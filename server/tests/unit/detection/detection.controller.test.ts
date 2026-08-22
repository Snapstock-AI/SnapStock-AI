import { Response } from "express";
import { DetectionController } from "../../../src/modules/detection/detection.controller";
import { DetectionService } from "../../../src/modules/detection/detection.service";
import { AuthRequest } from "../../../src/shared/middleware/auth.middleware";

jest.mock("../../../src/modules/detection/detection.service", () => ({
  DetectionService: {
    analyze: jest.fn(),
  },
}));

const mockedService = DetectionService as jest.Mocked<
  typeof DetectionService
>;

describe("DetectionController", () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      file: {
        buffer: Buffer.from("fake-image"),
        originalname: "shelf.jpg",
        mimetype: "image/jpeg",
      } as Express.Multer.File,

      body: {
        businessId: "business-123",
        shelfId: "shelf-123",
      },

      user: {
        id: "user-123",
        userId: "user-123",
        email: "test@example.com",
        system_role: "BUSINESS_USER",
        sessionId: "session-123",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("analyze", () => {
    it("should return 401 when user is not authenticated", async () => {
      req.user = undefined;

      await DetectionController.analyze(
        req as AuthRequest,
        res as Response
      );

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
      });

      expect(mockedService.analyze).not.toHaveBeenCalled();
    });

    it("should call DetectionService and return 200 on success", async () => {
      const result = {
        scanId: "scan-123",

        image_width: 640,
        image_height: 480,

        total_count: 1,

        counts: {
          apple: {
            fresh: 1,
            rotten: 0,
            total: 1,
          },
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
        ],
      };

      mockedService.analyze.mockResolvedValue(result);

      await DetectionController.analyze(
        req as AuthRequest,
        res as Response
      );

      expect(mockedService.analyze).toHaveBeenCalledWith(
        req.file,
        "business-123",
        "shelf-123",
        "user-123"
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: result,
      });
    });

    it("should return 400 when DetectionService throws an error", async () => {
      mockedService.analyze.mockRejectedValue(
        new Error("AI service unavailable")
      );

      await DetectionController.analyze(
        req as AuthRequest,
        res as Response
      );

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "AI service unavailable",
      });
    });
  });
});