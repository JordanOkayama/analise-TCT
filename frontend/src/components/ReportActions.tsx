import { Download, FileText } from "lucide-react";
import { api } from "../api/client";
import { downloadBlob, rowsToCsv } from "../lib/utils";
import type { AnalysisResponse } from "../types/analysis";
import { Button } from "./ui/button";

export function ReportActions({ file, analysis }: { file: File | null; analysis: AnalysisResponse }) {
  async function downloadPdf() {
    if (!file) return;
    const blob = await api.reportPdf(file);
    downloadBlob(blob, "relatorio-psicometrico.pdf");
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={downloadPdf} disabled={!file}>
        <FileText className="h-4 w-4" />
        Relatório PDF
      </Button>
      <Button
        variant="secondary"
        onClick={() => downloadBlob(new Blob([rowsToCsv(analysis.items as unknown as Record<string, unknown>[])], { type: "text/csv" }), "itens.csv")}
      >
        <Download className="h-4 w-4" />
        Tabela de itens
      </Button>
      <Button
        variant="secondary"
        onClick={() => downloadBlob(new Blob([rowsToCsv(analysis.students as unknown as Record<string, unknown>[])], { type: "text/csv" }), "estudantes.csv")}
      >
        <Download className="h-4 w-4" />
        Tabela de estudantes
      </Button>
    </div>
  );
}

