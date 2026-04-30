import sys

from dotenv import load_dotenv

load_dotenv()
sys.path = sys.path + ["./app"]

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from services.llm_service import LLMService

SUPPORTED_LANGS = {"pt", "en", "es"}

app = FastAPI(title="LLM Summarizer Service")
llm_service = LLMService()


class SummarizeRequest(BaseModel):
    text: str
    lang: str


class SummarizeResponse(BaseModel):
    summary: str


@app.get("/")
async def root() -> dict:
    return {"message": "API is running"}


@app.post("/summarize", response_model=SummarizeResponse)
async def summarize(payload: SummarizeRequest) -> dict:
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text is required.")

    if payload.lang not in SUPPORTED_LANGS:
        raise HTTPException(status_code=400, detail="Language not supported")

    try:
        summary = llm_service.summarize(payload.text, payload.lang)
        return {"summary": summary}
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to generate summary")
