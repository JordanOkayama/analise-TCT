import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GroupMetric } from "../types/analysis";
import { num, pct } from "../lib/utils";
import { ChartCard } from "./ChartCard";
import { DataTable } from "./DataTable";

export function GroupComparison({ groups }: { groups: GroupMetric[] }) {
  if (!groups.length) {
    return (
      <div className="rounded-lg border border-academy-line bg-academy-panel/86 p-6 text-sm text-slate-400">
        Inclua colunas como escola, município, turma, série ou grupo no CSV para habilitar comparações.
      </div>
    );
  }

  const chartData = groups.map((group) => ({
    label: `${group.variable}: ${group.group}`,
    mean_percent: group.mean_percent,
    n: group.n
  }));

  return (
    <div className="space-y-5">
      <ChartCard id="comparacao-grupos" title="Comparação entre grupos">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#9fb4b8" fontSize={11} interval={0} angle={-25} textAnchor="end" height={90} />
            <YAxis stroke="#9fb4b8" fontSize={12} domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
            <Tooltip contentStyle={{ background: "#0b1d23", border: "1px solid #1e3a43" }} formatter={(value) => pct(Number(value))} />
            <Bar dataKey="mean_percent" fill="#5ee0bb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <DataTable
        rows={groups as unknown as Record<string, unknown>[]}
        filename="comparacao-grupos.csv"
        columns={[
          { key: "variable", label: "Variável" },
          { key: "group", label: "Grupo" },
          { key: "n", label: "n" },
          { key: "mean_score", label: "Média", render: (row) => num((row as unknown as GroupMetric).mean_score, 2) },
          { key: "mean_percent", label: "% médio", render: (row) => pct((row as unknown as GroupMetric).mean_percent) },
          { key: "std_score", label: "DP", render: (row) => num((row as unknown as GroupMetric).std_score, 2) },
          { key: "cronbach_alpha", label: "Alfa", render: (row) => num((row as unknown as GroupMetric).cronbach_alpha) }
        ]}
      />
    </div>
  );
}

