export interface GenerateMediaClientRequest {
  projectId: string;
  compiledPrompt: string;
  provider?: string;
  model?: string;
  parameters?: Record<string, unknown>;
  referenceAssets?: Array<{
    id: string;
    name: string;
    mimeType: string;
    sourceUrl?: string;
    b2Key?: string;
  }>;
}

export interface GenerateMediaSuccessResponse {
  success: true;
  run: {
    id: string;
    pipelineId: string;
    status: "completed";
    provider: string;
    model: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  asset: {
    url: string;
    b2Key?: string;
    mimeType: string;
    sizeBytes?: number;
    sha256: string;
  };
  manifest: {
    url?: string;
    b2Key?: string;
    sha256?: string;
    verified: boolean;
    data?: Record<string, unknown>;
  };
}

export interface GenerateMediaFailureResponse {
  success: false;
  error: {
    code:
      | "INVALID_REQUEST"
      | "PROVIDER_NOT_CONFIGURED"
      | "MODEL_NOT_AVAILABLE"
      | "GENERATION_FAILED"
      | "B2_NOT_CONFIGURED"
      | "B2_UPLOAD_FAILED"
      | "MANIFEST_FAILED"
      | "VERIFICATION_FAILED"
      | "INTERNAL_ERROR";
    message: string;
    retryable: boolean;
    runId?: string;
  };
}

export type GenerateMediaResponse = GenerateMediaSuccessResponse | GenerateMediaFailureResponse;

export async function callGenblazeService(
  requestData: GenerateMediaClientRequest
): Promise<GenerateMediaResponse> {
  const baseUrl = process.env.GENBLAZE_API_BASE_URL || "http://127.0.0.1:8000";

  try {
    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.detail && typeof data.detail === "object" && data.detail.error) {
        return data.detail as GenerateMediaFailureResponse;
      }
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: data.message || `Genblaze service returned HTTP ${res.status}`,
          retryable: true,
        },
      };
    }

    return data as GenerateMediaSuccessResponse;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "Failed to communicate with Genblaze Python service",
        retryable: true,
      },
    };
  }
}
