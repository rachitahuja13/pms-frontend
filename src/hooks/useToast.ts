import { useContext } from 'react';
import { ToastContext, type ToastFns } from '../context/ToastContext';

export function useToast(): ToastFns {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return toast;
}
