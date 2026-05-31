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
  ChevronDown,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import { cn } from './components/ui/utils';
import { Logo } from './components/design';
import LanguageSwitcher from './components/LanguageSwitcher';

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const homeLabel = isAuthenticated ? t('navigation.dashboard') : t('navigation.home');

  const allNavItems = [
    { name: homeLabel, path: '/', icon: LayoutDashboard, roles: ['any'] as const },
    { name: t('navigation.campaigns'), path: '/business/campaigns', icon: Briefcase, roles: ['business'] as const },
    { name: t('navigation.analytics'), path: '/business/analytics', icon: Target, roles: ['business'] as const },
    { name: t('navigation.agents'), path: '/agent/manage', icon: Bot, roles: ['agent'] as const },
    { name: t('navigation.wallet'), path: '/agent/analytics', icon: Users, roles: ['agent'] as const },
    { name: t('navigation.demo'), path: '/demo', icon: MessageSquare, roles: ['any'] as const },
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
    setProfileDropdownOpen(false);
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const displayName = user?.display_name || user?.email?.split('@')[0] || '';
  const isDemo = location.pathname === '/demo';

  return (
    <div className="h-[100dvh] flex flex-col font-sans overflow-hidden bg-[var(--color-bg)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-[var(--radius-md)] focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t('navigation.skipToMain')}
      </a>
      {!isDemo && (
      <header className="shrink-0 z-50 border-b border-[var(--color-border)]/60 bg-white/75 backdrop-blur-2xl shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-16 max-w-[var(--page-max)] items-center gap-6 px-[var(--page-px)]">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Logo size="sm" className="ring-1 ring-black/5" />
            <span className="hidden sm:block text-[15px] font-extrabold tracking-tight text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
              Synaptic
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 flex-1" aria-label="Main menu">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-200',
                    active
                      ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <LanguageSwitcher />

            {isAuthenticated ? (
              <>
                {user?.role === 'business' && (
                  <Link
                    to="/business/campaigns"
                    className="hidden sm:inline-flex items-center gap-1.5 h-9 rounded-lg bg-[var(--color-primary)] px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition-all duration-200 active:scale-[0.97]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{t('campaigns.create')}</span>
                  </Link>
                )}

                {/* Profile Dropdown */}
                <div className="relative hidden md:block" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen((o) => !o)}
                    className={cn(
                      "flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-lg border transition-all duration-200",
                      profileDropdownOpen
                        ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-subtle)] shadow-sm"
                        : "border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]"
                    )}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-primary)] to-[#4f46e5] text-[11px] font-bold text-white">
                      {userInitial}
                    </span>
                    <span className="text-[13px] font-medium text-[var(--color-text)] max-w-[100px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-200",
                      profileDropdownOpen && "rotate-180"
                    )} />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3.5 py-2.5 border-b border-[var(--color-border)]/60">
                        <p className="text-[13px] font-semibold text-[var(--color-text)] truncate">{displayName}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] transition-colors"
                        >
                          <UserCircle className="w-4 h-4" />
                          {t('navigation.profile')}
                        </Link>
                      </div>
                      <div className="border-t border-[var(--color-border)]/60 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('auth.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-[var(--color-primary)] px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition-all duration-200 active:scale-[0.97]"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">{t('auth.login')}</span>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--color-border)]/60 bg-white px-[var(--page-px)] py-3 animate-in slide-in-from-top-2 fade-in duration-200">
            <nav className="flex flex-col gap-0.5">
              {isAuthenticated && (
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 h-11 rounded-lg px-3 text-[13px] font-medium transition-colors',
                    isActive('/profile')
                      ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-primary)] to-[#4f46e5] text-[11px] font-bold text-white">
                    {userInitial}
                  </span>
                  {displayName || t('navigation.profile')}
                </Link>
              )}
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 h-11 rounded-lg px-3 text-[13px] font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.name}
                </Link>
              ))}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 h-11 rounded-lg px-3 text-[13px] font-medium text-red-600 mt-1 border-t border-[var(--color-border)]/40 pt-2 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                  {t('auth.logout')}
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

      {/* Mobile Bottom Navigation */}
      {!isDemo && (
      <nav
        className="lg:hidden shrink-0 z-50 border-t border-[var(--color-border)]/60 bg-white/80 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)]"
        aria-label="Bottom navigation"
      >
        <div className="flex items-stretch justify-around h-14 px-1">
          {mobileNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 px-1 transition-all duration-200',
                  active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
                    active && 'bg-[var(--color-primary-subtle)] scale-110'
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
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
