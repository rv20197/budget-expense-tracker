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
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={selectId}>
        {label}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
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
        {error ? <span className="text-xs text-red-600 mt-1 block">{error}</span> : null}
      </label>
    );
  },
);

Select.displayName = "Select";
