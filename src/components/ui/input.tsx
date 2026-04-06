"use client";

import * as React from "react";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import type { InputLabelProps } from "@mui/material/InputLabel";

type InputProps = Omit<TextFieldProps, "error" | "helperText" | "label" | "variant"> & {
  error?: string;
  label?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, slotProps, type, value, defaultValue, ...props }, ref) => {
    const shouldShrinkLabel = type === "date" || value != null || defaultValue != null;
    const inputLabelSlot =
      slotProps?.inputLabel && typeof slotProps.inputLabel === "object"
        ? (slotProps.inputLabel as Partial<InputLabelProps>)
        : undefined;

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
        slotProps={{
          ...slotProps,
          inputLabel:
            shouldShrinkLabel && inputLabelSlot?.shrink === undefined
              ? {
                  ...inputLabelSlot,
                  shrink: true,
                }
              : slotProps?.inputLabel,
        }}
      />
    );
  },
);

Input.displayName = "Input";
