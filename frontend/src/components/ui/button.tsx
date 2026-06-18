import React from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-academy-teal text-academy-ink hover:bg-[#7de8ca]",
        variant === "secondary" && "border border-academy-line bg-white/6 text-slate-100 hover:bg-white/10",
        variant === "ghost" && "text-slate-300 hover:bg-white/8 hover:text-white",
        variant === "danger" && "bg-academy-red text-white hover:bg-[#f17a81]",
        className
      )}
      {...props}
    />
  );
}

