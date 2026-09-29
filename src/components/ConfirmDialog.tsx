import { useEffect } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmDialogProps {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = tone === 'danger';

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel, onConfirm]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-dialog__icon${isDanger ? ' confirm-dialog__icon--danger' : ''}`}>
          {isDanger ? <AlertTriangle size={20} strokeWidth={2} /> : <HelpCircle size={20} strokeWidth={2} />}
        </div>
        <h2 style={{ marginBottom: 6 }}>{title}</h2>
        {message && <p className="confirm-dialog__message">{message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className={`btn ${isDanger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
