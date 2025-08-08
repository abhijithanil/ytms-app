from __future__ import annotations

import json
from typing import Any, Dict

import google.generativeai as genai


def configure(api_key: str, model_name: str) -> None:
    genai.configure(api_key=api_key)
    # No persistent client object needed; model constructed per call


def generate_feedback_with_audio_bytes(
    *, model_name: str, audio_bytes: bytes, audio_mime_type: str, question_text: str
) -> Dict[str, Any]:
    model = genai.GenerativeModel(model_name)

    system_prompt = (
        "You are an IELTS Speaking examiner and expert coach. "
        "Given an audio answer to a question, produce a strict JSON object with: "
        "transcript, bandScore(0-9), grammarFixes(list of objects: {original, improved, rationale}), "
        "vocabularySuggestions(list of advanced words/phrases with example usage), "
        "pronunciationFeedback, coherenceCohesionFeedback, suggestedModelAnswer, feedbackVoiceText. "
        "Be concise and specific. Output ONLY valid JSON."
    )

    audio_part = {
        "mime_type": audio_mime_type,
        "data": audio_bytes,
    }

    contents = [
        {"role": "user", "parts": [
            {"text": system_prompt},
            {"text": f"Question: {question_text}"},
            audio_part,
        ]}
    ]

    response = model.generate_content(contents, generation_config={"temperature": 0.3})

    text = response.text or "{}"
    return _safe_parse_json(text)


def _safe_parse_json(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except Exception:
        # Try to extract the first JSON object
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