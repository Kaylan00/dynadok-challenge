import sys

from dotenv import load_dotenv

load_dotenv()
sys.path = sys.path + ["./app"]

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.llm_service import LLMService

SUPPORTED_LANGS = {"pt", "en", "es"}

app = FastAPI(
    title="LLM Summarizer Service",
    description=(
        "Serviço Python responsável por gerar resumos de texto usando o modelo "
        "Qwen2.5-72B-Instruct via Hugging Face Inference API. "
        "Chamado internamente pela Node API."
    ),
    version="1.0.0",
)
llm_service = LLMService()


class SummarizeRequest(BaseModel):
    text: str = Field(
        ...,
        description="Texto a ser resumido.",
        examples=["Artificial intelligence is transforming the way we work and live."],
    )
    lang: str = Field(
        ...,
        description="Idioma do resumo gerado. Valores aceitos: `pt`, `en`, `es`.",
        examples=["pt"],
    )


class SummarizeResponse(BaseModel):
    summary: str = Field(..., description="Resumo gerado pelo LLM no idioma solicitado.")


class HealthResponse(BaseModel):
    message: str


@app.get(
    "/",
    response_model=HealthResponse,
    summary="Health check",
    description="Verifica se o serviço está no ar.",
    tags=["Status"],
)
async def root() -> dict:
    return {"message": "API is running"}


@app.post(
    "/summarize",
    response_model=SummarizeResponse,
    summary="Gerar resumo",
    description=(
        "Recebe um texto e um idioma alvo, envia ao LLM e retorna o resumo traduzido. "
        "Idiomas suportados: `pt` (Português), `en` (Inglês), `es` (Espanhol)."
    ),
    responses={
        400: {"description": "Idioma não suportado."},
        502: {"description": "Falha na comunicação com o LLM."},
    },
    tags=["Summarizer"],
)
async def summarize(payload: SummarizeRequest) -> dict:
    if payload.lang not in SUPPORTED_LANGS:
        raise HTTPException(status_code=400, detail="Language not supported")

    summary = llm_service.summarize(payload.text, payload.lang)
    return {"summary": summary}
