import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  ListChecks,
  AlertTriangle,
  Users,
  Inbox,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Hourglass,
  Check,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { api, extractErrorMessage } from '../api/client';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import type { DashboardResponse, Task, TaskStatus } from '../types';

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
}

/* ---------------- Employee dashboard: a to-do list of assigned tasks ---------------- */

const CIRCLE_ICON: Record<TaskStatus, LucideIcon> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  BLOCKED: AlertTriangle,
  PENDING_APPROVAL: Hourglass,
  COMPLETED: CheckCircle2,
};

const CIRCLE_CLASS: Record<TaskStatus, string> = {
  TODO: 'todo-item__circle--todo',
  IN_PROGRESS: 'todo-item__circle--in-progress',
  BLOCKED: 'todo-item__circle--blocked',
  PENDING_APPROVAL: 'todo-item__circle--pending-approval',
  COMPLETED: 'todo-item__circle--completed',
};

function EmployeeDashboard() {
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

  async function toggleComplete(task: Task) {
    // Clicking a completed OR pending-approval task reverts it to TODO (i.e. "undo" /
    // "cancel my request"); clicking anything else marks it done — which the backend
    // turns into PENDING_APPROVAL rather than COMPLETED, since this is an employee.
    const nextStatus: TaskStatus =
      task.status === 'COMPLETED' || task.status === 'PENDING_APPROVAL' ? 'TODO' : 'COMPLETED';
    setUpdatingId(task.id);
    try {
      const { data } = await api.patch<Task>(`/tasks/${task.id}/status`, { status: nextStatus });
      setTasks((prev) => (prev ? prev.map((t) => (t.id === task.id ? data : t)) : prev));
      if (data.status === 'PENDING_APPROVAL') {
        toast.success('Marked done — waiting on your supervisor to approve it.');
      } else {
        toast.success(data.status === 'COMPLETED' ? 'Task marked complete.' : 'Task reopened.');
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not update this task.'));
    } finally {
      setUpdatingId(null);
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!tasks) return <Spinner label="Loading your to-do list…" />;

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const pendingCount = tasks.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const notStartedCount = tasks.filter((t) => t.status === 'TODO').length;
  const overdueCount = tasks.filter((t) => t.overdue).length;

  return (
    <>
      <div className="page-header">
        <h1>Your To-Do List</h1>
        <p>Red means not started, yellow means waiting on approval, green means done.</p>
      </div>

      <div className="stat-grid">
        <StatTile icon={ListChecks} value={tasks.length} label="Assigned to you" />
        <StatTile
          icon={Circle}
          value={notStartedCount}
          label="Not started"
          valueColor={notStartedCount > 0 ? 'var(--status-blocked)' : 'inherit'}
        />
        <StatTile
          icon={Hourglass}
          value={pendingCount}
          label="Pending approval"
          valueColor={pendingCount > 0 ? 'var(--status-pending)' : 'inherit'}
        />
        <StatTile
          icon={AlertTriangle}
          value={overdueCount}
          label="Overdue"
          valueColor={overdueCount > 0 ? 'var(--status-blocked)' : 'inherit'}
        />
        <StatTile icon={CheckCircle2} value={completedCount} label="Completed" valueColor="var(--status-done)" />
      </div>

      <div className="card">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Inbox size={18} strokeWidth={2} />
            </div>
            Nothing's assigned to you right now.
          </div>
        ) : (
          <ul className="todo-list">
            {tasks.map((task) => {
              const Icon = CIRCLE_ICON[task.status] || Circle;
              return (
                <li key={task.id} className={`todo-item${task.status === 'COMPLETED' ? ' todo-item--completed' : ''}`}>
                  <button
                    type="button"
                    className={`todo-item__circle ${CIRCLE_CLASS[task.status] || ''}`}
                    onClick={() => toggleComplete(task)}
                    disabled={updatingId === task.id}
                    aria-label={
                      task.status === 'COMPLETED' || task.status === 'PENDING_APPROVAL'
                        ? 'Undo'
                        : 'Mark as completed'
                    }
                    title={
                      task.status === 'PENDING_APPROVAL'
                        ? 'Cancel completion request'
                        : task.status === 'COMPLETED'
                          ? 'Mark as not started'
                          : 'Mark as completed'
                    }
                  >
                    <Icon size={21} strokeWidth={2} />
                  </button>

                  <div className="todo-item__body">
                    <div className="todo-item__title">{task.title}</div>
                    <div className="todo-item__meta">
                      <Link to={`/projects/${task.projectId}`}>{task.projectName}</Link>
                      {task.dueDate && <span className="mono">Due {task.dueDate}</span>}
                      {task.overdue && <span className="badge badge--overdue">Overdue</span>}
                    </div>
                    {task.status === 'PENDING_APPROVAL' && (
                      <div className="pending-note">Waiting on your supervisor to approve this.</div>
                    )}
                  </div>

                  <StatusBadge status={task.status} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

/* ---------------- Admin dashboard: org-wide overview + approval queue ---------------- */

const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'PENDING_APPROVAL', 'COMPLETED'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  PENDING_APPROVAL: 'Pending approval',
  COMPLETED: 'Completed',
};

function AdminDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  function load() {
    api
      .get<DashboardResponse>('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Could not load the dashboard.')));
  }

  useEffect(load, []);

  async function approve(task: Task) {
    setBusyId(task.id);
    try {
      await api.patch(`/tasks/${task.id}/approve`);
      toast.success('Task approved.');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not approve this task.'));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(task: Task) {
    const ok = await confirm({
      title: `Send "${task.title}" back?`,
      message: 'The assignee will see it return to In Progress along with your reason.',
      confirmLabel: 'Send back',
    });
    if (!ok) return;

    const reason = window.prompt('Why is this being sent back? (shown to the employee)');
    if (!reason || !reason.trim()) return;

    setBusyId(task.id);
    try {
      await api.patch(`/tasks/${task.id}/reject`, { reason: reason.trim() });
      toast.success('Sent back to the employee.');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not send this task back.'));
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <Spinner label="Loading dashboard…" />;

  const maxStatusCount = Math.max(1, ...STATUS_ORDER.map((s) => data.tasksByStatus?.[s] || 0));
  const overdueColor = data.overdueTasks > 0 ? 'var(--status-blocked)' : 'inherit';
  const pendingCount = data.pendingApprovalTasks?.length || 0;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>An overview of everything in flight right now.</p>
      </div>

      <div className="stat-grid">
        <StatTile icon={FolderKanban} value={data.activeProjects} label="Active projects" />
        <StatTile icon={ListChecks} value={data.totalTasks} label="Total tasks" />
        <StatTile
          icon={Hourglass}
          value={pendingCount}
          label="Awaiting approval"
          valueColor={pendingCount > 0 ? 'var(--status-pending)' : 'inherit'}
        />
        <StatTile icon={AlertTriangle} value={data.overdueTasks} label="Overdue tasks" valueColor={overdueColor} />
        <StatTile icon={Users} value={data.totalEmployees} label="Employees" />
      </div>

      {pendingCount > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: '14px 18px 0' }} className="section-title">
            <Hourglass size={14} strokeWidth={2} /> Waiting on your approval ({pendingCount})
          </div>
          <table>
            <tbody>
              {data.pendingApprovalTasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/projects/${t.projectId}`}>{t.title}</Link>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {t.projectName} · marked done by {t.completionRequestedByName || 'someone'}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn--secondary"
                        disabled={busyId === t.id}
                        onClick={() => reject(t)}
                        title="Send back"
                      >
                        <Undo2 size={14} strokeWidth={2} />
                        Send back
                      </button>
                      <button
                        className="btn btn--primary"
                        disabled={busyId === t.id}
                        onClick={() => approve(t)}
                        title="Approve"
                      >
                        <Check size={14} strokeWidth={2} />
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ padding: '18px 20px', marginBottom: 24 }}>
        <div className="section-title">Tasks by status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STATUS_ORDER.map((status) => {
            const count = data.tasksByStatus?.[status] || 0;
            const pct = Math.round((count / maxStatusCount) * 100);
            return (
              <div key={status} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 32px', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13 }}>{STATUS_LABELS[status]}</span>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="mono" style={{ fontSize: 13, textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ padding: '14px 18px 0' }} className="section-title">
            <AlertTriangle size={14} strokeWidth={2} /> Overdue
          </div>
          <TaskMiniTable tasks={data.overdueTaskList} emptyLabel="Nothing overdue. Good shape." />
        </div>

        <div className="card">
          <div style={{ padding: '14px 18px 0' }} className="section-title">
            <CalendarClock size={14} strokeWidth={2} /> Upcoming deadlines
          </div>
          <TaskMiniTable tasks={data.upcomingDeadlines} emptyLabel="No upcoming deadlines scheduled." />
        </div>
      </div>
    </>
  );
}

/* ---------------- Shared bits ---------------- */

function StatTile({
  icon: Icon,
  value,
  label,
  valueColor,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__top">
        <div className="stat-tile__icon">
          <Icon size={15} strokeWidth={2} />
        </div>
      </div>
      <div className="stat-tile__value" style={{ color: valueColor }}>
        {value}
      </div>
      <div className="stat-tile__label">{label}</div>
    </div>
  );
}

function TaskMiniTable({ tasks, emptyLabel }: { tasks: Task[]; emptyLabel: string }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Inbox size={18} strokeWidth={2} />
        </div>
        {emptyLabel}
      </div>
    );
  }
  return (
    <table>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id}>
            <td>
              <Link to={`/projects/${t.projectId}`}>{t.title}</Link>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.projectName}</div>
            </td>
            <td className="mono" style={{ whiteSpace: 'nowrap' }}>
              {t.dueDate || '—'}
            </td>
            <td>
              <StatusBadge status={t.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}