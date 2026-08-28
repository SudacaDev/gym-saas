"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmingLabel: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
}

/**
 * Styled replacement for window.confirm() on destructive actions — the app
 * has no other unstyled OS dialogs, this shouldn't be the exception. Keeps
 * the confirm button disabled and the dialog un-dismissable while the async
 * action is in flight, same as the form dialogs' isSubmitting pattern.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmingLabel,
  cancelLabel = "Cancelar",
  onConfirm,
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !confirming && onOpenChange(next)}>
      <DialogContent showCloseButton={!confirming}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={confirming} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" disabled={confirming} onClick={handleConfirm}>
            {confirming ? confirmingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
