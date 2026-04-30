import fs from "fs";
import os from "os";
import path from "path";

describe("Persistência em JSON", () => {
  const TEST_FILE = path.join(os.tmpdir(), `persist-test-${process.pid}.json`);

  beforeEach(() => {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    process.env.DATA_FILE = TEST_FILE;
    jest.resetModules();
  });

  afterAll(() => {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  });

  function loadRepo() {
    const { TasksRepository } = require("../src/repositories/tasksRepository");
    return new TasksRepository();
  }

  it("preserva tarefas e currentId entre instâncias", () => {
    const repo1 = loadRepo();
    const t1 = repo1.createTask("texto 1", "pt", "resumo 1");
    const t2 = repo1.createTask("texto 2", "en", "summary 2");
    expect(t1.id).toBe(1);
    expect(t2.id).toBe(2);

    jest.resetModules();
    const repo2 = loadRepo();
    expect(repo2.getAllTasks()).toHaveLength(2);
    expect(repo2.getTaskById(1)).toMatchObject({ text: "texto 1", lang: "pt" });
    expect(repo2.getTaskById(2)).toMatchObject({ text: "texto 2", lang: "en" });

    const t3 = repo2.createTask("texto 3", "es", "resumen 3");
    expect(t3.id).toBe(3);
  });

  it("não reusa id de tarefa deletada após reinicializar", () => {
    const repo1 = loadRepo();
    repo1.createTask("a", "pt", "ra");
    repo1.createTask("b", "pt", "rb");
    repo1.deleteTask(2);

    jest.resetModules();
    const repo2 = loadRepo();
    expect(repo2.getAllTasks()).toHaveLength(1);

    const novo = repo2.createTask("c", "pt", "rc");
    expect(novo.id).toBe(3);
  });

  it("escreve JSON válido no arquivo configurado", () => {
    const repo = loadRepo();
    repo.createTask("texto", "pt", "resumo");

    expect(fs.existsSync(TEST_FILE)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(TEST_FILE, "utf-8"));
    expect(raw).toEqual({
      currentId: 2,
      tasks: [{ id: 1, text: "texto", summary: "resumo", lang: "pt" }],
    });
  });
});
