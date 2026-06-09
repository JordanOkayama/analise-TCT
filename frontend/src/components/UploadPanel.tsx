import { AlertCircle, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { api } from "../api/client";
import type { PreviewResponse } from "../types/analysis";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface Props {
  file: File | null;
  preview: PreviewResponse | null;
  loading: boolean;
  error: string | null;
  onFile: (file: File | null) => void;
  onPreview: (preview: PreviewResponse | null) => void;
  onAnalyze: () => void;
  onError: (error: string | null) => void;
}

export function UploadPanel({ file, preview, loading, error, onFile, onPreview, onAnalyze, onError }: Props) {
  async function handleFile(fileList: FileList | null) {
    const selected = fileList?.[0] ?? null;
    onFile(selected);
    onPreview(null);
    onError(null);
    if (!selected) return;
    try {
      onPreview(await api.preview(selected));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Não foi possível validar o arquivo.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Importação da matriz</CardTitle>
          <p className="mt-1 text-sm text-slate-400">CSV binário com ID, itens e metadados opcionais.</p>
        </div>
        <Button onClick={onAnalyze} disabled={!file || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Processar análise
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-academy-line bg-white/5 px-6 text-center transition hover:border-academy-teal">
          <FileSpreadsheet className="mb-3 h-9 w-9 text-academy-teal" />
          <span className="text-sm font-medium text-slate-100">{file?.name ?? "Selecionar arquivo CSV"}</span>
          <span className="mt-1 text-xs text-slate-500">Separadores aceitos: vírgula ou ponto e vírgula</span>
          <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files)} />
        </label>

        <div className="min-w-0">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-academy-red/50 bg-academy-red/10 p-3 text-sm text-red-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full bg-white/8 px-2.5 py-1">Separador: {preview.detected_separator}</span>
                <span className="rounded-full bg-white/8 px-2.5 py-1">ID: {preview.id_column}</span>
                <span className="rounded-full bg-white/8 px-2.5 py-1">{preview.item_columns.length} itens</span>
                <span className="rounded-full bg-white/8 px-2.5 py-1">{preview.metadata_columns.length} metadados</span>
              </div>
              <div className="max-h-60 overflow-auto rounded-md border border-academy-line scrollbar-thin">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="sticky top-0 bg-academy-blue text-slate-200">
                    <tr>{preview.columns.map((col) => <th key={col} className="px-3 py-2 font-medium">{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, idx) => (
                      <tr key={idx} className="border-t border-academy-line odd:bg-white/[.03]">
                        {preview.columns.map((col) => <td key={col} className="px-3 py-2 text-slate-300">{String(row[col] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.issues.map((issue) => (
                <p key={issue.message} className="text-xs text-academy-gold">{issue.message}</p>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-academy-line bg-white/[.03] p-5 text-sm text-slate-400">
              A prévia aparecerá aqui após a seleção de um CSV válido.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

