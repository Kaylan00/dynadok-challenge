import { Router, Request, Response } from "express";

import { TasksRepository } from "../repositories/tasksRepository";
import { SummarizerService } from "../services/summarizerService";

const SUPPORTED_LANGS = ["pt", "en", "es"];
const PYTHON_LLM_URL = process.env.PYTHON_LLM_URL ?? "http://localhost:5000";

const router = Router();
const tasksRepository = new TasksRepository();
const summarizerService = new SummarizerService(PYTHON_LLM_URL);

/**
 * @openapi
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Cria uma tarefa e retorna o resumo gerado pelo Python
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskBody'
 *     responses:
 *       201:
 *         description: Tarefa criada.
 *       400:
 *         description: text vazio ou idioma não suportado.
 *       502:
 *         description: Serviço Python fora do ar.
 */
router.post("/", async (req: Request, res: Response) => {
  const { text, lang } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ message: "Text is required." });
  }

  if (!lang || !SUPPORTED_LANGS.includes(lang)) {
    return res.status(400).json({ message: "Language not supported" });
  }

  try {
    const summary = await summarizerService.summarize(text, lang);
    const task = tasksRepository.createTask(text, lang, summary);
    return res.status(201).json(task);
  } catch (error) {
    console.error("Erro ao gerar resumo:", error);
    return res.status(502).json({ message: "Failed to communicate with LLM service." });
  }
});

/**
 * @openapi
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Lista todas as tarefas
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", (_req: Request, res: Response) => {
  return res.json(tasksRepository.getAllTasks());
});

/**
 * @openapi
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Busca tarefa por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Não encontrada.
 */
router.get("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid ID." });
  }

  const task = tasksRepository.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  return res.json(task);
});

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Remove uma tarefa
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Removida.
 *       404:
 *         description: Não encontrada.
 */
router.delete("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid ID." });
  }

  const deleted = tasksRepository.deleteTask(id);
  if (!deleted) {
    return res.status(404).json({ message: "Task not found." });
  }

  return res.status(204).send();
});

export default router;
