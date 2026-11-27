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
      className={`inline-flex items-center gap-2 shrink-0 ${className}`}
    >
      {/* Theme Toggle (40x40 accessible touch target) */}
      <button
        type="button"
        data-testid="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={themeAriaLabel}
        aria-pressed={!isDark}
        title={themeAriaLabel}
        className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] text-[var(--text-primary)] transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.96] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2"
      >
        {isDark ? (
          <Sun className="w-[17px] h-[17px] text-[var(--status-warning-text)] shrink-0" aria-hidden="true" />
        ) : (
          <Moon className="w-[17px] h-[17px] text-[var(--brand-primary-text)] shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* Language Toggle ES / EN (40px min-height) */}
      <button
        type="button"
        data-testid="lang-toggle-btn"
        onClick={toggleLanguage}
        aria-label={langAriaLabel}
        aria-pressed={!isEs}
        title={langAriaLabel}
        className="inline-flex items-center gap-1.5 px-3 h-[40px] rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--text-primary)] transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.96] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2"
      >
        <Globe className="w-[15px] h-[15px] text-[var(--brand-primary-text)] shrink-0" aria-hidden="true" />
        <span className="inline-flex items-center gap-1">
          <span className={isEs ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)] font-normal'}>
            ES
          </span>
          <span aria-hidden="true" className="text-[var(--border-strong)]">
            /
          </span>
          <span className={!isEs ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)] font-normal'}>
            EN
          </span>
        </span>
      </button>
    </div>
  );
}
