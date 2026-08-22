import db from "../../../src/config/db";
import { DetectionRepository } from "../../../src/modules/detection/detection.repository";

jest.mock("../../../src/config/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockQuery = db.query as jest.Mock;

describe("DetectionRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createScan", () => {
    it("should create a scan and return the created scan", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "scan-123",
          },
        ],
      });

      const result = await DetectionRepository.createScan(
        "business-123",
        "shelf-123",
        "user-123",
      );

      expect(result).toEqual({
        id: "scan-123",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO scans"),
        ["business-123", "shelf-123", "user-123"],
      );
    });
  });

  describe("updateScanStatus", () => {
    it("should update scan to PROCESSING", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "scan-123",
            status: "PROCESSING",
          },
        ],
      });

      const result = await DetectionRepository.updateScanStatus(
        "scan-123",
        "PROCESSING",
      );

      expect(result).toEqual({
        id: "scan-123",
        status: "PROCESSING",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE scans"),
        ["PROCESSING", null, "scan-123"],
      );
    });

    it("should update scan to FAILED with an error message", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "scan-123",
            status: "FAILED",
            error_message: "AI service unavailable",
          },
        ],
      });

      const result = await DetectionRepository.updateScanStatus(
        "scan-123",
        "FAILED",
        "AI service unavailable",
      );

      expect(result).toEqual({
        id: "scan-123",
        status: "FAILED",
        error_message: "AI service unavailable",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE scans"),
        ["FAILED", "AI service unavailable", "scan-123"],
      );
    });

    it("should set completed_at when scan is completed", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "scan-123",
            status: "COMPLETED",
          },
        ],
      });

      const result = await DetectionRepository.updateScanStatus(
        "scan-123",
        "COMPLETED",
      );

      expect(result).toEqual({
        id: "scan-123",
        status: "COMPLETED",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("completed_at = CURRENT_TIMESTAMP"),
        ["COMPLETED", "scan-123"],
      );
    });
  });

  describe("findProductByName", () => {
    it("should return the product when it exists", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "product-123",
          },
        ],
      });

      const result = await DetectionRepository.findProductByName(
        "business-123",
        "Apple",
      );

      expect(result).toEqual({
        id: "product-123",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT id"),
        ["business-123", "Apple"],
      );
    });

    it("should return null when the product does not exist", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await DetectionRepository.findProductByName(
        "business-123",
        "Unknown Product",
      );

      expect(result).toBeNull();
    });
  });

  describe("createDetection", () => {
    it("should create a detection", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "detection-123",
            scan_id: "scan-123",
            product_label: "Apple",
            product_id: "product-123",
            confidence: 0.95,
            freshness: "Fresh",
            freshness_confidence: 0.9,
          },
        ],
      });

      const bbox = {
        x1: 10,
        y1: 20,
        x2: 100,
        y2: 200,
      };

      const result = await DetectionRepository.createDetection(
        "scan-123",
        "Apple",
        "product-123",
        0.95,
        bbox,
        "Fresh",
        0.9,
      );

      expect(result).toEqual({
        id: "detection-123",
        scan_id: "scan-123",
        product_label: "Apple",
        product_id: "product-123",
        confidence: 0.95,
        freshness: "Fresh",
        freshness_confidence: 0.9,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO detections"),
        [
          "scan-123",
          "Apple",
          "product-123",
          0.95,
          JSON.stringify(bbox),
          "Fresh",
          0.9,
        ],
      );
    });

    it("should allow a detection without a matching product", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "detection-123",
            product_label: "Unknown Product",
            product_id: null,
          },
        ],
      });

      const result = await DetectionRepository.createDetection(
        "scan-123",
        "Unknown Product",
        null,
        0.8,
        {
          x1: 10,
          y1: 20,
          x2: 100,
          y2: 200,
        },
        "UNKNOWN",
        null,
      );

      expect(result.product_id).toBeNull();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO detections"),
        expect.arrayContaining(["scan-123", "Unknown Product", null, 0.8]),
      );
    });
  });
});
