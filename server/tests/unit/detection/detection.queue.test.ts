import { DetectionService } from "../../../src/modules/detection/detection.service";
import { sqsClient } from "../../../src/config/aws";

jest.mock("../../../src/config/aws", () => ({
  analysisRequestQueueUrl: "https://sqs.ap-south-1.amazonaws.com/account/jobs",
  awsResourceNames: {
    bucket: "snapstock-ai-images-471547181436",
  },
  s3Client: {},
  sqsClient: {
    send: jest.fn(),
  },
}));

const mockedSqsClient = sqsClient as jest.Mocked<typeof sqsClient>;

describe("DetectionService.queueUploadedScan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSqsClient.send.mockResolvedValue({} as never);
  });

  it("publishes an IMAGE_UPLOADED event to the analysis queue", async () => {
    await DetectionService.queueUploadedScan({
      eventType: "IMAGE_UPLOADED",
      scanId: "scan-123",
      businessId: "business-123",
      shelfId: "shelf-123",
      userId: "user-123",
      bucket: "snapstock-ai-images-471547181436",
      objectKey: "business-123/scan-123/shelf.jpg",
      contentType: "image/jpeg",
      timestamp: "2026-09-21T00:00:00.000Z",
    });

    expect(mockedSqsClient.send).toHaveBeenCalledTimes(1);
    const command = mockedSqsClient.send.mock.calls[0][0] as {
      input: {
        QueueUrl: string;
        MessageBody: string;
      };
    };

    expect(command.input.QueueUrl).toBe(
      "https://sqs.ap-south-1.amazonaws.com/account/jobs"
    );
    expect(JSON.parse(command.input.MessageBody)).toEqual(
      expect.objectContaining({
        eventType: "IMAGE_UPLOADED",
        scanId: "scan-123",
        objectKey: "business-123/scan-123/shelf.jpg",
      })
    );
  });
});