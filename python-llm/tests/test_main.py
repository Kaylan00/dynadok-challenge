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
