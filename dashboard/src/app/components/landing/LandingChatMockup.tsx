import { Bot } from 'lucide-react';
import { Logo } from '../design';

export function LandingChatMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">IT yordamchi</p>
            <p className="text-xs text-[var(--color-text-muted)]">onlayn</p>
          </div>
          <Logo size="sm" className="ml-auto opacity-90" />
        </div>
        <div className="p-4 space-y-3 bg-white min-h-[280px]">
          <div className="flex justify-end">
            <div className="max-w-[88%] rounded-2xl rounded-br-md bg-[var(--color-primary)] text-white px-3.5 py-2.5 text-sm">
              Eng yaxshi IT kurslar qayerda?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-[var(--color-border)] px-3.5 py-3 text-sm text-[var(--color-text)] shadow-[var(--shadow-xs)]">
              <p className="leading-relaxed">Toshkentda eng yaxshi IT kurslar:</p>
              <ol className="mt-2 list-decimal list-inside text-[var(--color-text-secondary)] space-y-0.5">
                <li>Najot Ta&apos;lim</li>
                <li>Mohirdev</li>
                <li>PDP Academy</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Synaptic tavsiyasi
                </p>
                <p className="mt-1 font-semibold text-[var(--color-text)]">Najot Ta&apos;lim — 20% chegirma</p>
                <span className="mt-2 flex min-h-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-xs font-semibold text-white">
                  najottedu.uz
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute -z-10 -bottom-4 -right-4 h-40 w-40 rounded-full bg-[var(--color-primary)]/10 blur-3xl"
        aria-hidden
      />
    </div>
  );
}
