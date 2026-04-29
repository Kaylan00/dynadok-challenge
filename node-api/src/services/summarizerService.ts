import axios, { AxiosInstance } from "axios";

interface SummarizeResponse {
  summary: string;
}

export class SummarizerService {
  private client: AxiosInstance;

  constructor(baseURL: string, timeoutMs = 60_000) {
    this.client = axios.create({ baseURL, timeout: timeoutMs });
  }

  async summarize(text: string, lang: string): Promise<string> {
    const { data } = await this.client.post<SummarizeResponse>("/summarize", {
      text,
      lang,
    });
    return data.summary;
  }
}
