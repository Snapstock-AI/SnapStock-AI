import axios from "axios";

import { DetectionService } from "../../../src/modules/detection/detection.service";
import { DetectionRepository } from "../../../src/modules/detection/detection.repository";

jest.mock("axios");

jest.mock("../../../src/modules/detection/detection.repository", () => ({
  DetectionRepository: {
    createScan: jest.fn(),
    updateScanStatus: jest.fn(),
    findProductByName: jest.fn(),
    createDetection: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockedRepository = DetectionRepository as jest.Mocked<
  typeof DetectionRepository
>;

describe("DetectionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.AI_SERVICE_URL = "http://ai-service";
  });

 
  describe("Input validation", () => {
    it("should throw an error when no image is uploaded", async () => {
      await expect(
        DetectionService.analyze(
          undefined,
          "business-123",
          "shelf-123",
          "user-123"
        )
      ).rejects.toThrow("No image uploaded.");

      expect(
        mockedRepository.createScan
      ).not.toHaveBeenCalled();
    });

    it("should throw an error when business ID is missing", async () => {
      const file = {
        buffer: Buffer.from("test"),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
      } as Express.Multer.File;

      await expect(
        DetectionService.analyze(
          file,
          "",
          "shelf-123",
          "user-123"
        )
      ).rejects.toThrow("Business ID is required.");

      expect(
        mockedRepository.createScan
      ).not.toHaveBeenCalled();
    });

    it("should throw an error when shelf ID is missing", async () => {
      const file = {
        buffer: Buffer.from("test"),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
      } as Express.Multer.File;

      await expect(
        DetectionService.analyze(
          file,
          "business-123",
          "",
          "user-123"
        )
      ).rejects.toThrow("Shelf ID is required.");

      expect(
        mockedRepository.createScan
      ).not.toHaveBeenCalled();
    });

    it("should throw an error when user ID is missing", async () => {
      const file = {
        buffer: Buffer.from("test"),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
      } as Express.Multer.File;

      await expect(
        DetectionService.analyze(
          file,
          "business-123",
          "shelf-123",
          ""
        )
      ).rejects.toThrow("User ID is required.");

      expect(
        mockedRepository.createScan
      ).not.toHaveBeenCalled();
    });
  });


  describe("Successful scan", () => {
    it("should process AI detections and complete the scan", async () => {
      const file = {
        buffer: Buffer.from("fake-image"),
        originalname: "shelf.jpg",
        mimetype: "image/jpeg",
      } as Express.Multer.File;

      
      mockedRepository.createScan.mockResolvedValue({
        id: "scan-123",
      });

     
      mockedRepository.updateScanStatus.mockResolvedValue({
        id: "scan-123",
        status: "PROCESSING",
      });

      
      mockedRepository.findProductByName
        .mockResolvedValueOnce({
          id: "product-apple",
        })
        .mockResolvedValueOnce(null);

      
      mockedRepository.createDetection
        .mockResolvedValueOnce({
          id: "detection-1",
          product_label: "Apple",
          confidence: 0.95,
          bbox_json: {
            x1: 10,
            y1: 20,
            x2: 100,
            y2: 200,
          },
          freshness: "Fresh",
          freshness_confidence: 0.9,
        })
        .mockResolvedValueOnce({
          id: "detection-2",
          product_label: "Banana",
          confidence: 0.88,
          bbox_json: {
            x1: 120,
            y1: 30,
            x2: 200,
            y2: 220,
          },
          freshness: "Spoiled",
          freshness_confidence: 0.8,
        });

    
      mockedAxios.post.mockResolvedValue({
        data: {
          image_width: 640,
          image_height: 480,
          total_count: 2,

          counts: {
            Apple: 1,
            Banana: 1,
          },

          detections: [
            {
              class_name: "Apple",
              confidence: 0.95,

              bounding_box: {
                x1: 10,
                y1: 20,
                x2: 100,
                y2: 200,
              },

              freshness: "good",
              freshness_confidence: 0.9,
            },

            {
              class_name: "Banana",
              confidence: 0.88,

              bounding_box: {
                x1: 120,
                y1: 30,
                x2: 200,
                y2: 220,
              },

              freshness: "bad",
              freshness_confidence: 0.8,
            },
          ],
        },
      });

     
      const result = await DetectionService.analyze(
        file,
        "business-123",
        "shelf-123",
        "user-123"
      );

      
      expect(
        mockedRepository.createScan
      ).toHaveBeenCalledWith(
        "business-123",
        "shelf-123",
        "user-123"
      );

      
      expect(
        mockedRepository.updateScanStatus
      ).toHaveBeenCalledWith(
        "scan-123",
        "PROCESSING"
      );

      
      expect(
        mockedAxios.post
      ).toHaveBeenCalledWith(
        "http://ai-service/analyze",
        expect.anything(),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );

      
      expect(
        mockedRepository.findProductByName
      ).toHaveBeenNthCalledWith(
        1,
        "business-123",
        "Apple"
      );

      expect(
        mockedRepository.findProductByName
      ).toHaveBeenNthCalledWith(
        2,
        "business-123",
        "Banana"
      );

     

      expect(
        mockedRepository.createDetection
      ).toHaveBeenNthCalledWith(
        1,
        "scan-123",
        "Apple",
        "product-apple",
        0.95,
        {
          x1: 10,
          y1: 20,
          x2: 100,
          y2: 200,
        },
        "Fresh",
        0.9
      );

      expect(
        mockedRepository.createDetection
      ).toHaveBeenNthCalledWith(
        2,
        "scan-123",
        "Banana",
        null,
        0.88,
        {
          x1: 120,
          y1: 30,
          x2: 200,
          y2: 220,
        },
        "Spoiled",
        0.8
      );

      
      expect(
        mockedRepository.updateScanStatus
      ).toHaveBeenLastCalledWith(
        "scan-123",
        "COMPLETED"
      );

      // --------------------------------------------------------
      // Verify final result
      // --------------------------------------------------------

      expect(result).toEqual({
        scanId: "scan-123",

        image_width: 640,
        image_height: 480,

        total_count: 2,

        counts: {
          Apple: 1,
          Banana: 1,
        },

        detections: [
          {
            id: "detection-1",
            class_name: "Apple",
            confidence: 0.95,

            bounding_box: {
              x1: 10,
              y1: 20,
              x2: 100,
              y2: 200,
            },

            freshness: "Fresh",
            freshness_confidence: 0.9,
            freshness_confidence_percent: 90,
          },

          {
            id: "detection-2",
            class_name: "Banana",
            confidence: 0.88,

            bounding_box: {
              x1: 120,
              y1: 30,
              x2: 200,
              y2: 220,
            },

            freshness: "Spoiled",
            freshness_confidence: 0.8,
            freshness_confidence_percent: 80,
          },
        ],
      });
    });
  });

 
  describe("Failure handling", () => {
    it("should mark the scan as FAILED when the AI service fails", async () => {
      const file = {
        buffer: Buffer.from("fake-image"),
        originalname: "shelf.jpg",
        mimetype: "image/jpeg",
      } as Express.Multer.File;

     
      mockedRepository.createScan.mockResolvedValue({
        id: "scan-456",
      });

    
      mockedRepository.updateScanStatus.mockResolvedValue({
        id: "scan-456",
        status: "PROCESSING",
      });

    
      mockedAxios.post.mockRejectedValue(
        new Error("AI service unavailable")
      );

     
      await expect(
        DetectionService.analyze(
          file,
          "business-123",
          "shelf-123",
          "user-123"
        )
      ).rejects.toThrow(
        "AI service unavailable"
      );

      
      expect(
        mockedRepository.createScan
      ).toHaveBeenCalledWith(
        "business-123",
        "shelf-123",
        "user-123"
      );

     

      expect(
        mockedRepository.updateScanStatus
      ).toHaveBeenCalledWith(
        "scan-456",
        "PROCESSING"
      );

   
      expect(
        mockedRepository.updateScanStatus
      ).toHaveBeenLastCalledWith(
        "scan-456",
        "FAILED",
        "AI service unavailable"
      );
    });
  });
});