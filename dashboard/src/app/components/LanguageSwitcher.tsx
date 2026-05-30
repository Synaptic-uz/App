import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
	className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
	className = '',
}) => {
	const { i18n } = useTranslation();

	const languages = [
		{ code: 'en', name: 'English', flag: '🇺🇸' },
		{ code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
		{ code: 'ru', name: 'Русский', flag: '🇷🇺' },
	];

	const handleLanguageChange = (code: string) => {
		i18n.changeLanguage(code);
		localStorage.setItem('language', code);
	};

	const currentLang =
		languages.find((l) => l.code === i18n.language) || languages[0];

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<div className="flex items-center gap-1 border rounded-lg p-1 bg-white dark:bg-slate-900">
				<Globe className="w-4 h-4 text-slate-500" />
				<select
					value={i18n.language}
					onChange={(e) => handleLanguageChange(e.target.value)}
					className="text-sm px-2 py-1 rounded border-0 bg-transparent cursor-pointer font-medium"
				>
					{languages.map((lang) => (
						<option key={lang.code} value={lang.code}>
							{lang.flag} {lang.name}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};

export default LanguageSwitcher;
