# LLM Summarizer API

API que recebe um texto e um idioma, manda pro serviço Python gerar o resumo via LangChain, e salva tudo numa lista de tarefas.

Dois serviços rodando juntos:

- **node-api** — entrada da aplicação, valida os dados, persiste em JSON e chama o Python
- **python-llm** — só gera o resumo, sem saber nada de CRUD

## Requisitos

- Token do Hugging Face (gratuito): https://huggingface.co/settings/tokens
- Docker + Docker Compose (recomendado), ou Node 18+ e Python 3.10+

## Configuração

```bash
cp node-api/.env.example node-api/.env
cp python-llm/.env.example python-llm/.env
```

Edite `python-llm/.env` e coloque seu `HF_TOKEN`.

## Rodando

### Com Docker

```bash
docker compose up --build
```

Node em `http://localhost:3005`, Python em `http://localhost:5000`.

### Sem Docker

```bash
./setup.sh install

# dois terminais separados:
./setup.sh start-python
./setup.sh start-node
```

## Testes

```bash
./setup.sh test

# ou separado:
./setup.sh test-node          # unit do Node (Jest + Supertest)
./setup.sh test-python        # Python (pytest + FastAPI TestClient)
./setup.sh test-integration   # e2e: Node sobe Python real e bate via HTTP
```

O teste de integração roda o serviço Python de verdade com `LLM_FAKE=1` (sem precisar de `HF_TOKEN`), garantindo que o contrato HTTP entre os dois lados não quebre.

## Swagger

- `http://localhost:3005/docs`
- `http://localhost:5000/docs`

## Endpoints

### `GET /`

```bash
curl http://localhost:3005/
```

```json
{ "message": "API is running" }
```

### `POST /tasks`

```bash
curl -X POST http://localhost:3005/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Seu texto aqui...", "lang": "pt"}'
```

```json
{
  "id": 1,
  "text": "Seu texto aqui...",
  "summary": "Resumo gerado em português.",
  "lang": "pt"
}
```

Idiomas aceitos: `pt`, `en`, `es`. Qualquer outro retorna `400`.

### `GET /tasks`

```bash
curl http://localhost:3005/tasks
```

```json
[
  {
    "id": 1,
    "text": "Seu texto aqui...",
    "summary": "Resumo gerado em português.",
    "lang": "pt"
  }
]
```

### `GET /tasks/:id`

```bash
curl http://localhost:3005/tasks/1
```

`404` se não existir, `400` se o ID não for número.

### `DELETE /tasks/:id`

```bash
curl -X DELETE http://localhost:3005/tasks/1
```

`204` no sucesso, `404` se não encontrar.

## Algumas notas

Separei Node e Python porque misturar LangChain com a lógica de CRUD ia complicar sem necessidade. O Node não precisa saber como o resumo é gerado, só precisa do resultado.

Preferi fazer resumo e tradução num prompt só pra não ter duas chamadas ao modelo. Mandei o idioma direto no prompt e funcionou bem.

O Python também valida o idioma mesmo o Node já validando antes — não faz sentido o serviço confiar cegamente no que chega, qualquer um pode chamar ele direto.

A tarefa só é salva depois que o resumo volta com sucesso. Se o Python cair no meio, nada fica registrado pela metade.

## Variáveis de ambiente

**node-api/.env**
```
PORT=3005
PYTHON_LLM_URL=http://localhost:5000
```

**python-llm/.env**
```
PORT=5000
HF_TOKEN=seu_token_aqui
```
