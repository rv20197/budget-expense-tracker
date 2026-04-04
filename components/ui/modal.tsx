"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type ModalProps = Readonly<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}>;

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
      >
        <div
          className={cn(
            "w-full max-w-lg bg-white shadow-2xl",
            "sm:rounded-2xl sm:max-h-[90vh] sm:overflow-hidden",
            "rounded-t-2xl max-h-[90vh] overflow-hidden",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-4 pb-3 sm:p-6 sm:pb-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-slate-950 sm:text-xl">
                {title}
              </h2>
              {description ? (
                <p id="modal-description" className="mt-2 text-sm text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 min-h-[44px]"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col max-h-[calc(90vh-120px)] overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
