import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Target,
  Users,
  LayoutDashboard,
  Plus,
  Briefcase,
  Bot,
  LogOut,
  LogIn,
  MessageSquare,
  Menu,
  X,
  UserCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { cn } from './components/ui/utils';
import { Logo } from './components/design';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const homeLabel = isAuthenticated ? 'Boshqaruv' : 'Bosh sahifa';

  const allNavItems = [
    { name: homeLabel, path: '/', icon: LayoutDashboard, roles: ['any'] as const },
    { name: 'Kampaniyalar', path: '/business/campaigns', icon: Briefcase, roles: ['business'] as const },
    { name: 'Analitika', path: '/business/analytics', icon: Target, roles: ['business'] as const },
    { name: 'Agentlar', path: '/agent/manage', icon: Bot, roles: ['agent'] as const },
    { name: 'Daromad', path: '/agent/analytics', icon: Users, roles: ['agent'] as const },
    { name: 'Profil', path: '/profile', icon: UserCircle, roles: ['business', 'agent'] as const },
    { name: 'Demo', path: '/demo', icon: MessageSquare, roles: ['any'] as const },
  ];

  const navItems = allNavItems.filter(
    (item) =>
      item.roles.includes('any') ||
      (user && (item.roles as readonly string[]).includes(user.role))
  );

  const mobileNavItems = isAuthenticated
    ? user?.role === 'business'
      ? navItems.filter((i) =>
          ['/', '/business/campaigns', '/business/analytics', '/profile', '/demo'].includes(i.path)
        )
      : navItems.filter((i) =>
          ['/', '/agent/manage', '/agent/analytics', '/profile', '/demo'].includes(i.path)
        )
    : navItems.filter((i) => i.path === '/' || i.path === '/demo');

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const isDemo = location.pathname === '/demo';

  return (
    <div className="h-[100dvh] flex flex-col font-sans overflow-hidden bg-[var(--color-bg)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-[var(--radius-md)] focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Asosiy kontentga o‘tish
      </a>
      {!isDemo && (
      <header className="shrink-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface-glass)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
        <div className="mx-auto flex h-[var(--header-h)] max-w-[var(--page-max)] items-center justify-between gap-4 px-[var(--page-px)]">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Logo size="md" />
              <span className="hidden sm:block text-lg font-bold tracking-tight text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)]">
                Synaptic
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5 ml-2" aria-label="Asosiy menyu">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'relative flex items-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-medium transition-colors min-h-10',
                      active
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-text)]'
                    )}
                  >
                    {active && (
                      <span
                        className="absolute inset-x-2.5 -bottom-[13px] h-0.5 rounded-full bg-[var(--color-primary)]"
                        aria-hidden
                      />
                    )}
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {user?.role === 'business' && (
                  <Link
                    to="/business/campaigns"
                    className="hidden sm:inline-flex items-center gap-2 min-h-10 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-glow)] hover:bg-[var(--color-primary-hover)] transition-colors duration-[var(--duration-fast)]"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">Yangi kampaniya</span>
                  </Link>
                )}
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[var(--color-border)]">
                  <Link
                    to="/profile"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-muted)] to-[var(--color-primary)]/20 text-sm font-bold text-[var(--color-primary)] ring-2 ring-[var(--color-surface)] hover:ring-[var(--color-primary)] transition-shadow"
                    title="Profil"
                  >
                    {userInitial}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] transition-colors"
                    aria-label="Chiqish"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 min-h-10 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-glow)] hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Kirish</span>
              </Link>
            )}

            <button
              type="button"
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text)] hover:bg-[var(--color-primary-subtle)]"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-label="Menyu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--page-px)] py-4 animate-fadeIn">
            <nav className="flex flex-col gap-1">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 min-h-12 rounded-[var(--radius-md)] px-4 text-sm font-medium transition-colors',
                  isActive('/profile')
                    ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-icon-bg)] text-xs font-bold text-[var(--color-primary)]">
                  {userInitial}
                </span>
                Profil
              </Link>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 min-h-12 rounded-[var(--radius-md)] px-4 text-sm font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 min-h-12 rounded-[var(--radius-md)] px-4 text-sm font-medium text-[var(--color-danger)] mt-2 hover:bg-[var(--color-danger-bg)]"
                >
                  <LogOut className="w-5 h-5" />
                  Chiqish
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
      )}

      <main id="main-content" className="flex-1 min-h-0 overflow-hidden flex flex-col" tabIndex={-1}>
        <Outlet />
      </main>

      {!isDemo && (
      <nav
        className="lg:hidden shrink-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface-glass)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        aria-label="Pastki navigatsiya"
      >
        <div className="flex items-stretch justify-around h-[var(--bottom-nav-h)] px-1">
          {mobileNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 min-w-0 px-1 transition-colors duration-[var(--duration-fast)]',
                  active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-all duration-[var(--duration-fast)]',
                    active && 'bg-[var(--color-primary-muted)] scale-105'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-semibold truncate max-w-full">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      )}
    </div>
  );
}
