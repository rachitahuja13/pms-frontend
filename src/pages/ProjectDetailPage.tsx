import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, ListChecks, Copy, Trash2, Pencil, History, Check, Undo2 } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import { useAuth } from '../hooks/useAuth';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import type {
  Project,
  ProjectAuditLog,
  ProjectRequest,
  ProjectStatus,
  Task,
  TaskAuditLog,
  TaskPriority,
  TaskRequest,
  User,
} from '../types';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const FIELD_LABELS: Record<string, string> = {
  description: 'Description',
  endDate: 'Due date',
  dueDate: 'Due date',
  priority: 'Priority',
  assignedTo: 'Assignee',
  owner: 'Project owner',
  approval: 'Approval',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [history, setHistory] = useState<ProjectAuditLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const [taskModalMode, setTaskModalMode] = useState<{ kind: 'new' } | { kind: 'duplicate'; source: Task } | null>(
    null
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  function load() {
    if (!id) return;
    Promise.all([api.get<Project>(`/projects/${id}`), api.get<Task[]>(`/projects/${id}/tasks`)])
      .then(([projectRes, tasksRes]) => {
        setProject(projectRes.data);
        setTasks(tasksRes.data);
      })
      .catch((err) => setError(extractErrorMessage(err, 'Could not load this project.')));
  }

  function loadHistory() {
    if (!id) return;
    api
      .get<ProjectAuditLog[]>(`/projects/${id}/history`)
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]));
  }

  useEffect(load, [id]);
  useEffect(loadHistory, [id]);

  function canActOnApproval(task: Task): boolean {
    return task.projectOwnerId == null || task.projectOwnerId === user?.id;
  }

  async function handleDeleteTask(task: Task) {
    const ok = await confirm({
      title: `Delete "${task.title}"?`,
      message: 'This permanently removes the task. This can\u2019t be undone.',
      confirmLabel: 'Delete task',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks((prev) => (prev ? prev.filter((t) => t.id !== task.id) : prev));
      toast.success('Task deleted.');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not delete this task.'));
    }
  }

  async function handleApproveTask(task: Task) {
    try {
      await api.patch(`/tasks/${task.id}/approve`);
      toast.success('Task approved.');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not approve this task.'));
    }
  }

  async function handleRejectTask(task: Task) {
    const ok = await confirm({
      title: `Send "${task.title}" back?`,
      message: 'The assignee will see it return to In Progress along with your reason.',
      confirmLabel: 'Send back',
    });
    if (!ok) return;

    const reason = window.prompt('Why is this being sent back? (shown to the employee)');
    if (!reason || !reason.trim()) return;

    try {
      await api.patch(`/tasks/${task.id}/reject`, { reason: reason.trim() });
      toast.success('Sent back to the employee.');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not send this task back.'));
    }
  }

  async function handleDeleteProject() {
    if (!project) return;
    const ok = await confirm({
      title: `Delete "${project.name}"?`,
      message: `This permanently removes the project and all ${project.totalTasks} of its tasks. This can't be undone.`,
      confirmLabel: 'Delete project',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/projects/${project.id}`);
      toast.success('Project deleted.');
      navigate('/projects', { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not delete this project.'));
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!project || !tasks) return <Spinner label="Loading project…" />;

  const taskColumns: DataTableColumn<Task>[] = [
    { key: 'title', label: 'Task', sortable: true },
    {
      key: 'assignedToName',
      label: 'Assigned to',
      sortable: true,
      render: (t) => t.assignedToName || <span style={{ color: 'var(--ink-soft)' }}>Unassigned</span>,
    },
    { key: 'priority', label: 'Priority', sortable: true },
    {
      key: 'dueDate',
      label: 'Due date',
      sortable: true,
      render: (t) => <span className="mono">{t.dueDate || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (t) => (
        <>
          <StatusBadge status={t.status} />
          {t.overdue && (
            <span className="badge badge--overdue" style={{ marginLeft: 6 }}>
              Overdue
            </span>
          )}
        </>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            label: '',
            render: (t: Task) => (
              <div style={{ display: 'flex', gap: 4 }}>
                {t.status === 'PENDING_APPROVAL' &&
                  (canActOnApproval(t) ? (
                    <>
                      <button
                        className="btn btn--ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectTask(t);
                        }}
                        aria-label={`Send back ${t.title}`}
                        title="Send back"
                      >
                        <Undo2 size={15} strokeWidth={2} />
                      </button>
                      <button
                        className="btn btn--ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveTask(t);
                        }}
                        aria-label={`Approve ${t.title}`}
                        title="Approve"
                        style={{ color: 'var(--status-done)' }}
                      >
                        <Check size={15} strokeWidth={2} />
                      </button>
                    </>
                  ) : (
                    <span className="pending-note" style={{ marginTop: 0 }} title={`Only ${t.projectOwnerName} can approve this`}>
                      Awaiting {t.projectOwnerName}
                    </span>
                  ))}
                <button
                  className="btn btn--ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTask(t);
                  }}
                  aria-label={`Edit ${t.title}`}
                  title="Edit task"
                >
                  <Pencil size={15} strokeWidth={2} />
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTaskModalMode({ kind: 'duplicate', source: t });
                  }}
                  aria-label={`Duplicate ${t.title}`}
                  title="Duplicate task"
                >
                  <Copy size={15} strokeWidth={2} />
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(t);
                  }}
                  aria-label={`Delete ${t.title}`}
                  title="Delete task"
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </div>
            ),
          } satisfies DataTableColumn<Task>,
        ]
      : []),
  ];

  return (
    <>
      <div className="page-header">
        <p style={{ marginBottom: 6 }}>
          <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ArrowLeft size={14} strokeWidth={2} /> Projects
          </Link>
        </p>
        <div className="top-strip" style={{ marginBottom: 0 }}>
          <div>
            <h1>{project.name}</h1>
            <p>{project.description || 'No description yet.'}</p>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--secondary" onClick={() => setShowEditModal(true)}>
                <Pencil size={14} strokeWidth={2} />
                Edit
              </button>
              <button className="btn btn--secondary" onClick={handleDeleteProject}>
                <Trash2 size={14} strokeWidth={2} />
                Delete project
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-tile__value">{project.ownerName || 'Unassigned'}</div>
          <div className="stat-tile__label">Project owner</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{STATUS_LABELS[project.status] || project.status}</div>
          <div className="stat-tile__label">Status</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{project.progressPercent}%</div>
          <div className="stat-tile__label">Progress</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">
            {project.completedTasks}/{project.totalTasks}
          </div>
          <div className="stat-tile__label">Tasks completed</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value">{project.endDate || '—'}</div>
          <div className="stat-tile__label">Due date</div>
        </div>
      </div>

      <div className="top-strip">
        <div className="section-title" style={{ margin: 0 }}>
          Tasks
        </div>
        {isAdmin && (
          <button className="btn btn--primary" onClick={() => setTaskModalMode({ kind: 'new' })}>
            <Plus size={15} strokeWidth={2.5} />
            New task
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: isAdmin ? 24 : 0 }}>
        <DataTable
          columns={taskColumns}
          rows={tasks}
          getRowId={(t) => t.id}
          searchPlaceholder="Search tasks…"
          emptyState={
            <div className="empty-state">
              <div className="empty-state__icon">
                <ListChecks size={18} strokeWidth={2} />
              </div>
              No tasks in this project yet.
            </div>
          }
        />
      </div>

      {isAdmin && (
        <div className="card">
          <button
            type="button"
            className="section-title"
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '14px 18px',
              cursor: 'pointer',
              justifyContent: 'space-between',
              display: 'flex',
            }}
            onClick={() => setShowHistory((s) => !s)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <History size={14} strokeWidth={2} />
              Change history ({history.length})
            </span>
            <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>{showHistory ? 'Hide' : 'Show'}</span>
          </button>

          {showHistory &&
            (history.length === 0 ? (
              <div className="empty-state">No edits have been logged for this project yet.</div>
            ) : (
              <ul className="history-list">
                {history.map((h) => (
                  <li key={h.id} className="history-item">
                    <div className="history-item__top">
                      <strong>{FIELD_LABELS[h.fieldChanged] || h.fieldChanged}</strong> changed by{' '}
                      {h.changedByName}
                      <span className="mono history-item__date">
                        {new Date(h.changedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="history-item__values">
                      <span className="history-item__old">{h.oldValue || '(empty)'}</span>
                      {' \u2192 '}
                      <span className="history-item__new">{h.newValue || '(empty)'}</span>
                    </div>
                    <div className="history-item__reason">Reason: {h.reason}</div>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            load();
            toast.success('Task updated.');
          }}
        />
      )}

      {taskModalMode && (
        <TaskModal
          projectId={id!}
          initial={taskModalMode.kind === 'duplicate' ? taskModalMode.source : undefined}
          onClose={() => setTaskModalMode(null)}
          onCreated={() => {
            setTaskModalMode(null);
            load();
            toast.success(taskModalMode.kind === 'duplicate' ? 'Task duplicated.' : 'Task created.');
          }}
        />
      )}

      {showEditModal && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            load();
            loadHistory();
            toast.success('Project updated.');
          }}
        />
      )}
    </>
  );
}

/* ---------------- Edit project (description / due date / owner) — requires a reason ---------------- */

interface EditFormState {
  description: string;
  endDate: string;
  ownerId: string;
  changeReason: string;
}

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditFormState>({
    description: project.description || '',
    endDate: project.endDate || '',
    ownerId: project.ownerId ? String(project.ownerId) : '',
    changeReason: '',
  });
  const [admins, setAdmins] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<User[]>('/users/admins')
      .then((res) => setAdmins(res.data))
      .catch(() => setAdmins([]));
  }, []);

  const descriptionChanged = form.description !== (project.description || '');
  const dueDateChanged = form.endDate !== (project.endDate || '');
  const ownerChanged = form.ownerId !== (project.ownerId ? String(project.ownerId) : '');
  const hasChanges = descriptionChanged || dueDateChanged || ownerChanged;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!hasChanges) {
      setError('Change the description, due date, or owner before saving.');
      return;
    }
    if (!form.changeReason.trim()) {
      setError('Please explain why you\u2019re making this change.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: ProjectRequest = {
        name: project.name,
        description: form.description,
        endDate: form.endDate || undefined,
        ownerId: form.ownerId ? Number(form.ownerId) : undefined,
        changeReason: form.changeReason.trim(),
      };
      await api.put(`/projects/${project.id}`, payload);
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save these changes.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          <Pencil size={17} strokeWidth={2.5} /> Edit project
        </h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="edit-due-date">Due date</label>
              <input
                id="edit-due-date"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-owner">Project owner</label>
              <select id="edit-owner" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
                <option value="">Unassigned (any admin)</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="edit-reason">Reason for this change</label>
            <textarea
              id="edit-reason"
              required={hasChanges}
              placeholder="e.g. Client pushed the launch back two weeks"
              value={form.changeReason}
              onChange={(e) => setForm({ ...form, changeReason: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Edit an existing task — requires a reason ---------------- */

interface EditTaskFormState {
  description: string;
  dueDate: string;
  priority: TaskPriority;
  assignedToId: string;
  changeReason: string;
}

function EditTaskModal({ task, onClose, onSaved }: { task: Task; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditTaskFormState>({
    description: task.description || '',
    dueDate: task.dueDate || '',
    priority: task.priority,
    assignedToId: task.assignedToId ? String(task.assignedToId) : '',
    changeReason: '',
  });
  const [employees, setEmployees] = useState<User[]>([]);
  const [history, setHistory] = useState<TaskAuditLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<User[]>('/users/employees')
      .then((res) => setEmployees(res.data))
      .catch(() => setEmployees([]));
    api
      .get<TaskAuditLog[]>(`/tasks/${task.id}/history`)
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]));
  }, [task.id]);

  const descriptionChanged = form.description !== (task.description || '');
  const dueDateChanged = form.dueDate !== (task.dueDate || '');
  const priorityChanged = form.priority !== task.priority;
  const assigneeChanged = form.assignedToId !== (task.assignedToId ? String(task.assignedToId) : '');
  const hasChanges = descriptionChanged || dueDateChanged || priorityChanged || assigneeChanged;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!hasChanges) {
      setError('Change at least one field before saving.');
      return;
    }
    if (!form.changeReason.trim()) {
      setError('Please explain why you\u2019re making this change.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: TaskRequest = {
        title: task.title,
        projectId: task.projectId,
        description: form.description,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        assignedToId: form.assignedToId ? Number(form.assignedToId) : undefined,
        changeReason: form.changeReason.trim(),
      };
      await api.put(`/tasks/${task.id}`, payload);
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not save these changes.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          <Pencil size={17} strokeWidth={2.5} /> Edit task
        </h2>
        <p style={{ margin: '-10px 0 16px', fontSize: 12.5, color: 'var(--ink-soft)' }}>{task.title}</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="task-edit-description">Description</label>
            <textarea
              id="task-edit-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="task-edit-assignee">Assign to</label>
              <select
                id="task-edit-assignee"
                value={form.assignedToId}
                onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="task-edit-priority">Priority</label>
              <select
                id="task-edit-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="task-edit-due-date">Due date</label>
            <input
              id="task-edit-due-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="task-edit-reason">Reason for this change</label>
            <textarea
              id="task-edit-reason"
              required={hasChanges}
              placeholder="e.g. Reassigning because Jane is out this week"
              value={form.changeReason}
              onChange={(e) => setForm({ ...form, changeReason: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        <button
          type="button"
          className="section-title"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            borderTop: '1px solid var(--mist)',
            marginTop: 18,
            paddingTop: 14,
            cursor: 'pointer',
            justifyContent: 'space-between',
            display: 'flex',
          }}
          onClick={() => setShowHistory((s) => !s)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <History size={14} strokeWidth={2} />
            Change history ({history.length})
          </span>
          <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>{showHistory ? 'Hide' : 'Show'}</span>
        </button>

        {showHistory &&
          (history.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              No edits have been logged for this task yet.
            </div>
          ) : (
            <ul className="history-list" style={{ borderTop: 'none' }}>
              {history.map((h) => (
                <li key={h.id} className="history-item" style={{ padding: '10px 0' }}>
                  <div className="history-item__top">
                    <strong>{FIELD_LABELS[h.fieldChanged] || h.fieldChanged}</strong> changed by {h.changedByName}
                    <span className="mono history-item__date">{new Date(h.changedAt).toLocaleString()}</span>
                  </div>
                  <div className="history-item__values">
                    <span className="history-item__old">{h.oldValue || '(empty)'}</span>
                    {' \u2192 '}
                    <span className="history-item__new">{h.newValue || '(empty)'}</span>
                  </div>
                  <div className="history-item__reason">Reason: {h.reason}</div>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}

/* ---------------- Create / duplicate task ---------------- */

interface TaskFormState {
  title: string;
  description: string;
  assignedToId: string;
  priority: TaskPriority;
  dueDate: string;
}

function TaskModal({
  projectId,
  initial,
  onClose,
  onCreated,
}: {
  projectId: string;
  initial?: Task;
  onClose: () => void;
  onCreated: () => void;
}) {
  const isDuplicate = Boolean(initial);
  const [form, setForm] = useState<TaskFormState>({
    title: initial ? `${initial.title} (Copy)` : '',
    description: initial?.description || '',
    assignedToId: initial?.assignedToId ? String(initial.assignedToId) : '',
    priority: initial?.priority || 'MEDIUM',
    dueDate: initial?.dueDate || '',
  });
  const [employees, setEmployees] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<User[]>('/users/employees')
      .then((res) => setEmployees(res.data))
      .catch(() => setEmployees([]));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Give the task a title.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: TaskRequest = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        projectId: Number(projectId),
        assignedToId: form.assignedToId ? Number(form.assignedToId) : null,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      };
      await api.post('/tasks', payload);
      onCreated();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create the task.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          {isDuplicate ? <Copy size={17} strokeWidth={2.5} /> : <Plus size={17} strokeWidth={2.5} />}
          {isDuplicate ? 'Duplicate task' : 'New task'}
        </h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="assignedToId">Assign to</label>
              <select
                id="assignedToId"
                value={form.assignedToId}
                onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="dueDate">Due date</label>
            <input
              id="dueDate"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : isDuplicate ? 'Create copy' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}