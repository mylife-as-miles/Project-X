import { NextRequest, NextResponse } from "next/server";
import { uploadToB2 } from "@/lib/b2-client";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
]);

const MAX_PAYLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export async function POST(req: NextRequest) {
  try {
    const keyId = process.env.B2_KEY_ID;
    const appKey = process.env.B2_APPLICATION_KEY;

    if (!keyId || !appKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "B2_NOT_CONFIGURED",
            message: "Backblaze B2 credentials are not configured on the server.",
          },
        },
        { status: 422 }
      );
    }

    const body = await req.json();
    const { filename, content, contentType, projectId } = body;

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Content payload is required.",
          },
        },
        { status: 400 }
      );
    }

    const mime = contentType || "application/json";
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: `Content type '${mime}' is not permitted.`,
          },
        },
        { status: 400 }
      );
    }

    const stringContent = typeof content === "object" ? JSON.stringify(content, null, 2) : String(content);
    if (Buffer.byteLength(stringContent, "utf-8") > MAX_PAYLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Payload size exceeds maximum allowed limit (10 MB).",
          },
        },
        { status: 400 }
      );
    }

    // Generate safe server-controlled key
    const safeProjectId = (projectId || "workspace").replace(/[^a-zA-Z0-9_-]/g, "");
    const randomHash = crypto.randomBytes(8).toString("hex");
    const safeFilename = (filename || `metadata_${Date.now()}.json`).replace(/[^a-zA-Z0-9_.-]/g, "_");
    const key = `projects/${safeProjectId}/metadata/${randomHash}_${safeFilename}`;

    const result = await uploadToB2({
      key,
      body: stringContent,
      contentType: mime,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "B2_UPLOAD_FAILED",
            message: result.error || "Failed to upload asset to Backblaze B2.",
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "An unexpected error occurred during B2 upload.",
        },
      },
      { status: 500 }
    );
  }
}
