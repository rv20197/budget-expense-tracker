"use client";

import * as React from "react";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";

type InputProps = Omit<TextFieldProps, "error" | "helperText" | "label" | "variant"> & {
  error?: string;
  label?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, InputLabelProps, type, value, defaultValue, ...props }, ref) => {
    const shouldShrinkLabel = type === "date" || value != null || defaultValue != null;

    return (
      <TextField
        {...props}
        type={type}
        value={value}
        defaultValue={defaultValue}
        inputRef={ref}
        label={label}
        error={Boolean(error)}
        helperText={error}
        fullWidth
        size="small"
        InputLabelProps={{
          ...InputLabelProps,
          shrink: InputLabelProps?.shrink ?? shouldShrinkLabel,
        }}
      />
    );
  },
);

Input.displayName = "Input";
