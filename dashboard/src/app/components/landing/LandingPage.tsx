import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { AppLinkButton, Logo } from '../design';

const LandingChatMockup = lazy(() =>
  import('./LandingChatMockup').then((mod) => ({ default: mod.LandingChatMockup }))
);
const LandingSections = lazy(() =>
  import('./LandingSections').then((mod) => ({ default: mod.LandingSections }))
);

function LandingChatMockupFallback() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3">
          <div className="h-9 w-9 rounded-full bg-[var(--color-primary)]/20" />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-[var(--color-text-muted)]/15" />
            <div className="h-2.5 w-16 rounded-full bg-[var(--color-text-muted)]/10" />
          </div>
          <div className="ml-auto h-7 w-7 rounded-md bg-[var(--color-text-muted)]/10" />
        </div>
        <div className="min-h-[280px] space-y-3 bg-white p-4">
          <div className="flex justify-end">
            <div className="h-12 w-[70%] rounded-2xl rounded-br-md bg-[var(--color-primary)]/15" />
          </div>
          <div className="flex justify-start">
            <div className="h-40 w-[85%] rounded-2xl rounded-bl-md border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold text-[var(--color-primary)] tracking-wide uppercase mb-3">
      {children}
    </p>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const [showSections, setShowSections] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const revealSections = () => {
      if (!cancelled) {
        setShowSections(true);
      }
    };

    if (typeof window === 'undefined') {
      revealSections();
      return undefined;
    }

    const win = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleCallback = win.requestIdleCallback?.(() => {
      revealSections();
    });

    if (idleCallback === undefined) {
      timerId = window.setTimeout(revealSections, 250);
    }

    return () => {
      cancelled = true;
      if (idleCallback !== undefined && win.cancelIdleCallback) {
        win.cancelIdleCallback(idleCallback);
      }
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  return (
    <div className="bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-20%,rgba(0,28,255,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-[var(--page-max)] px-[var(--page-px)] py-12 md:py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Logo size="lg" />
                <span className="text-xl font-bold tracking-tight">Synaptic</span>
              </div>
              <p className="text-sm font-semibold text-[var(--color-primary)] mb-2">
                {t('landing.hero.label')}
              </p>
              <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold text-shadow-glow tracking-tight leading-[1.08]">
                {t('landing.hero.title')}
              </h1>
              <p className="mt-5 text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                {t('landing.hero.subtitle')}
              </p>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                {t('landing.hero.description')}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
                <AppLinkButton to="/register" state={{ role: 'business' }} className="gap-2 min-h-12 px-8">
                  {t('landing.hero.startBusiness')}
                  <ArrowRight className="w-4 h-4" />
                </AppLinkButton>
                <AppLinkButton to="/demo" variant="secondary" className="gap-2 min-h-12">
                  <MessageSquare className="w-4 h-4" />
                  {t('landing.hero.demoChat')}
                </AppLinkButton>
              </div>
              <div className="mt-8 flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">&lt;150ms</p>
                  <p className="text-[var(--color-text-muted)]">{t('landing.hero.stats.adSelection')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">$0.55</p>
                  <p className="text-[var(--color-text-muted)]">{t('landing.hero.stats.avgCpc')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">60%</p>
                  <p className="text-[var(--color-text-muted)]">{t('landing.hero.stats.agentShare')}</p>
                </div>
              </div>
            </div>
            <Suspense fallback={<LandingChatMockupFallback />}>
              <LandingChatMockup />
            </Suspense>
          </div>
        </div>
      </section>
      {showSections ? (
        <Suspense
          fallback={
            <div className="perf-section py-16 md:py-20">
              <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)] space-y-8">
                <div className="h-7 w-40 rounded-full bg-[var(--color-border)]/60" />
                <div className="h-10 w-72 rounded-full bg-[var(--color-border)]/50" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="h-48 rounded-[var(--radius-xl)] bg-[var(--color-bg-subtle)]" />
                  <div className="h-48 rounded-[var(--radius-xl)] bg-[var(--color-bg-subtle)]" />
                  <div className="h-48 rounded-[var(--radius-xl)] bg-[var(--color-bg-subtle)]" />
                </div>
              </div>
            </div>
          }
        >
          <LandingSections />
        </Suspense>
      ) : null}
    </div>
  );
}
