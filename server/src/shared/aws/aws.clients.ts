import path from "path";
import dotenv from "dotenv";

import {
  S3Client,
} from "@aws-sdk/client-s3";

import {
  SQSClient,
} from "@aws-sdk/client-sqs";

dotenv.config({
  path: path.resolve(
    __dirname,
    "../../../../.env"
  ),
});

function requiredEnv(
  name: string
): string {

  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }

  return value;
}

export const awsRegion =
  process.env.AWS_REGION ||
  "ap-south-1";

export const s3Bucket =
  requiredEnv(
    "AWS_S3_BUCKET"
  );

export const analysisRequestQueueUrl =
  requiredEnv(
    "AWS_ANALYSIS_REQUEST_QUEUE_URL"
  );

export const analysisResultQueueUrl =
  requiredEnv(
    "AWS_ANALYSIS_RESULT_QUEUE_URL"
  );

export const s3Client =
  new S3Client({
    region: awsRegion,

    endpoint:
      process.env.AWS_ENDPOINT_URL ||
      undefined,

    forcePathStyle:
      process.env.AWS_ENDPOINT_URL
        ? true
        : undefined,
  });

export const sqsClient =
  new SQSClient({
    region: awsRegion,

    endpoint:
      process.env.AWS_ENDPOINT_URL ||
      undefined,
  });