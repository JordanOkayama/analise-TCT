import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { useRef } from "react";
import { toPng, toSvg } from "html-to-image";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function ChartCard({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  const ref = useRef<HTMLDivElement>(null);

  async function exportImage(type: "png" | "svg") {
    if (!ref.current) return;
    const dataUrl = type === "png" ? await toPng(ref.current, { backgroundColor: "#0b1d23" }) : await toSvg(ref.current, { backgroundColor: "#0b1d23" });
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
