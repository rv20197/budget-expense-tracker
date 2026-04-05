type OverBudgetBannerProps = Readonly<{
  count: number;
}>;

export function OverBudgetBanner({ count }: OverBudgetBannerProps) {
  if (count === 0) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      {count} budget{count > 1 ? "s are" : " is"} over limit this month. Review
      those categories before the overspend grows.
    </div>
  );
}
