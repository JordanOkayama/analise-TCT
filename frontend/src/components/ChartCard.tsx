import { Download } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { useRef } from "react";
import { toPng, toSvg } from "html-to-image";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  id: string;
  exportRef?: RefObject<HTMLElement>;
}

export function ChartCard({ title, children, id, exportRef }: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  async function exportImage(type: "png" | "svg") {
    const target = exportRef?.current ?? ref.current;
    if (!target) return;
    const width = Math.max(target.scrollWidth, target.clientWidth);
    const height = Math.max(target.scrollHeight, target.clientHeight);
    const options = {
      backgroundColor: "#0b1d23",
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: "none",
        overflow: "visible"
      }
    };
    const dataUrl = type === "png" ? await toPng(target, options) : await toSvg(target, options);
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `${id}.${type}`;
    anchor.click();
  }

  return (
    <Card className="chart-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" className="h-8 px-2" title="Exportar PNG" onClick={() => exportImage("png")}>
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button variant="ghost" className="h-8 px-2" title="Exportar SVG" onClick={() => exportImage("svg")}>
            SVG
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={ref} className="min-h-72 bg-academy-panel p-2">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
