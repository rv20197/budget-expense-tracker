"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CircularProgress from "@mui/material/CircularProgress";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const BANK_OPTIONS = [
  "HDFC Bank",
  "ICICI Bank",
  "SBI",
  "Axis Bank",
  "Kotak Bank",
  "HDFC Credit Card",
  "SBI Card",
  "ICICI Credit Card",
  "Amex",
  "Other",
];

type Step = "select" | "processing" | "result";

type UploadResult = {
  uploadId: string;
  totalFound: number;
  totalInserted: number;
  duplicatesSkipped: number;
  errorMessage?: string | null;
};

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

export function UploadStatementModal({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState(BANK_OPTIONS[0]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [progressMessage, setProgressMessage] = useState("Uploading...");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup polling on close/unmount
  useEffect(() => {
    if (!open) {
      stopPolling();
    }
    return () => stopPolling();
  }, [open, stopPolling]);

  const resetModal = () => {
    stopPolling();
    setStep("select");
    setFile(null);
    setBankName(BANK_OPTIONS[0]);
    setFileError(null);
    setUploadId(null);
    setResult(null);
    setProgressMessage("Uploading...");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setFileError(null);
    if (rejected.length > 0) {
      setFileError("Only PDF files are accepted.");
      return;
    }
    const f = accepted[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      setFileError("File is too large. Maximum size is 15MB.");
      return;
    }
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
  });

  const startPolling = useCallback((id: string) => {
    const messages = [
      "Parsing PDF...",
      "Detecting transactions...",
      "Categorizing with AI...",
      "Saving transactions...",
    ];
    let msgIdx = 0;

    pollingRef.current = setInterval(async () => {
      // Cycle through progress messages
      msgIdx = (msgIdx + 1) % messages.length;
      setProgressMessage(messages[msgIdx]);

      try {
        const res = await fetch(`/api/v1/statements/${id}/status`);
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data;

        if (data.status === "completed") {
          stopPolling();
          setResult({
            uploadId: id,
            totalFound: data.totalFound,
            totalInserted: data.totalInserted,
            duplicatesSkipped: data.duplicatesSkipped,
            errorMessage: null,
          });
          setStep("result");
        } else if (data.status === "failed") {
          stopPolling();
          setResult({
            uploadId: id,
            totalFound: 0,
            totalInserted: 0,
            duplicatesSkipped: 0,
            errorMessage: data.errorMessage ?? "Processing failed.",
          });
          setStep("result");
        }
      } catch {
        // Network error — keep polling
      }
    }, 2000);
  }, [stopPolling]);

  const handleSubmit = async () => {
    if (!file) {
      setFileError("Please select a PDF file.");
      return;
    }
    setIsSubmitting(true);
    setProgressMessage("Uploading...");
    setStep("processing");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bankName", bankName);

    try {
      const res = await fetch("/api/v1/statements/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Upload failed.");
        setStep("select");
        setIsSubmitting(false);
        return;
      }

      const id = json.data.uploadId;
      setUploadId(id);
      setProgressMessage("Parsing PDF...");
      startPolling(id);
    } catch {
      toast.error("Upload failed. Please try again.");
      setStep("select");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === "select"
          ? "Import Statement"
          : step === "processing"
            ? "Processing Statement"
            : "Import Complete"
      }
    >
      {step === "select" && (
        <div className="flex flex-col gap-5">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition ${
              isDragActive
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="text-center">
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setFileError(null);
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  {isDragActive ? "Drop your PDF here" : "Drag & drop your statement PDF"}
                </p>
                <p className="mt-1 text-xs text-slate-500">or click to browse — PDF only, max 15MB</p>
              </div>
            )}
          </div>

          {fileError && (
            <p className="text-sm text-red-600">{fileError}</p>
          )}

          {/* Bank selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Bank / Card
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            >
              {BANK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!file || isSubmitting}>
              Upload Statement
            </Button>
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center gap-6 py-8">
          <CircularProgress size={48} sx={{ color: "#4F46E5" }} />
          <div className="text-center">
            <p className="font-medium text-slate-900">{progressMessage}</p>
            <p className="mt-1 text-sm text-slate-500">
              This may take a moment for large statements.
            </p>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="flex flex-col gap-5">
          {result.errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="font-medium text-red-800">Import failed</p>
              <p className="mt-1 text-sm text-red-700">{result.errorMessage}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="font-medium text-green-800">Import successful</p>
              <ul className="mt-2 space-y-1 text-sm text-green-700">
                <li>{result.totalFound} transactions found</li>
                <li>{result.totalInserted} transactions imported</li>
                <li>{result.duplicatesSkipped} duplicates skipped</li>
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                resetModal();
              }}
            >
              Upload Another
            </Button>
            {!result.errorMessage && result.uploadId && (
              <Button
                onClick={() => {
                  handleClose();
                  router.push(`/statements/${result.uploadId}`);
                }}
              >
                View Imported
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
