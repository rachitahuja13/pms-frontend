import { useContext } from 'react';
import { ConfirmContext, type ConfirmFn } from '../context/ConfirmContext';

/**
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: 'Delete task?', message: '...', tone: 'danger' });
 *   if (ok) { ... }
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return confirm;
}
