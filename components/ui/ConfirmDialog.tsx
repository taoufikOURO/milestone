"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Confirmation d'une action destructive (§6.5) : `description` doit préciser
 * les conséquences. Basé sur <dialog> natif (focus piégé, Échap ferme).
 * La confirmation n'est qu'un confort : le droit est revérifié côté serveur.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border-soft bg-background p-6 text-text-primary shadow-lg backdrop:bg-text-primary/50"
    >
      <h2 id="confirm-title" className="text-lg font-bold">
        {title}
      </h2>
      <div className="mt-2 text-sm text-text-secondary">{description}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={pending}>
          {pending ? "Patientez…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
