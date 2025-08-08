from __future__ import annotations

from typing import Any, Dict

from ..config import get_settings
from ..providers import gemini_local, gemini_vertex


class EvaluationError(RuntimeError):
    pass


def evaluate_answer(question_text: str, audio_bytes: bytes, audio_mime_type: str) -> Dict[str, Any]:
    settings = get_settings()

    if settings.app_env == "local":
        if not settings.google_api_key:
            raise EvaluationError("GOOGLE_API_KEY is required for local environment")
        gemini_local.configure(settings.google_api_key, settings.gemini_model)
        return gemini_local.generate_feedback_with_audio_bytes(
            model_name=settings.gemini_model,
            audio_bytes=audio_bytes,
            audio_mime_type=audio_mime_type,
            question_text=question_text,
        )

    # prod -> Vertex AI
    if not settings.gcp_project_id:
        raise EvaluationError("GCP_PROJECT_ID is required for production environment")
    gemini_vertex.configure(settings.gcp_project_id, settings.gcp_location)
    return gemini_vertex.generate_feedback_with_audio_bytes(
        model_name=settings.gemini_model,
        audio_bytes=audio_bytes,
        audio_mime_type=audio_mime_type,
        question_text=question_text,
    )