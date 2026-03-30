"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, options, placeholder, ...props }, ref) => {
    const selectId = id ?? props.name;

    return (
      <label className="grid gap-2 text-sm text-slate-700" htmlFor={selectId}>
        {label ? <span className="font-medium">{label}</span> : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            className,
          )}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </label>
    );
  },
);

Select.displayName = "Select";
