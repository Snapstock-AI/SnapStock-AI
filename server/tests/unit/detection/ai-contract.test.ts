/**
 * Contract between the AI service's /analyze response and the backend.
 * contracts/analyze-response.sample.json is also validated against the AI service's
 * Pydantic AnalysisResponse model (ai-service/tests/api/test_analyze_contract.py),
 * so a field renamed on either side makes one of the two suites fail.
 */
import fs from "fs";
import path from "path";
import axios from "axios";

import { DetectionRepository } from "../../../src/modules/detection/detection.repository";
import { DetectionService } from "../../../src/modules/detection/detection.service";
import type { AIAnalysisResponse } from "../../../src/modules/detection/detection.types";

jest.mock("axios");
jest.mock("../../../src/modules/detection/detection.repository", () => ({
  DetectionRepository: {
    createScan: jest.fn(),
    updateScanStatus: jest.fn(),
    findProductByName: jest.fn(),
    findOrCreateProduct: jest.fn(),
    createDetection: jest.fn(),
    applyInventoryChange: jest.fn(),
  },
}));
jest.mock("../../../src/modules/business/business.service", () => ({
  BusinessService: { assertMember: jest.fn(), isMember: jest.fn() },
}));

const SAMPLE_PATH = path.resolve(__dirname, "../../../../contracts/analyze-response.sample.json");
const sample: AIAnalysisResponse = JSON.parse(fs.readFileSync(SAMPLE_PATH, "utf8"));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const repo = DetectionRepository as jest.Mocked<typeof DetectionRepository>;

/** Freshness labels the backend's mapping understands (anything else becomes UNKNOWN). */
const UNDERSTOOD_FRESHNESS = ["good", "fresh", "medium", "ripe", "bad", "spoiled", "rotten"];

describe("AI /analyze response contract (backend side)", () => {
  it("the sample has exactly the top-level fields the backend reads", () => {
    expect(Object.keys(sample).sort()).toEqual(
      ["counts", "detections", "image_height", "image_width", "total_count"].sort(),
    );
  });

  it("every detection has the fields the backend reads", () => {
    for (const detection of sample.detections) {
      expect(detection).toEqual(
        expect.objectContaining({
          class_name: expect.any(String),
          confidence: expect.any(Number),
          bounding_box: {
            x1: expect.any(Number),
            y1: expect.any(Number),
            x2: expect.any(Number),
            y2: expect.any(Number),
          },
          freshness: expect.any(String),
          freshness_confidence: expect.any(Number),
          freshness_confidence_percent: expect.any(Number),
        }),
      );
    }
  });

  it("every freshness label the AI sends is one the backend can map", () => {
    for (const detection of sample.detections) {
      expect(UNDERSTOOD_FRESHNESS).toContain(detection.freshness.toLowerCase());
    }
  });

  it("the sample is internally consistent (counts, totals, confidences)", () => {
    expect(sample.total_count).toBe(sample.detections.length);
    for (const summary of Object.values(sample.counts)) {
      expect(summary.total).toBe(summary.fresh + summary.rotten);
    }
    for (const detection of sample.detections) {
      expect(detection.confidence).toBeGreaterThanOrEqual(0);
      expect(detection.confidence).toBeLessThanOrEqual(1);
      expect(detection.freshness_confidence_percent).toBeCloseTo(detection.freshness_confidence * 100);
    }
  });

  it("DetectionService turns the sample into the result shape the client renders", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    process.env.AI_SERVICE_URL = "http://ai-service";
    mockedAxios.post.mockResolvedValue({ data: sample });
    repo.createScan.mockResolvedValue({ id: "scan-1" } as never);
    repo.findOrCreateProduct.mockResolvedValue({ id: "product-1" } as never);
    repo.applyInventoryChange.mockResolvedValue([]);
    repo.createDetection.mockImplementation(
      async (_scan, label, _product, confidence, bbox, freshness, freshnessConfidence) =>
        ({
          id: `d-${label}`,
          product_label: label,
          confidence,
          bbox_json: bbox,
          freshness,
          freshness_confidence: freshnessConfidence,
        }) as never,
    );

    const result = await DetectionService.analyze(
      { buffer: Buffer.from("x"), originalname: "shelf.jpg", mimetype: "image/jpeg" } as Express.Multer.File,
      "biz-1",
      "shelf-1",
      "user-1",
    );

    // Same keys as client/src/lib/detection.ts DetectionResult.
    expect(Object.keys(result).sort()).toEqual(
      ["counts", "detections", "image_height", "image_width", "inventoryChanges", "scanId", "total_count"].sort(),
    );
    expect(result.detections.map((d) => d.freshness)).toEqual(["Fresh", "Spoiled", "Fresh"]);
    expect(result.counts).toEqual(sample.counts);
    jest.restoreAllMocks();
  });
});
