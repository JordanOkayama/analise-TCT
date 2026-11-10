import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { AnalysisResponse } from "../types/analysis";
import { scoreBox, type BoxPlotStats } from "../lib/boxplot";
import { ChartCard } from "./ChartCard";

const axis = { stroke: "#9fb4b8", fontSize: 12 };

export function AcademicCharts({ analysis }: { analysis: AnalysisResponse }) {
  const scoreCounts = Object.values(
    analysis.students.reduce<Record<number, { score: number; count: number }>>((acc, student) => {
      acc[student.raw_score] = acc[student.raw_score] ?? { score: student.raw_score, count: 0 };
      acc[student.raw_score].count += 1;
      return acc;
    }, {})
  );
  const box = scoreBox(analysis.students.map((student) => student.raw_score));

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard id="dificuldade-itens" title="Índice de dificuldade (p_i)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analysis.items}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="item" {...axis} />
            <YAxis {...axis} domain={[0, 1]} />
            <Tooltip contentStyle={{ background: "#0b1d23", border: "1px solid #1e3a43" }} />
            <Bar dataKey="difficulty_p_star" fill="#f3c969" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard id="discriminacao-itens" title="Discriminação dos itens">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analysis.items}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="item" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={{ background: "#0b1d23", border: "1px solid #1e3a43" }} />
            <Bar dataKey="discrimination" fill="#5ee0bb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard id="histograma-escores" title="Histograma dos escores">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={scoreCounts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={{ background: "#0b1d23", border: "1px solid #1e3a43" }} />
            <Bar dataKey="count" fill="#6aa6ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard id="cautela-escore" title="Dispersão entre índice de cautela e escore">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="raw_score" name="Escore" {...axis} />
            <YAxis type="number" dataKey="caution_index_c_n" name="Índice de cautela" {...axis} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#0b1d23", border: "1px solid #1e3a43" }} />
            <Scatter data={analysis.students} fill="#ef6b73" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard id="correlacao-item-total" title="Correlação item-total">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={analysis.items}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="item" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={{ background: "#0b1d23", border: "1px solid #1e3a43" }} />
            <Bar dataKey="item_total_correlation" fill="#5ee0bb" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="difficulty_p_star" stroke="#f3c969" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard id="boxplot-escores" title="Boxplot dos escores">
        <ScoreBoxPlot stats={box} max={analysis.globals.items_count} />
      </ChartCard>
    </div>
  );
}

function ScoreBoxPlot({ stats, max }: { stats: BoxPlotStats | null; max: number }) {
  if (!stats) return <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">Sem escores disponíveis.</div>;
  const { lowerWhisker: min, q1, median, q3, upperWhisker: high, iqr, lowerFence, upperFence, outliers } = stats;
  const format = (value: number) => value.toLocaleString("pt-BR");
  const summary = `Mínimo dentro do limite: ${format(min)}; Q1: ${format(q1)}; Mediana (Q2): ${format(median)}; Q3: ${format(q3)}; Máximo dentro do limite: ${format(high)}; AIQ: ${format(iqr)}; LI: ${format(lowerFence)}; LS: ${format(upperFence)}.`;
  const occurrences = new Map<number, number>();
  const outlierPoints = outliers.map((value) => {
    const occurrence = occurrences.get(value) ?? 0;
    occurrences.set(value, occurrence + 1);
    return { value, occurrence };
  });
  const width = 820;
  const height = 260;
  const left = 70;
  const right = 40;
  const scale = (value: number) => left + (value / Math.max(1, max)) * (width - left - right);
  const y = 130;
  const ticks = Array.from({ length: max + 1 }, (_, index) => index).filter((value) => value === 0 || value === max || value % Math.max(1, Math.ceil(max / 8)) === 0);

  return (
    <div className="flex h-[300px] flex-col">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300" title={summary}>
        <span>Mín. no limite: {format(min)}</span><span>Q1: {format(q1)}</span>
        <span>Mediana: {format(median)}</span><span>Q3: {format(q3)}</span>
        <span>Máx. no limite: {format(high)}</span><span>AIQ: {format(iqr)}</span>
        <span>Discrepantes: {outliers.length}</span>
      </div>
    <svg viewBox={`0 0 ${width} ${height}`} className="min-h-0 w-full flex-1" role="img" aria-label={`Boxplot dos escores. ${summary} Valores potencialmente discrepantes: ${outliers.length}.`}>
      <title>{summary} Valores potencialmente discrepantes: {outliers.length ? outliers.map(format).join(", ") : "nenhum"}.</title>
      <line x1={left} y1="210" x2={width - right} y2="210" stroke="#36555e" />
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={scale(tick)} y1="206" x2={scale(tick)} y2="214" stroke="#789098" />
          <text x={scale(tick)} y="235" textAnchor="middle" fill="#9fb4b8" fontSize="12">{tick}</text>
        </g>
      ))}
      <line x1={scale(min)} y1={y} x2={scale(high)} y2={y} stroke="#e7f1f0" strokeWidth="2" />
      <line x1={scale(min)} y1={y - 28} x2={scale(min)} y2={y + 28} stroke="#e7f1f0" strokeWidth="2" />
      <line x1={scale(high)} y1={y - 28} x2={scale(high)} y2={y + 28} stroke="#e7f1f0" strokeWidth="2" />
      <rect x={scale(q1)} y={y - 42} width={scale(q3) - scale(q1)} height="84" fill="#5ee0bb" opacity="0.82" rx="4" />
      <line x1={scale(median)} y1={y - 46} x2={scale(median)} y2={y + 46} stroke={iqr === 0 ? "#5ee0bb" : "#071418"} strokeWidth="4" />
      {outlierPoints.map(({ value, occurrence }, index) => (
        <circle key={index} data-outlier-score={value} cx={scale(value)} cy={y + (occurrence - ((occurrences.get(value) ?? 1) - 1) / 2) * Math.min(10, 96 / Math.max(1, (occurrences.get(value) ?? 1) - 1))} r="4" fill="#ef6b73" stroke="#071418">
          <title>Valor potencialmente discrepante: {format(value)} (observação {index + 1}). LI: {format(lowerFence)}; LS: {format(upperFence)}.</title>
        </circle>
      ))}
      <text x={(left + width - right) / 2} y="258" textAnchor="middle" fill="#cfe2e1" fontSize="12">Escore bruto</text>
    </svg>
    </div>
  );
}
