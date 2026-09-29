/**
 * Shelf scan end to end through the backend: HTTP -> JWT auth middleware -> DetectionController
 * -> BusinessService membership check -> DetectionService -> AI service -> response.
 * Only the edges are faked: the database repositories and the HTTP call to the AI service,
 * which answers with the shared contract sample (contracts/analyze-response.sample.json).
 * SRS: FR-SCAN-004, FR-FRESH-001/003, FR-INV-002, NFR-SEC-003 (tenant isolation).
 */
import fs from "fs";
import path from "path";
import axios from "axios";
import jwt from "jsonwebtoken";
import request from "supertest";

import app from "../../../src/app";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import { BusinessRepository } from "../../../src/modules/business/business.repository";
import { DetectionRepository } from "../../../src/modules/detection/detection.repository";
import type { AIAnalysisResponse } from "../../../src/modules/detection/detection.types";


jest.mock("../../../src/config/db", () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock("axios");
jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: { findActiveSessionById: jest.fn() },
}));
jest.mock("../../../src/modules/business/business.repository", () => ({
  BusinessRepository: { isMember: jest.fn() },
}));
jest.mock("../../../src/modules/detection/detection.repository", () => ({
  DetectionRepository: {
    createScan: jest.fn(),
    updateScanStatus: jest.fn(),
    findOrCreateProduct: jest.fn(),
    findProductByName: jest.fn(),
    createDetection: jest.fn(),
    applyInventoryChange: jest.fn(),
    findForCorrection: jest.fn(),
    correctFreshness: jest.fn(),
  },
}));

const JWT_SECRET = "scan-integration-secret";
const AI_SERVICE_URL = "http://ai-service.test";
const SAMPLE_PATH = path.resolve(__dirname, "../../../../contracts/analyze-response.sample.json");
const aiSample: AIAnalysisResponse = JSON.parse(fs.readFileSync(SAMPLE_PATH, "utf8"));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const authRepo = AuthRepository as jest.Mocked<typeof AuthRepository>;
const businessRepo = BusinessRepository as jest.Mocked<typeof BusinessRepository>;
const detectionRepo = DetectionRepository as jest.Mocked<typeof DetectionRepository>;

function tokenFor(overrides: Record<string, unknown> = {}, secret = JWT_SECRET) {
  return jwt.sign(
    {
      userId: "user-1",
      email: "owner@freshmart.com",
      system_role: "USER",
      sessionId: "session-1",
      businessId: "biz-1",
      businessRole: "OWNER",
      ...overrides,
    },
    secret,
  );
}

function analyze(fields: Record<string, string> = {}, token = tokenFor()) {
  const req = request(app).post("/detection/analyze").set("Authorization", `Bearer ${token}`);
  for (const [name, value] of Object.entries({ businessId: "biz-1", shelfId: "shelf-1", ...fields })) {
    req.field(name, value);
  }
  return req.attach("file", Buffer.from("fake-image-bytes"), {
    filename: "shelf.jpg",
    contentType: "image/jpeg",
  });
}

const INVENTORY_CHANGES = [
  { productId: "product-apple", product: "apple", detected: 2, currentQuantity: 5, quantity: 7 },
  { productId: "product-orange", product: "orange", detected: 1, currentQuantity: 0, quantity: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.AI_SERVICE_URL = AI_SERVICE_URL;

  authRepo.findActiveSessionById.mockResolvedValue({
    id: "session-1",
    user_id: "user-1",
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  } as never);
  businessRepo.isMember.mockResolvedValue(true);
  mockedAxios.post.mockResolvedValue({ data: aiSample });

  detectionRepo.createScan.mockResolvedValue({ id: "scan-1" } as never);
  detectionRepo.updateScanStatus.mockResolvedValue(undefined as never);
  detectionRepo.findOrCreateProduct.mockImplementation(async (_businessId, name) => ({ id: `product-${name}` }) as never);
  detectionRepo.findProductByName.mockImplementation(async (_businessId, name) => ({ id: `product-${name}` }) as never);
  // Echo back what the service saves, stored the way PostgreSQL returns it
  // (numeric columns as strings, bounding box as JSON text).
  let saved = 0;
  detectionRepo.createDetection.mockImplementation(
    async (_scanId, label, _productId, confidence, bbox, freshness, freshnessConfidence) =>
      ({
        id: `detection-${++saved}`,
        product_label: label,
        confidence: String(confidence),
        bbox_json: JSON.stringify(bbox),
        freshness,
        freshness_confidence: String(freshnessConfidence),
      }) as never,
  );
  detectionRepo.applyInventoryChange.mockResolvedValue(INVENTORY_CHANGES as never);
});

afterEach(() => jest.restoreAllMocks());

describe("POST /detection/analyze: successful scans", () => {
  it("turns the AI service response into the scan result the frontend reads", async () => {
    const response = await analyze();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const data = response.body.data;
    expect(data).toMatchObject({
      scanId: "scan-1",
      image_width: aiSample.image_width,
      image_height: aiSample.image_height,
      total_count: aiSample.total_count,
      counts: aiSample.counts,
      inventoryChanges: INVENTORY_CHANGES,
    });
    expect(data.detections).toHaveLength(aiSample.detections.length);
    data.detections.forEach((detection: Record<string, any>, index: number) => {
      const fromAi = aiSample.detections[index];
      expect(detection.id).toBe(`detection-${index + 1}`);
      expect(detection.class_name).toBe(fromAi.class_name);
      expect(detection.confidence).toBe(fromAi.confidence);
      expect(detection.bounding_box).toEqual(fromAi.bounding_box);
      expect(detection.freshness_confidence).toBe(fromAi.freshness_confidence);
      expect(detection.freshness_confidence_percent).toBeCloseTo(fromAi.freshness_confidence * 100);
    });
  });

  it("maps the AI's good/bad freshness labels to Fresh/Spoiled before saving and returning them", async () => {
    const response = await analyze();

    expect(aiSample.detections.map((d) => d.freshness)).toEqual(["good", "bad", "good"]);
    expect(response.body.data.detections.map((d: { freshness: string }) => d.freshness)).toEqual([
      "Fresh",
      "Spoiled",
      "Fresh",
    ]);
    expect(detectionRepo.createDetection.mock.calls.map((call) => call[5])).toEqual(["Fresh", "Spoiled", "Fresh"]);
  });

  it("forwards the uploaded image to the AI service as multipart form data", async () => {
    await analyze();

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, form, config] = mockedAxios.post.mock.calls[0] as [string, { getBuffer(): Buffer }, { headers: Record<string, string> }];
    expect(url).toBe(`${AI_SERVICE_URL}/analyze`);
    expect(config.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    const body = form.getBuffer().toString();
    expect(body).toContain('filename="shelf.jpg"');
    expect(body).toContain("Content-Type: image/jpeg");
    expect(body).toContain("fake-image-bytes");
  });

  it("records the scan for the signed-in user and business, then applies the stock change", async () => {
    await analyze();

    expect(detectionRepo.createScan).toHaveBeenCalledWith("biz-1", "shelf-1", "user-1", "STOCK_IN");
    expect(detectionRepo.updateScanStatus).toHaveBeenCalledWith("scan-1", "PROCESSING");
    expect(detectionRepo.updateScanStatus).not.toHaveBeenCalledWith("scan-1", "FAILED", expect.anything());
    expect(detectionRepo.findOrCreateProduct).toHaveBeenCalledWith("biz-1", "apple");
    expect(detectionRepo.findOrCreateProduct).toHaveBeenCalledWith("biz-1", "orange");
    expect(detectionRepo.applyInventoryChange).toHaveBeenCalledWith("scan-1", "biz-1", "STOCK_IN");
  });

  it("Remove Stock only matches existing products and never creates new ones", async () => {
    const response = await analyze({ scanMode: "STOCK_OUT" });

    expect(response.status).toBe(200);
    expect(detectionRepo.createScan).toHaveBeenCalledWith("biz-1", "shelf-1", "user-1", "STOCK_OUT");
    expect(detectionRepo.findProductByName).toHaveBeenCalledTimes(aiSample.detections.length);
    expect(detectionRepo.findOrCreateProduct).not.toHaveBeenCalled();
    expect(detectionRepo.applyInventoryChange).toHaveBeenCalledWith("scan-1", "biz-1", "STOCK_OUT");
  });

  it("returns an empty inventory change list when nothing changed", async () => {
    detectionRepo.applyInventoryChange.mockResolvedValue(undefined as never);

    const response = await analyze();

    expect(response.status).toBe(200);
    expect(response.body.data.inventoryChanges).toEqual([]);
  });
});

describe("POST /detection/analyze: failed scans", () => {
  it("reports an unreachable AI service and marks the scan FAILED", async () => {
    mockedAxios.post.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8000"));

    const response = await analyze();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: "connect ECONNREFUSED 127.0.0.1:8000" });
    expect(detectionRepo.updateScanStatus).toHaveBeenCalledWith(
      "scan-1",
      "FAILED",
      "connect ECONNREFUSED 127.0.0.1:8000",
    );
    expect(detectionRepo.createDetection).not.toHaveBeenCalled();
    expect(detectionRepo.applyInventoryChange).not.toHaveBeenCalled();
  });

  it("refuses to remove stock that was never added, and leaves inventory untouched", async () => {
    detectionRepo.findProductByName.mockResolvedValue(null as never);

    const response = await analyze({ scanMode: "STOCK_OUT" });

    const message =
      "No matching inventory products found for: apple, orange. Add stock first before removing.";
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message });
    expect(detectionRepo.updateScanStatus).toHaveBeenCalledWith("scan-1", "FAILED", message);
    expect(detectionRepo.applyInventoryChange).not.toHaveBeenCalled();
  });

  it("rejects an unknown scan mode before doing any work", async () => {
    const response = await analyze({ scanMode: "STOCK_SIDEWAYS" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: "Invalid scan mode." });
    expect(detectionRepo.createScan).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("rejects a request without an image and does not create a scan", async () => {
    const response = await request(app)
      .post("/detection/analyze")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .field("businessId", "biz-1")
      .field("shelfId", "shelf-1");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: "No image uploaded." });
    expect(detectionRepo.createScan).not.toHaveBeenCalled();
  });
});

describe("POST /detection/analyze: access control", () => {
  it("rejects a request with no token", async () => {
    const response = await request(app)
      .post("/detection/analyze")
      .field("businessId", "biz-1")
      .field("shelfId", "shelf-1")
      .attach("file", Buffer.from("fake-image-bytes"), "shelf.jpg");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: "No token provided" });
    expect(detectionRepo.createScan).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("rejects a token that was not signed by this server", async () => {
    const response = await analyze({}, tokenFor({}, "someone-elses-secret"));

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: "Invalid or expired token" });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("rejects a token whose session was revoked (for example after logout)", async () => {
    authRepo.findActiveSessionById.mockResolvedValue(null);

    const response = await analyze();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: "Session expired or revoked" });
    expect(authRepo.findActiveSessionById).toHaveBeenCalledWith("session-1");
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("stops a user from scanning into a business they do not belong to", async () => {
    businessRepo.isMember.mockResolvedValue(false);

    const response = await analyze({ businessId: "someone-elses-business" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: "You do not belong to this business" });
    expect(businessRepo.isMember).toHaveBeenCalledWith("user-1", "someone-elses-business");
    expect(detectionRepo.createScan).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

describe("PATCH /detection/:detectionId/freshness (manual correction)", () => {
  beforeEach(() => {
    detectionRepo.findForCorrection.mockResolvedValue({
      entities: [{ id: "detection-1" }],
      raw: [{ scan_business_id: "biz-1" }],
    } as never);
    detectionRepo.correctFreshness.mockResolvedValue({ id: "detection-1", corrected_freshness: "Medium" } as never);
  });

  function correct(freshness: unknown) {
    return request(app)
      .patch("/detection/detection-1/freshness")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ freshness });
  }

  it("saves a member's correction and returns the new state", async () => {
    const response = await correct("Medium");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { id: "detection-1", freshness: "Medium", corrected_freshness: "Medium" },
    });
    expect(detectionRepo.correctFreshness).toHaveBeenCalledWith("detection-1", "Medium", "user-1");
  });

  it("only accepts Fresh, Medium or Spoiled", async () => {
    const response = await correct("good");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Freshness must be Fresh, Medium, or Spoiled.");
    expect(detectionRepo.correctFreshness).not.toHaveBeenCalled();
  });

  it("stops a user from correcting another business's detection", async () => {
    businessRepo.isMember.mockResolvedValue(false);

    const response = await correct("Spoiled");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("You do not belong to this business.");
    expect(businessRepo.isMember).toHaveBeenCalledWith("user-1", "biz-1");
    expect(detectionRepo.correctFreshness).not.toHaveBeenCalled();
  });
});
