import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";

const region = process.env.AWS_REGION || "ap-south-1";
const endpoint = process.env.AWS_ENDPOINT_URL || undefined;

const credentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  : undefined;

export const s3Client = new S3Client({
  region,
  endpoint,
  forcePathStyle: Boolean(endpoint),
  credentials,
});

export const sqsClient = new SQSClient({
  region,
  endpoint,
  credentials,
});

export const awsResourceNames = {
  bucket:
    process.env.S3_UPLOAD_BUCKET ||
    process.env.S3_BUCKET_NAME ||
    "snapstock-uploads",
  analysisRequestQueue:
    process.env.ANALYSIS_REQUEST_QUEUE_NAME || "snapstock-analysis-jobs",
  analysisResultQueue:
    process.env.ANALYSIS_RESULT_QUEUE_NAME || "snapstock-analysis-results",
} as const;