"use client";

import * as React from "react";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import type { InputLabelProps } from "@mui/material/InputLabel";

import { formatAmountInWords } from "@/lib/numberToWords";

type InputProps = Omit<TextFieldProps, "error" | "helperText" | "label" | "variant"> & {
  error?: string;
  helperText?: React.ReactNode;
  label?: string;
  showAmountInWords?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error,
      helperText,
      label,
      slotProps,
      type,
      value,
      defaultValue,
      onChange,
      showAmountInWords,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState<unknown>(
      value ?? defaultValue ?? "",
    );

    React.useEffect(() => {
      if (value !== undefined && value !== null) {
        setInternalValue(value);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    const amountInWordsHelper = showAmountInWords
      ? formatAmountInWords(internalValue)
      : null;

    const computedHelperText = error ?? helperText ?? amountInWordsHelper ?? undefined;
    const shouldShrinkLabel =
      type === "date" ||
      value != null ||
      defaultValue != null ||
      Boolean(internalValue);

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
        onChange={handleChange}
        inputRef={ref}
        label={label}
        error={Boolean(error)}
        helperText={computedHelperText}
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
