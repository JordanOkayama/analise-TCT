import React from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-academy-line bg-[#071418]/70 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-academy-teal",
        className
      )}
      {...props}
    />
  );
}

