import { useMemo, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { AnalysisResponse, Zone } from "../types/analysis";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ChartCard } from "./ChartCard";

const zoneStyles: Record<Zone, { label: string; className: string; color: string }> = {
  expected_correct: { label: "Acerto esperado", className: "bg-[#5ee0bb]", color: "#5ee0bb" },
  expected_error: { label: "Erro esperado", className: "bg-[#1e3a43]", color: "#1e3a43" },
  unexpected_correct: { label: "Acerto inesperado", className: "bg-[#f3c969]", color: "#f3c969" },
  anomalous_error: { label: "Erro anômalo", className: "bg-[#ef6b73]", color: "#ef6b73" }
};

export function SPHeatmap({ analysis }: { analysis: AnalysisResponse }) {
  const [activeZones, setActiveZones] = useState<Set<Zone>>(new Set(Object.keys(zoneStyles) as Zone[]));
  const [zoom, setZoom] = useState(1);
  const exportSurfaceRef = useRef<HTMLDivElement>(null);
  const cellMap = useMemo(() => new Map(analysis.sp.cells.map((cell) => [`${cell.row}-${cell.col}`, cell])), [analysis.sp.cells]);
  const rows = analysis.sp.ordered_students.length;
  const cols = analysis.sp.ordered_items.length;
  const baseCellSize = cols > 60 ? 22 : cols > 40 ? 26 : 30;
  const cellSize = Math.round(baseCellSize * zoom);
  const studentColumnWidth = 150;
  const matrixWidth = studentColumnWidth + cols * cellSize;

  function toggle(zone: Zone) {
    const next = new Set(activeZones);
    if (next.has(zone)) next.delete(zone);
    else next.add(zone);
    setActiveZones(next);
  }

  function changeZoom(value: number) {
    setZoom(Math.min(1.8, Math.max(0.6, value)));
  }

  return (
    <div className="space-y-5">
      <ChartCard id="curva-sp-matriz-zonal" title="Curva S-P e matriz zonal" exportRef={exportSurfaceRef}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>{rows} estudantes x {cols} itens</span>
          <span>A matriz completa pode ser explorada com rolagem horizontal e vertical.</span>
        </div>
        <div className="mb-4 flex flex-col gap-3 rounded-md border border-academy-line bg-white/[.03] p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(zoneStyles) as Zone[]).map((zone) => (
              <button
                key={zone}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                  activeZones.has(zone) ? "border-academy-teal text-white" : "border-academy-line text-slate-500"
                }`}
                onClick={() => toggle(zone)}
              >
                <span className={`h-2.5 w-2.5 rounded-sm ${zoneStyles[zone].className}`} />
                {zoneStyles[zone].label}
                <span className="text-slate-500">{analysis.sp.zone_counts[zone]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-academy-line bg-academy-ink/70 px-2 py-1">
            <Button variant="ghost" className="h-8 w-8 px-0" title="Reduzir zoom" onClick={() => changeZoom(zoom - 0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <input
              aria-label="Zoom da matriz zonal"
              className="h-2 w-32 accent-[#5ee0bb]"
              max="1.8"
              min="0.6"
              step="0.05"
              type="range"
              value={zoom}
              onChange={(event) => changeZoom(Number(event.target.value))}
            />
            <Button variant="ghost" className="h-8 w-8 px-0" title="Aumentar zoom" onClick={() => changeZoom(zoom + 0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="h-8 w-8 px-0" title="Redefinir zoom" onClick={() => changeZoom(1)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <span className="min-w-12 text-right text-xs text-slate-300">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
        <div className="max-h-[72vh] overflow-auto rounded-md border border-academy-line scrollbar-thin">
          <div ref={exportSurfaceRef} className="w-max bg-academy-panel p-3" style={{ minWidth: matrixWidth }}>
            <div
              className="grid overflow-hidden rounded-md border border-academy-line"
              style={{
                gridTemplateColumns: `${studentColumnWidth}px repeat(${cols}, ${cellSize}px)`,
                gridTemplateRows: `32px repeat(${rows}, ${cellSize}px)`
              }}
            >
              <div className="sticky left-0 top-0 z-20 border-b border-r border-academy-line bg-academy-blue px-2 py-1 text-xs text-slate-300">Estudante</div>
              {analysis.sp.ordered_items.map((item) => (
                <div key={item} className="sticky top-0 z-10 border-b border-r border-academy-line bg-academy-blue px-1 py-1 text-center text-[10px] text-slate-300">
                  {item}
                </div>
              ))}
              {analysis.sp.ordered_students.map((student, row) => (
                <div key={`${student}-row`} className="contents">
                  <div className="sticky left-0 z-10 truncate border-b border-r border-academy-line bg-academy-blue/95 px-2 py-1 text-xs text-slate-300">
                    {student}
                  </div>
                  {analysis.sp.ordered_items.map((item, col) => {
                    const cell = cellMap.get(`${row}-${col}`);
                    const visible = cell ? activeZones.has(cell.zone) : false;
                    return (
                      <div
                        key={`${student}-${item}`}
                        title={`${student} / ${item}: ${cell?.value} - ${cell ? zoneStyles[cell.zone].label : ""}`}
                        className="border-b border-r border-[#17323b]"
                        style={{ backgroundColor: cell && visible ? zoneStyles[cell.zone].color : "#071418" }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ChartCard>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(zoneStyles) as Zone[]).map((zone) => (
          <Badge key={zone} className="justify-between rounded-md py-2">
            <span className="inline-flex items-center gap-2">
              <span className={`h-3 w-3 rounded-sm ${zoneStyles[zone].className}`} />
              {zoneStyles[zone].label}
            </span>
            <span>{analysis.sp.zone_counts[zone]}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
