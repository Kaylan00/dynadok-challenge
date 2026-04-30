import { ChildProcess, spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";

const PYTHON_PORT = Number(process.env.INTEGRATION_PYTHON_PORT) || 5099;
const PYTHON_URL = `http://127.0.0.1:${PYTHON_PORT}`;
const DATA_FILE = path.join(os.tmpdir(), `integ-tasks-${process.pid}.json`);

process.env.DATA_FILE = DATA_FILE;
process.env.PYTHON_LLM_URL = PYTHON_URL;

import request from "supertest";

const PYTHON_ROOT = path.resolve(__dirname, "../../python-llm");
const PYTHON_BIN = path.join(PYTHON_ROOT, ".venv/bin/python");

let pythonProc: ChildProcess | null = null;

function ping(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve((res.statusCode ?? 500) < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitFor(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await ping(url)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Serviço em ${url} não respondeu em ${timeoutMs}ms`);
}

beforeAll(async () => {
  if (!fs.existsSync(PYTHON_BIN)) {
    throw new Error(
      `venv do Python não encontrada em ${PYTHON_BIN}. Rode ./setup.sh install-python antes.`
    );
  }

  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);

  pythonProc = spawn(
    PYTHON_BIN,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      String(PYTHON_PORT),
    ],
    {
      cwd: PYTHON_ROOT,
      env: { ...process.env, LLM_FAKE: "1", HF_TOKEN: "ignored" },
      stdio: "pipe",
    }
  );

  pythonProc.stderr?.on("data", (chunk) => {
    if (process.env.DEBUG_INTEGRATION) process.stderr.write(chunk);
  });

  await waitFor(`${PYTHON_URL}/`);
}, 60_000);

afterAll(async () => {
  if (pythonProc && !pythonProc.killed) {
    pythonProc.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 200));
    if (!pythonProc.killed) pythonProc.kill("SIGKILL");
  }
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
});

describe("Integração Node ↔ Python", () => {
  let app: any;

  beforeAll(() => {
    jest.resetModules();
    app = require("../src/app").default;
  });

  it("POST /tasks chama o Python real e devolve o resumo", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ text: "Texto pra teste de integração ponta a ponta.", lang: "pt" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      text: "Texto pra teste de integração ponta a ponta.",
      lang: "pt",
    });
    expect(res.body.summary).toContain("FAKE_SUMMARY");
    expect(res.body.summary).toContain("Portuguese");
  });

  it("retorna 400 para idioma inválido", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ text: "qualquer", lang: "fr" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Language not supported");
  });

  it("persiste a tarefa criada no arquivo JSON", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ text: "outro texto", lang: "en" });
    expect(res.status).toBe(201);

    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const ids = raw.tasks.map((t: any) => t.id);
    expect(ids).toContain(res.body.id);
  });
});
