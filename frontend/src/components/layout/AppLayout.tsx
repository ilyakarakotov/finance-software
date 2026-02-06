import { NavLink, Outlet, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Building2, DollarSign, Layers, BarChart3, ShoppingCart,
  LayoutDashboard, Calendar, Home,
} from 'lucide-react';

const navItems = [
  { path: 'setup', label: 'Project Setup', icon: Building2 },
  { path: 'budget', label: 'Budget', icon: DollarSign },
  { path: 'capital', label: 'Capital Stack', icon: Layers },
  { path: 'cashflow', label: 'Cashflow', icon: Calendar },
  { path: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: 'sales', label: 'Sales', icon: ShoppingCart },
];

export default function AppLayout() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="min-h-screen bg-[#0f1729]">
      {/* Top header */}
      <header className="bg-navy-900/80 border-b border-navy-700 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between h-12">
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <LayoutDashboard size={18} />
              Greencity Finance
            </NavLink>
            {projectId && (
              <span className="text-xs text-slate-500 ml-2">
                Project #{projectId}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">v1.0 — Phase 1</div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar nav (only when inside a project) */}
        {projectId && (
          <nav className="w-48 min-h-[calc(100vh-48px)] bg-navy-900/40 border-r border-navy-700/50 p-2 space-y-0.5 flex-shrink-0">
            <NavLink
              to="/"
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs px-3 py-2 rounded transition-colors mb-2"
            >
              <Home size={14} />
              All Projects
            </NavLink>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={`/project/${projectId}/${item.path}`}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 text-xs px-3 py-2 rounded transition-colors',
                    isActive
                      ? 'bg-navy-700/50 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-navy-800/50'
                  )
                }
              >
                <item.icon size={14} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Main content */}
        <main className={clsx('flex-1 p-6 max-w-[1600px]', !projectId && 'mx-auto')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
