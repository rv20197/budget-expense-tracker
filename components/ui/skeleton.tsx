import { cn } from "@/lib/utils";

type SkeletonProps = Readonly<{
  className?: string;
}>;

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-slate-200/80", className)}
    />
  );
}
