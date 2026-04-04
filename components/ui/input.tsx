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
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={inputId}>
        {label}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            className,
          )}
          {...props}
        />
        {error ? <span className="text-xs text-red-600 mt-1 block">{error}</span> : null}
      </label>
    );
  },
);

Input.displayName = "Input";
