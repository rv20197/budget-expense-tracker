"use client";

import * as React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect, { type SelectChangeEvent } from "@mui/material/Select";
import FormHelperText from "@mui/material/FormHelperText";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (event: SelectChangeEvent<string>, child: React.ReactNode) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
};

export const Select = React.forwardRef<HTMLInputElement, SelectProps>(
  (
    {
      error,
      label,
      id,
      options,
      placeholder,
      name,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled,
      className,
    },
    ref,
  ) => {
    const selectId = id ?? name;
    const shouldShrinkLabel = Boolean(placeholder || value || defaultValue);

    return (
      <FormControl fullWidth size="small" error={Boolean(error)}>
        {label ? (
          <InputLabel id={`${selectId}-label`} shrink={shouldShrinkLabel}>
            {label}
          </InputLabel>
        ) : null}
        <MuiSelect
          labelId={label ? `${selectId}-label` : undefined}
          id={selectId}
          label={label}
          name={name}
          value={value ?? ""}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          inputRef={ref}
          className={className}
          displayEmpty={Boolean(placeholder)}
          renderValue={(selected) => {
            const selectedValue = selected as string;

            if (!selectedValue) {
              return placeholder ?? "";
            }

            return options.find((option) => option.value === selectedValue)?.label ?? selectedValue;
          }}
        >
          {placeholder ? <MenuItem value="">{placeholder}</MenuItem> : null}
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </MuiSelect>
        {error ? <FormHelperText>{error}</FormHelperText> : null}
      </FormControl>
    );
  },
);

Select.displayName = "Select";
