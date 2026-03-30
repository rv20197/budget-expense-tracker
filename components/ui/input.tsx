"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label className="grid gap-2 text-sm text-slate-700" htmlFor={inputId}>
        {label ? <span className="font-medium">{label}</span> : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            className,
          )}
          {...props}
        />
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </label>
    );
  },
);

Input.displayName = "Input";
