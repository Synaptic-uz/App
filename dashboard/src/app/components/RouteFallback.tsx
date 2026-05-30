export default function RouteFallback() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-3 bg-[var(--color-bg)]"
      role="status"
      aria-live="polite"
      aria-label="Sahifa yuklanmoqda"
    >
      <div className="h-10 w-10 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      <p className="text-sm text-[var(--color-text-secondary)]">Yuklanmoqda…</p>
    </div>
  );
}
