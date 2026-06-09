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
      <ChartCard id="dificuldade-itens" title="Dificuldade dos itens (p*)">
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

      <ChartCard id="cautela-escore" title="Dispersão entre cautela e escore">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="raw_score" name="Escore" {...axis} />
            <YAxis type="number" dataKey="caution_index_c_n" name="Cautela" {...axis} />
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
        <ScoreBoxPlot stats={box.box} max={analysis.globals.items_count} />
      </ChartCard>
    </div>
  );
}

function scoreBox(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
  return {
    name: "Escores",
    box: [sorted[0] ?? 0, q(0.25), q(0.5), q(0.75), sorted[sorted.length - 1] ?? 0],
    fill: "#5ee0bb"
  };
}

function ScoreBoxPlot({ stats, max }: { stats: number[]; max: number }) {
  const [min, q1, median, q3, high] = stats;
  const width = 820;
  const height = 260;
  const left = 70;
  const right = 40;
  const scale = (value: number) => left + (value / Math.max(1, max)) * (width - left - right);
  const y = 130;
  const ticks = Array.from({ length: max + 1 }, (_, index) => index).filter((value) => value === 0 || value === max || value % Math.max(1, Math.ceil(max / 8)) === 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full">
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
      <rect x={scale(q1)} y={y - 42} width={Math.max(2, scale(q3) - scale(q1))} height="84" fill="#5ee0bb" opacity="0.82" rx="4" />
      <line x1={scale(median)} y1={y - 46} x2={scale(median)} y2={y + 46} stroke="#071418" strokeWidth="4" />
      <text x={left} y="44" fill="#cfe2e1" fontSize="13">Min {min} | Q1 {q1} | Mediana {median} | Q3 {q3} | Max {high}</text>
      <text x={left} y="236" fill="#cfe2e1" fontSize="12">Escore bruto</text>
    </svg>
  );
}
