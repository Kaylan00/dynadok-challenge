import express, { Application, Request, Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import tasksRoutes from "./routes/tasksRoutes";

const app: Application = express();

app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LLM Summarizer — Node API",
      version: "1.0.0",
      description:
        "API Node responsável por receber requisições, validar dados, persistir tarefas em JSON e acionar o serviço Python para geração de resumos via LLM.",
    },
    servers: [{ url: "http://localhost:3005", description: "Local" }],
    components: {
      schemas: {
        Task: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            text: { type: "string", example: "Artificial intelligence is transforming industries." },
            summary: { type: "string", example: "A inteligência artificial está transformando indústrias." },
            lang: { type: "string", example: "pt" },
          },
        },
        CreateTaskBody: {
          type: "object",
          required: ["text", "lang"],
          properties: {
            text: { type: "string", description: "Texto a ser resumido.", example: "Artificial intelligence is transforming industries." },
            lang: { type: "string", description: "Idioma do resumo. Valores aceitos: pt, en, es.", example: "pt" },
          },
        },
        ErrorMessage: {
          type: "object",
          properties: {
            message: { type: "string", example: "Language not supported" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API is running" });
});

app.use("/tasks", tasksRoutes);

export default app;
