import { Download, FileText } from "lucide-react";
import { api } from "../api/client";
import { downloadBlob, rowsToCsv } from "../lib/utils";
import type { AnalysisResponse } from "../types/analysis";
import { Button } from "./ui/button";

function itemRows(analysis: AnalysisResponse) {
  return analysis.items.map((item) => ({
    Item: item.item,
    Ordem: item.order,
    Acertos: item.frequency_correct,
    "Proporção de acertos": item.proportion_correct,
    "p_i": item.difficulty_p_star,
    "Discriminação": item.discrimination,
    "r_pbi": item.point_biserial,
    "D_i": item.coefficient_d_i,
    "Correlação item-total": item.item_total_correlation
  }));
}

function studentRows(analysis: AnalysisResponse) {
  return analysis.students.map((student) => ({
    ID: student.student_id,
    Escore: student.raw_score,
    "% acerto": student.percent_correct,
    "Índice de suspeição (C_n)": student.caution_index_c_n,
    "Acertos inesperados": student.guesses,
    "Erros anômalos": student.anomalous_errors,
    ...student.metadata
  }));
}

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
        onClick={() => downloadBlob(new Blob([rowsToCsv(itemRows(analysis))], { type: "text/csv;charset=utf-8" }), "itens.csv")}
      >
        <Download className="h-4 w-4" />
        Tabela de itens
      </Button>
      <Button
        variant="secondary"
        onClick={() => downloadBlob(new Blob([rowsToCsv(studentRows(analysis))], { type: "text/csv;charset=utf-8" }), "estudantes.csv")}
      >
        <Download className="h-4 w-4" />
        Tabela de estudantes
      </Button>
    </div>
  );
}
