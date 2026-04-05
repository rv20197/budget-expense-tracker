"use client";

import * as React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect from "@mui/material/Select";
import FormHelperText from "@mui/material/FormHelperText";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<{ value: string; name?: string }>;
  onBlur?: React.FocusEventHandler<HTMLElement>;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, label, id, options, placeholder, name, value, onChange, onBlur, disabled, className }, ref) => {
    const selectId = id ?? name;

    return (
      <FormControl fullWidth size="small" error={Boolean(error)}>
        {label ? <InputLabel id={`${selectId}-label`}>{label}</InputLabel> : null}
        <MuiSelect
          labelId={label ? `${selectId}-label` : undefined}
          id={selectId}
          label={label}
          name={name}
          value={value ?? ""}
          onChange={onChange as never}
          onBlur={onBlur as never}
          disabled={disabled}
          inputRef={ref as never}
          className={className}
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
