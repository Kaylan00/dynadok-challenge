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
 *     summary: Criar tarefa com resumo
 *     description: Envia o texto pro serviço Python, aguarda o resumo e persiste a tarefa. Nada é salvo se o Python falhar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskBody'
 *     responses:
 *       201:
 *         description: Tarefa criada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Parâmetros inválidos (text ausente ou idioma não suportado).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *       502:
 *         description: Falha na comunicação com o serviço Python LLM.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
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
    return res.status(502).json({ message: "Falha ao comunicar com o serviço de LLM." });
  }
});

/**
 * @openapi
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Listar tarefas
 *     responses:
 *       200:
 *         description: Lista de tarefas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
router.get("/", (_req: Request, res: Response) => {
  return res.json(tasksRepository.getAllTasks());
});

/**
 * @openapi
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Buscar tarefa por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarefa encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: ID inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *       404:
 *         description: Tarefa não encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 */
router.get("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const task = tasksRepository.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: "Tarefa não encontrada." });
  }

  return res.json(task);
});

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Deletar tarefa por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Tarefa deletada com sucesso.
 *       400:
 *         description: ID inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *       404:
 *         description: Tarefa não encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 */
router.delete("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const deleted = tasksRepository.deleteTask(id);
  if (!deleted) {
    return res.status(404).json({ message: "Tarefa não encontrada." });
  }

  return res.status(204).send();
});

export default router;
