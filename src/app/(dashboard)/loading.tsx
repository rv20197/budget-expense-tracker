import Skeleton from "@mui/material/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid gap-4">
      <Skeleton variant="rounded" className="h-24 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton variant="rounded" className="h-40 w-full" />
        <Skeleton variant="rounded" className="h-40 w-full" />
        <Skeleton variant="rounded" className="h-40 w-full" />
      </div>
      <Skeleton variant="rounded" className="h-96 w-full" />
    </div>
  );
}
