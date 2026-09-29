import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import { useAuth } from '../hooks/useAuth';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import type { Project, ProjectRequest, ProjectStatus, User } from '../types';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  function load() {
    api
      .get<Project[]>('/projects')
      .then((res) => setProjects(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Could not load projects.')));
  }

  useEffect(load, []);

  async function handleDelete(project: Project) {
    const ok = await confirm({
      title: `Delete "${project.name}"?`,
      message: `This permanently removes the project and all ${project.totalTasks} of its tasks. This can't be undone.`,
      confirmLabel: 'Delete project',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/projects/${project.id}`);
      setProjects((prev) => (prev ? prev.filter((p) => p.id !== project.id) : prev));
      toast.success('Project deleted.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not delete this project.'));
    }
  }

  if (error) return <div className="error-banner">{error}</div>;

  const columns: DataTableColumn<Project>[] = [
    {
      key: 'name',
      label: 'Project',
      sortable: true,
      render: (p) => <Link to={`/projects/${p.id}`}>{p.name}</Link>,
    },
    {
      key: 'ownerName',
      label: 'Owner',
      sortable: true,
      render: (p) => p.ownerName || <span style={{ color: 'var(--ink-soft)' }}>Unassigned</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (p) => STATUS_LABELS[p.status] || p.status,
    },
    {
      key: 'progressPercent',
      label: 'Progress',
      sortable: true,
      width: 160,
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-bar__fill" style={{ width: `${p.progressPercent}%` }} />
          </div>
          <span className="mono" style={{ fontSize: 12.5 }}>
            {p.progressPercent}%
          </span>
        </div>
      ),
    },
    {
      key: 'totalTasks',
      label: 'Tasks',
      sortable: true,
      sortValue: (p) => p.totalTasks,
      render: (p) => (
        <span className="mono">
          {p.completedTasks}/{p.totalTasks}
        </span>
      ),
    },
    {
      key: 'endDate',
      label: 'Due',
      sortable: true,
      render: (p) => <span className="mono">{p.endDate || '—'}</span>,
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            label: '',
            render: (p: Project) => (
              <button
                className="btn btn--ghost"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  handleDelete(p);
                }}
                aria-label={`Delete ${p.name}`}
                title="Delete project"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            ),
          } satisfies DataTableColumn<Project>,
        ]
      : []),
  ];

  return (
    <>
      <div className="top-strip">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Projects</h1>
          <p>Every project, who owns it, and how far along it is.</p>
        </div>
        {isAdmin && (
          <button className="btn btn--primary" onClick={() => setShowModal(true)}>
            <Plus size={15} strokeWidth={2.5} />
            New project
          </button>
        )}
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={projects || []}
          getRowId={(p) => p.id}
          loading={!projects}
          onRowClick={(p) => navigate(`/projects/${p.id}`)}
          searchPlaceholder="Search projects…"
          emptyState={
            <div className="empty-state">
              <div className="empty-state__icon">
                <FolderKanban size={18} strokeWidth={2} />
              </div>
              No projects yet.
            </div>
          }
        />
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            load();
            toast.success('Project created.');
          }}
        />
      )}
    </>
  );
}

interface ProjectFormState {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  ownerId: string;
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<ProjectFormState>({
    name: '',
    description: '',
    status: 'PLANNED',
    startDate: '',
    endDate: '',
    ownerId: '',
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Give the project a name.');
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError('The due date can\u2019t be before the start date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: ProjectRequest = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        ownerId: form.ownerId ? Number(form.ownerId) : undefined,
      };
      await api.post('/projects', payload);
      onCreated();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create the project.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          <Plus size={17} strokeWidth={2.5} /> New project
        </h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
              >
                {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ownerId">Assigned admin</label>
              <select id="ownerId" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
                <option value="">Me (default)</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="startDate">Start date</label>
              <input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="endDate">Due date</label>
              <input
                id="endDate"
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}