import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpenCheck, Database, FileText, HelpCircle, Layers3, Microscope, UsersRound } from "lucide-react";
import { api } from "./api/client";
import { AcademicCharts } from "./components/Charts";
import { DataTable } from "./components/DataTable";
import { FilterBar } from "./components/FilterBar";
import { GroupComparison } from "./components/GroupComparison";
import { LegendGuide } from "./components/LegendGuide";
import { MetricCards } from "./components/MetricCards";
import { ReportActions } from "./components/ReportActions";
import { SPHeatmap } from "./components/SPHeatmap";
import { ThemeToggle, type ThemeMode } from "./components/ThemeToggle";
import { UploadPanel } from "./components/UploadPanel";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { num, pct } from "./lib/utils";
import type { AnalysisResponse, ItemMetric, PreviewResponse, StudentMetric, Zone } from "./types/analysis";

type Tab = "dashboard" | "items" | "students" | "sp" | "groups" | "legend" | "exports";

const APP_VERSION = "1.0.4";

const tabs: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "items", label: "Itens", icon: BookOpenCheck },
  { id: "students", label: "Estudantes", icon: UsersRound },
  { id: "sp", label: "Curva S-P", icon: Layers3 },
  { id: "groups", label: "Grupos", icon: Database },
  { id: "legend", label: "Legendas", icon: HelpCircle },
  { id: "exports", label: "Relatório", icon: FileText }
];

const emptyZoneCounts: Record<Zone, number> = {
  expected_correct: 0,
  expected_error: 0,
  unexpected_correct: 0,
  anomalous_error: 0
};

function classifySPCell(value: 0 | 1, col: number, studentScore: number): Zone {
  const expectedCorrect = col < studentScore;
  if (value === 1 && expectedCorrect) return "expected_correct";
  if (value === 0 && expectedCorrect) return "anomalous_error";
  if (value === 1) return "unexpected_correct";
  return "expected_error";
}

function normalizeStudentId(value: string | number) {
  return String(value).replace(/\.0$/, "");
}

function normalizeAnalysisMetrics(analysis: AnalysisResponse): AnalysisResponse {
  const denominator = Math.max(1, analysis.globals.students_count);
  const studentScores = new Map(analysis.sp.student_curve.map((point) => [normalizeStudentId(point.label), point.value]));
  const itemWeights = new Map(analysis.sp.problem_curve.map((point) => [point.label, point.value]));
  const totalWeight = Math.max(1, analysis.sp.problem_curve.reduce((sum, point) => sum + point.value, 0));
  const zoneCounts = { ...emptyZoneCounts };
  const studentInconsistencies = new Map<string, { guesses: number; anomalousErrors: number; weightedPenalty: number }>();
  const normalizedCells = analysis.sp.cells.map((cell) => {
    const studentId = normalizeStudentId(cell.student_id);
    const score = studentScores.get(studentId) ?? 0;
    const zone = classifySPCell(cell.value, cell.col, score);

    zoneCounts[zone] += 1;
    if (zone === "unexpected_correct" || zone === "anomalous_error") {
      const current = studentInconsistencies.get(studentId) ?? { guesses: 0, anomalousErrors: 0, weightedPenalty: 0 };
      if (zone === "unexpected_correct") current.guesses += 1;
      if (zone === "anomalous_error") current.anomalousErrors += 1;
      current.weightedPenalty += itemWeights.get(cell.item) ?? 0;
      studentInconsistencies.set(studentId, current);
    }

    return { ...cell, student_id: studentId, zone };
  });

  return {
    ...analysis,
    items: analysis.items.map((item) => {
      const p_i = Number((item.frequency_correct / denominator).toFixed(4));
      const { sp_atypical_rate: _removed, ...itemWithoutAtypicalRate } = item as ItemMetric & { sp_atypical_rate?: number };
      return {
        ...itemWithoutAtypicalRate,
        proportion_correct: p_i,
        difficulty_p_star: p_i
      };
    }),
    students: analysis.students.map((student) => {
      const studentId = normalizeStudentId(student.student_id);
      const inconsistency = studentInconsistencies.get(studentId);
      return {
        ...student,
        student_id: studentId,
        guesses: inconsistency?.guesses ?? 0,
        anomalous_errors: inconsistency?.anomalousErrors ?? 0,
        caution_index_c_n: Number(((inconsistency?.weightedPenalty ?? 0) / totalWeight).toFixed(4))
      };
    }),
    sp: {
      ...analysis.sp,
      cells: normalizedCells,
      zone_counts: zoneCounts
    }
  };
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [baseAnalysis, setBaseAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem("psicoedu-theme");
    return saved === "light" ? "light" : "dark";
  });
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("psicoedu-theme", theme);
  }, [theme]);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyze(file);
      setBaseAnalysis(result);
      setAnalysis(result);
      setPreview(result.preview);
      setFilters({});
      setActiveTab("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível processar a matriz.");
    } finally {
      setLoading(false);
    }
  }

  const displayAnalysis = useMemo(() => {
    return analysis ? normalizeAnalysisMetrics(analysis) : null;
  }, [analysis]);

  const studentRows = useMemo<Record<string, unknown>[]>(() => {
    return displayAnalysis?.students.map((student) => ({ ...student, ...student.metadata })) ?? [];
  }, [displayAnalysis]);

  const filterSourceRows = useMemo<Record<string, unknown>[]>(() => {
    return baseAnalysis?.students.map((student) => ({ ...student, ...student.metadata })) ?? [];
  }, [baseAnalysis]);

  async function handleFiltersChange(nextFilters: Record<string, string>) {
    setFilters(nextFilters);
    const hasActiveFilters = Object.values(nextFilters).some(Boolean);
    if (!hasActiveFilters) {
      if (baseAnalysis) {
        setAnalysis(baseAnalysis);
        setPreview(baseAnalysis.preview);
      }
      return;
    }
    if (!file) return;

    setFilterLoading(true);
    setError(null);
    try {
      const result = await api.analyzeFiltered(file, nextFilters);
      setAnalysis(result);
      setPreview(result.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível aplicar os filtros.");
    } finally {
      setFilterLoading(false);
    }
  }

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setAnalysis(null);
    setBaseAnalysis(null);
    setFilters({});
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-academy-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-academy-line bg-white/5 px-3 py-1 text-xs text-academy-teal">
              <Microscope className="h-3.5 w-3.5" />
              TCT, Curva S-P e matriz zonal
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">PsicoEdu Analytics</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Ambiente acadêmico para análise psicométrica de avaliações educacionais, com foco em Educação Matemática e Avaliação Educacional.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle theme={theme} onToggle={() => setTheme((current) => current === "dark" ? "light" : "dark")} />
            <Badge className="rounded-md">FastAPI</Badge>
            <Badge className="rounded-md">React + TypeScript</Badge>
            <Badge className="rounded-md">Exportação acadêmica</Badge>
            <Badge className="rounded-md">v{APP_VERSION}</Badge>
          </div>
        </header>

        <UploadPanel
          file={file}
          preview={preview}
          loading={loading}
          error={error}
          onFile={handleFileChange}
          onPreview={setPreview}
          onAnalyze={analyze}
          onError={setError}
        />

        {displayAnalysis && (
          <>
            {displayAnalysis.warnings.length > 0 && (
              <div className="rounded-lg border border-academy-gold/50 bg-academy-gold/10 p-4 text-sm text-yellow-100">
                {displayAnalysis.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            )}

            <nav className="flex gap-2 overflow-x-auto rounded-lg border border-academy-line bg-academy-panel/75 p-2 scrollbar-thin">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "primary" : "ghost"}
                    className="shrink-0"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </nav>

            <FilterBar
              rows={filterSourceRows}
              columns={baseAnalysis?.preview.metadata_columns ?? displayAnalysis.preview.metadata_columns}
              filters={filters}
              onChange={handleFiltersChange}
              applying={filterLoading}
            />

            {activeTab === "dashboard" && (
              <section className="space-y-5">
                <MetricCards metrics={displayAnalysis.globals} />
                <AcademicCharts analysis={displayAnalysis} />
              </section>
            )}

            {activeTab === "items" && (
              <Card>
                <CardHeader>
                  <CardTitle>Indicadores por item</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    rows={displayAnalysis.items as unknown as Record<string, unknown>[]}
                    filename="indicadores-itens.csv"
                    columns={[
                      { key: "item", label: "Item" },
                      { key: "frequency_correct", label: "Acertos" },
                      { key: "difficulty_p_star", label: "p_i", render: (row) => num((row as unknown as ItemMetric).difficulty_p_star) },
                      { key: "coefficient_d_i", label: "D_i", render: (row) => num((row as unknown as ItemMetric).coefficient_d_i) },
                      { key: "point_biserial", label: "r_pbi", render: (row) => num((row as unknown as ItemMetric).point_biserial) }
                    ]}
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === "students" && (
              <Card>
                <CardHeader>
                  <CardTitle>Indicadores por estudante</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    rows={studentRows}
                    filename="indicadores-estudantes.csv"
                    columns={[
                      { key: "student_id", label: "ID" },
                      { key: "raw_score", label: "Escore" },
                      { key: "percent_correct", label: "% acerto", render: (row) => pct((row as unknown as StudentMetric).percent_correct) },
                      { key: "caution_index_c_n", label: "C_n", render: (row) => num((row as unknown as StudentMetric).caution_index_c_n) },
                      { key: "guesses", label: "Chutes" },
                      { key: "anomalous_errors", label: "Erros anômalos" },
                      ...displayAnalysis.preview.metadata_columns.map((column) => ({ key: column, label: column }))
                    ]}
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === "sp" && <SPHeatmap analysis={displayAnalysis} />}

            {activeTab === "groups" && <GroupComparison groups={displayAnalysis.groups} />}

            {activeTab === "legend" && <LegendGuide />}

            {activeTab === "exports" && (
              <Card>
                <CardHeader>
                  <CardTitle>Exportação e relatório acadêmico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ReportActions file={file} analysis={displayAnalysis} filters={filters} />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-md border border-academy-line bg-white/[.03] p-4">
                      <p className="text-sm font-medium text-slate-100">Resumo estatístico</p>
                      <p className="mt-2 text-sm text-slate-400">Média {num(displayAnalysis.globals.mean_score, 2)}, DP {num(displayAnalysis.globals.score_std, 2)} e alfa {num(displayAnalysis.globals.cronbach_alpha)}.</p>
                    </div>
                    <div className="rounded-md border border-academy-line bg-white/[.03] p-4">
                      <p className="text-sm font-medium text-slate-100">Matriz zonal</p>
                      <p className="mt-2 text-sm text-slate-400">Chutes e erros anômalos destacados para interpretação diagnóstica.</p>
                    </div>
                    <div className="rounded-md border border-academy-line bg-white/[.03] p-4">
                      <p className="text-sm font-medium text-slate-100">Expansão futura</p>
                      <p className="mt-2 text-sm text-slate-400">Arquitetura preparada para TRI, Rasch e DIF em novos serviços estatísticos.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
