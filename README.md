# LLM Summarizer API

API para resumir textos usando LLM. Você manda um texto e um idioma, o sistema gera um resumo traduzido e salva a tarefa.

O projeto tem dois serviços:

- **node-api**: recebe as requisições, valida os dados, salva as tarefas em JSON e chama o serviço Python
- **python-llm**: recebe o texto e o idioma, gera o resumo usando LangChain e retorna o resultado

## Requisitos

- Node.js 18+
- Python 3.10+
- Token do Hugging Face (gratuito): https://huggingface.co/settings/tokens

## Configuração

```bash
cp node-api/.env.example node-api/.env
cp python-llm/.env.example python-llm/.env
```

Abra `python-llm/.env` e cole seu `HF_TOKEN`.

## Como rodar

```bash
# instalar dependências
./setup.sh install

# em terminais separados:
./setup.sh start-python
./setup.sh start-node
```

Node disponível em `http://localhost:3005`, Python em `http://localhost:5000`.

## Endpoints

### `GET /`

```bash
curl http://localhost:3005/
```

```json
{ "message": "API is running" }
```

---

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

Idiomas aceitos: `pt`, `en`, `es`. Qualquer outro retorna `400`:

```json
{ "message": "Language not supported" }
```

---

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

---

### `GET /tasks/:id`

```bash
curl http://localhost:3005/tasks/1
```

```json
{
  "id": 1,
  "text": "Seu texto aqui...",
  "summary": "Resumo gerado em português.",
  "lang": "pt"
}
```

---

### `DELETE /tasks/:id`

```bash
curl -X DELETE http://localhost:3005/tasks/1
```

Retorna `204` sem body em caso de sucesso. `404` se a tarefa não existir.

## Decisões tomadas

**Node gerencia as tarefas, Python gera o resumo.** Faz sentido manter as responsabilidades separadas: o Node cuida do CRUD e da persistência, o Python fica focado na integração com o LLM.

**Persistência em JSON.** É o requisito do desafio e resolve bem pra esse escopo. Não tem concorrência de escrita e o volume é baixo.

**Python valida o idioma também.** O Node já valida antes de chamar o Python, mas o serviço Python não deveria confiar cegamente no que chega. Os dois validam.

**Resumo e tradução num único prompt.** Evita duas chamadas ao LLM. O modelo recebe o texto e o idioma alvo e retorna só o resumo já traduzido.

**Tarefa só é criada depois que o resumo chega.** Se a chamada ao Python falhar, nada é persistido. Evita registros incompletos no JSON.

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
