import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";

import type { AIAnalysisResponse, DetectionResult } from "./detection.types";

import { DetectionRepository } from "./detection.repository";
import { BusinessService } from "../business/business.service";
import {
  analysisRequestQueueUrl,
  analysisResultQueueUrl,
  awsResourceNames,
  s3Client,
  sqsClient,
} from "../../config/aws";

const CORRECTABLE_FRESHNESS = ["Fresh", "Medium", "Spoiled"] as const;

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
  static async history(
    userId: string,
    businessId: string,
    startDate: Date,
    endDate: Date,
  ) {
    await BusinessService.assertMember(userId, businessId);
    return DetectionRepository.findScanHistory(businessId, startDate, endDate);
  }

  static async correctFreshness(
    userId: string,
    detectionId: string,
    freshness: string,
  ) {
    if (
      !CORRECTABLE_FRESHNESS.includes(
        freshness as (typeof CORRECTABLE_FRESHNESS)[number],
      )
    ) {
      throw new Error("Freshness must be Fresh, Medium, or Spoiled.");
    }

    const row = await DetectionRepository.findForCorrection(detectionId);
    if (!row?.scan_business_id) {
      throw new Error("Detection not found.");
    }

    const isMember = await BusinessService.isMember(
      userId,
      row.scan_business_id,
    );
    if (!isMember) {
      throw new Error("You do not belong to this business.");
    }

    return DetectionRepository.correctFreshness(
      detectionId,
      freshness as (typeof CORRECTABLE_FRESHNESS)[number],
      userId,
    );
  }

  static async getScanStatus(scanId: string) {
    const scan = await DetectionRepository.getScanById(scanId);

    if (!scan) {
      throw new Error("Scan not found.");
    }

    if (scan.status !== "COMPLETED") {
      return {
        scanId,
        status: scan.status,
        data: null,
        errorMessage: scan.error_message ?? undefined,
      };
    }

    const detections = await DetectionRepository.getDetectionsForScan(scanId);

    const counts: Record<string, { fresh: number; rotten: number; total: number }> = {};

    for (const detection of detections) {
      const label = detection.product_label;
      const freshness = detection.freshness ?? "UNKNOWN";
      const freshCount = freshness === "Fresh" ? 1 : 0;
      const rottenCount = freshness === "Spoiled" ? 1 : 0;

      if (!counts[label]) {
        counts[label] = {
          fresh: 0,
          rotten: 0,
          total: 0,
        };
      }

      counts[label].total += 1;
      counts[label].fresh += freshCount;
      counts[label].rotten += rottenCount;
    }

    const mappedDetections = detections.map((detection) => ({
      id: detection.id,
      class_name: detection.product_label,
      confidence: Number(detection.confidence),
      bounding_box: detection.bbox_json ?? { x1: 0, y1: 0, x2: 0, y2: 0 },
      freshness: detection.freshness ?? "UNKNOWN",
      freshness_confidence: Number(detection.freshness_confidence ?? 0),
      freshness_confidence_percent: Number(detection.freshness_confidence ?? 0) * 100,
    }));

    return {
      scanId,
      status: "COMPLETED",
      data: {
        scanId,
        image_width: 0,
        image_height: 0,
        total_count: mappedDetections.length,
        counts,
        detections: mappedDetections,
      },
    };
  }

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
          errorMessage?: string;
        };

        if (!payload.scanId) {
          continue;
        }

        if (payload.eventType === "ANALYSIS_FAILED") {
          await DetectionRepository.updateScanStatus(
            payload.scanId,
            "FAILED",
            payload.errorMessage ?? "AI analysis failed."
          );
          processed.push(payload as AnalysisJob);
        } else if (payload.eventType === "ANALYSIS_COMPLETED") {
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
        } else {
          console.warn("Ignoring unknown analysis result event", {
            eventType: payload.eventType,
            scanId: payload.scanId,
          });
          continue;
        }
      } catch (error: any) {
        console.error("Failed to persist analysis result:", {
          message: error.message,
          stack: error.stack,
        });
        continue;
      }

      try {
        if (message.ReceiptHandle) {
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: analysisResultQueueUrl,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
        }
      } catch (error: any) {
        console.error("Failed to delete processed analysis result message:", {
          message: error.message,
          stack: error.stack,
        });
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

}