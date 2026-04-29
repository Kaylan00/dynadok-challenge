import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";

const TEST_DATA_FILE = path.join(os.tmpdir(), `tasks-test-${process.pid}.json`);
process.env.DATA_FILE = TEST_DATA_FILE;

import app from "../src/app";

afterAll(() => {
  if (fs.existsSync(TEST_DATA_FILE)) fs.unlinkSync(TEST_DATA_FILE);
});

jest.mock("axios", () => {
  const post = jest.fn().mockResolvedValue({
    data: { summary: "Resumo gerado pelo mock." },
  });
  return { default: { create: () => ({ post }) }, create: () => ({ post }) };
});

describe("GET /", () => {
  it("retorna mensagem de status", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("API is running");
  });
});

describe("POST /tasks", () => {
  it("cria tarefa com dados válidos", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ text: "Texto de teste para resumo.", lang: "pt" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      text: "Texto de teste para resumo.",
      lang: "pt",
      summary: expect.any(String),
    });
  });

  it("retorna 400 quando text não é enviado", async () => {
    const res = await request(app).post("/tasks").send({ lang: "pt" });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para idioma não suportado", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ text: "qualquer texto", lang: "fr" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Language not supported");
  });

  it("retorna 400 quando text é uma string vazia", async () => {
    const res = await request(app).post("/tasks").send({ text: "", lang: "en" });
    expect(res.status).toBe(400);
  });
});

describe("GET /tasks", () => {
  it("retorna array de tarefas", async () => {
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /tasks/:id", () => {
  it("retorna tarefa existente", async () => {
    const created = await request(app)
      .post("/tasks")
      .send({ text: "Texto para busca por id.", lang: "en" });

    const res = await request(app).get(`/tasks/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it("retorna 404 para id inexistente", async () => {
    const res = await request(app).get("/tasks/999999");
    expect(res.status).toBe(404);
  });

  it("retorna 400 para id inválido", async () => {
    const res = await request(app).get("/tasks/abc");
    expect(res.status).toBe(400);
  });
});

describe("DELETE /tasks/:id", () => {
  it("deleta tarefa existente e retorna 204", async () => {
    const created = await request(app)
      .post("/tasks")
      .send({ text: "Tarefa para deletar.", lang: "es" });

    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it("retorna 404 ao tentar deletar id inexistente", async () => {
    const res = await request(app).delete("/tasks/999999");
    expect(res.status).toBe(404);
  });
});
