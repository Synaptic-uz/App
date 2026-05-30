import { Link } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  CheckCircle2,
  Circle,
  MessageSquare,
  Sparkles,
  User,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useOnboardingProgress } from '../../lib/useOnboardingProgress';
import { AppLinkButton, PageShell, Panel } from '../components/design';

type Step = {
  id: string;
  title: string;
  description: string;
  to: string;
  cta: string;
  done: boolean;
  icon: typeof Briefcase;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { loading, campaignCount, agentCount, profileComplete, demoVisited } =
    useOnboardingProgress();

  const isBusiness = user?.role === 'business';
  const displayName = user?.display_name || user?.company_name || user?.email?.split('@')[0] || t('common.user');

  const businessSteps: Step[] = [
    {
      id: 'campaign',
      title: t('dashboard.steps.campaign.title'),
      description: t('dashboard.steps.campaign.description'),
      to: '/business/campaigns',
      cta: campaignCount > 0 ? t('dashboard.steps.campaign.cta') : t('dashboard.steps.campaign.ctaFirst'),
      done: campaignCount > 0,
      icon: Briefcase,
    },
    {
      id: 'analytics',
      title: t('dashboard.steps.analytics.title'),
      description: t('dashboard.steps.analytics.description'),
      to: '/business/analytics',
      cta: t('dashboard.steps.analytics.cta'),
      done: campaignCount > 0,
      icon: BarChart3,
    },
    {
      id: 'demo',
      title: t('dashboard.steps.demo.title'),
      description: t('dashboard.steps.demo.description'),
      to: '/demo',
      cta: t('dashboard.steps.demo.cta'),
      done: demoVisited,
      icon: MessageSquare,
    },
    {
      id: 'profile',
      title: t('dashboard.steps.profile.title'),
      description: t('dashboard.steps.profile.description'),
      to: '/profile',
      cta: t('dashboard.steps.profile.cta'),
      done: profileComplete,
      icon: User,
    },
  ];

  const agentSteps: Step[] = [
    {
      id: 'agent',
      title: t('dashboard.steps.agent.title'),
      description: t('dashboard.steps.agent.description'),
      to: '/agent/manage',
      cta: agentCount > 0 ? t('dashboard.steps.agent.cta') : t('dashboard.steps.agent.ctaAdd'),
      done: agentCount > 0,
      icon: Bot,
    },
    {
      id: 'earnings',
      title: t('dashboard.steps.earnings.title'),
      description: t('dashboard.steps.earnings.description'),
      to: '/agent/analytics',
      cta: t('dashboard.steps.earnings.cta'),
      done: agentCount > 0,
      icon: BarChart3,
    },
    {
      id: 'demo',
      title: t('dashboard.steps.apiDemo.title'),
      description: t('dashboard.steps.apiDemo.description'),
      to: '/demo',
      cta: t('dashboard.steps.apiDemo.cta'),
      done: demoVisited,
      icon: MessageSquare,
    },
    {
      id: 'profile',
      title: t('dashboard.steps.profile.title'),
      description: t('dashboard.steps.profile.description'),
      to: '/profile',
      cta: t('dashboard.steps.profile.cta'),
      done: profileComplete,
      icon: User,
    },
  ];

  const steps = isBusiness ? businessSteps : agentSteps;
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done) ?? steps[0];
  const primaryTo = isBusiness ? '/business/campaigns' : '/agent/manage';
  const primaryLabel = isBusiness
    ? campaignCount > 0
      ? t('navigation.campaigns')
      : t('campaigns.create')
    : agentCount > 0
      ? t('navigation.agents')
      : t('agents.register');

  return (
    <PageShell className="animate-fadeIn">
      <Helmet>
        <title>{t('navigation.dashboard')} — Synaptic</title>
      </Helmet>

      <div className="mb-8">
        <p className="text-sm font-semibold text-[var(--color-primary)] mb-1">{t('dashboard.panel')}</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text)]">
          {t('dashboard.welcome', { name: displayName })}
        </h1>
        <p className="mt-2 text-base text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
          {isBusiness
            ? t('dashboard.businessDesc')
            : t('dashboard.agentDesc')}
        </p>
      </div>

      {!loading && (
        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-[var(--color-text-secondary)] mb-2">
            <span>{t('dashboard.onboardingProgress')}</span>
            <span className="tabular-nums">
              {doneCount} / {steps.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <Panel className="synaptic-card bg-blue-700 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {doneCount === steps.length ? t('dashboard.ready') : t('dashboard.nextStep')}
            </div>
            <h2 className="text-xl font-bold">
              {doneCount === steps.length ? t('dashboard.greatKeepGoing') : nextStep.title}
            </h2>
            <p className="mt-2 text-sm text-white/85 max-w-md leading-relaxed">
              {doneCount === steps.length
                ? isBusiness
                  ? t('dashboard.manageCampaignsOrAnalytics')
                  : t('dashboard.monitorAgentsAndEarnings')
                : nextStep.description}
            </p>
          </div>
          <AppLinkButton
            to={doneCount === steps.length ? primaryTo : nextStep.to}
            className="shrink-0 bg-white text-[var(--color-primary)] hover:bg-white/95 shadow-lg gap-2 min-h-12 px-6"
          >
            {doneCount === steps.length ? primaryLabel : nextStep.cta}
            <ArrowRight className="w-4 h-4" />
          </AppLinkButton>
        </div>
      </Panel>

      <h2 className="section-title">{t('dashboard.allSteps')}</h2>
      <ol className="space-y-3" aria-label="Boshlash qadamlari">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const StatusIcon = step.done ? CheckCircle2 : Circle;
          return (
            <li key={step.id}>
              <Link
                to={step.to}
                className="flex items-start gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-5 hover:border-[var(--color-primary)]/30 hover:shadow-[var(--shadow-sm)] transition-all group"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-icon-bg)] text-[var(--color-primary)] text-sm font-bold">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                    <span className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      {step.title}
                    </span>
                    <StatusIcon
                      className={`w-4 h-4 shrink-0 ${step.done ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)] leading-relaxed">{step.description}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                    {step.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
        {t('dashboard.helpNeeded')}{' '}
        <Link to="/demo" className="text-[var(--color-primary)] font-medium hover:underline">
          {t('navigation.chat')}
        </Link>
        {' '}{t('dashboard.checkFormat')}
      </p>
    </PageShell>
  );
}
