export type Role = 'ADMIN' | 'EMPLOYEE';

export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'PENDING_APPROVAL' | 'COMPLETED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  department: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdByName: string | null;
  /** The one admin who owns/manages this project. Null means "any admin can approve here". */
  ownerId: number | null;
  ownerName: string | null;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  createdAt: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  projectName: string;
  assignedToId: number | null;
  assignedToName: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  overdue: boolean;
  createdAt: string;
  /** Set only while status === 'PENDING_APPROVAL'. */
  completionRequestedByName: string | null;
  completionRequestedAt: string | null;
  /** Denormalized from the task's project. Null means "any admin can approve". */
  projectOwnerId: number | null;
  projectOwnerName: string | null;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  user: User;
}

export interface DashboardResponse {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  overdueTasks: number;
  totalEmployees: number;
  recentTasks: Task[];
  upcomingDeadlines: Task[];
  overdueTaskList: Task[];
  pendingApprovalTasks: Task[];
}

export interface ProjectReport {
  projectId: number;
  projectName: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  totalTasks: number;
  todo: number;
  inProgress: number;
  blocked: number;
  completed: number;
  overdue: number;
  progressPercent: number;
}

export interface EmployeeReport {
  userId: number;
  fullName: string;
  totalAssigned: number;
  todo: number;
  inProgress: number;
  blocked: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details?: string[];
}

/* -------- Request payloads -------- */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  department?: string;
}

export interface ProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  /** Defaults to the creating admin on creation if omitted. */
  ownerId?: number;
  /** Required by the backend when this request changes description, endDate, or ownerId on an existing project. */
  changeReason?: string;
}

export interface ProjectAuditLog {
  id: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  changedByName: string;
  changedAt: string;
}

export interface TaskRequest {
  title: string;
  description?: string;
  projectId: number;
  assignedToId?: number | null;
  priority?: TaskPriority;
  dueDate?: string;
  /** Required by the backend when this request changes description/dueDate/priority/assignedToId on an existing task. */
  changeReason?: string;
}

export interface TaskAuditLog {
  id: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  changedByName: string;
  changedAt: string;
}

export interface TaskStatusUpdateRequest {
  status: TaskStatus;
}

export interface TaskRejectRequest {
  reason: string;
}

/* -------- AI Assistant (chat) -------- */

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
}