import { NextRequest, NextResponse } from "next/server";
import { uploadToB2 } from "@/lib/b2-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, content, contentType, folder } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "Content payload is required" },
        { status: 400 }
      );
    }

    const keyFolder = folder || "manifests";
    const safeFilename = filename || `manifest_${Date.now()}.json`;
    const key = `${keyFolder}/${safeFilename}`;

    const result = await uploadToB2({
      key,
      body: typeof content === "object" ? JSON.stringify(content, null, 2) : content,
      contentType: contentType || "application/json",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process B2 upload" },
      { status: 500 }
    );
  }
}
