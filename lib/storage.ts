import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  return _client;
}

function getBucket(): string {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) throw new Error("STORAGE_BUCKET is not set");
  return bucket;
}

export function buildObjectKey(userId: string, applicationId: string): string {
  const id = crypto.randomUUID();
  return `users/${userId}/applications/${applicationId}/cover-letter/${id}.pdf`;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  mime: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: mime,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}

export async function getDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: 60 },
  );
}
