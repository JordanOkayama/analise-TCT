import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  rows: Array<Record<string, unknown>>;
  columns: string[];
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
}

export function FilterBar({ rows, columns, filters, onChange }: Props) {
  const available = columns.filter((column) => rows.some((row) => row[column] !== undefined && row[column] !== null && String(row[column]) !== ""));
  if (!available.length) return null;

  function setFilter(column: string, value: string) {
    onChange({ ...filters, [column]: value });
  }

  function clear() {
    onChange({});
  }

  return (
    <div className="rounded-lg border border-academy-line bg-academy-panel/75 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
          <SlidersHorizontal className="h-4 w-4 text-academy-teal" />
          Filtros de metadados
        </div>
        <Button variant="ghost" className="h-8 px-2" onClick={clear}>
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {available.map((column) => {
          const values = Array.from(new Set(rows.map((row) => String(row[column] ?? "")).filter(Boolean))).sort();
          return (
            <label key={column} className="text-xs text-slate-400">
              {column}
              <select
                className="mt-1 h-10 w-full rounded-md border border-academy-line bg-[#071418] px-3 text-sm text-slate-100 outline-none focus:border-academy-teal"
                value={filters[column] ?? ""}
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

