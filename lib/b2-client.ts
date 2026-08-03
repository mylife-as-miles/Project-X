import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export function getB2Client() {
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  const region = process.env.B2_REGION || "us-west-004";

  if (!keyId || !applicationKey) {
    return null;
  }

  return new S3Client({
    endpoint: `https://s3.${region}.backblazeb2.com`,
    region: region,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
  });
}

export async function uploadToB2(params: {
  key: string;
  body: string | Buffer;
  contentType?: string;
  bucket?: string;
}) {
  const client = getB2Client();
  const bucket = params.bucket || process.env.B2_BUCKET_NAME || "projectx-genblaze-media";

  if (!client) {
    return {
      success: false,
      error: "B2 credentials not configured",
      url: `https://f000.backblazeb2.com/file/${bucket}/${params.key}`,
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType || "application/json",
    });

    await client.send(command);

    return {
      success: true,
      bucket,
      key: params.key,
      url: `https://f000.backblazeb2.com/file/${bucket}/${params.key}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to upload to B2",
      url: `https://f000.backblazeb2.com/file/${bucket}/${params.key}`,
    };
  }
}
