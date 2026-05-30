import { type ReactNode, type ComponentType, forwardRef } from 'react';
import { Link } from 'react-router';
import { cn } from '../ui/utils';
import { LanguageSwitcher } from "./LanguageSwitcher";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("filter drop-shadow-md", 'synaptic-scroll flex-1 min-h-0 overflow-auto bg-[var(--color-bg)]', className)} data-scrollable="true">
      <div className="mx-auto w-full max-w-[var(--page-max)] px-[var(--page-px)] py-6 md:py-8 pb-28 lg:pb-8">
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions, className }: any) {
  return (
    <header className={cn("filter drop-shadow-md", 'mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text)]">{title}</h1>
        {description && <p className="mt-2 text-sm md:text-base text-[var(--color-text-secondary)]">{description}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <LanguageSwitcher />
        {actions}
      </div>
    </header>
  );
}

// Qolgan komponentlar...
export function Panel({ children, className, padding = true }: any) { return <div className={cn("filter drop-shadow-md", 'rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-5 md:p-7', className)}>{children}</div>; }
export function AppButton({ children, className, ...props }: any) { return <button className={cn("filter drop-shadow-md", 'inline-flex items-center justify-center gap-2', className)} {...props}>{children}</button>; }
export function AppLinkButton({ to, children, className }: any) { return <Link to={to} className={cn("filter drop-shadow-md", 'inline-flex items-center justify-center', className)}>{children}</Link>; }
export function BackLink({ to, children }: any) { return <Link to={to}>{children}</Link>; }
export function Alert({ children }: any) { return <div className="p-4 border">{children}</div>; }
export function SuccessBanner({ children }: any) { return <div className="p-4 bg-green-100">{children}</div>; }
export function FormField({ label, children }: any) { return <div><label>{label}</label>{children}</div>; }
export const inputClassName = "w-full border p-2";
export function Badge({ children }: any) { return <span>{children}</span>; }
export function Logo({ size = 'md', className }: any) { return <img src="/img/main_logo.jpg" alt="Synaptic" className={cn("filter drop-shadow-md", 'rounded', className)} />; }
export function AuthLayout({ children }: any) { return <div className="p-10">{children}</div>; }
export function AuthCard({ children }: any) { return <div className="p-8 border">{children}</div>; }
export function EmptyState({ title, description, action }: any) { return <div><h2>{title}</h2><p>{description}</p></div>; }
export function StatCard({ label, value }: any) { return <div className="border p-5">{label} {value}</div>; }
export function IconButton({ children, ...props }: any) { return <button {...props}>{children}</button>; }
export function MobileCardList({ children }: any) { return <div className="md:hidden">{children}</div>; }
export function DataTableShell({ children }: any) { return <div className="hidden md:block">{children}</div>; }
export function DataCard({ title, actions }: any) { return <div><h3>{title}</h3>{actions}</div>; }
