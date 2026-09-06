import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

export type ThemeMode = "dark" | "light";

export function ThemeToggle({ theme, onToggle }: { theme: ThemeMode; onToggle: () => void }) {
  const isDark = theme === "dark";

  return (
    <Button variant="secondary" className="shrink-0" onClick={onToggle} title="Alternar modo claro e escuro">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? "Modo claro" : "Modo noturno"}
    </Button>
  );
}

