import { BarChart3, GraduationCap, Sigma, UsersRound } from "lucide-react";
import type { GlobalMetrics } from "../types/analysis";
import { num, pct } from "../lib/utils";

const icons = [Sigma, BarChart3, UsersRound, GraduationCap];

export function MetricCards({ metrics }: { metrics: GlobalMetrics }) {
  const cards = [
    { label: "Alfa de Cronbach", value: num(metrics.cronbach_alpha), hint: "Consistência interna" },
    { label: "Média de acertos", value: `${num(metrics.mean_score, 2)} (${pct(metrics.mean_percent)})`, hint: "Escore médio" },
    { label: "Examinandos", value: String(metrics.students_count), hint: "Linhas analisadas" },
    { label: "Itens", value: String(metrics.items_count), hint: "Colunas binárias" }
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = icons[index];
        return (
          <div key={card.label} className="rounded-lg border border-academy-line bg-academy-panel/86 p-5 shadow-glow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">{card.label}</p>
              <Icon className="h-5 w-5 text-academy-teal" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

