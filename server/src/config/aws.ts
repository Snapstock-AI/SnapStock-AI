import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";

/**
 * Event-driven scan analysis:
 *   browser --presigned POST--> S3 --> backend publishes IMAGE_UPLOADED (SQS jobs queue)
 *   --> AI worker --> ANALYSIS_COMPLETED / ANALYSIS_FAILED (SQS results queue) --> backend consumer
 *
 * The pipeline is enabled when the bucket and both queue URLs are set. Otherwise the web client
 * falls back to the synchronous POST /detection/analyze endpoint (also used by the mobile app).
 *
 * Credentials: in AWS the default provider chain is used (IRSA on EKS, no static keys).
 * Locally, AWS_ENDPOINT_URL points at LocalStack and its dummy credentials are used.
 */
const region = process.env.AWS_REGION || "ap-south-1";
const endpoint = process.env.AWS_ENDPOINT_URL || undefined;
// Endpoint baked into presigned URLs that the *browser* uses. Defaults to AWS_ENDPOINT_URL,
// override when the backend reaches LocalStack by another host name (e.g. inside Docker).
const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT_URL || endpoint;

const localCredentials = endpoint
  ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    }
  : undefined;

const createS3Client = (s3Endpoint?: string) =>
  new S3Client({
    region,
    endpoint: s3Endpoint,
    forcePathStyle: Boolean(s3Endpoint),
    credentials: localCredentials,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

export const s3Client = createS3Client(endpoint);

export const s3PresignClient =
  publicEndpoint === endpoint ? s3Client : createS3Client(publicEndpoint);

export const sqsClient = new SQSClient({
  region,
  endpoint,
  credentials: localCredentials,
});

export const analysisConfig = {
  bucket: process.env.S3_UPLOAD_BUCKET || "",
  jobQueueUrl: process.env.SQS_ANALYSIS_JOB_QUEUE_URL || "",
  resultQueueUrl: process.env.SQS_ANALYSIS_RESULT_QUEUE_URL || "",
  uploadExpirySeconds: Number(process.env.S3_PRESIGN_EXPIRY_SECONDS) || 900,
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024,
};

export const isEventPipelineEnabled = () =>
  Boolean(
    analysisConfig.bucket &&
      analysisConfig.jobQueueUrl &&
      analysisConfig.resultQueueUrl,
  );
