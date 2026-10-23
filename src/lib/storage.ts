import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { PutObjectCommand, S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

type EnvLike = Record<string, string | undefined>;

export function s3Enabled(env: EnvLike = process.env) {
  return Boolean(
    env.S3_ENDPOINT &&
      env.S3_ACCESS_KEY &&
      env.S3_SECRET_KEY &&
      env.S3_BUCKET &&
      env.S3_PUBLIC_URL,
  );
}

function client() {
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}

let bucketReady: Promise<void> | null = null;

async function ensureBucket() {
  if (!s3Enabled()) return;
  if (!bucketReady) {
    bucketReady = (async () => {
      const s3 = client();
      const bucket = process.env.S3_BUCKET!;
      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch {
        try {
          await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        } catch {
          /* may already exist or race */
        }
      }
    })();
  }
  await bucketReady;
}

export async function saveImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const key = `${nanoid()}.${safeExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (s3Enabled()) {
    await ensureBucket();
    const s3 = client();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: file.type || `image/${safeExt}`,
      }),
    );
    const base = process.env.S3_PUBLIC_URL!.replace(/\/$/, "");
    return `${base}/${key}`;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, key), buffer);
  return `/uploads/${key}`;
}

export function storageMode(env: EnvLike = process.env) {
  return s3Enabled(env) ? "s3" : "local";
}
