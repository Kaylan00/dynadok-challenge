import os

os.environ["HF_TOKEN"] = "hf_fake_token_for_tests"

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from app.main import app, llm_service

    llm_service.chain = MagicMock()
    llm_service.chain.invoke.return_value = "Resumo gerado pelo mock."

    return TestClient(app)


def test_health_check(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"message": "API is running"}


def test_summarize_ok(client):
    res = client.post("/summarize", json={"text": "Some text to summarize.", "lang": "pt"})
    assert res.status_code == 200
    assert res.json()["summary"] == "Resumo gerado pelo mock."


def test_summarize_lang_en(client):
    res = client.post("/summarize", json={"text": "Some text.", "lang": "en"})
    assert res.status_code == 200


def test_summarize_lang_es(client):
    res = client.post("/summarize", json={"text": "Algún texto.", "lang": "es"})
    assert res.status_code == 200


def test_summarize_lang_invalido(client):
    res = client.post("/summarize", json={"text": "Bonjour le monde.", "lang": "fr"})
    assert res.status_code == 400
    assert res.json()["detail"] == "Language not supported"


def test_summarize_sem_campos(client):
    res = client.post("/summarize", json={})
    assert res.status_code == 422


def test_summarize_texto_vazio(client):
    res = client.post("/summarize", json={"text": "", "lang": "pt"})
    assert res.status_code == 400


def test_summarize_texto_so_espacos(client):
    res = client.post("/summarize", json={"text": "   ", "lang": "pt"})
    assert res.status_code == 400


def test_prompt_template_renderiza_text_e_language():
    from app.services.llm_service import PROMPT_TEMPLATE
    from langchain_core.prompts import PromptTemplate

    rendered = PromptTemplate.from_template(PROMPT_TEMPLATE).format(
        text="hello world", language="Portuguese"
    )
    assert "hello world" in rendered
    assert "Portuguese" in rendered
    assert "translate" in rendered.lower()


@pytest.mark.parametrize(
    "lang,expected_language",
    [("pt", "Portuguese"), ("en", "English"), ("es", "Spanish")],
)
def test_chain_recebe_language_correto(client, lang, expected_language):
    from app.main import llm_service

    llm_service.chain.invoke.reset_mock()
    llm_service.chain.invoke.return_value = "ok"

    res = client.post("/summarize", json={"text": "qualquer texto", "lang": lang})

    assert res.status_code == 200
    llm_service.chain.invoke.assert_called_once_with(
        {"text": "qualquer texto", "language": expected_language}
    )
