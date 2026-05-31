import { type ReactNode, forwardRef } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../ui/utils';

/* ─── PageShell ────────────────────────────────────────────── */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'synaptic-scroll flex-1 min-h-0 overflow-auto bg-[var(--color-bg)]',
        className,
      )}
      data-scrollable="true"
    >
      <div className="mx-auto w-full max-w-[var(--page-max)] px-[var(--page-px)] py-6 md:py-8 pb-28 lg:pb-8">
        {children}
      </div>
    </div>
  );
}

/* ─── PageHeader ───────────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm md:text-base text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
}

/* ─── Panel ────────────────────────────────────────────────── */
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-7',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─── AppButton ────────────────────────────────────────────── */
const btnBase =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-[var(--duration-fast)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

const btnVariants: Record<string, string> = {
  primary:
    'rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-glow)] hover:bg-[var(--color-primary-hover)]',
  secondary:
    'rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
  ghost:
    'rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]',
  danger:
    'rounded-[var(--radius-md)] bg-[var(--color-danger)] text-white hover:bg-red-700',
};

const btnSizes: Record<string, string> = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-8 text-sm',
};

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ children, className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(btnBase, btnVariants[variant], btnSizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

AppButton.displayName = 'AppButton';

/* ─── AppLinkButton ────────────────────────────────────────── */
interface AppLinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  state?: unknown;
}

export const AppLinkButton = forwardRef<HTMLAnchorElement, AppLinkButtonProps>(
  ({ to, children, className, variant = 'primary', size = 'md', state, ...props }, ref) => {
    return (
      <Link
        ref={ref as any}
        to={to}
        state={state}
        className={cn(btnBase, btnVariants[variant], btnSizes[size], className)}
        {...(props as any)}
      >
        {children}
      </Link>
    );
  }
);

AppLinkButton.displayName = 'AppLinkButton';

/* ─── BackLink ─────────────────────────────────────────────── */
export function BackLink({
  to = '/',
  children,
}: {
  to?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-4"
    >
      <ArrowLeft className="w-4 h-4" />
      {children || 'Ortga'}
    </Link>
  );
}

/* ─── Alert ────────────────────────────────────────────────── */
export function Alert({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-md)] border border-red-200 bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)]',
        className,
      )}
      role="alert"
    >
      <svg
        className="w-5 h-5 shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <div>{children}</div>
    </div>
  );
}

/* ─── SuccessBanner ────────────────────────────────────────── */
export function SuccessBanner({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700',
        className,
      )}
      role="status"
    >
      <svg
        className="w-5 h-5 shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <div>{children}</div>
    </div>
  );
}

/* ─── FormField ────────────────────────────────────────────── */
export function FormField({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-[var(--color-text)]">
        {label}
        {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
      </label>
      {hint && (
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{hint}</p>
      )}
      {children}
    </div>
  );
}

/* ─── Input class names ────────────────────────────────────── */
export const inputClassName = cn(
  'w-full min-h-11 rounded-[var(--radius-md)]',
  'border border-[var(--color-border-strong)] bg-[var(--color-surface)]',
  'px-4 text-sm text-[var(--color-text)]',
  'placeholder:text-[var(--color-text-muted)]',
  'outline-none focus:outline-none',
  'focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-muted)]',
  'transition-all duration-[var(--duration-fast)]',
  'disabled:opacity-50 disabled:bg-[var(--color-bg-subtle)]',
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
);

export const selectClassName = cn(
  'w-full min-h-11 rounded-[var(--radius-md)]',
  'border border-[var(--color-border-strong)] bg-[var(--color-surface)]',
  'px-4 text-sm text-[var(--color-text)]',
  'outline-none appearance-none',
  'focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-muted)]',
  'transition-all duration-[var(--duration-fast)]',
  'disabled:opacity-50 disabled:bg-[var(--color-bg-subtle)]',
  'bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2012%2012%27%3E%3Cpath%20fill=%27%2364748b%27%20d=%27M2%204l4%204%204-4%27/%3E%3C/svg%3E")]',
  'bg-[length:12px_12px] bg-[position:right_12px_center] bg-no-repeat',
  'pr-9',
);

export const textareaClassName = cn(
  'w-full rounded-[var(--radius-md)]',
  'border border-[var(--color-border-strong)] bg-[var(--color-surface)]',
  'px-4 py-3 text-sm text-[var(--color-text)]',
  'placeholder:text-[var(--color-text-muted)]',
  'outline-none resize-y focus:outline-none',
  'focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-muted)]',
  'transition-all duration-[var(--duration-fast)]',
  'disabled:opacity-50 disabled:bg-[var(--color-bg-subtle)]',
);

/* ─── Badge ────────────────────────────────────────────────── */
const badgeVariants: Record<string, string> = {
  primary:
    'bg-[var(--color-primary-muted)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/15',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
  danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] ring-1 ring-red-600/15',
  neutral:
    'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15',
};

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'neutral' | 'warning';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ─── Logo ─────────────────────────────────────────────────── */
const logoSizes: Record<string, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
};

export function Logo({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <img
      src="/img/main_logo.jpg"
      alt="Synaptic"
      className={cn(
        'rounded-[var(--radius-md)] object-cover',
        logoSizes[size],
        className,
      )}
    />
  );
}

/* ─── AuthLayout ───────────────────────────────────────────── */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-primary-subtle)] to-[var(--color-bg)] px-4 py-8">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,28,255,0.08),transparent_55%)]"
        aria-hidden
      />
      <div className="relative w-full max-w-md animate-fadeIn">{children}</div>
    </div>
  );
}

/* ─── AuthCard ─────────────────────────────────────────────── */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl p-8 shadow-[var(--shadow-md)]">
      {children}
    </div>
  );
}

/* ─── EmptyState ───────────────────────────────────────────── */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode | { to: string; label: string };
}) {
  return (
    <div className="text-center py-12 max-w-md mx-auto">
      <h2 className="text-lg font-bold text-[var(--color-text)]">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {typeof action === 'object' && 'to' in action ? (
            <AppLinkButton to={action.to} variant="primary">
              {action.label}
            </AppLinkButton>
          ) : (
            (action as ReactNode)
          )}
        </div>
      )}
    </div>
  );
}

/* ─── StatCard ─────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5',
        className,
      )}
    >
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[var(--color-text)] tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{hint}</p>
      )}
    </div>
  );
}

/* ─── IconButton ───────────────────────────────────────────── */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  label?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, label, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] transition-colors',
          'disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

/* ─── MobileCardList ───────────────────────────────────────── */
export function MobileCardList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('md:hidden space-y-3', className)}>{children}</div>
  );
}

/* ─── DataTableShell ───────────────────────────────────────── */
export function DataTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'hidden md:block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─── DataCard ─────────────────────────────────────────────── */
export function DataCard({
  title,
  subtitle,
  meta,
  badges,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-[var(--color-text)] truncate">{title}</p>
        {subtitle && (
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
            {subtitle}
          </p>
        )}
        {meta && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
            {meta}
          </p>
        )}
      </div>
      {badges && (
        <div className="flex flex-wrap gap-1.5">{badges}</div>
      )}
      {actions && (
        <div className="flex items-center gap-1 pt-2 border-t border-[var(--color-border)]">
          {actions}
        </div>
      )}
    </div>
  );
}
