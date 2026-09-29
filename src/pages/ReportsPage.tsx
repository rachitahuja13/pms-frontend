import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import Spinner from '../components/Spinner';
import type { EmployeeReport, ProjectReport } from '../types';

type Tab = 'projects' | 'employees';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('projects');
  const [projectReports, setProjectReports] = useState<ProjectReport[] | null>(null);
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<ProjectReport[]>('/reports/projects'),
      api.get<EmployeeReport[]>('/reports/employees'),
    ])
      .then(([projectsRes, employeesRes]) => {
        setProjectReports(projectsRes.data);
        setEmployeeReports(employeesRes.data);
      })
      .catch((err) => setError(extractErrorMessage(err, 'Could not load reports.')));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;

  const projectColumns: DataTableColumn<ProjectReport>[] = [
    { key: 'projectName', label: 'Project', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'totalTasks', label: 'Total', sortable: true },
    { key: 'todo', label: 'To do', sortable: true },
    { key: 'inProgress', label: 'In progress', sortable: true },
    { key: 'blocked', label: 'Blocked', sortable: true },
    { key: 'completed', label: 'Completed', sortable: true },
    {
      key: 'overdue',
      label: 'Overdue',
      sortable: true,
      render: (r) => (
        <span className="mono" style={{ color: r.overdue > 0 ? 'var(--status-blocked)' : 'inherit' }}>
          {r.overdue}
        </span>
      ),
    },
    {
      key: 'progressPercent',
      label: 'Progress',
      sortable: true,
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-bar__fill" style={{ width: `${r.progressPercent}%` }} />
          </div>
          <span className="mono" style={{ fontSize: 12.5 }}>
            {r.progressPercent}%
          </span>
        </div>
      ),
    },
  ];

  const employeeColumns: DataTableColumn<EmployeeReport>[] = [
    { key: 'fullName', label: 'Employee', sortable: true },
    { key: 'totalAssigned', label: 'Assigned', sortable: true },
    { key: 'todo', label: 'To do', sortable: true },
    { key: 'inProgress', label: 'In progress', sortable: true },
    { key: 'blocked', label: 'Blocked', sortable: true },
    { key: 'completed', label: 'Completed', sortable: true },
    {
      key: 'overdue',
      label: 'Overdue',
      sortable: true,
      render: (r) => (
        <span className="mono" style={{ color: r.overdue > 0 ? 'var(--status-blocked)' : 'inherit' }}>
          {r.overdue}
        </span>
      ),
    },
    {
      key: 'completionRate',
      label: 'Completion rate',
      sortable: true,
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-bar__fill" style={{ width: `${r.completionRate}%` }} />
          </div>
          <span className="mono" style={{ fontSize: 12.5 }}>
            {r.completionRate}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Reports</h1>
        <p>Progress and workload, broken down by project and by employee.</p>
      </div>

      <div className="tab-strip">
        <button className={`tab-strip__btn${tab === 'projects' ? ' active' : ''}`} onClick={() => setTab('projects')}>
          By project
        </button>
        <button className={`tab-strip__btn${tab === 'employees' ? ' active' : ''}`} onClick={() => setTab('employees')}>
          By employee
        </button>
      </div>

      <div className="card">
        {tab === 'projects' ? (
          !projectReports ? (
            <Spinner label="Loading project reports…" />
          ) : (
            <DataTable
              columns={projectColumns}
              rows={projectReports}
              getRowId={(r) => r.projectId}
              searchPlaceholder="Search projects…"
              emptyState={
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <BarChart3 size={18} strokeWidth={2} />
                  </div>
                  No project data yet.
                </div>
              }
            />
          )
        ) : !employeeReports ? (
          <Spinner label="Loading employee reports…" />
        ) : (
          <DataTable
            columns={employeeColumns}
            rows={employeeReports}
            getRowId={(r) => r.userId}
            searchPlaceholder="Search employees…"
            emptyState={
              <div className="empty-state">
                <div className="empty-state__icon">
                  <BarChart3 size={18} strokeWidth={2} />
                </div>
                No employee data yet.
              </div>
            }
          />
        )}
      </div>
    </>
  );
}
