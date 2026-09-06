import { useEffect, useState } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  rows: Array<Record<string, unknown>>;
  columns: string[];
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void | Promise<void>;
  applying?: boolean;
}

export function FilterBar({ rows, columns, filters, onChange, applying = false }: Props) {
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>(filters);
  const available = columns.filter((column) => rows.some((row) => row[column] !== undefined && row[column] !== null && String(row[column]) !== ""));

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  if (!available.length) return null;

  function setFilter(column: string, value: string) {
    setDraftFilters({ ...draftFilters, [column]: value });
  }

  function apply() {
    void onChange(draftFilters);
  }

  function clear() {
    setDraftFilters({});
    void onChange({});
  }

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="rounded-lg border border-academy-line bg-academy-panel/75 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
          <SlidersHorizontal className="h-4 w-4 text-academy-teal" />
          Filtros de metadados
          {activeCount > 0 && <span className="rounded-full bg-academy-teal/15 px-2 py-0.5 text-xs text-academy-teal">{activeCount} ativo(s)</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="h-8 px-2" onClick={apply} disabled={applying}>
            <Check className="h-4 w-4" />
            {applying ? "Aplicando..." : "Aplicar filtros"}
          </Button>
          <Button variant="ghost" className="h-8 px-2" onClick={clear} disabled={applying}>
            <X className="h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {available.map((column) => {
          const values = Array.from(new Set(rows.map((row) => String(row[column] ?? "")).filter(Boolean))).sort();
          return (
            <label key={column} className="text-xs text-slate-400">
              {column}
              <select
                className="mt-1 h-10 w-full rounded-md border border-academy-line bg-[#071418] px-3 text-sm text-slate-100 outline-none focus:border-academy-teal"
                value={draftFilters[column] ?? ""}
                onChange={(event) => setFilter(column, event.target.value)}
              >
                <option value="">Todos</option>
                {values.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}
