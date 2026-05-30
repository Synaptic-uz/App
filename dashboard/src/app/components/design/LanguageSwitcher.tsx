import { useTranslation } from 'react-i18next';
import { cn } from '../ui/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'uz', label: 'O\'zbek' },
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
  ];

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm rounded-[var(--radius-sm)] px-2 py-1 outline-none focus:border-[var(--color-primary)] transition-colors",
        className
      )}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
