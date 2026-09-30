import { ForbiddenError } from "../../shared/utils/errors";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";

import type {
  AnalyzeRequest,
  AIAnalysisResponse,
  SavedDetection,
  DetectionResult,
} from "./detection.types";

import { DetectionRepository } from "./detection.repository";
import { BusinessService } from "../business/business.service";
import type { ScanMode } from "../../entities/Scan";
import {
  analysisConfig,
  isEventPipelineEnabled,
  s3Client,
  s3PresignClient,
  sqsClient,
} from "../../config/aws";

const CORRECTABLE_FRESHNESS = ["Fresh", "Medium", "Spoiled"] as const;

const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function mapFreshness(
  freshness: string | null | undefined,
): "Fresh" | "Medium" | "Spoiled" | "UNKNOWN" {
  if (!freshness) {
    return "UNKNOWN";
  }

  switch (freshness.toLowerCase()) {
    case "good":
    case "fresh":
      return "Fresh";

    case "medium":
    case "ripe":
      return "Medium";

    case "bad":
    case "spoiled":
    case "rotten":
      return "Spoiled";

    default:
      return "UNKNOWN";
  }
}

const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS) || 30_000;
const AI_UNAVAILABLE_MESSAGE =
  "AI analysis is temporarily unavailable. Please try again shortly.";
const AI_UNREACHABLE_CODES = ["ECONNREFUSED", "ECONNABORTED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "EAI_AGAIN"];

export class AiServiceUnavailableError extends Error {
  readonly code = "AI_UNAVAILABLE";

  constructor() {
    super(AI_UNAVAILABLE_MESSAGE);
    this.name = "AiServiceUnavailableError";
  }
}

/** The S3/SQS pipeline is not configured; clients fall back to POST /detection/analyze. */
export class EventPipelineDisabledError extends Error {
  readonly code = "EVENT_PIPELINE_DISABLED";

  constructor() {
    super("Event-driven analysis is not configured on this server.");
    this.name = "EventPipelineDisabledError";
  }
}

function isAiUnreachable(error: any) {
  return AI_UNREACHABLE_CODES.includes(error?.code) || error?.response?.status === 503;
}

export type ScanUploadRequest = {
  businessId: string;
  shelfId: string;
  userId: string;
  scanMode: ScanMode;
  fileName: string;
  contentType: string;
};

export type ScanUploadResponse = {
  scanId: string;
  status: "PENDING";
  upload: { url: string; fields: Record<string, string> };
  maxBytes: number;
  expiresInSeconds: number;
};

/** SQS jobs-queue message published after the image is in S3. */
export type AnalysisJob = {
  eventType: "IMAGE_UPLOADED";
  scanId: string;
  businessId: string;
  shelfId: string;
  userId: string;
  scanMode: ScanMode;
  bucket: string;
  objectKey: string;
  contentType: string;
  timestamp: string;
};

/** SQS results-queue message published by the AI worker. */
export type AnalysisResultEvent = {
  eventType?: "ANALYSIS_COMPLETED" | "ANALYSIS_FAILED" | string;
  scanId?: string;
  data?: AIAnalysisResponse;
  errorMessage?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const result = await DetectionRepository.findForCorrection(detectionId);
    const detection = result.entities[0];
    const businessId = result.raw[0]?.scan_business_id;

    if (!detection || !businessId) {
      throw new Error("Detection not found.");
    }

    const isMember = await BusinessService.isMember(userId, businessId);
    if (!isMember) {
      throw new ForbiddenError("You do not belong to this business.");
    }

    return DetectionRepository.correctFreshness(
      detectionId,
      freshness as (typeof CORRECTABLE_FRESHNESS)[number],
      userId,
    );
  }

  /**
   * Stores an AI result for a scan: detections, product links, the stock-in/stock-out
   * inventory change and low-stock alerts. Shared by the synchronous endpoint and the
   * event-driven result consumer so both paths behave identically.
   */
  static async persistAnalysis(
    scanId: string,
    businessId: string,
    scanMode: ScanMode,
    aiResult: AIAnalysisResponse,
  ): Promise<DetectionResult> {
    const savedDetections: SavedDetection[] = [];
    const unmatchedLabels = new Set<string>();
    let linkedProducts = 0;

    for (const detection of aiResult.detections) {
      const product =
        scanMode === "STOCK_IN"
          ? await DetectionRepository.findOrCreateProduct(
              businessId,
              detection.class_name,
            )
          : await DetectionRepository.findProductByName(
              businessId,
              detection.class_name,
            );

      if (!product) {
        unmatchedLabels.add(detection.class_name);
      } else {
        linkedProducts += 1;
      }

      const savedDetection = await DetectionRepository.createDetection(
        scanId,
        detection.class_name,
        product ? product.id : null,
        detection.confidence,
        detection.bounding_box,
        mapFreshness(detection.freshness),
        detection.freshness_confidence,
      );

      const boundingBox =
        typeof savedDetection.bbox_json === "string"
          ? JSON.parse(savedDetection.bbox_json)
          : savedDetection.bbox_json;

      savedDetections.push({
        id: savedDetection.id,

        class_name: savedDetection.product_label,

        confidence: Number(savedDetection.confidence),

        bounding_box: boundingBox,

        freshness: savedDetection.freshness ?? "UNKNOWN",

        freshness_confidence: Number(savedDetection.freshness_confidence),

        freshness_confidence_percent:
          Number(savedDetection.freshness_confidence) * 100,
      });
    }

    if (
      scanMode === "STOCK_OUT" &&
      aiResult.detections.length > 0 &&
      linkedProducts === 0
    ) {
      throw new Error(
        `No matching inventory products found for: ${[...unmatchedLabels].join(", ")}. Add stock first before removing.`,
      );
    }

    const inventoryChanges = await DetectionRepository.applyInventoryChange(
      scanId,
      businessId,
      scanMode,
    );

    const result: DetectionResult = {
      scanId,

      image_width: aiResult.image_width,

      image_height: aiResult.image_height,

      total_count: aiResult.total_count,

      counts: aiResult.counts,

      detections: savedDetections,

      inventoryChanges: inventoryChanges ?? [],
    };

    await DetectionRepository.saveScanResult(scanId, result);

    return result;
  }

  /** Synchronous analysis over HTTP (fallback path and mobile app). */
  static async analyze(
    file: Express.Multer.File | undefined,
    businessId: string,
    shelfId: string,
    userId: string,
    scanMode: ScanMode = "STOCK_IN",
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
      scanMode,
    };

    const scan = await DetectionRepository.createScan(
      analyzeRequest.businessId,
      analyzeRequest.shelfId,
      analyzeRequest.userId,
      scanMode,
    );

    const scanId = scan.id;

    try {
      await DetectionRepository.updateScanStatus(scanId, "PROCESSING");

      const formData = new FormData();

      formData.append("file", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await axios.post<AIAnalysisResponse>(
        `${process.env.AI_SERVICE_URL}/analyze`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: AI_REQUEST_TIMEOUT_MS,
        },
      );

      return await DetectionService.persistAnalysis(
        scanId,
        analyzeRequest.businessId,
        scanMode,
        response.data,
      );
    } catch (error: any) {
      if (isAiUnreachable(error)) {
        // FR-HEALTH-002: controlled error; the raw socket error names internal hosts.
        await DetectionRepository.updateScanStatus(
          scanId,
          "FAILED",
          AI_UNAVAILABLE_MESSAGE,
        );
        throw new AiServiceUnavailableError();
      }

      await DetectionRepository.updateScanStatus(
        scanId,
        "FAILED",
        error.message,
      );

      throw error;
    }
  }

  // ---- Event-driven analysis ------------------------------------------------

  /** Step 1: create a PENDING scan and a presigned S3 POST the browser uploads the image with. */
  static async createUploadUrl(
    request: ScanUploadRequest,
  ): Promise<ScanUploadResponse> {
    if (!isEventPipelineEnabled()) {
      throw new EventPipelineDisabledError();
    }

    if (!request.businessId) {
      throw new Error("Business ID is required.");
    }

    if (!request.shelfId) {
      throw new Error("Shelf ID is required.");
    }

    if (!request.fileName) {
      throw new Error("File name is required.");
    }

    if (!ALLOWED_UPLOAD_TYPES.has(request.contentType)) {
      throw new Error("Unsupported file. Please upload a JPEG, PNG or WebP image.");
    }

    await BusinessService.assertMember(request.userId, request.businessId);

    const scan = await DetectionRepository.createScan(
      request.businessId,
      request.shelfId,
      request.userId,
      request.scanMode,
    );

    const safeFileName =
      path.basename(request.fileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) ||
      "image";
    const objectKey = `scans/${request.businessId}/${scan.id}/${safeFileName}`;

    await DetectionRepository.updateScanImageMetadata(
      scan.id,
      objectKey,
      request.contentType,
      safeFileName,
    );

    // A presigned POST (unlike PUT) lets S3 itself enforce the size and content type.
    const { url, fields } = await createPresignedPost(s3PresignClient, {
      Bucket: analysisConfig.bucket,
      Key: objectKey,
      Conditions: [
        ["content-length-range", 1, analysisConfig.maxUploadBytes],
        ["eq", "$Content-Type", request.contentType],
      ],
      Fields: { "Content-Type": request.contentType },
      Expires: analysisConfig.uploadExpirySeconds,
    });

    return {
      scanId: scan.id,
      status: "PENDING",
      upload: { url, fields },
      maxBytes: analysisConfig.maxUploadBytes,
      expiresInSeconds: analysisConfig.uploadExpirySeconds,
    };
  }

  /** Step 2: after the browser uploaded the image, publish IMAGE_UPLOADED to the jobs queue. */
  static async queueScan(scanId: string, userId: string) {
    if (!isEventPipelineEnabled()) {
      throw new EventPipelineDisabledError();
    }

    const scan = await DetectionRepository.getScanById(scanId);
    if (!scan) {
      throw new Error("Scan not found.");
    }

    await BusinessService.assertMember(userId, scan.business_id);

    if (scan.status !== "PENDING") {
      // Idempotent: a retried request must not publish the job twice.
      return { scanId, status: scan.status };
    }

    if (!scan.image_key || !scan.image_content_type) {
      throw new Error("This scan has no uploaded image.");
    }

    let uploadedBytes: number;
    try {
      const head = await s3Client.send(
        new HeadObjectCommand({ Bucket: analysisConfig.bucket, Key: scan.image_key }),
      );
      uploadedBytes = Number(head.ContentLength ?? 0);
    } catch {
      throw new Error("The image has not been uploaded yet. Upload it before queuing the scan.");
    }

    // S3 enforces the presigned POST size limit; re-check here as defense in depth
    // (and because S3 emulators such as LocalStack do not enforce policy conditions).
    if (uploadedBytes <= 0 || uploadedBytes > analysisConfig.maxUploadBytes) {
      const message = `Image is too large. The maximum size is ${Math.floor(
        analysisConfig.maxUploadBytes / (1024 * 1024),
      )} MB.`;
      await DetectionRepository.updateScanStatus(scanId, "FAILED", message);
      throw new Error(message);
    }

    const claimed = await DetectionRepository.claimScanForQueue(scanId);
    if (!claimed) {
      const current = await DetectionRepository.getScanById(scanId);
      return { scanId, status: current?.status ?? "PROCESSING" };
    }

    const job: AnalysisJob = {
      eventType: "IMAGE_UPLOADED",
      scanId,
      businessId: scan.business_id,
      shelfId: scan.shelf_id,
      userId: scan.user_id,
      scanMode: scan.scan_mode,
      bucket: analysisConfig.bucket,
      objectKey: scan.image_key,
      contentType: scan.image_content_type,
      timestamp: new Date().toISOString(),
    };

    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: analysisConfig.jobQueueUrl,
          MessageBody: JSON.stringify(job),
          MessageAttributes: {
            eventType: { DataType: "String", StringValue: job.eventType },
            scanId: { DataType: "String", StringValue: scanId },
          },
        }),
      );
    } catch (error) {
      console.error("Failed to publish analysis job", { scanId, error });
      await DetectionRepository.updateScanStatus(scanId, "FAILED", AI_UNAVAILABLE_MESSAGE);
      throw new AiServiceUnavailableError();
    }

    return { scanId, status: "PROCESSING" as const };
  }

  /** Step 3: the client polls until the scan is COMPLETED (result included) or FAILED. */
  static async getScanStatus(scanId: string, userId: string) {
    const scan = await DetectionRepository.getScanById(scanId);
    if (!scan) {
      throw new Error("Scan not found.");
    }

    await BusinessService.assertMember(userId, scan.business_id);

    // COMPLETED is set inside the inventory transaction just before the result is stored,
    // so report PROCESSING until the result is readable.
    if (scan.status === "COMPLETED" && scan.result_json) {
      return { scanId, status: "COMPLETED" as const, data: scan.result_json as DetectionResult };
    }

    if (scan.status === "FAILED") {
      return {
        scanId,
        status: "FAILED" as const,
        data: null,
        errorMessage: scan.error_message ?? "Analysis failed.",
      };
    }

    return {
      scanId,
      status: scan.status === "COMPLETED" ? ("PROCESSING" as const) : scan.status,
      data: null,
    };
  }

  /** Handles one results-queue event. Safe to call twice for the same scan (SQS is at-least-once). */
  static async handleAnalysisResult(event: AnalysisResultEvent): Promise<void> {
    // Malformed events are dropped, not retried: a non-UUID id would fail the DB lookup
    // on every delivery and only end up in the DLQ.
    if (!event.scanId || !UUID_PATTERN.test(event.scanId)) {
      console.warn("Ignoring analysis result with a missing or invalid scanId", {
        scanId: event.scanId,
      });
      return;
    }

    const scan = await DetectionRepository.getScanById(event.scanId);
    if (!scan) {
      console.warn("Ignoring analysis result for unknown scan", { scanId: event.scanId });
      return;
    }

    if (scan.status === "COMPLETED" || scan.status === "FAILED") {
      return; // duplicate delivery
    }

    if (event.eventType === "ANALYSIS_FAILED") {
      await DetectionRepository.updateScanStatus(
        scan.id,
        "FAILED",
        event.errorMessage || "AI analysis failed.",
      );
      return;
    }

    if (event.eventType !== "ANALYSIS_COMPLETED" || !Array.isArray(event.data?.detections)) {
      console.warn("Ignoring unknown analysis result event", {
        eventType: event.eventType,
        scanId: event.scanId,
      });
      return;
    }

    try {
      // Business and scan mode come from the database, never from the message.
      await DetectionService.persistAnalysis(
        scan.id,
        scan.business_id,
        scan.scan_mode,
        event.data,
      );
    } catch (error: any) {
      await DetectionRepository.updateScanStatus(
        scan.id,
        "FAILED",
        error?.message || "Could not save the analysis result.",
      );
    }
  }

  /** Long-polls the results queue until stopped. Each backend replica runs one loop. */
  static startResultConsumer(): { stop: () => void } {
    let running = true;

    const loop = async () => {
      while (running) {
        try {
          const response = await sqsClient.send(
            new ReceiveMessageCommand({
              QueueUrl: analysisConfig.resultQueueUrl,
              MaxNumberOfMessages: 10,
              WaitTimeSeconds: 20,
            }),
          );

          for (const message of response.Messages ?? []) {
            try {
              await DetectionService.handleAnalysisResult(
                JSON.parse(message.Body || "{}") as AnalysisResultEvent,
              );
              await sqsClient.send(
                new DeleteMessageCommand({
                  QueueUrl: analysisConfig.resultQueueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                }),
              );
            } catch (error) {
              // Not deleted: SQS redelivers it, and after maxReceiveCount it lands in the DLQ.
              console.error("Failed to process analysis result message", error);
            }
          }
        } catch (error) {
          console.error("Result queue polling failed", error);
          await sleep(5000);
        }
      }
    };

    void loop();
    return {
      stop: () => {
        running = false;
      },
    };
  }
}
