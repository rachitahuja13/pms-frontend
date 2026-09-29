# The New Dimensionz — Project Manager (Frontend)

Employee-facing web app for the Project & Task Management System, written in
TypeScript with React + Vite. Talks to the existing Spring Boot backend over
its REST API.

## Features
- **Login** (JWT, stored in localStorage, attached automatically to every API call)
- **Dashboard**
  - Employees: a personal to-do list of assigned tasks — a red circle means not
    started, amber means in progress, green check means completed. Click the
    circle to toggle a task complete/incomplete right from the dashboard.
  - Admins: org-wide overview (active projects, task counts by status, overdue
    tasks, upcoming deadlines).
- **My Tasks** — every task assigned to you, in a searchable/sortable table with
  an inline status dropdown.
- **Projects** — searchable/sortable table with progress bars; click into a
  project to see its task table. Admins can create, delete, and duplicate tasks,
  and delete projects.
- **Employees** (admin only) — create accounts, enable/disable access.
- **Kanban Board** (admin only) — all tasks across every project (or filtered to
  one), grouped into To do / In progress / Blocked / Completed columns. Drag a
  card to a new column to change its status, or use the status dropdown on
  each card (works on touch devices where drag-and-drop doesn't).
- **Reports** (admin only) — per-project and per-employee breakdowns in
  sortable/searchable tables.
- **AI Assistant** (admin only) — placeholder screen for an upcoming AI chat
  feature; not yet wired to a backend.
- **Confirmation dialogs** — destructive actions (delete task/project, disable
  an account) go through a proper in-app dialog, never the browser's native
  `confirm()`/`alert()`.
- **Toast notifications** for success/error feedback on actions.
- **Fully responsive** — the sidebar collapses into a slide-out mobile menu
  under ~900px, tables scroll horizontally, forms and stat grids reflow.

Role-based UI: employees see Dashboard / My Tasks / Projects. Admins
additionally get Employees, Reports, and AI Assistant tabs, plus create/delete/
duplicate controls. The backend enforces the same rules independently — this
is convenience, not the security boundary.

## Tech stack
- React 18 + TypeScript (strict mode)
- Vite
- react-router-dom v6
- axios
- lucide-react (icons)
- No UI framework — hand-built design system (see `src/index.css`)

## Local development
```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your backend
npm run dev
```
Opens on `http://localhost:5173`. Make sure the backend is running and
reachable at the URL in `.env`.

### Type checking
```bash
npm run typecheck   # tsc -b --noEmit, no build output
npm run build        # tsc -b && vite build — build fails on type errors
```

## Project structure
```
src/
├── api/client.ts           Axios instance, JWT interceptor, error helper
├── types/index.ts           All shared types — mirrors the backend's DTOs
├── context/                 AuthContext, ConfirmContext, ToastContext
├── hooks/                   useAuth, useConfirm, useToast
├── components/
│   ├── Layout.tsx            App shell: dark sidebar + responsive mobile nav
│   ├── DataTable.tsx         Generic sortable/searchable/paginated table
│   ├── ConfirmDialog.tsx     Styled confirm/cancel dialog (used via useConfirm)
│   ├── StatusBadge.tsx, Spinner.tsx, Skeleton.tsx, ProtectedRoute.tsx
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx      Branches on role: employee to-do list vs admin overview
    ├── MyTasksPage.tsx
    ├── ProjectsPage.tsx       + create/delete project
    ├── ProjectDetailPage.tsx  + create/duplicate/delete task
    ├── UsersPage.tsx          admin only
    ├── ReportsPage.tsx        admin only
    └── ChatPage.tsx           admin only, "coming soon" placeholder
```

## Building for the office network
Same as before — build once, serve statically from the same internal server as
the backend.

### Option A — Docker (recommended)
```bash
docker build --build-arg VITE_API_BASE_URL=https://pms.internal.yourcompany.com/api -t pms-frontend .
docker run -d -p 80:80 --name pms-frontend pms-frontend
```

### Option B — Plain static build
```bash
npm run build
```
Produces `dist/`. Copy its contents to your internal web server's document
root. Make sure unknown paths fall back to `index.html` (see `nginx.conf`) or
refreshing on `/projects/3` will 404.

## Environment variable
| Var | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | Backend base URL. Compile-time, not runtime — set before `npm run build` / `docker build`. |

## Notes
- No attempt is made to detect "am I on the office network" — that's enforced
  by the backend not being reachable from outside the LAN (see the backend
  README). If the API is unreachable, calls simply fail with a network error.
- The Google Fonts `<link>` tags in `index.html` are a progressive enhancement;
  if your office network has no general internet access, remove them — the CSS
  already falls back to system fonts.
- JWTs live in `localStorage`. A 401 response clears the session and redirects
  to `/login` automatically (`src/api/client.ts`).
- The AI Assistant page is a UI placeholder only — no chat backend exists yet.
