import { createContext, useCallback, useRef, useState, type ReactNode } from 'react';
import ConfirmDialog, { type ConfirmTone } from '../components/ConfirmDialog';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolver = useRef<((result: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setState({
      title: options.title || 'Are you sure?',
      message: options.message,
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
      tone: options.tone || 'default',
    });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function handleClose(result: boolean) {
    setState(null);
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmDialog {...state} onConfirm={() => handleClose(true)} onCancel={() => handleClose(false)} />
      )}
    </ConfirmContext.Provider>
  );
}
