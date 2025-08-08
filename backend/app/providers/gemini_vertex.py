from __future__ import annotations

import json
from typing import Any, Dict

from vertexai import init
from vertexai.generative_models import GenerativeModel, Part


def configure(project_id: str, location: str) -> None:
    init(project=project_id, location=location)


def generate_feedback_with_audio_bytes(
    *, model_name: str, audio_bytes: bytes, audio_mime_type: str, question_text: str
) -> Dict[str, Any]:
    model = GenerativeModel(model_name)

    system_prompt = (
        "You are an IELTS Speaking examiner and expert coach. "
        "Given an audio answer to a question, produce a strict JSON object with: "
        "transcript, bandScore(0-9), grammarFixes(list of objects: {original, improved, rationale}), "
        "vocabularySuggestions(list of advanced words/phrases with example usage), "
        "pronunciationFeedback, coherenceCohesionFeedback, suggestedModelAnswer, feedbackVoiceText. "
        "Be concise and specific. Output ONLY valid JSON."
    )

    audio_part = Part.from_data(mime_type=audio_mime_type, data=audio_bytes)

    response = model.generate_content([
        system_prompt,
        f"Question: {question_text}",
        audio_part,
    ], generation_config={"temperature": 0.3})

    text = response.text or "{}"
    return _safe_parse_json(text)


def _safe_parse_json(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                pass
        return {
            "transcript": "",
            "bandScore": 0,
            "grammarFixes": [],
            "vocabularySuggestions": [],
            "pronunciationFeedback": "",
            "coherenceCohesionFeedback": "",
            "suggestedModelAnswer": "",
            "feedbackVoiceText": "Here is some feedback, but parsing failed.",
            "raw": text,
        }