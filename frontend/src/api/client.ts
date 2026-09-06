import type { AnalysisResponse, PreviewResponse } from "../types/analysis";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function upload<T>(path: string, file: File, filters?: Record<string, string>): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  if (filters) form.append("filters", JSON.stringify(filters));
  const response = await fetch(apiUrl(path), { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Falha inesperada." }));
    throw new Error(payload.detail ?? "Falha inesperada.");
  }
  return response.json();
}

export const api = {
  preview: (file: File) => upload<PreviewResponse>("/api/preview", file),
  analyze: (file: File) => upload<AnalysisResponse>("/api/analyze", file),
  analyzeFiltered: (file: File, filters: Record<string, string>) => upload<AnalysisResponse>("/api/analyze-filtered", file, filters),
  async reportPdf(file: File, filters?: Record<string, string>) {
    const form = new FormData();
    form.append("file", file);
    if (filters) form.append("filters", JSON.stringify(filters));
    const response = await fetch(apiUrl("/api/report/pdf"), { method: "POST", body: form });
    if (!response.ok) throw new Error("Nao foi possivel gerar o PDF.");
    return response.blob();
  }
};
