import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  FolderKanban,
  Users,
  LogOut,
  BarChart3,
  Sparkles,
  Menu,
  X,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/my-tasks', label: 'My Tasks', icon: ListChecks },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/kanban', label: 'Kanban Board', icon: LayoutGrid },
  { to: '/users', label: 'Employees', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/chat', label: 'AI Assistant', icon: Sparkles },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <div className="app-shell">
      <button className="mobile-topbar" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu size={20} strokeWidth={2} />
        <span className="mobile-topbar__brand">The New Dimensionz</span>
      </button>

      {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark">ND</div>
          <div>
            <div className="sidebar__brand-name">The New Dimensionz</div>
            <div className="sidebar__brand-sub">Project Manager</div>
          </div>
          <button className="sidebar__close-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user-name">{user?.fullName}</div>
          <div className="sidebar__user-role">{isAdmin ? 'Administrator' : 'Employee'}</div>
          <button className="sidebar__logout" onClick={logout}>
            <LogOut size={14} strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
