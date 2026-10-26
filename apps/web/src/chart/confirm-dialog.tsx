import { type ReactNode, useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  /** The question; null keeps the dialog closed. */
  message: string | null;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

/**
 * The app's own confirmation, in place of `window.confirm` (which looks foreign and blocks the page).
 * Escape and the cancel button dismiss it; the cancel button has focus first, so Enter never deletes by accident.
 */
export function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (message !== null && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (message === null && dialog.open) dialog.close();
  }, [message]);

  return (
    <dialog ref={ref} className="card star-dialog" onClose={onCancel} aria-labelledby="confirm-dialog-message" data-id="confirm-dialog">
      {message !== null && (
        <>
          <p id="confirm-dialog-message" className="confirm-message">
            {message}
          </p>
          <div className="confirm-actions">
            <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel} data-id="confirm-dialog-cancel">
              {cancelLabel}
            </button>
            <button type="button" className="btn btn-danger-outline" onClick={onConfirm} data-id="confirm-dialog-confirm">
              {confirmLabel}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
