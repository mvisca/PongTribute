import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'ca', label: 'CA' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-1">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`px-2 py-1 text-xs rounded transition-colors
            ${i18n.language === code
              ? 'bg-purple-600 text-white'
              : 'text-purple-300 hover:text-white'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}