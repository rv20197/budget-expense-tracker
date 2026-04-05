import Chip from "@mui/material/Chip";

type BadgeProps = Readonly<{
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger";
  className?: string;
}>;

const variantColor: Record<NonNullable<BadgeProps["variant"]>, "default" | "success" | "warning" | "error"> = {
  neutral: "default",
  success: "success",
  warning: "warning",
  danger: "error",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return <Chip size="small" label={children} color={variantColor[variant]} className={className} />;
}
