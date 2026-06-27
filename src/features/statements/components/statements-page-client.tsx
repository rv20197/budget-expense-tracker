"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadStatementModal } from "@/features/statements/components/upload-statement-modal";
import type { StatementUploadItem } from "@/features/statements/actions/statements.actions";

type Props = Readonly<{
  uploads: StatementUploadItem[];
}>;

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="success">Completed</Badge>;
  if (status === "failed") return <Badge variant="danger">Failed</Badge>;
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CircularProgress size={12} sx={{ color: "#3b82f6" }} />
        <Badge variant="neutral">Processing</Badge>
      </span>
    );
  }
  return <Badge variant="neutral">Pending</Badge>;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StatementsPageClient({ uploads: initialUploads }: Props) {
  const router = useRouter();
  const [uploads, setUploads] = useState(initialUploads);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StatementUploadItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await fetch(`/api/v1/statements/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to delete.");
        setDeleteTarget(null);
        return;
      }
      setUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success("Statement deleted.");
      setDeleteTarget(null);
    });
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Statement Uploads</h2>
          <p className="mt-1 text-sm text-slate-600">
            {uploads.length} statement{uploads.length !== 1 ? "s" : ""} imported
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>Import Statement</Button>
      </div>

      {uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white py-16">
          <p className="text-slate-500">No statements imported yet.</p>
          <Button className="mt-4" onClick={() => setIsUploadOpen(true)}>
            Import your first statement
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block md:hidden space-y-3">
            {uploads.map((u) => (
              <div key={u.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-slate-900">{u.fileName}</p>
                    <p className="text-sm text-slate-500">{u.bankName}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>Uploaded {formatDate(u.createdAt)}</span>
                      {u.statementPeriodStart && (
                        <span>
                          {formatDate(u.statementPeriodStart)} – {formatDate(u.statementPeriodEnd)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <StatusBadge status={u.status} />
                    </div>
                    {u.status === "completed" && (
                      <p className="mt-1 text-xs text-slate-500">
                        {u.totalInserted} imported, {u.duplicatesSkipped} skipped
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Tooltip title="View transactions">
                      <button
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        onClick={() => router.push(`/statements/${u.id}`)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <button
                        className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-[28px] border border-slate-200 bg-white">
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 600, color: "#475569", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" } }}>
                  <TableCell>File</TableCell>
                  <TableCell>Bank</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Transactions</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uploads.map((u) => (
                  <TableRow
                    key={u.id}
                    hover
                    sx={{ cursor: "pointer", "&:last-child td": { border: 0 } }}
                    onClick={() => router.push(`/statements/${u.id}`)}
                  >
                    <TableCell>
                      <p className="max-w-[200px] truncate text-sm font-medium text-slate-900">
                        {u.fileName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{u.bankName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{formatDate(u.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {u.statementPeriodStart
                          ? `${formatDate(u.statementPeriodStart)} – ${formatDate(u.statementPeriodEnd)}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                      {u.status === "failed" && u.errorMessage && (
                        <Tooltip title={u.errorMessage}>
                          <p className="mt-1 max-w-[150px] truncate text-xs text-red-500">
                            {u.errorMessage}
                          </p>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {u.status === "completed"
                          ? `${u.totalInserted} / ${u.totalFound}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip title="View transactions">
                          <button
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                            onClick={() => router.push(`/statements/${u.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </button>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <button
                            className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setDeleteTarget(u)}
                          >
                            <DeleteIcon fontSize="small" />
                          </button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Upload modal */}
      <UploadStatementModal
        open={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          router.refresh();
        }}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete statement?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-600">
            The statement upload record will be removed.
            Any imported transactions will remain in your transactions list.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
