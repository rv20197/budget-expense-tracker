"use client";

import * as React from "react";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";

type InputProps = Omit<TextFieldProps, "error" | "helperText" | "label" | "variant"> & {
  error?: string;
  label?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, ...props }, ref) => (
    <TextField
      {...props}
      inputRef={ref}
      label={label}
      error={Boolean(error)}
      helperText={error}
      fullWidth
      size="small"
    />
  ),
);

Input.displayName = "Input";
