import axios from "axios";
import FormData from "form-data";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";

import type {
  AnalyzeRequest,
  AIDetection,
  AIAnalysisResponse,
  SavedDetection,
  DetectionResult,
} from "./detection.types";

import { DetectionRepository } from "./detection.repository";
import {
  analysisRequestQueueUrl,
  analysisResultQueueUrl,
  awsResourceNames,
  s3Client,
  sqsClient,
} from "../../config/aws";

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type ScanUploadRequest = {
  businessId: string;
  shelfId: string;
  userId: string;
  fileName: string;
  contentType: string;
};

export type ScanUploadResponse = {
  scanId: string;
  status: "PENDING";
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export type AnalysisJob = {
  eventType: "IMAGE_UPLOADED";
  scanId: string;
  businessId: string;
  shelfId: string;
  userId: string;
  bucket: string;
  objectKey: string;
  contentType: string;
  timestamp: string;
};

function mapFreshness(
  freshness: string | null | undefined
): "Fresh" | "Spoiled" | "UNKNOWN" {

  if (!freshness) {
    return "UNKNOWN";
  }

  switch (freshness.toLowerCase()) {

    case "good":
      return "Fresh";

    case "bad":
      return "Spoiled";

    default:
      return "UNKNOWN";
  }
}

export class DetectionService {

  static async queueUploadedScan(
    scan: AnalysisJob
  ): Promise<void> {
    if (!analysisRequestQueueUrl) {
      throw new Error("SQS_ANALYSIS_JOB_QUEUE_URL is required.");
    }

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: analysisRequestQueueUrl,
        MessageBody: JSON.stringify(scan),
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: scan.eventType,
          },
          scanId: {
            DataType: "String",
            StringValue: scan.scanId,
          },
        },
      })
    );
  }

  static async consumeAnalysisResults(): Promise<AnalysisJob[]> {
    if (!analysisResultQueueUrl) {
      throw new Error("SQS_ANALYSIS_RESULT_QUEUE_URL is required.");
    }

    const response = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: analysisResultQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ["All"],
        AttributeNames: ["All"],
      })
    );

    const messages = response.Messages ?? [];
    const processed: AnalysisJob[] = [];

    for (const message of messages) {
      if (!message.Body) {
        continue;
      }

      try {
        const payload = JSON.parse(message.Body) as {
          eventType?: string;
          scanId?: string;
          businessId?: string;
          shelfId?: string;
          userId?: string;
          data?: AIAnalysisResponse;
        };

        if (payload.eventType !== "ANALYSIS_COMPLETED" || !payload.scanId) {
          continue;
        }

        const aiResult = payload.data ?? {
          image_width: 0,
          image_height: 0,
          total_count: 0,
          counts: {},
          detections: [],
        };

        for (const detection of aiResult.detections) {
          const product = await DetectionRepository.findProductByName(
            payload.businessId ?? "",
            detection.class_name
          );

          await DetectionRepository.createDetection(
            payload.scanId,
            detection.class_name,
            product ? product.id : null,
            detection.confidence,
            detection.bounding_box,
            mapFreshness(detection.freshness),
            detection.freshness_confidence
          );
        }

        await DetectionRepository.updateScanStatus(payload.scanId, "COMPLETED");
        processed.push(payload as AnalysisJob);
      } catch (error: any) {
        console.error("Failed to process analysis result message:", error.message);
      } finally {
        if (message.ReceiptHandle) {
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: analysisResultQueueUrl,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
        }
      }
    }

    return processed;
  }

  static startResultQueueConsumer(intervalMs = 5000): NodeJS.Timeout {
    return setInterval(() => {
      void DetectionService.consumeAnalysisResults().catch((error) => {
        console.error("Result queue polling failed:", error);
      });
    }, intervalMs);
  }

  static async createUploadUrl(
    request: ScanUploadRequest
  ): Promise<ScanUploadResponse> {
    if (!request.businessId) {
      throw new Error("Business ID is required.");
    }

    if (!request.shelfId) {
      throw new Error("Shelf ID is required.");
    }

    if (!request.userId) {
      throw new Error("User ID is required.");
    }

    if (!request.fileName) {
      throw new Error("File name is required.");
    }

    if (!allowedImageTypes.has(request.contentType)) {
      throw new Error("Unsupported image type. Upload JPEG, PNG or WebP.");
    }

    const scan = await DetectionRepository.createScan(
      request.businessId,
      request.shelfId,
      request.userId
    );

    const safeFileName = path.basename(request.fileName).replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const objectKey = `${request.businessId}/${scan.id}/${safeFileName}`;
    const expiresInSeconds = Number(
      process.env.S3_PRESIGN_EXPIRY_SECONDS || 900
    );

    await DetectionRepository.updateScanImageMetadata(
      scan.id,
      objectKey,
      request.contentType,
      safeFileName
    );

    const command = new PutObjectCommand({
      Bucket: awsResourceNames.bucket,
      Key: objectKey,
      ContentType: request.contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      scanId: scan.id,
      status: "PENDING",
      objectKey,
      uploadUrl,
      expiresInSeconds,
    };
  }

  static async analyze(
    file: Express.Multer.File | undefined,
    businessId: string,
    shelfId: string,
    userId: string
  ): Promise<DetectionResult> { 

    if (!file) {
      throw new Error("No image uploaded.");
    }

    if (!businessId) {
      throw new Error("Business ID is required.");
    }

    if (!shelfId) {
      throw new Error("Shelf ID is required.");
    }

    if (!userId) {
      throw new Error("User ID is required.");
    }

    
    const analyzeRequest: AnalyzeRequest = {
      businessId,
      shelfId,
      userId,
    };

    const scan = await DetectionRepository.createScan(
      analyzeRequest.businessId,
      analyzeRequest.shelfId,
      analyzeRequest.userId
    );

    const scanId = scan.id;

    try {

      await DetectionRepository.updateScanStatus(
        scanId,
        "PROCESSING"
      );

      const formData = new FormData();

      formData.append(
        "file",
        file.buffer,
        {
          filename: file.originalname,
          contentType: file.mimetype,
        }
      );

     
      const response = await axios.post<AIAnalysisResponse>(
        `${process.env.AI_SERVICE_URL}/analyze`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      
      const aiResult: AIAnalysisResponse = response.data;

      console.log(
        "========== AI SERVICE RESULT =========="
      );

      console.log(
        JSON.stringify(aiResult, null, 2)
      );

    
      const savedDetections: SavedDetection[] = [];

      for (const detection of aiResult.detections) {

        const product =
          await DetectionRepository.findProductByName(
            analyzeRequest.businessId,
            detection.class_name
          );

        const savedDetection =
          await DetectionRepository.createDetection(
            scanId,
            detection.class_name,
            product ? product.id : null,
            detection.confidence,
            detection.bounding_box,
            mapFreshness(detection.freshness),
            detection.freshness_confidence
          );

        const boundingBox =
          typeof savedDetection.bbox_json === "string"
            ? JSON.parse(savedDetection.bbox_json)
            : savedDetection.bbox_json;

        savedDetections.push({

          id: savedDetection.id,

          class_name: savedDetection.product_label,

          confidence: Number(
            savedDetection.confidence
          ),

          bounding_box: boundingBox,

          freshness: savedDetection.freshness,

          freshness_confidence: Number(
            savedDetection.freshness_confidence
          ),

          freshness_confidence_percent:
            Number(
              savedDetection.freshness_confidence
            ) * 100,
        });
      }

      await DetectionRepository.updateScanStatus(
        scanId,
        "COMPLETED"
      );

     
      const result: DetectionResult = {

        scanId,

        image_width: aiResult.image_width,

        image_height: aiResult.image_height,

        total_count: aiResult.total_count,

        counts: aiResult.counts,

        detections: savedDetections,
      };

      console.log(
        "========== BACKEND RESPONSE =========="
      );

      console.log(
        JSON.stringify(result, null, 2)
      );

      return result;

    } catch (error: any) {

      await DetectionRepository.updateScanStatus(
        scanId,
        "FAILED",
        error.message
      );

      throw error;
    }
  }
}