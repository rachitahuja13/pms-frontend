import { createContext, useCallback, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastFns {
  success: (message: string) => void;
  error: (message: string) => void;
}

export const ToastContext = createContext<ToastFns | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const toast: ToastFns = {
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={16} strokeWidth={2} /> : <XCircle size={16} strokeWidth={2} />}
            <span>{t.message}</span>
            <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
