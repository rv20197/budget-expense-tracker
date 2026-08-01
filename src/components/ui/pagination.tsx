"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Button from "@mui/material/Button";

type PaginationProps = Readonly<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}>;

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const getVisiblePages = () => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: Array<number | string> = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        variant="outlined"
        startIcon={<ChevronLeftIcon />}
        size="small"
      >
        Previous
      </Button>

      {/* Desktop view: Page buttons */}
      <div className="hidden sm:flex items-center gap-1.5">
        {visiblePages.map((page, index) => (
          <Button
            key={index}
            variant={page === currentPage ? "contained" : "outlined"}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={page === "..."}
            size="small"
            sx={{ minWidth: "36px", px: 1 }}
          >
            {page}
          </Button>
        ))}
      </div>

      {/* Mobile view: Simple text indicator */}
      <span className="text-xs font-medium text-slate-600 sm:hidden px-2">
        Page {currentPage} of {totalPages}
      </span>

      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        variant="outlined"
        endIcon={<ChevronRightIcon />}
        size="small"
      >
        Next
      </Button>
    </div>
  );
}
