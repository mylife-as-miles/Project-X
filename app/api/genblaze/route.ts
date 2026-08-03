import { NextRequest, NextResponse } from "next/server";
import { callGenblazeService, GenerateMediaClientRequest } from "@/lib/genblaze-client";

const MAX_PROMPT_LENGTH = 10_000;
const ALLOWED_PROVIDERS = new Set(["google", "google-gemini-image", "google-imagen", "openai"]);

function statusForError(code: string): number {
  switch (code) {
    case "INVALID_REQUEST":
      return 400;
    case "PROVIDER_NOT_CONFIGURED":
    case "B2_NOT_CONFIGURED":
    case "MODEL_NOT_AVAILABLE":
      return 422;
    case "GENERATION_FAILED":
    case "B2_UPLOAD_FAILED":
      return 502;
    case "MANIFEST_FAILED":
    case "VERIFICATION_FAILED":
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, compiledPrompt, provider, model, parameters, referenceAssets } = body;

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

    if (compiledPrompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: `compiledPrompt cannot exceed ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const selectedProvider = typeof provider === "string" ? provider : "google";
    if (!ALLOWED_PROVIDERS.has(selectedProvider)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Unsupported image provider.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const payload: GenerateMediaClientRequest = {
      projectId: projectId.trim(),
      compiledPrompt: compiledPrompt.trim(),
      provider: selectedProvider,
      model: typeof model === "string" && model.trim() ? model.trim() : undefined,
      parameters: parameters && typeof parameters === "object" ? parameters : {},
      referenceAssets: Array.isArray(referenceAssets) ? referenceAssets.slice(0, 8) : [],
    };

    const result = await callGenblazeService(payload);
    if (!result.success) {
      return NextResponse.json(result, { status: statusForError(result.error.code) });
    }

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected internal server error occurred.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
