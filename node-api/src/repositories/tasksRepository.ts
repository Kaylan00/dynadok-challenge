import fs from "fs";
import path from "path";

export interface Task {
  id: number;
  text: string;
  summary: string;
  lang: string;
}

interface PersistedData {
  currentId: number;
  tasks: Task[];
}

const DATA_FILE = process.env.DATA_FILE ?? path.resolve(__dirname, "../../data/tasks.json");

export class TasksRepository {
  private tasks: Task[] = [];
  private currentId = 1;

  constructor() {
    this.load();
  }

  createTask(text: string, lang: string, summary: string): Task {
    const task: Task = {
      id: this.currentId++,
      text,
      summary,
      lang,
    };
    this.tasks.push(task);
    this.persist();
    return task;
  }

  getAllTasks(): Task[] {
    return this.tasks;
  }

  getTaskById(id: number): Task | null {
    return this.tasks.find((t) => t.id === id) ?? null;
  }

  deleteTask(id: number): boolean {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;

    this.tasks.splice(index, 1);
    this.persist();
    return true;
  }

  private load(): void {
    try {
      if (!fs.existsSync(DATA_FILE)) return;
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const data = JSON.parse(raw) as PersistedData;
      this.tasks = data.tasks ?? [];
      this.currentId = data.currentId ?? 1;
    } catch {
      this.tasks = [];
      this.currentId = 1;
    }
  }

  private persist(): void {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data: PersistedData = {
      currentId: this.currentId,
      tasks: this.tasks,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  }
}
