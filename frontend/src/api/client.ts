import type { AnalysisResponse, PreviewResponse } from "../types/analysis";

async function upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(path, { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Falha inesperada." }));
    throw new Error(payload.detail ?? "Falha inesperada.");
  }
  return response.json();
}

export const api = {
  preview: (file: File) => upload<PreviewResponse>("/api/preview", file),
  analyze: (file: File) => upload<AnalysisResponse>("/api/analyze", file),
  async reportPdf(file: File) {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/report/pdf", { method: "POST", body: form });
    if (!response.ok) throw new Error("Não foi possível gerar o PDF.");
    return response.blob();
  }
};

