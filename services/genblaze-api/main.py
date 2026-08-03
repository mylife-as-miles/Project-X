import logging
import os
import re
import time
from typing import Any, Dict, List, Literal, Optional, Tuple
from urllib.parse import unquote, urlparse

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("genblaze-api")

try:
    from genblaze_core import KeyStrategy, Modality, ObjectStorageSink, Pipeline

    GENBLAZE_CORE_AVAILABLE = True
except ImportError:
    KeyStrategy = Modality = ObjectStorageSink = Pipeline = None  # type: ignore[assignment]
    GENBLAZE_CORE_AVAILABLE = False

try:
    from genblaze_s3 import S3StorageBackend

    GENBLAZE_S3_AVAILABLE = True
except ImportError:
    S3StorageBackend = None  # type: ignore[assignment]
    GENBLAZE_S3_AVAILABLE = False

try:
    from genblaze_google import GeminiImageProvider
except ImportError:
    GeminiImageProvider = None  # type: ignore[assignment]

try:
    from genblaze_google import ImagenProvider
except ImportError:
    ImagenProvider = None  # type: ignore[assignment]

try:
    from genblaze_openai import DalleProvider
except ImportError:
    DalleProvider = None  # type: ignore[assignment]

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:3000,"
    "http://127.0.0.1:3000,"
    "https://projectx.mylife-as-miles.my.id"
)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("PROJECTX_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]

app = FastAPI(
    title="Project X — Genblaze Media Pipeline API",
    version="1.1.0",
    description="Generative-media API using a genuine Genblaze provider pipeline and Backblaze B2 storage.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class ReferenceAsset(BaseModel):
    id: str = Field(..., min_length=1, max_length=200)
    name: str = Field(..., min_length=1, max_length=500)
    mimeType: str = Field(..., min_length=1, max_length=100)
    sourceUrl: Optional[str] = Field(None, max_length=4000)
    b2Key: Optional[str] = Field(None, max_length=2000)


class GenerateMediaRequest(BaseModel):
    projectId: str = Field(..., min_length=1, max_length=200)
    promptTemplateId: Optional[str] = Field(None, max_length=200)
    compiledPrompt: str = Field(..., min_length=1, max_length=10000)
    provider: Literal["google", "google-gemini-image", "google-imagen", "openai"] = "google"
    model: Optional[str] = Field(None, max_length=200)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    referenceAssets: List[ReferenceAsset] = Field(default_factory=list, max_length=8)


def _failure(
    http_status: int,
    code: str,
    message: str,
    retryable: bool,
    run_id: Optional[str] = None,
) -> HTTPException:
    error: Dict[str, Any] = {
        "code": code,
        "message": message,
        "retryable": retryable,
    }
    if run_id:
        error["runId"] = run_id
    return HTTPException(
        status_code=http_status,
        detail={"success": False, "error": error},
    )


def _redact(message: str) -> str:
    safe = message
    for name in (
        "B2_KEY_ID",
        "B2_APP_KEY",
        "B2_APPLICATION_KEY",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "OPENAI_API_KEY",
    ):
        value = os.getenv(name)
        if value:
            safe = safe.replace(value, "[REDACTED]")
    safe = re.sub(r"([?&](?:X-Amz-[^=]+|Authorization|token)=[^&\s]+)", "[REDACTED]", safe, flags=re.I)
    return safe[:800]


def _configure_b2_environment() -> str:
    key_id = os.getenv("B2_KEY_ID")
    app_key = os.getenv("B2_APP_KEY") or os.getenv("B2_APPLICATION_KEY")
    bucket = os.getenv("B2_BUCKET_NAME")
    if not key_id or not app_key or not bucket:
        raise _failure(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "B2_NOT_CONFIGURED",
            "B2_KEY_ID, B2_APP_KEY (or B2_APPLICATION_KEY), and B2_BUCKET_NAME must be configured on the server.",
            False,
        )
    os.environ["B2_APP_KEY"] = app_key
    return bucket


def _build_storage() -> Any:
    if not GENBLAZE_CORE_AVAILABLE or not GENBLAZE_S3_AVAILABLE:
        raise _failure(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "B2_NOT_CONFIGURED",
            "genblaze-core and genblaze-s3 must be installed in the Python service.",
            False,
        )
    bucket = _configure_b2_environment()
    try:
        backend = S3StorageBackend.for_backblaze(bucket)
        return ObjectStorageSink(backend, key_strategy=KeyStrategy.HIERARCHICAL)
    except HTTPException:
        raise
    except Exception as exc:
        raise _failure(
            status.HTTP_502_BAD_GATEWAY,
            "B2_NOT_CONFIGURED",
            f"Could not initialize Backblaze B2 storage: {_redact(str(exc))}",
            False,
        ) from exc


def _google_api_configured() -> bool:
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if key and not os.getenv("GEMINI_API_KEY"):
        os.environ["GEMINI_API_KEY"] = key
    return bool(key)


def _select_provider(provider_name: str, requested_model: Optional[str]) -> Tuple[Any, str, str]:
    provider_name = provider_name.lower()
    if provider_name in {"google", "google-gemini-image", "google-imagen"}:
        if not _google_api_configured():
            raise _failure(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "PROVIDER_NOT_CONFIGURED",
                "GEMINI_API_KEY or GOOGLE_API_KEY must be configured on the server.",
                False,
            )

        force_imagen = provider_name == "google-imagen" or bool(requested_model and requested_model.startswith("imagen-"))
        if not force_imagen and GeminiImageProvider is not None:
            model = requested_model if requested_model and "image" in requested_model.lower() else os.getenv(
                "GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"
            )
            return GeminiImageProvider(), model, "google-gemini-image"

        if ImagenProvider is not None:
            model = requested_model if requested_model and requested_model.startswith("imagen-") else os.getenv(
                "IMAGEN_MODEL", "imagen-3.0-generate-002"
            )
            return ImagenProvider(), model, "google-imagen"

        raise _failure(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "PROVIDER_NOT_CONFIGURED",
            "No Google image provider is available in the installed genblaze-google package.",
            False,
        )

    if provider_name == "openai":
        if not os.getenv("OPENAI_API_KEY"):
            raise _failure(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "PROVIDER_NOT_CONFIGURED",
                "OPENAI_API_KEY must be configured on the server.",
                False,
            )
        if DalleProvider is None:
            raise _failure(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "PROVIDER_NOT_CONFIGURED",
                "DalleProvider is not available in the installed genblaze-openai package.",
                False,
            )
        model = requested_model if requested_model and (
            requested_model.startswith("dall-e-") or requested_model.startswith("gpt-image-")
        ) else os.getenv("OPENAI_IMAGE_MODEL", "dall-e-3")
        return DalleProvider(), model, "openai"

    raise _failure(
        status.HTTP_400_BAD_REQUEST,
        "INVALID_REQUEST",
        f"Unsupported provider: {provider_name}",
        False,
    )


def _unpack_result(result: Any) -> Tuple[Any, Any]:
    run = getattr(result, "run", None)
    manifest = getattr(result, "manifest", None)
    if run is not None and manifest is not None:
        return run, manifest
    if isinstance(result, tuple) and len(result) == 2:
        return result[0], result[1]
    raise RuntimeError("Genblaze returned an unsupported result shape.")


def _attribute(value: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        if isinstance(value, dict) and name in value:
            return value[name]
        if hasattr(value, name):
            result = getattr(value, name)
            if result is not None:
                return result
    return default


def _manifest_data(manifest: Any) -> Optional[Dict[str, Any]]:
    for method_name in ("model_dump", "to_dict", "dict"):
        method = getattr(manifest, method_name, None)
        if callable(method):
            data = method()
            if isinstance(data, dict):
                return data
    return None


def _object_key_from_url(url: str, bucket: str) -> Optional[str]:
    parsed = urlparse(url)
    if parsed.scheme in {"s3", "b2"}:
        return unquote(parsed.path.lstrip("/"))
    marker = f"/file/{bucket}/"
    if marker in parsed.path:
        return unquote(parsed.path.split(marker, 1)[1])
    if parsed.netloc.startswith(f"{bucket}."):
        return unquote(parsed.path.lstrip("/"))
    return None


def _validate_asset(asset: Any, bucket: str) -> Dict[str, Any]:
    url = str(_attribute(asset, "url", default="") or "")
    sha256 = str(_attribute(asset, "sha256", "sha_256", default="") or "")
    if not url:
        raise RuntimeError("Genblaze completed without returning an asset URL.")
    if urlparse(url).scheme in {"", "file"}:
        raise RuntimeError("The generated asset was not persisted to Backblaze B2.")
    if not re.fullmatch(r"[0-9a-fA-F]{64}", sha256):
        raise RuntimeError("Genblaze did not return a valid SHA-256 for the generated asset.")
    return {
        "url": url,
        "b2Key": _object_key_from_url(url, bucket),
        "mimeType": str(_attribute(asset, "mime_type", "mimeType", "content_type", default="image/png")),
        "sizeBytes": _attribute(asset, "size_bytes", "sizeBytes", "content_length"),
        "sha256": sha256.lower(),
    }


def _classify_pipeline_error(exc: Exception) -> Tuple[int, str, bool]:
    name = exc.__class__.__name__.lower()
    text = str(exc).lower()
    if "storage" in name or "s3" in name or "backblaze" in text or "bucket" in text:
        return status.HTTP_502_BAD_GATEWAY, "B2_UPLOAD_FAILED", True
    if "manifest" in name or "verify" in text:
        return status.HTTP_500_INTERNAL_SERVER_ERROR, "MANIFEST_FAILED", False
    if "model" in name or "model" in text and ("not found" in text or "unsupported" in text):
        return status.HTTP_422_UNPROCESSABLE_ENTITY, "MODEL_NOT_AVAILABLE", False
    return status.HTTP_502_BAD_GATEWAY, "GENERATION_FAILED", True


@app.get("/health")
def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "projectx-genblaze-api",
        "version": "1.1.0",
        "sdk": {
            "genblaze_core": GENBLAZE_CORE_AVAILABLE,
            "genblaze_s3": GENBLAZE_S3_AVAILABLE,
            "gemini_image_provider": GeminiImageProvider is not None,
            "imagen_provider": ImagenProvider is not None,
            "openai_image_provider": DalleProvider is not None,
        },
        "configuration": {
            "b2_configured": bool(
                os.getenv("B2_KEY_ID")
                and (os.getenv("B2_APP_KEY") or os.getenv("B2_APPLICATION_KEY"))
                and os.getenv("B2_BUCKET_NAME")
            ),
            "google_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
            "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        },
    }


@app.post("/generate", status_code=status.HTTP_200_OK)
def generate_media(req: GenerateMediaRequest) -> Dict[str, Any]:
    if not GENBLAZE_CORE_AVAILABLE or Pipeline is None or Modality is None:
        raise _failure(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "INTERNAL_ERROR",
            "genblaze-core is not installed in the Python service.",
            False,
        )

    started = time.time()
    pipeline_id = f"projectx-{re.sub(r'[^a-zA-Z0-9_-]+', '-', req.projectId).strip('-') or 'workspace'}"
    storage = _build_storage()
    provider, model, provider_id = _select_provider(req.provider, req.model)

    step_options: Dict[str, Any] = {}
    aspect_ratio = req.parameters.get("aspect_ratio")
    if isinstance(aspect_ratio, str) and re.fullmatch(r"\d{1,2}:\d{1,2}", aspect_ratio):
        step_options["aspect_ratio"] = aspect_ratio

    try:
        result = (
            Pipeline(pipeline_id)
            .step(
                provider,
                model=model,
                prompt=req.compiledPrompt.strip(),
                modality=Modality.IMAGE,
                **step_options,
            )
            .run(sink=storage, timeout=int(os.getenv("GENBLAZE_GENERATION_TIMEOUT", "180")))
        )
        run, manifest = _unpack_result(result)
        steps = _attribute(run, "steps", default=[])
        if not steps:
            raise RuntimeError("Genblaze completed without recording a pipeline step.")
        step = steps[0]
        assets = _attribute(step, "assets", default=[])
        if not assets:
            raise RuntimeError("The image provider returned no generated assets.")

        bucket = os.environ["B2_BUCKET_NAME"]
        asset_data = _validate_asset(assets[0], bucket)
        verify_method = getattr(manifest, "verify", None)
        if not callable(verify_method):
            raise RuntimeError("The Genblaze manifest does not expose verify().")
        verified = bool(verify_method())
        if not verified:
            raise _failure(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "VERIFICATION_FAILED",
                "Genblaze generated an asset, but manifest verification failed.",
                False,
                str(_attribute(run, "id", "run_id", default="")) or None,
            )

        run_id = str(_attribute(run, "id", "run_id", default="") or "")
        if not run_id:
            raise RuntimeError("Genblaze did not return a run ID.")

        manifest_url = _attribute(manifest, "url", "storage_url", "uri", "object_url")
        manifest_key = _attribute(manifest, "b2_key", "object_key", "storage_key", "key")
        if manifest_url and not manifest_key:
            manifest_key = _object_key_from_url(str(manifest_url), bucket)
        canonical_hash = str(_attribute(manifest, "canonical_hash", default="") or "")
        completed = time.time()

        return {
            "success": True,
            "run": {
                "id": run_id,
                "pipelineId": str(_attribute(run, "pipeline_id", default=pipeline_id)),
                "status": "completed",
                "provider": str(_attribute(step, "provider", default=provider_id)),
                "model": str(_attribute(step, "model", default=model)),
                "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started)),
                "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(completed)),
                "durationMs": int((completed - started) * 1000),
            },
            "asset": asset_data,
            "manifest": {
                "url": str(manifest_url) if manifest_url else None,
                "b2Key": str(manifest_key) if manifest_key else None,
                "sha256": canonical_hash or None,
                "verified": True,
                "data": _manifest_data(manifest),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        http_status, code, retryable = _classify_pipeline_error(exc)
        message = _redact(str(exc)) or "The Genblaze image pipeline failed."
        logger.error("Genblaze pipeline failed (%s): %s", exc.__class__.__name__, message)
        raise _failure(http_status, code, message, retryable) from exc
