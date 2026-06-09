import { ArrowDownUp, Download, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { downloadBlob, rowsToCsv } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({ rows, columns, filename }: { rows: T[]; columns: Column<T>[]; filename: string }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>(String(columns[0]?.key ?? ""));
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return [...rows]
      .filter((row) => JSON.stringify(row).toLowerCase().includes(q))
      .sort((a, b) => {
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        const order = av.localeCompare(bv, undefined, { numeric: true });
        return direction === "asc" ? order : -order;
      });
  }, [rows, query, sortKey, direction]);

  function toggleSort(key: string) {
    if (key === sortKey) setDirection(direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input className="pl-9" placeholder="Pesquisar na tabela" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Button
          variant="secondary"
          onClick={() => downloadBlob(new Blob([rowsToCsv(filtered)], { type: "text/csv;charset=utf-8" }), filename)}
        >
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </div>
      <div className="max-h-[520px] overflow-auto rounded-md border border-academy-line scrollbar-thin">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-academy-blue text-slate-200">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-3 py-3 font-medium">
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort(String(column.key))}>
                    {column.label}
                    <ArrowDownUp className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr key={idx} className="border-t border-academy-line odd:bg-white/[.03] hover:bg-white/[.06]">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-3 py-2.5 text-slate-300">
                    {column.render ? column.render(row) : String(row[String(column.key)] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
