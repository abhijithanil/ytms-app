from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from typing import List

from ..services.evaluator import evaluate_answer, EvaluationError

router = APIRouter()


QUESTIONS = {
    "1": [
        "Do you work or are you a student?",
        "What do you usually do in your free time?",
        "Do you prefer to study in the morning or the evening?",
        "What kind of music do you like?",
        "Tell me about your hometown.",
        "Do you enjoy reading books?",
        "How often do you exercise?",
        "Do you like to cook?",
        "What languages do you speak?",
        "Do you prefer to travel alone or with others?",
    ],
    "2": [
        "Describe a memorable journey you have taken.",
        "Describe a person who has inspired you.",
        "Describe a book or film that made a strong impression on you.",
        "Describe an important skill you learned.",
        "Describe a city you would like to visit in the future.",
    ],
    "3": [
        "How important is it for people to travel?",
        "What are the advantages and disadvantages of public transportation?",
        "Do you think technology has changed the way we learn? How?",
        "Should governments invest more in education or healthcare? Why?",
        "How can people balance work and personal life more effectively?",
    ],
}


@router.get("/questions")
async def get_questions(part: str = "1") -> JSONResponse:
    data: List[str] = QUESTIONS.get(part, QUESTIONS["1"])
    return JSONResponse({"part": part, "questions": data})


@router.post("/evaluate")
async def evaluate(
    question_text: str = Form(...),
    part: str = Form("1"),
    audio: UploadFile = File(...),
):
    # Accept common browser audio formats (webm/opus, m4a, mp3, wav)
    mime_type = audio.content_type or "audio/webm"
    try:
        audio_bytes = await audio.read()
        result = evaluate_answer(question_text=question_text, audio_bytes=audio_bytes, audio_mime_type=mime_type)
        return JSONResponse({
            "part": part,
            "question": question_text,
            "result": result,
        })
    except EvaluationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")