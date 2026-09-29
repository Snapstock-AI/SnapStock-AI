/**
 * How the backend turns the AI service's /analyze response into saved detections
 * and the API result the client renders, plus freshness correction and history.
 * SRS: FR-SCAN-004, FR-DET-002, FR-FRESH-001, FR-FRESH-003, FR-INV-002.
 *
 * Input validation and the basic success/failure paths are covered in
 * detection.service.test.ts.
 */
import axios from "axios";

import { BusinessService } from "../../../src/modules/business/business.service";
import { DetectionRepository } from "../../../src/modules/detection/detection.repository";
import { DetectionService } from "../../../src/modules/detection/detection.service";

jest.mock("axios");
jest.mock("../../../src/modules/detection/detection.repository", () => ({
  DetectionRepository: {
    createScan: jest.fn(),
    updateScanStatus: jest.fn(),
    findProductByName: jest.fn(),
    findOrCreateProduct: jest.fn(),
    createDetection: jest.fn(),
    applyInventoryChange: jest.fn(),
    findForCorrection: jest.fn(),
    correctFreshness: jest.fn(),
    findScanHistory: jest.fn(),
  },
}));
jest.mock("../../../src/modules/business/business.service", () => ({
  BusinessService: { assertMember: jest.fn(), isMember: jest.fn() },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const repo = DetectionRepository as jest.Mocked<typeof DetectionRepository>;
const business = BusinessService as jest.Mocked<typeof BusinessService>;

const FILE = {
  buffer: Buffer.from("image"),
  originalname: "shelf.jpg",
  mimetype: "image/jpeg",
} as Express.Multer.File;

function aiDetection(overrides: Record<string, unknown> = {}) {
  return {
    class_name: "apple",
    confidence: 0.9,
    bounding_box: { x1: 10, y1: 20, x2: 110, y2: 220 },
    freshness: "good",
    freshness_confidence: 0.85,
    freshness_confidence_percent: 85,
    ...overrides,
  };
}

/** Makes the AI service return these detections. */
function aiReturns(detections: object[], extra: Record<string, unknown> = {}) {
  mockedAxios.post.mockResolvedValue({
    data: {
      image_width: 640,
      image_height: 480,
      total_count: detections.length,
      counts: {},
      detections,
      ...extra,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  process.env.AI_SERVICE_URL = "http://ai-service";

  repo.createScan.mockResolvedValue({ id: "scan-1" } as never);
  repo.findOrCreateProduct.mockResolvedValue({ id: "product-1" } as never);
  repo.findProductByName.mockResolvedValue({ id: "product-1" } as never);
  repo.applyInventoryChange.mockResolvedValue([]);
  // Echo what the service asked to save, the way the database row would come back.
  repo.createDetection.mockImplementation(
    async (_scanId, label, _productId, confidence, bbox, freshness, freshnessConfidence) =>
      ({
        id: `detection-${label}`,
        product_label: label,
        confidence: String(confidence),
        bbox_json: bbox,
        freshness,
        freshness_confidence: String(freshnessConfidence),
      }) as never,
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("freshness mapping from the AI label to the stored class", () => {
  it.each([
    ["good", "Fresh"],
    ["GOOD", "Fresh"],
    ["fresh", "Fresh"],
    ["medium", "Medium"],
    ["ripe", "Medium"],
    ["bad", "Spoiled"],
    ["spoiled", "Spoiled"],
    ["rotten", "Spoiled"],
    ["unknown-label", "UNKNOWN"],
    ["", "UNKNOWN"],
    [null, "UNKNOWN"],
  ])("AI freshness %p is stored as %p", async (aiValue, stored) => {
    aiReturns([aiDetection({ freshness: aiValue })]);

    const result = await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(repo.createDetection.mock.calls[0][5]).toBe(stored);
    expect(result.detections[0].freshness).toBe(stored);
  });
});

describe("the saved detection and the API result", () => {
  it("stores label, product, confidence, box and freshness confidence exactly as the AI returned them", async () => {
    aiReturns([aiDetection()]);

    await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(repo.createDetection).toHaveBeenCalledWith(
      "scan-1",
      "apple",
      "product-1",
      0.9,
      { x1: 10, y1: 20, x2: 110, y2: 220 },
      "Fresh",
      0.85,
    );
  });

  it("returns numbers (not database strings) and a percentage equal to freshness_confidence x 100", async () => {
    aiReturns([aiDetection({ freshness_confidence: 0.73 })]);

    const { detections } = await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(detections[0]).toMatchObject({
      id: "detection-apple",
      class_name: "apple",
      confidence: 0.9,
      freshness_confidence: 0.73,
    });
    expect(detections[0].freshness_confidence_percent).toBeCloseTo(73);
  });

  it("parses a bounding box that the database returned as a JSON string", async () => {
    aiReturns([aiDetection()]);
    repo.createDetection.mockResolvedValueOnce({
      id: "d1",
      product_label: "apple",
      confidence: "0.9",
      bbox_json: JSON.stringify({ x1: 1, y1: 2, x2: 3, y2: 4 }),
      freshness: "Fresh",
      freshness_confidence: "0.8",
    } as never);

    const { detections } = await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(detections[0].bounding_box).toEqual({ x1: 1, y1: 2, x2: 3, y2: 4 });
  });

  it("passes the image size, total count and per-class counts through unchanged", async () => {
    const counts = { apple: { fresh: 1, rotten: 1, total: 2 } };
    aiReturns([aiDetection(), aiDetection({ freshness: "bad" })], { counts, image_width: 800, image_height: 600 });

    const result = await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(result).toMatchObject({
      scanId: "scan-1",
      image_width: 800,
      image_height: 600,
      total_count: 2,
      counts,
    });
    expect(result.detections).toHaveLength(2);
  });

  it("includes the inventory changes, or an empty list when there are none", async () => {
    aiReturns([aiDetection()]);
    const change = { productId: "product-1", product: "apple", detected: 1, currentQuantity: 10, quantity: 11 };
    repo.applyInventoryChange.mockResolvedValueOnce([change]).mockResolvedValueOnce(undefined as never);

    const first = await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");
    const second = await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(first.inventoryChanges).toEqual([change]);
    expect(second.inventoryChanges).toEqual([]);
  });

  it("handles an image with no detections: nothing saved, empty result, scan still completes", async () => {
    aiReturns([]);

    const result = await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(repo.createDetection).not.toHaveBeenCalled();
    expect(result).toMatchObject({ total_count: 0, detections: [], inventoryChanges: [] });
    expect(repo.applyInventoryChange).toHaveBeenCalledWith("scan-1", "biz-1", "STOCK_IN");
    expect(repo.updateScanStatus).not.toHaveBeenCalledWith("scan-1", "FAILED", expect.anything());
  });

  it("sends the uploaded image to the AI service's /analyze endpoint", async () => {
    aiReturns([]);

    await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "http://ai-service/analyze",
      expect.anything(),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});

describe("scan modes", () => {
  it("STOCK_IN (the default) creates unknown products so the stock can be added", async () => {
    aiReturns([aiDetection({ class_name: "mango" })]);

    await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(repo.createScan).toHaveBeenCalledWith("biz-1", "shelf-1", "user-1", "STOCK_IN");
    expect(repo.findOrCreateProduct).toHaveBeenCalledWith("biz-1", "mango");
    expect(repo.findProductByName).not.toHaveBeenCalled();
    expect(repo.applyInventoryChange).toHaveBeenCalledWith("scan-1", "biz-1", "STOCK_IN");
  });

  it("STOCK_OUT only looks up existing products and never creates one", async () => {
    aiReturns([aiDetection()]);

    await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1", "STOCK_OUT");

    expect(repo.createScan).toHaveBeenCalledWith("biz-1", "shelf-1", "user-1", "STOCK_OUT");
    expect(repo.findProductByName).toHaveBeenCalledWith("biz-1", "apple");
    expect(repo.findOrCreateProduct).not.toHaveBeenCalled();
    expect(repo.applyInventoryChange).toHaveBeenCalledWith("scan-1", "biz-1", "STOCK_OUT");
  });

  it("STOCK_OUT saves an unmatched item without a product link when other items match", async () => {
    aiReturns([aiDetection({ class_name: "apple" }), aiDetection({ class_name: "kiwi" })]);
    repo.findProductByName.mockImplementation(async (_biz, name) =>
      (name === "apple" ? { id: "product-apple" } : null) as never,
    );

    await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1", "STOCK_OUT");

    expect(repo.createDetection.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      ["apple", "product-apple"],
      ["kiwi", null],
    ]);
    expect(repo.applyInventoryChange).toHaveBeenCalled();
  });

  it("STOCK_OUT with no matching product fails the scan and changes no stock", async () => {
    aiReturns([aiDetection({ class_name: "kiwi" }), aiDetection({ class_name: "kiwi" })]);
    repo.findProductByName.mockResolvedValue(null);

    await expect(
      DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1", "STOCK_OUT"),
    ).rejects.toThrow("No matching inventory products found for: kiwi. Add stock first before removing.");

    expect(repo.applyInventoryChange).not.toHaveBeenCalled();
    expect(repo.updateScanStatus).toHaveBeenCalledWith("scan-1", "FAILED", expect.stringContaining("kiwi"));
  });

  it("marks the scan PROCESSING before calling the AI service", async () => {
    aiReturns([]);

    await DetectionService.analyze(FILE, "biz-1", "shelf-1", "user-1");

    expect(repo.updateScanStatus).toHaveBeenCalledWith("scan-1", "PROCESSING");
    expect(repo.updateScanStatus.mock.invocationCallOrder[0]).toBeLessThan(
      mockedAxios.post.mock.invocationCallOrder[0],
    );
  });
});

describe("correctFreshness (manual correction, FR-FRESH-003)", () => {
  function detectionIn(businessId: string | undefined) {
    repo.findForCorrection.mockResolvedValue({
      entities: businessId ? [{ id: "d1" }] : [],
      raw: businessId ? [{ scan_business_id: businessId }] : [],
    } as never);
  }

  it.each(["Fresh", "Medium", "Spoiled"])("a member can correct a detection to %s", async (value) => {
    detectionIn("biz-1");
    business.isMember.mockResolvedValue(true);
    repo.correctFreshness.mockResolvedValue({ id: "d1", freshness: value } as never);

    await expect(DetectionService.correctFreshness("user-1", "d1", value)).resolves.toEqual({
      id: "d1",
      freshness: value,
    });
    expect(repo.correctFreshness).toHaveBeenCalledWith("d1", value, "user-1");
  });

  it.each(["fresh", "good", "UNKNOWN", ""])("rejects the value %p before touching the database", async (value) => {
    await expect(DetectionService.correctFreshness("user-1", "d1", value)).rejects.toThrow(
      "Freshness must be Fresh, Medium, or Spoiled.",
    );
    expect(repo.findForCorrection).not.toHaveBeenCalled();
  });

  it("reports an unknown detection", async () => {
    detectionIn(undefined);

    await expect(DetectionService.correctFreshness("user-1", "missing", "Fresh")).rejects.toThrow(
      "Detection not found.",
    );
    expect(repo.correctFreshness).not.toHaveBeenCalled();
  });

  it("refuses to correct another business's detection", async () => {
    detectionIn("other-biz");
    business.isMember.mockResolvedValue(false);

    await expect(DetectionService.correctFreshness("user-1", "d1", "Spoiled")).rejects.toThrow(
      "You do not belong to this business.",
    );
    expect(business.isMember).toHaveBeenCalledWith("user-1", "other-biz");
    expect(repo.correctFreshness).not.toHaveBeenCalled();
  });
});

describe("history", () => {
  const start = new Date("2026-09-01");
  const end = new Date("2026-09-30");

  it("checks membership, then returns the business's scan history for the date range", async () => {
    business.assertMember.mockResolvedValue(undefined);
    repo.findScanHistory.mockResolvedValue([{ id: "scan-1" }] as never);

    await expect(DetectionService.history("user-1", "biz-1", start, end)).resolves.toEqual([{ id: "scan-1" }]);
    expect(business.assertMember).toHaveBeenCalledWith("user-1", "biz-1");
    expect(repo.findScanHistory).toHaveBeenCalledWith("biz-1", start, end);
  });

  it("does not read history for a non-member", async () => {
    business.assertMember.mockRejectedValue(new Error("You do not belong to this business"));

    await expect(DetectionService.history("user-1", "biz-1", start, end)).rejects.toThrow(
      "You do not belong to this business",
    );
    expect(repo.findScanHistory).not.toHaveBeenCalled();
  });
});
