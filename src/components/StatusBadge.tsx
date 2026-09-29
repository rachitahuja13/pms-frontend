import type { TaskStatus } from '../types';

const LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  PENDING_APPROVAL: 'Pending approval',
  COMPLETED: 'Completed',
};

const CLASS_MAP: Record<TaskStatus, string> = {
  TODO: 'badge--todo',
  IN_PROGRESS: 'badge--in-progress',
  BLOCKED: 'badge--blocked',
  PENDING_APPROVAL: 'badge--pending-approval',
  COMPLETED: 'badge--completed',
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`badge ${CLASS_MAP[status] || 'badge--todo'}`}>
      <span className="badge__dot" />
      {LABELS[status] || status}
    </span>
  );
}