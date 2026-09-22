import { DetectionService } from "../../../src/modules/detection/detection.service";
import { DetectionRepository } from "../../../src/modules/detection/detection.repository";
import { sqsClient } from "../../../src/config/aws";

jest.mock("../../../src/config/aws", () => ({
  analysisRequestQueueUrl: "https://sqs.ap-south-1.amazonaws.com/account/jobs",
  analysisResultQueueUrl: "https://sqs.ap-south-1.amazonaws.com/account/results",
  awsResourceNames: { bucket: "snapstock-ai-images-471547181436" },
  s3Client: {},
  sqsClient: {
    send: jest.fn(),
  },
}));

jest.mock("../../../src/modules/detection/detection.repository", () => ({
  DetectionRepository: {
    updateScanStatus: jest.fn(),
    findProductByName: jest.fn(),
    createDetection: jest.fn(),
  },
}));

const mockedSqsClient = sqsClient as jest.Mocked<typeof sqsClient>;
const mockedRepository = DetectionRepository as jest.Mocked<typeof DetectionRepository>;

describe("DetectionService.consumeAnalysisResults", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSqsClient.send.mockImplementation(async (command: any) => {
      if (command.input?.QueueUrl?.includes("results")) {
        return {
          Messages: [
            {
              ReceiptHandle: "receipt-1",
              Body: JSON.stringify({
                eventType: "ANALYSIS_COMPLETED",
                scanId: "scan-123",
                businessId: "business-123",
                shelfId: "shelf-456",
                userId: "user-789",
                data: {
                  total_count: 1,
                  counts: { apple: { fresh: 1, rotten: 0, total: 1 } },
                  detections: [
                    {
                      class_name: "apple",
                      confidence: 0.91,
                      bounding_box: { x1: 10, y1: 10, x2: 60, y2: 60 },
                      freshness: "good",
                      freshness_confidence: 0.88,
                    },
                  ],
                },
              }),
            },
          ],
        } as never;
      }

      return {} as never;
    });

    mockedRepository.findProductByName.mockResolvedValue({ id: "product-1" });
    mockedRepository.createDetection.mockResolvedValue({
      id: "detection-1",
      bbox_json: JSON.stringify({ x1: 10, y1: 10, x2: 60, y2: 60 }),
      product_label: "apple",
      confidence: 0.91,
      freshness: "Fresh",
      freshness_confidence: 0.88,
    } as any);
  });

  it("handles analysis-complete SQS messages and marks the scan completed", async () => {
    const results = await DetectionService.consumeAnalysisResults();

    expect(results).toHaveLength(1);
    expect(mockedRepository.updateScanStatus).toHaveBeenCalledWith("scan-123", "COMPLETED");
    expect(mockedRepository.createDetection).toHaveBeenCalledWith(
      "scan-123",
      "apple",
      "product-1",
      0.91,
      { x1: 10, y1: 10, x2: 60, y2: 60 },
      "Fresh",
      0.88
    );
  });
});
