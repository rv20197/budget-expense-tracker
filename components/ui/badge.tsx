import { cn } from "@/lib/utils";

type BadgeProps = Readonly<{
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger";
  className?: string;
}>;

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
