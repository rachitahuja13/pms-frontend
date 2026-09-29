import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, GripVertical } from 'lucide-react';
import { api, extractErrorMessage } from '../api/client';
import Spinner from '../components/Spinner';
import { useToast } from '../hooks/useToast';
import type { Project, Task, TaskStatus } from '../types';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'PENDING_APPROVAL', label: 'Pending approval' },
  { status: 'BLOCKED', label: 'Blocked' },
  { status: 'COMPLETED', label: 'Completed' },
];

const DOT_CLASS: Record<TaskStatus, string> = {
  TODO: 'badge--todo',
  IN_PROGRESS: 'badge--in-progress',
  BLOCKED: 'badge--blocked',
  COMPLETED: 'badge--completed',
  PENDING_APPROVAL: 'badge--pending-approval',
};

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [error, setError] = useState('');
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const toast = useToast();

  function load() {
    Promise.all([api.get<Task[]>('/tasks'), api.get<Project[]>('/projects')])
      .then(([tasksRes, projectsRes]) => {
        setTasks(tasksRes.data);
        setProjects(projectsRes.data);
      })
      .catch((err) => setError(extractErrorMessage(err, 'Could not load the board.')));
  }

  useEffect(load, []);

  const visibleTasks = useMemo(() => {
    if (!tasks) return [];
    if (projectFilter === 'all') return tasks;
    return tasks.filter((t) => String(t.projectId) === projectFilter);
  }, [tasks, projectFilter]);

  async function moveTask(taskId: number, nextStatus: TaskStatus) {
    const task = tasks?.find((t) => t.id === taskId);
    if (!task || task.status === nextStatus) return;

    setUpdatingId(taskId);
    // Optimistic update so the drag feels instant.
    setTasks((prev) => (prev ? prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)) : prev));
    try {
      const { data } = await api.patch<Task>(`/tasks/${taskId}/status`, { status: nextStatus });
      setTasks((prev) => (prev ? prev.map((t) => (t.id === taskId ? data : t)) : prev));
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not move this task.'));
      load(); // revert to server truth on failure
    } finally {
      setUpdatingId(null);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, status: TaskStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const taskId = Number(e.dataTransfer.getData('text/task-id'));
    if (taskId) moveTask(taskId, status);
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!tasks) return <Spinner label="Loading board…" />;

  return (
    <>
      <div className="top-strip">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Kanban Board</h1>
          <p>Drag a card to change its status, or use the dropdown on touch devices.</p>
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const columnTasks = visibleTasks.filter((t) => t.status === col.status);
          return (
            <div
              key={col.status}
              className={`kanban-column${dragOverStatus === col.status ? ' kanban-column--over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <div className="kanban-column__header">
                <span className={`badge ${DOT_CLASS[col.status]}`}>
                  <span className="badge__dot" />
                  {col.label}
                </span>
                <span className="mono kanban-column__count">{columnTasks.length}</span>
              </div>

              <div className="kanban-column__body">
                {columnTasks.length === 0 ? (
                  <div className="kanban-empty">No tasks here.</div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`kanban-card${updatingId === task.id ? ' kanban-card--updating' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/task-id', String(task.id));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <div className="kanban-card__top">
                        <GripVertical size={13} strokeWidth={2} className="kanban-card__grip" />
                        <span className={`kanban-card__priority kanban-card__priority--${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                        {task.overdue && <span className="badge badge--overdue">Overdue</span>}
                      </div>

                      <div className="kanban-card__title">{task.title}</div>

                      <div className="kanban-card__meta">
                        <Link to={`/projects/${task.projectId}`} onClick={(e) => e.stopPropagation()}>
                          {task.projectName}
                        </Link>
                        {task.dueDate && <span className="mono">Due {task.dueDate}</span>}
                      </div>

                      <div className="kanban-card__footer">
                        <span className="kanban-card__assignee">
                          {task.assignedToName || 'Unassigned'}
                        </span>
                        <select
                          className="kanban-card__status-select"
                          value={task.status}
                          disabled={updatingId === task.id}
                          onChange={(e) => moveTask(task.id, e.target.value as TaskStatus)}
                          aria-label={`Change status for ${task.title}`}
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.status} value={c.status}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {visibleTasks.length === 0 && (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <div className="empty-state__icon">
            <LayoutGrid size={18} strokeWidth={2} />
          </div>
          No tasks match this filter.
        </div>
      )}
    </>
  );
}
