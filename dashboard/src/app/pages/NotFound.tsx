import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AppLinkButton, PageShell } from '../components/design';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <PageShell className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center w-full max-w-lg animate-scaleIn">
        <p className="text-8xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold text-[var(--color-text)]">{t('common.error.notFoundTitle')}</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {t('common.error.notFoundDesc')}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <AppLinkButton to="/">{t('common.error.backToHome')}</AppLinkButton>
          <Link
            to="/demo"
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-6 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            {t('navigation.demo')} chat
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
