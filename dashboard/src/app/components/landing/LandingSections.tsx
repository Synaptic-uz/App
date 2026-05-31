import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Bot,
  Briefcase,
  Check,
  EyeOff,
  Layers,
  MessageSquare,
  Server,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-[var(--color-primary)] tracking-wide uppercase mb-3">
      {children}
    </p>
  );
}

export function LandingSections() {
  const { t } = useTranslation();

  const PROBLEMS = [
    {
      icon: TrendingDown,
      title: t('landing.problem.items.zeroClick.title'),
      desc: t('landing.problem.items.zeroClick.desc'),
    },
    {
      icon: EyeOff,
      title: t('landing.problem.items.bannerBlindness.title'),
      desc: t('landing.problem.items.bannerBlindness.desc'),
    },
    {
      icon: Server,
      title: t('landing.problem.items.infraCosts.title'),
      desc: t('landing.problem.items.infraCosts.desc'),
    },
  ];

  const PILLARS = [
    {
      icon: Layers,
      title: t('landing.features.items.contextual.title'),
      desc: t('landing.features.items.contextual.desc'),
    },
    {
      icon: MessageSquare,
      title: t('landing.features.items.native.title'),
      desc: t('landing.features.items.native.desc'),
    },
    {
      icon: Zap,
      title: t('landing.features.items.fastIntegration.title'),
      desc: t('landing.features.items.fastIntegration.desc'),
    },
  ];

  const PIPELINE = [
    { n: '01', title: t('landing.pipeline.steps.scan.title'), desc: t('landing.pipeline.steps.scan.desc') },
    { n: '02', title: t('landing.pipeline.steps.vectorize.title'), desc: t('landing.pipeline.steps.vectorize.desc') },
    { n: '03', title: t('landing.pipeline.steps.match.title'), desc: t('landing.pipeline.steps.match.desc') },
    { n: '04', title: t('landing.pipeline.steps.output.title'), desc: t('landing.pipeline.steps.output.desc') },
  ];

  const MARKET = [
    { label: 'TAM', value: '$180M', hint: t('landing.market.items.tam.hint') },
    { label: 'SAM', value: '$32.9M', hint: t('landing.market.items.sam.hint') },
    { label: 'SOM', value: '$1.1M', hint: t('landing.market.items.som.hint') },
  ];

  const COMPARE = [
    [t('landing.compare.headers.market'), t('landing.compare.headers.global'), t('landing.compare.headers.russia'), t('landing.compare.headers.synaptic')],
    [t('landing.compare.rows.semantics.label'), t('landing.compare.rows.semantics.global'), t('landing.compare.rows.semantics.russia'), t('landing.compare.rows.semantics.synaptic')],
    [t('landing.compare.rows.format.label'), t('landing.compare.rows.format.global'), t('landing.compare.rows.format.russia'), t('landing.compare.rows.format.synaptic')],
    [t('landing.compare.rows.revenue.label'), t('landing.compare.rows.revenue.global'), t('landing.compare.rows.revenue.russia'), t('landing.compare.rows.revenue.synaptic')],
  ];

  const ROADMAP = [
    {
      phase: t('landing.roadmap.items.phase1.phase'),
      title: t('landing.roadmap.items.phase1.title'),
      metric: t('landing.roadmap.items.phase1.metric'),
      desc: t('landing.roadmap.items.phase1.desc'),
    },
    {
      phase: t('landing.roadmap.items.phase2.phase'),
      title: t('landing.roadmap.items.phase2.title'),
      metric: t('landing.roadmap.items.phase2.metric'),
      desc: t('landing.roadmap.items.phase2.desc'),
    },
    {
      phase: t('landing.roadmap.items.phase3.phase'),
      title: t('landing.roadmap.items.phase3.title'),
      metric: t('landing.roadmap.items.phase3.metric'),
      desc: t('landing.roadmap.items.phase3.desc'),
    },
  ];

  return (
    <>
      <section className="perf-section py-16 md:py-20 bg-[var(--color-bg-subtle)]">
        <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)]">
          <SectionLabel>{t('landing.problem.label')}</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-2xl">
            {t('landing.problem.title')}
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {PROBLEMS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-xs)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-bold text-lg">{title}</h3>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="perf-section py-16 md:py-20">
        <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)]">
          <SectionLabel>{t('landing.features.label')}</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-2xl">
            {t('landing.features.title')}
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {PILLARS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 hover:border-[var(--color-primary)]/25 hover:shadow-[var(--shadow-sm)] transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-icon-bg)] text-[var(--color-primary)]">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="perf-section py-16 md:py-20 bg-[#0f1419] text-white">
        <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)]">
          <SectionLabel>
            <span className="text-white/70">{t('landing.pipeline.label')}</span>
          </SectionLabel>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('landing.pipeline.title')}</h2>
          <p className="mt-3 text-white/75 max-w-2xl leading-relaxed">{t('landing.pipeline.subtitle')}</p>
          <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PIPELINE.map((step) => (
              <li key={step.n} className="rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <span className="text-3xl font-extrabold text-white/25">{step.n}</span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="perf-section py-16 md:py-20">
        <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)]">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <SectionLabel>{t('landing.market.label')}</SectionLabel>
              <h2 className="text-2xl font-bold tracking-tight">{t('landing.market.title')}</h2>
              <div className="mt-8 space-y-4">
                {MARKET.map((m) => (
                  <div key={m.label} className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-text-muted)]">{m.label}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{m.hint}</p>
                    </div>
                    <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>{t('landing.business.label')}</SectionLabel>
              <h2 className="text-2xl font-bold tracking-tight">{t('landing.business.title')}</h2>
              <div className="mt-8 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-primary)] to-[#0026e6] p-6 md:p-8 text-white">
                <p className="text-sm text-white/80">{t('landing.business.avgCpc')}</p>
                <p className="text-4xl font-extrabold mt-1">$0.55</p>
                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex justify-between gap-4 border-b border-white/15 pb-2">
                    <span>{t('landing.business.revShare.agent')}</span>
                    <span className="font-semibold tabular-nums">{t('landing.business.revShare.agentValue')}</span>
                  </li>
                  <li className="flex justify-between gap-4 border-b border-white/15 pb-2">
                    <span>{t('landing.business.revShare.synaptic')}</span>
                    <span className="font-semibold tabular-nums">{t('landing.business.revShare.synapticValue')}</span>
                  </li>
                  <li className="flex justify-between gap-4 pt-1">
                    <span>{t('landing.business.revShare.netProfit')}</span>
                    <span className="font-semibold tabular-nums">{t('landing.business.revShare.netProfitValue')}</span>
                  </li>
                </ul>
                <p className="mt-4 text-xs text-white/60">{t('landing.business.revShare.annualHint')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="perf-section py-16 md:py-20 bg-[var(--color-bg-subtle)]">
        <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)]">
          <SectionLabel>{t('landing.compare.label')}</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-2xl">{t('landing.compare.title')}</h2>
          <div className="mt-8 overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                  {COMPARE[0].map((cell, i) => (
                    <th key={i} className={`py-3 px-4 text-left font-semibold ${i === 3 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.slice(1).map((row) => (
                  <tr key={row[0]} className="border-b border-[var(--color-border)] last:border-0">
                    {row.map((cell, i) => (
                      <td key={i} className={`py-3 px-4 ${i === 0 ? 'font-medium' : ''} ${i === 3 ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text-secondary)]'}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="perf-section py-16 md:py-20">
        <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)]">
          <SectionLabel>{t('landing.roadmap.label')}</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('landing.roadmap.title')}</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {ROADMAP.map((r) => (
              <div key={r.phase} className="rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 flex flex-col">
                <p className="text-xs font-bold text-[var(--color-primary)]">{r.phase}</p>
                <h3 className="mt-2 text-xl font-bold">{r.title}</h3>
                <p className="mt-3 text-3xl font-extrabold text-[var(--color-text)] tabular-nums">{r.metric}</p>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="perf-section py-16 md:py-20 border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)]">
          <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight">{t('landing.audience.title')}</h2>
          <p className="text-center text-[var(--color-text-secondary)] mt-3 max-w-xl mx-auto">{t('landing.audience.subtitle')}</p>
          <div className="mt-10 grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <Link
              to="/register"
              state={{ role: 'business' }}
              className="group rounded-[var(--radius-xl)] border-2 border-[var(--color-primary)] bg-[var(--color-primary-muted)]/30 p-8 hover:shadow-[var(--shadow-md)] transition-all"
            >
              <Briefcase className="w-8 h-8 text-[var(--color-primary)]" />
              <h3 className="mt-4 text-xl font-bold">{t('landing.audience.business.title')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {[t('landing.audience.business.features.native'), t('landing.audience.business.features.wallet'), t('landing.audience.business.features.analytics')].map((text) => (
                  <li key={text} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] group-hover:gap-2 transition-all">
                {t('landing.audience.business.cta')} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              to="/register"
              state={{ role: 'agent' }}
              className="group rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-8 hover:border-[var(--color-primary)]/30 hover:shadow-[var(--shadow-md)] transition-all"
            >
              <Bot className="w-8 h-8 text-[var(--color-primary)]" />
              <h3 className="mt-4 text-xl font-bold">{t('landing.audience.agent.title')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {[t('landing.audience.agent.features.api'), t('landing.audience.agent.features.revShare'), t('landing.audience.agent.features.demo')].map((text) => (
                  <li key={text} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] group-hover:gap-2 transition-all">
                {t('landing.audience.agent.cta')} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="perf-section py-16 md:py-20 bg-gradient-to-br from-[var(--color-primary)] to-[#0026e6] text-white">
        <div className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)] text-center">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            {t('landing.final.title')}
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight max-w-2xl mx-auto">{t('landing.final.title')}</h2>
          <p className="mt-4 text-white/85 max-w-lg mx-auto leading-relaxed">{t('landing.final.subtitle')}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-white px-8 text-sm font-semibold text-[var(--color-primary)] hover:bg-white/95 transition-colors"
            >
              {t('landing.final.startFree')}
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-white/35 px-8 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              {t('landing.final.login')}
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
        <p>© {new Date().getFullYear()} {t('landing.footer.copy')}</p>
      </footer>
    </>
  );
}
