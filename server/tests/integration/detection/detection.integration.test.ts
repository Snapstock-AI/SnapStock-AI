import request from "supertest";
import app from "../../../src/app";
import { DetectionService } from "../../../src/modules/detection/detection.service";

jest.mock("../../../src/modules/detection/detection.service", () => ({
  DetectionService: {
    analyze: jest.fn(),
  },
}));

jest.mock("../../../src/shared/middleware/auth.middleware", () => ({
  authMiddleware: jest.fn((req, _res, next) => {
    req.user = {
      id: "user-123",
    };

    next();
  }),
}));

const mockedService = DetectionService as jest.Mocked<
  typeof DetectionService
>;

describe("POST /detection/analyze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully process a shelf image", async () => {
    const result = {
      scanId: "scan-123",

      image_width: 640,
      image_height: 480,

      total_count: 2,

      counts: {
        apple: {
          fresh: 1,
          rotten: 0,
          total: 1,
        },

        lemon: {
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

        {
          id: "detection-2",
          class_name: "Lemon",
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
    };

    mockedService.analyze.mockResolvedValue(result);

    const response = await request(app)
      .post("/detection/analyze")
      .field("businessId", "business-123")
      .field("shelfId", "shelf-123")
      .attach(
        "file",
        Buffer.from("fake-image"),
        "shelf.jpg"
      );

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      data: result,
    });

    expect(mockedService.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: "shelf.jpg",
        mimetype: "image/jpeg",
      }),
      "business-123",
      "shelf-123",
      "user-123"
    );
  });

  it("should return 400 when no image is uploaded", async () => {
    mockedService.analyze.mockRejectedValue(
      new Error("No image uploaded.")
    );

    const response = await request(app)
      .post("/detection/analyze")
      .field("businessId", "business-123")
      .field("shelfId", "shelf-123");

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "No image uploaded.",
    });

    expect(mockedService.analyze).toHaveBeenCalledWith(
      undefined,
      "business-123",
      "shelf-123",
      "user-123"
    );
  });

  it("should return 400 when business ID is missing", async () => {
    mockedService.analyze.mockRejectedValue(
      new Error("Business ID is required.")
    );

    const response = await request(app)
      .post("/detection/analyze")
      .field("shelfId", "shelf-123")
      .attach(
        "file",
        Buffer.from("fake-image"),
        "shelf.jpg"
      );

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "Business ID is required.",
    });

    expect(mockedService.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: "shelf.jpg",
        mimetype: "image/jpeg",
      }),
      undefined,
      "shelf-123",
      "user-123"
    );
  });

  it("should return 400 when shelf ID is missing", async () => {
    mockedService.analyze.mockRejectedValue(
      new Error("Shelf ID is required.")
    );

    const response = await request(app)
      .post("/detection/analyze")
      .field("businessId", "business-123")
      .attach(
        "file",
        Buffer.from("fake-image"),
        "shelf.jpg"
      );

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "Shelf ID is required.",
    });

    expect(mockedService.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: "shelf.jpg",
        mimetype: "image/jpeg",
      }),
      "business-123",
      undefined,
      "user-123"
    );
  });

  it("should return 400 when the scanning service fails", async () => {
    mockedService.analyze.mockRejectedValue(
      new Error("AI service unavailable")
    );

    const response = await request(app)
      .post("/detection/analyze")
      .field("businessId", "business-123")
      .field("shelfId", "shelf-123")
      .attach(
        "file",
        Buffer.from("fake-image"),
        "shelf.jpg"
      );

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "AI service unavailable",
    });

    expect(mockedService.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: "shelf.jpg",
        mimetype: "image/jpeg",
      }),
      "business-123",
      "shelf-123",
      "user-123"
    );
  });
});