import Skeleton from "@mui/material/Skeleton";

type SkeletonProps = Readonly<{
  className?: string;
}>;

export function AppSkeleton({ className }: SkeletonProps) {
  return <Skeleton variant="rounded" className={className} />;
}
