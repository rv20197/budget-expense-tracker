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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl shadow-slate-900/20",
          className,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
