import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './en.json';
import uzTranslations from './uz.json';
import ruTranslations from './ru.json';

const resources = {
	en: { translation: enTranslations },
	uz: { translation: uzTranslations },
	ru: { translation: ruTranslations },
};

// Get saved language from localStorage or detect browser language
const getSavedLanguage = (): string => {
	const saved = localStorage.getItem('language');
	if (saved && ['en', 'uz', 'ru'].includes(saved)) {
		return saved;
	}

	// Detect browser language
	const browserLang = navigator.language.substring(0, 2);
	if (['en', 'uz', 'ru'].includes(browserLang)) {
		return browserLang;
	}

	return 'en'; // Default fallback
};

i18n.use(initReactI18next).init({
	resources,
	lng: getSavedLanguage(),
	fallbackLng: 'en',
	interpolation: {
		escapeValue: false,
	},
});

export default i18n;
