import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import {
  AiServiceUnavailableError,
  DetectionService,
  EventPipelineDisabledError,
} from "../../../src/modules/detection/detection.service";
import { DetectionRepository } from "../../../src/modules/detection/detection.repository";
import { BusinessService } from "../../../src/modules/business/business.service";
import { ForbiddenError } from "../../../src/shared/utils/errors";
import * as aws from "../../../src/config/aws";

jest.mock("@aws-sdk/s3-presigned-post", () => ({ createPresignedPost: jest.fn() }));

jest.mock("../../../src/config/aws", () => ({
  analysisConfig: {
    bucket: "scan-bucket",
    jobQueueUrl: "https://sqs/jobs",
    resultQueueUrl: "https://sqs/results",
    uploadExpirySeconds: 900,
    maxUploadBytes: 10 * 1024 * 1024,
  },
  isEventPipelineEnabled: jest.fn(() => true),
  s3Client: { send: jest.fn() },
  s3PresignClient: {},
  sqsClient: { send: jest.fn() },
}));

jest.mock("../../../src/modules/detection/detection.repository", () => ({
  DetectionRepository: {
    createScan: jest.fn(),
    updateScanStatus: jest.fn(),
    updateScanImageMetadata: jest.fn(),
    getScanById: jest.fn(),
    claimScanForQueue: jest.fn(),
    saveScanResult: jest.fn(),
    findProductByName: jest.fn(),
    findOrCreateProduct: jest.fn(),
    createDetection: jest.fn(),
    applyInventoryChange: jest.fn(),
    linkScanProducts: jest.fn(),
  },
}));

jest.mock("../../../src/modules/business/business.service", () => ({
  BusinessService: { assertMember: jest.fn(), isMember: jest.fn() },
}));

const repo = DetectionRepository as jest.Mocked<typeof DetectionRepository>;
const business = BusinessService as jest.Mocked<typeof BusinessService>;
const s3Send = aws.s3Client.send as jest.Mock;
const sqsSend = aws.sqsClient.send as jest.Mock;
const pipelineEnabled = aws.isEventPipelineEnabled as jest.Mock;
const presignedPost = createPresignedPost as jest.Mock;

const SCAN_ID = "3f1d2c4b-5a6e-4f70-8a9b-0c1d2e3f4a5b";

const pendingScan = {
  id: SCAN_ID,
  business_id: "biz-1",
  shelf_id: "shelf-1",
  user_id: "user-1",
  scan_mode: "STOCK_OUT" as const,
  status: "PENDING" as const,
  error_message: null,
  image_key: "scans/biz-1/scan-1/apple.jpg",
  image_content_type: "image/jpeg",
  result_json: null,
};

const uploadRequest = {
  businessId: "biz-1",
  shelfId: "shelf-1",
  userId: "user-1",
  scanMode: "STOCK_IN" as const,
  fileName: "../../my apple (1).jpg",
  contentType: "image/jpeg",
};

beforeEach(() => {
  jest.clearAllMocks();
  pipelineEnabled.mockReturnValue(true);
  business.assertMember.mockResolvedValue(undefined as never);
});

describe("DetectionService.createUploadUrl", () => {
  it("creates a PENDING scan and a size/type-restricted presigned POST", async () => {
    repo.createScan.mockResolvedValue({ id: "scan-1" });
    presignedPost.mockResolvedValue({ url: "https://s3/scan-bucket", fields: { key: "k" } });

    const result = await DetectionService.createUploadUrl(uploadRequest);

    expect(business.assertMember).toHaveBeenCalledWith("user-1", "biz-1");
    expect(repo.createScan).toHaveBeenCalledWith("biz-1", "shelf-1", "user-1", "STOCK_IN");
    expect(repo.updateScanImageMetadata).toHaveBeenCalledWith(
      "scan-1",
      "scans/biz-1/scan-1/my_apple__1_.jpg",
      "image/jpeg",
      "my_apple__1_.jpg",
    );

    const params = presignedPost.mock.calls[0][1];
    expect(params.Bucket).toBe("scan-bucket");
    expect(params.Conditions).toEqual(
      expect.arrayContaining([
        ["content-length-range", 1, 10 * 1024 * 1024],
        ["eq", "$Content-Type", "image/jpeg"],
      ]),
    );
    expect(result).toMatchObject({
      scanId: "scan-1",
      status: "PENDING",
      upload: { url: "https://s3/scan-bucket", fields: { key: "k" } },
    });
  });

  it("rejects unsupported image types before creating a scan", async () => {
    await expect(
      DetectionService.createUploadUrl({ ...uploadRequest, contentType: "application/pdf" }),
    ).rejects.toThrow(/JPEG, PNG or WebP/);
    expect(repo.createScan).not.toHaveBeenCalled();
  });

  it("refuses non-members", async () => {
    business.assertMember.mockRejectedValue(new ForbiddenError("You do not belong to this business."));

    await expect(DetectionService.createUploadUrl(uploadRequest)).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.createScan).not.toHaveBeenCalled();
  });

  it("signals the client to fall back when the pipeline is not configured", async () => {
    pipelineEnabled.mockReturnValue(false);

    await expect(DetectionService.createUploadUrl(uploadRequest)).rejects.toBeInstanceOf(
      EventPipelineDisabledError,
    );
  });
});

describe("DetectionService.queueScan", () => {
  it("verifies the upload, claims the scan and publishes IMAGE_UPLOADED", async () => {
    repo.getScanById.mockResolvedValue(pendingScan);
    repo.claimScanForQueue.mockResolvedValue(true);
    s3Send.mockResolvedValue({ ContentLength: 2048 });
    sqsSend.mockResolvedValue({});

    const result = await DetectionService.queueScan("scan-1", "user-1");

    expect(s3Send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);
    expect(repo.claimScanForQueue).toHaveBeenCalledWith("scan-1");

    const command = sqsSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(SendMessageCommand);
    expect(command.input.QueueUrl).toBe("https://sqs/jobs");
    expect(JSON.parse(command.input.MessageBody)).toMatchObject({
      eventType: "IMAGE_UPLOADED",
      scanId: "scan-1",
      businessId: "biz-1",
      scanMode: "STOCK_OUT",
      bucket: "scan-bucket",
      objectKey: "scans/biz-1/scan-1/apple.jpg",
    });
    expect(result).toEqual({ scanId: "scan-1", status: "PROCESSING" });
  });

  it("is idempotent: an already queued scan is not published again", async () => {
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "PROCESSING" });

    const result = await DetectionService.queueScan("scan-1", "user-1");

    expect(result).toEqual({ scanId: "scan-1", status: "PROCESSING" });
    expect(sqsSend).not.toHaveBeenCalled();
  });

  it("refuses to queue when the image was not uploaded", async () => {
    repo.getScanById.mockResolvedValue(pendingScan);
    s3Send.mockRejectedValue(Object.assign(new Error("NotFound"), { name: "NotFound" }));

    await expect(DetectionService.queueScan("scan-1", "user-1")).rejects.toThrow(/not been uploaded/);
    expect(repo.claimScanForQueue).not.toHaveBeenCalled();
    expect(sqsSend).not.toHaveBeenCalled();
  });

  it("rejects an uploaded object larger than the limit without publishing", async () => {
    repo.getScanById.mockResolvedValue(pendingScan);
    s3Send.mockResolvedValue({ ContentLength: 11 * 1024 * 1024 });

    await expect(DetectionService.queueScan("scan-1", "user-1")).rejects.toThrow(/too large/);
    expect(repo.updateScanStatus).toHaveBeenCalledWith("scan-1", "FAILED", expect.stringMatching(/too large/));
    expect(repo.claimScanForQueue).not.toHaveBeenCalled();
    expect(sqsSend).not.toHaveBeenCalled();
  });

  it("marks the scan FAILED when the job cannot be published", async () => {
    repo.getScanById.mockResolvedValue(pendingScan);
    repo.claimScanForQueue.mockResolvedValue(true);
    s3Send.mockResolvedValue({ ContentLength: 2048 });
    sqsSend.mockRejectedValue(new Error("SQS down"));

    await expect(DetectionService.queueScan("scan-1", "user-1")).rejects.toBeInstanceOf(
      AiServiceUnavailableError,
    );
    expect(repo.updateScanStatus).toHaveBeenCalledWith("scan-1", "FAILED", expect.any(String));
  });

  it("refuses users outside the scan's business", async () => {
    repo.getScanById.mockResolvedValue(pendingScan);
    business.assertMember.mockRejectedValue(new ForbiddenError("You do not belong to this business."));

    await expect(DetectionService.queueScan("scan-1", "intruder")).rejects.toBeInstanceOf(ForbiddenError);
    expect(sqsSend).not.toHaveBeenCalled();
  });
});

describe("DetectionService.getScanStatus", () => {
  it("returns the stored result once ANALYZED so the user can add it to inventory", async () => {
    const result = { scanId: SCAN_ID, inventoryApplied: false };
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "ANALYZED", result_json: result });

    await expect(DetectionService.getScanStatus("scan-1", "user-1")).resolves.toEqual({
      scanId: "scan-1",
      status: "ANALYZED",
      data: result,
    });
  });

  it("returns the stored result once COMPLETED", async () => {
    const result = { scanId: "scan-1", detections: [], inventoryChanges: [] };
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "COMPLETED", result_json: result });

    await expect(DetectionService.getScanStatus("scan-1", "user-1")).resolves.toEqual({
      scanId: "scan-1",
      status: "COMPLETED",
      data: result,
    });
  });

  it("reports PROCESSING while the result is not stored yet", async () => {
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "COMPLETED", result_json: null });

    const status = await DetectionService.getScanStatus("scan-1", "user-1");
    expect(status.status).toBe("PROCESSING");
  });

  it("returns the failure reason", async () => {
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "FAILED", error_message: "Blurry image" });

    await expect(DetectionService.getScanStatus("scan-1", "user-1")).resolves.toMatchObject({
      status: "FAILED",
      errorMessage: "Blurry image",
    });
  });

  it("does not leak scans to other businesses", async () => {
    repo.getScanById.mockResolvedValue(pendingScan);
    business.assertMember.mockRejectedValue(new ForbiddenError("You do not belong to this business."));

    await expect(DetectionService.getScanStatus("scan-1", "intruder")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("DetectionService.handleAnalysisResult", () => {
  const aiResult = {
    image_width: 100,
    image_height: 80,
    total_count: 1,
    counts: { apple: { fresh: 1, medium: 0, rotten: 0, total: 1 } },
    detections: [
      {
        class_name: "apple",
        confidence: 0.9,
        bounding_box: { x1: 1, y1: 2, x2: 3, y2: 4 },
        freshness: "good",
        freshness_confidence: 0.95,
        freshness_confidence_percent: 95,
      },
    ],
  };

  it("persists a completed result using the scan's business and mode from the database", async () => {
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "PROCESSING", scan_mode: "STOCK_IN" });
    const persist = jest
      .spyOn(DetectionService, "persistAnalysis")
      .mockResolvedValue({} as never);

    await DetectionService.handleAnalysisResult({
      eventType: "ANALYSIS_COMPLETED",
      scanId: SCAN_ID,
      // A forged business in the message must be ignored.
      ...({ businessId: "other-biz" } as object),
      data: aiResult,
    });

    expect(persist).toHaveBeenCalledWith(SCAN_ID, "STOCK_IN", aiResult);
    persist.mockRestore();
  });

  it("drops events whose scanId is not a UUID without touching the database", async () => {
    await DetectionService.handleAnalysisResult({
      eventType: "ANALYSIS_COMPLETED",
      scanId: "not-a-uuid",
      data: aiResult,
    });

    expect(repo.getScanById).not.toHaveBeenCalled();
  });

  it("ignores duplicate deliveries for analyzed scans", async () => {
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "ANALYZED" });
    const persist = jest.spyOn(DetectionService, "persistAnalysis");

    await DetectionService.handleAnalysisResult({
      eventType: "ANALYSIS_COMPLETED",
      scanId: SCAN_ID,
      data: aiResult,
    });

    expect(persist).not.toHaveBeenCalled();
    persist.mockRestore();
  });

  it("ignores duplicate deliveries for finished scans", async () => {
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "COMPLETED" });
    const persist = jest.spyOn(DetectionService, "persistAnalysis");

    await DetectionService.handleAnalysisResult({
      eventType: "ANALYSIS_COMPLETED",
      scanId: SCAN_ID,
      data: aiResult,
    });

    expect(persist).not.toHaveBeenCalled();
    persist.mockRestore();
  });

  it("marks the scan FAILED on ANALYSIS_FAILED", async () => {
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "PROCESSING" });

    await DetectionService.handleAnalysisResult({
      eventType: "ANALYSIS_FAILED",
      scanId: SCAN_ID,
      errorMessage: "Unreadable image",
    });

    expect(repo.updateScanStatus).toHaveBeenCalledWith(SCAN_ID, "FAILED", "Unreadable image");
  });

  it("marks the scan FAILED when saving the result fails (e.g. stock-out of unknown products)", async () => {
    repo.getScanById.mockResolvedValue({ ...pendingScan, status: "PROCESSING" });
    const persist = jest
      .spyOn(DetectionService, "persistAnalysis")
      .mockRejectedValue(new Error("No matching inventory products found for: apple."));

    await DetectionService.handleAnalysisResult({
      eventType: "ANALYSIS_COMPLETED",
      scanId: SCAN_ID,
      data: aiResult,
    });

    expect(repo.updateScanStatus).toHaveBeenCalledWith(
      SCAN_ID,
      "FAILED",
      "No matching inventory products found for: apple.",
    );
    persist.mockRestore();
  });
});

describe("DetectionService.confirmInventory", () => {
  const analyzedScan = {
    ...pendingScan,
    status: "ANALYZED",
    scan_mode: "STOCK_IN",
    result_json: { scanId: SCAN_ID, total_count: 2, detections: [], inventoryApplied: false },
  };

  it("links products, applies the stock change once and stores the applied result", async () => {
    repo.getScanById.mockResolvedValue(analyzedScan as never);
    repo.linkScanProducts.mockResolvedValue({ linked: 2, unmatchedLabels: [] });
    const changes = [
      { productId: "p-1", product: "apple", detected: 2, currentQuantity: 3, quantity: 5 },
    ];
    repo.applyInventoryChange.mockResolvedValue(changes);

    const result = await DetectionService.confirmInventory(SCAN_ID, "user-1");

    expect(business.assertMember).toHaveBeenCalledWith("user-1", "biz-1");
    expect(repo.linkScanProducts).toHaveBeenCalledWith(SCAN_ID, "biz-1", "STOCK_IN");
    expect(repo.applyInventoryChange).toHaveBeenCalledWith(SCAN_ID, "biz-1", "STOCK_IN");
    expect(result).toMatchObject({
      scanId: SCAN_ID,
      scanMode: "STOCK_IN",
      total_count: 2,
      inventoryApplied: true,
      inventoryChanges: changes,
    });
    expect(repo.saveScanResult).toHaveBeenCalledWith(SCAN_ID, result);
  });

  it("refuses a scan that was already added to inventory", async () => {
    repo.getScanById.mockResolvedValue({ ...analyzedScan, status: "COMPLETED" } as never);

    await expect(DetectionService.confirmInventory(SCAN_ID, "user-1")).rejects.toThrow(
      "already been added to inventory",
    );
    expect(repo.applyInventoryChange).not.toHaveBeenCalled();
  });

  it("refuses a scan that has not finished analysis", async () => {
    repo.getScanById.mockResolvedValue({ ...analyzedScan, status: "PROCESSING" } as never);

    await expect(DetectionService.confirmInventory(SCAN_ID, "user-1")).rejects.toThrow(
      "not finished analysis",
    );
    expect(repo.applyInventoryChange).not.toHaveBeenCalled();
  });

  it("refuses a stock-out scan when no detected product exists in inventory", async () => {
    repo.getScanById.mockResolvedValue({ ...analyzedScan, scan_mode: "STOCK_OUT" } as never);
    repo.linkScanProducts.mockResolvedValue({ linked: 0, unmatchedLabels: ["mango"] });

    await expect(DetectionService.confirmInventory(SCAN_ID, "user-1")).rejects.toThrow(
      "No matching inventory products found for: mango",
    );
    expect(repo.applyInventoryChange).not.toHaveBeenCalled();
  });

  it("rejects a caller from another business", async () => {
    repo.getScanById.mockResolvedValue(analyzedScan as never);
    business.assertMember.mockRejectedValueOnce(new ForbiddenError("nope"));

    await expect(DetectionService.confirmInventory(SCAN_ID, "intruder")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(repo.applyInventoryChange).not.toHaveBeenCalled();
  });
});
