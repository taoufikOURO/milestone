"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
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
  // Plusieurs dialogues peuvent coexister sur une page : id unique par instance.
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      className="animate-dialog m-auto w-[calc(100%-2rem)] max-w-md rounded-panel border border-border-soft bg-background p-6 text-text-primary shadow-float backdrop:bg-text-primary/45 backdrop:backdrop-blur-[2px] sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
        >
          <TriangleAlert className="size-5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id={titleId} className="text-title font-bold">
            {title}
          </h2>
          <div className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</div>
        </div>
      </div>
      <div className="mt-7 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
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
