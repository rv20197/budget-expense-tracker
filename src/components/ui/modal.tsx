"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";

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
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" classes={{ paper: className }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        ) : null}
        {children}
      </DialogContent>
    </Dialog>
  );
}
