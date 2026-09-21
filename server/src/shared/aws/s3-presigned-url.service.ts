import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  s3Bucket,
  s3Client,
} from "./aws.clients";

export interface PresignedUpload {
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export async function createPresignedUploadUrl(
  businessId: string,
  scanId: string,
  fileName: string,
  contentType: string
): Promise<PresignedUpload> {

  const safeFileName =
    fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_");

  const objectKey =
    `scans/${businessId}/${scanId}/${safeFileName}`;

  const command =
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        scanId,
        businessId,
      },
    });

  const expiresInSeconds = 900;

  const uploadUrl =
    await getSignedUrl(
      s3Client,
      command,
      {
        expiresIn:
          expiresInSeconds,
      }
    );

  return {
    objectKey,
    uploadUrl,
    expiresInSeconds,
  };
}