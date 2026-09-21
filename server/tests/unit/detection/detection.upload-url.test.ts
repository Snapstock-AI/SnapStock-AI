import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { DetectionService } from "../../../src/modules/detection/detection.service";
import { DetectionRepository } from "../../../src/modules/detection/detection.repository";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock("../../../src/modules/detection/detection.repository", () => ({
  DetectionRepository: {
    createScan: jest.fn(),
    updateScanImageMetadata: jest.fn(),
  },
}));

const mockedGetSignedUrl = getSignedUrl as jest.MockedFunction<
  typeof getSignedUrl
>;
const mockedRepository = DetectionRepository as jest.Mocked<
  typeof DetectionRepository
>;

describe("DetectionService.createUploadUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.S3_PRESIGN_EXPIRY_SECONDS = "600";
    mockedRepository.createScan.mockResolvedValue({ id: "scan-123" });
    mockedRepository.updateScanImageMetadata.mockResolvedValue({
      id: "scan-123",
    });
    mockedGetSignedUrl.mockResolvedValue("http://signed-upload-url");
  });

  it("creates a pending scan and returns a signed S3 upload URL", async () => {
    const result = await DetectionService.createUploadUrl({
      businessId: "business-123",
      shelfId: "shelf-123",
      userId: "user-123",
      fileName: "shelf photo.jpg",
      contentType: "image/jpeg",
    });

    expect(mockedRepository.createScan).toHaveBeenCalledWith(
      "business-123",
      "shelf-123",
      "user-123"
    );
    expect(mockedRepository.updateScanImageMetadata).toHaveBeenCalledWith(
      "scan-123",
      "business-123/scan-123/shelf_photo.jpg",
      "image/jpeg",
      "shelf_photo.jpg"
    );
    expect(mockedGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 600 }
    );
    expect(result).toEqual({
      scanId: "scan-123",
      status: "PENDING",
      objectKey: "business-123/scan-123/shelf_photo.jpg",
      uploadUrl: "http://signed-upload-url",
      expiresInSeconds: 600,
    });
  });

  it("rejects unsupported image types before creating a scan", async () => {
    await expect(
      DetectionService.createUploadUrl({
        businessId: "business-123",
        shelfId: "shelf-123",
        userId: "user-123",
        fileName: "shelf.gif",
        contentType: "image/gif",
      })
    ).rejects.toThrow("Unsupported image type");

    expect(mockedRepository.createScan).not.toHaveBeenCalled();
  });
});