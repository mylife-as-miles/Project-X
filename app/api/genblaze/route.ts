import { NextRequest, NextResponse } from "next/server";
import { callGenblazeService, GenerateMediaClientRequest } from "@/lib/genblaze-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, compiledPrompt, provider, model, parameters, referenceAssets } = body;

    // Validate inputs
    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "projectId parameter is required.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (!compiledPrompt || typeof compiledPrompt !== "string" || !compiledPrompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "compiledPrompt parameter is required.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const payload: GenerateMediaClientRequest = {
      projectId: projectId.trim(),
      compiledPrompt: compiledPrompt.trim(),
      provider: provider || "google",
      model: model || "gemini-3.5-flash",
      parameters: parameters || {},
      referenceAssets: referenceAssets || [],
    };

    const result = await callGenblazeService(payload);

    if (!result.success) {
      const statusCode =
        result.error.code === "INVALID_REQUEST"
          ? 400
          : result.error.code === "PROVIDER_NOT_CONFIGURED" || result.error.code === "B2_NOT_CONFIGURED"
          ? 422
          : result.error.code === "GENERATION_FAILED"
          ? 502
          : 500;

      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "An unexpected internal server error occurred.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
