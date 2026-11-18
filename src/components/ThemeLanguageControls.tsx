import React from 'react';
import { Globe, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function ThemeLanguageControls({ className = '' }: { className?: string }) {
  const { theme, toggleTheme, language, toggleLanguage } = useApp();

  const isDark = theme === 'dark';
  const isEs = language === 'es';

  const themeAriaLabel = isEs
    ? isDark
      ? 'Cambiar a modo claro (actual: modo oscuro)'
      : 'Cambiar a modo oscuro (actual: modo claro)'
    : isDark
    ? 'Switch to light mode (current: dark mode)'
    : 'Switch to dark mode (current: light mode)';

  const langAriaLabel = isEs
    ? 'Cambiar idioma a inglés (actual: Español)'
    : 'Switch language to Spanish (current: English)';

  return (
    <div
      role="group"
      aria-label={isEs ? 'Preferencias de visualización e idioma' : 'Display and language preferences'}
      className={`inline-flex items-center gap-[8px] shrink-0 ${className}`}
    >
      {/* Botón para alternar tema entre oscuro y claro (solo icono, sin texto visible) */}
      <button
        type="button"
        data-testid="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={themeAriaLabel}
        aria-pressed={!isDark}
        title={themeAriaLabel}
        className={`inline-flex items-center justify-center w-[36px] h-[36px] min-h-[36px] rounded-full border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-electric-iris focus-visible:outline-offset-2 ${
          isDark
            ? 'border-white/20 bg-white/[0.04] text-bone-white hover:border-saffron-spark'
            : 'border-saffron-spark/60 bg-saffron-spark/10 text-bone-white hover:border-electric-iris'
        }`}
      >
        {isDark ? (
          <Moon className="w-[15px] h-[15px] text-electric-iris shrink-0" aria-hidden="true" />
        ) : (
          <Sun className="w-[15px] h-[15px] text-saffron-spark shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* Botón para alternar idioma entre español (ES) e inglés (EN) */}
      <button
        type="button"
        data-testid="lang-toggle-btn"
        onClick={toggleLanguage}
        aria-label={langAriaLabel}
        aria-pressed={!isEs}
        title={langAriaLabel}
        className="inline-flex items-center gap-[6px] px-[12px] py-[6px] min-h-[36px] rounded-full border border-white/20 bg-white/[0.04] hover:border-electric-iris text-[12px] font-semibold uppercase tracking-[0.35px] text-bone-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-electric-iris focus-visible:outline-offset-2"
      >
        <Globe className="w-[14px] h-[14px] text-saffron-spark shrink-0" aria-hidden="true" />
        <span className="inline-flex items-center gap-[4px]">
          <span className={isEs ? 'text-saffron-spark font-bold' : 'text-ash-gray font-normal'}>
            ES
          </span>
          <span aria-hidden="true" className="text-ash-gray">
            /
          </span>
          <span className={!isEs ? 'text-saffron-spark font-bold' : 'text-ash-gray font-normal'}>
            EN
          </span>
        </span>
      </button>
    </div>
  );
}
