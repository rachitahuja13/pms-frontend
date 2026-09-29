import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Users as UsersIcon } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import type { CreateUserRequest, Role, User } from '../types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  function load() {
    api
      .get<User[]>('/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Could not load employees.')));
  }

  useEffect(load, []);

  async function toggleEnabled(user: User) {
    const ok = await confirm({
      title: user.enabled ? `Disable ${user.fullName}?` : `Re-enable ${user.fullName}?`,
      message: user.enabled
        ? 'They will immediately lose access and won\u2019t be able to sign in.'
        : 'They will be able to sign in again.',
      confirmLabel: user.enabled ? 'Disable account' : 'Enable account',
      tone: user.enabled ? 'danger' : 'default',
    });
    if (!ok) return;

    try {
      const { data } = await api.put<User>(`/users/${user.id}`, { enabled: !user.enabled });
      setUsers((prev) => (prev ? prev.map((u) => (u.id === user.id ? data : u)) : prev));
      toast.success(data.enabled ? 'Account enabled.' : 'Account disabled.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not update this account.'));
    }
  }

  const columns: DataTableColumn<User>[] = [
    { key: 'fullName', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true, render: (u) => <span className="mono">{u.email}</span> },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (u) => (u.role === 'ADMIN' ? 'Administrator' : 'Employee'),
    },
    { key: 'department', label: 'Department', sortable: true, render: (u) => u.department || '—' },
    {
      key: 'enabled',
      label: 'Status',
      sortable: true,
      render: (u) => (
        <span className={`badge ${u.enabled ? 'badge--completed' : 'badge--blocked'}`}>
          {u.enabled ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <button
          className="btn btn--secondary"
          onClick={(e) => {
            e.stopPropagation();
            toggleEnabled(u);
          }}
        >
          {u.enabled ? 'Disable' : 'Enable'}
        </button>
      ),
    },
  ];

  if (error) return <div className="error-banner">{error}</div>;

  return (
    <>
      <div className="top-strip">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Employees</h1>
          <p>Everyone with access, and their account status.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          <UserPlus size={15} strokeWidth={2.5} />
          New account
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={users || []}
          getRowId={(u) => u.id}
          loading={!users}
          searchPlaceholder="Search employees…"
          emptyState={
            <div className="empty-state">
              <div className="empty-state__icon">
                <UsersIcon size={18} strokeWidth={2} />
              </div>
              No employees yet.
            </div>
          }
        />
      </div>

      {showModal && (
        <NewUserModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            load();
            toast.success('Account created.');
          }}
        />
      )}
    </>
  );
}

interface UserFormState {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  department: string;
}

function NewUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<UserFormState>({
    fullName: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload: CreateUserRequest = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department.trim() || undefined,
      };
      await api.post('/users', payload);
      onCreated();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not create this account.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          <UserPlus size={17} strokeWidth={2.5} /> New account
        </h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Temporary password</label>
            <input
              id="password"
              type="text"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="department">Department</label>
              <input
                id="department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
