"use client";

import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import MuiButton from "@mui/material/Button";
import type { SxProps, Theme } from "@mui/material/styles";

type ButtonProps = Omit<MuiButtonProps, "variant"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const baseSx: SxProps<Theme> = {
  borderRadius: "16px",
  px: 2,
  py: 1.25,
  minHeight: 44,
  textTransform: "none",
  fontWeight: 500,
  fontSize: "0.875rem",
  lineHeight: 1.25,
  boxShadow: "none",
};

export function Button({ variant = "primary", sx, ...props }: ButtonProps) {
  if (variant === "secondary") {
    return (
      <MuiButton
        {...props}
        variant="outlined"
        sx={[
          baseSx,
          {
            bgcolor: "#fff",
            color: "#0f172a",
            borderColor: "#e2e8f0",
            "&:hover": {
              bgcolor: "#f8fafc",
              borderColor: "#cbd5e1",
            },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      />
    );
  }

  if (variant === "ghost") {
    return (
      <MuiButton
        {...props}
        variant="text"
        sx={[
          baseSx,
          {
            color: "inherit",
            "&:hover": {
              bgcolor: "rgba(15, 23, 42, 0.08)",
            },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      />
    );
  }

  if (variant === "danger") {
    return (
      <MuiButton
        {...props}
        color="error"
        variant="contained"
        sx={[
          baseSx,
          {
            bgcolor: "#dc2626",
            "&:hover": {
              bgcolor: "#ef4444",
            },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      />
    );
  }

  return (
    <MuiButton
      {...props}
      variant="contained"
      sx={[
        baseSx,
        {
          bgcolor: "#020617",
          color: "#fff",
          "&:hover": {
            bgcolor: "#1e293b",
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
