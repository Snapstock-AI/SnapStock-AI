import path from "path";
import dotenv from "dotenv";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const region = "ap-south-1";
const sourceBucket = process.env.LOCALSTACK_S3_UPLOAD_BUCKET || "snapstock-uploads";
const targetBucket = process.env.AWS_TARGET_BUCKET;
const profile = process.env.AWS_PROFILE || "snapstock";

if (!targetBucket) {
  throw new Error(
    "AWS_TARGET_BUCKET is required. Set it to the globally unique AWS bucket name."
  );
}

const localstackClient = new S3Client({
  region,
  endpoint: process.env.LOCALSTACK_ENDPOINT_URL || "http://localhost:4566",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
});

const awsClient = new S3Client({
  region,
  credentials: fromIni({ profile }),
});

async function ensureTargetBucket(): Promise<void> {
  try {
    await awsClient.send(new HeadBucketCommand({ Bucket: targetBucket }));
  } catch {
    await awsClient.send(
      new CreateBucketCommand({
        Bucket: targetBucket,
        CreateBucketConfiguration: {
          LocationConstraint: region,
        },
      })
    );
  }

  await awsClient.send(
    new PutBucketCorsCommand({
      Bucket: targetBucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["http://localhost:5173"],
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
          },
        ],
      },
    })
  );
}

async function migrateObjects(): Promise<number> {
  let continuationToken: string | undefined;
  let copied = 0;

  do {
    const page = await localstackClient.send(
      new ListObjectsV2Command({
        Bucket: sourceBucket,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of page.Contents || []) {
      if (!object.Key) {
        continue;
      }

      const [sourceObject, metadata] = await Promise.all([
        localstackClient.send(
          new GetObjectCommand({
            Bucket: sourceBucket,
            Key: object.Key,
          })
        ),
        localstackClient.send(
          new HeadObjectCommand({
            Bucket: sourceBucket,
            Key: object.Key,
          })
        ),
      ]);

      if (!sourceObject.Body) {
        throw new Error(`Source object has no body: ${object.Key}`);
      }

      await awsClient.send(
        new PutObjectCommand({
          Bucket: targetBucket,
          Key: object.Key,
          Body: await sourceObject.Body.transformToByteArray(),
          ContentType: metadata.ContentType,
        })
      );

      copied += 1;
      console.log(`Copied ${object.Key}`);
    }

    continuationToken = page.NextContinuationToken;
  } while (continuationToken);

  return copied;
}

async function main(): Promise<void> {
  console.log(`Migrating ${sourceBucket} to ${targetBucket} in ${region}`);
  await ensureTargetBucket();
  const copied = await migrateObjects();
  console.log(`Migration complete. Copied ${copied} object(s).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});