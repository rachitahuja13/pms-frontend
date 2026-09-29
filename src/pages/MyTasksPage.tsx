import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import { useToast } from '../hooks/useToast';
import type { Task, TaskStatus } from '../types';

const STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const toast = useToast();

  function load() {
    api
      .get<Task[]>('/tasks/my-tasks')
      .then((res) => setTasks(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Could not load your tasks.')));
  }

  useEffect(load, []);

  async function updateStatus(taskId: number, status: TaskStatus) {
    setUpdatingId(taskId);
    try {
      const { data } = await api.patch<Task>(`/tasks/${taskId}/status`, { status });
      setTasks((prev) => (prev ? prev.map((t) => (t.id === taskId ? data : t)) : prev));
      toast.success(
        data.status === 'PENDING_APPROVAL' ? 'Marked done — waiting on approval.' : 'Task status updated.'
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not update the task status.'));
    } finally {
      setUpdatingId(null);
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!tasks) return <Spinner label="Loading your tasks…" />;

  const columns: DataTableColumn<Task>[] = [
    {
      key: 'title',
      label: 'Task',
      sortable: true,
      render: (task) => (
        <>
          <div style={{ fontWeight: 500 }}>{task.title}</div>
          {task.description && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{task.description}</div>
          )}
        </>
      ),
    },
    {
      key: 'projectName',
      label: 'Project',
      sortable: true,
      render: (task) => <Link to={`/projects/${task.projectId}`}>{task.projectName}</Link>,
    },
    { key: 'priority', label: 'Priority', sortable: true },
    {
      key: 'dueDate',
      label: 'Due date',
      sortable: true,
      render: (task) => (
        <>
          <span className="mono">{task.dueDate || '—'}</span>
          {task.overdue && (
            <div>
              <span className="badge badge--overdue" style={{ marginTop: 4 }}>
                Overdue
              </span>
            </div>
          )}
        </>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (task) =>
        task.status === 'PENDING_APPROVAL' ? (
          <div>
            <StatusBadge status={task.status} />
            <div className="pending-note">Waiting on approval</div>
          </div>
        ) : (
          <select
            value={task.status}
            disabled={updatingId === task.id}
            onChange={(e) => updateStatus(task.id, e.target.value as TaskStatus)}
            style={{ border: '1px solid var(--mist-strong)', borderRadius: 6, padding: '5px 8px', fontSize: 13 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'COMPLETED' ? 'Mark complete' : s.replace('_', ' ')}
              </option>
            ))}
          </select>
        ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <h1>My Tasks</h1>
        <p>Everything currently assigned to you, across every project.</p>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={tasks}
          getRowId={(t) => t.id}
          searchPlaceholder="Search your tasks…"
          emptyState={
            <div className="empty-state">
              <div className="empty-state__icon">
                <Inbox size={18} strokeWidth={2} />
              </div>
              Nothing's assigned to you right now.
            </div>
          }
        />
      </div>
    </>
  );
}