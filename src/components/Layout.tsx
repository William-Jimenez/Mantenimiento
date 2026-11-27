import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, LogOut, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoLockup } from './ConstellationCanvas';
import { GhostButton, ModalDialog, OutlineButton, PrimaryButton } from './CommonUI';
import { ThemeLanguageControls } from './ThemeLanguageControls';
import {
  calcularDistribucionHeader,
  ETIQUETA_PERFIL,
  HeaderLayoutAllocation,
  HeaderLayoutInput,
  NavLinkItem,
} from '../services/domainRules';

export { calcularDistribucionHeader, type HeaderLayoutAllocation, type HeaderLayoutInput, type NavLinkItem };

export function ToastFeedbackBanner() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      data-testid="toast-feedback-banner"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 max-w-[460px] w-[calc(100%-32px)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const isError = toast.tipo === 'error';
        const isWarn = toast.tipo === 'aviso';
        const accentStyle = isError
          ? 'border-[var(--status-danger-border)] text-[var(--status-danger-text)]'
          : isWarn
          ? 'border-[var(--status-warning-border)] text-[var(--status-warning-text)]'
          : 'border-[var(--status-success-border)] text-[var(--status-success-text)]';
        const Icon = isError ? AlertCircle : isWarn ? AlertTriangle : CheckCircle2;

        return (
          <div
            key={toast.id}
            className={`animate-ds-enter pointer-events-auto w-full surface-elevated border px-4 py-3.5 flex items-center justify-between gap-3 ${accentStyle}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <span className="text-[14px] font-medium text-[var(--text-primary)] leading-[1.4]">
                {toast.texto}
              </span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Cerrar notificación"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] p-1.5 rounded-[8px] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const {
    pathname,
    navigate,
    currentUser,
    currentEmpleado,
    isAdmin,
    isTecnico,
    logout,
    sessionExpiringSoon,
    extendSession,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.min(1280, window.innerWidth) : 1280
  );

  useEffect(() => {
    const updateWidth = () => {
      if (headerRef.current) {
        setContainerWidth(headerRef.current.clientWidth);
      } else if (typeof window !== 'undefined') {
        setContainerWidth(Math.min(1280, window.innerWidth));
      }
    };

    updateWidth();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      observer.observe(headerRef.current);
    }

    window.addEventListener('resize', updateWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const navLinks: NavLinkItem[] = useMemo(
    () =>
      isAdmin
        ? [
            { id: 'inicio', label: 'Inicio', path: '/', priority: 1, estimatedWidthPx: 48 },
            {
              id: 'solicitudes',
              label: 'Solicitudes',
              path: '/solicitudes',
              priority: 1,
              estimatedWidthPx: 88,
              matchPrefix: true,
            },
            {
              id: 'usuarios',
              label: 'Usuarios',
              path: '/admin/usuarios',
              priority: 2,
              estimatedWidthPx: 70,
            },
            {
              id: 'empleados',
              label: 'Empleados',
              path: '/admin/empleados',
              priority: 2,
              estimatedWidthPx: 84,
              matchPrefix: true,
            },
            {
              id: 'recursos',
              label: 'Recursos',
              path: '/admin/recursos',
              priority: 3,
              estimatedWidthPx: 74,
              matchPrefix: true,
            },
            {
              id: 'categorias',
              label: 'Categorías',
              path: '/admin/categorias',
              priority: 3,
              estimatedWidthPx: 86,
            },
          ]
        : isTecnico
        ? [
            { id: 'inicio', label: 'Inicio', path: '/', priority: 1, estimatedWidthPx: 48 },
            {
              id: 'asignaciones',
              label: 'Mis Asignaciones',
              path: '/tecnico/solicitudes',
              priority: 1,
              estimatedWidthPx: 132,
              matchPrefix: true,
            },
          ]
        : [
            { id: 'inicio', label: 'Inicio', path: '/', priority: 1, estimatedWidthPx: 48 },
            {
              id: 'mis-solicitudes',
              label: 'Mis Solicitudes',
              path: '/solicitudes',
              priority: 1,
              estimatedWidthPx: 120,
              matchPrefix: true,
            },
          ],
    [isAdmin, isTecnico]
  );

  const layoutAllocation = useMemo(() => {
    const fullName = currentEmpleado
      ? `${currentEmpleado.nombres} ${currentEmpleado.apellidos}`
      : '';
    return calcularDistribucionHeader({
      containerWidth,
      navItems: navLinks,
      hasPrimaryCta: false,
      userDisplayLength: fullName.length,
    });
  }, [containerWidth, navLinks, currentEmpleado]);

  const isLinkActive = (item: NavLinkItem) => {
    if (item.path === '/') return pathname === '/';
    if (item.path === '/solicitudes' || item.path === '/tecnico/solicitudes') {
      return (
        pathname === '/solicitudes' ||
        pathname === '/tecnico' ||
        pathname === '/tecnico/solicitudes' ||
        (pathname.startsWith('/solicitudes/') && pathname !== '/solicitudes/nueva')
      );
    }
    return item.matchPrefix ? pathname.startsWith(item.path) : pathname === item.path;
  };

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const roleBadgeClass =
    currentUser?.perfil === 'ADMINISTRADOR'
      ? 'bg-[var(--brand-primary-soft)] border-[var(--brand-primary-border)] text-[var(--brand-primary-text)]'
      : currentUser?.perfil === 'EMPLEADO'
      ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
      : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-secondary)]';

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      {/* Sticky Top Navigation Bar — Single-Line Layout without top 'Nueva solicitud' CTA */}
      {currentUser && currentEmpleado && !currentUser.debeCambiarPassword && (
        <header
          ref={headerRef}
          data-layout-mode={layoutAllocation.mode}
          className="sticky top-0 z-30 w-full bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-subtle)]"
        >
          <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-3 lg:gap-5 flex-nowrap overflow-x-auto no-scrollbar">
            {/* Zone 1: Brand lockup */}
            <LogoLockup onClick={() => handleNavClick('/')} />

            {/* Zone 2: Single-line navigation links */}
            <nav
              aria-label="Navegación principal"
              className="hidden md:flex items-center flex-nowrap shrink-0 h-full"
              style={{ gap: `${Math.max(6, layoutAllocation.navGapPx - 4)}px` }}
            >
              {navLinks.map((item) => {
                const active = isLinkActive(item);
                return (
                  <button
                    key={item.path}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => handleNavClick(item.path)}
                    className={`relative h-[38px] px-2.5 rounded-[8px] text-[13px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2 ${
                      active
                        ? 'text-[var(--text-primary)] bg-[var(--brand-primary-soft)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {item.label}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-2.5 right-2.5 -bottom-[15px] h-[2px] rounded-full bg-[var(--brand-primary-text)]"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Theme & Language Controls + User session in the same single line */}
            <div className="flex items-center gap-2.5 lg:gap-3 shrink-0 flex-nowrap">
              <ThemeLanguageControls />

              <div className="hidden md:flex items-center gap-2.5 pl-2.5 border-l border-[var(--border-subtle)] text-[13px] whitespace-nowrap shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-primary)] font-medium whitespace-nowrap max-w-[140px] lg:max-w-[175px] truncate">
                    {currentEmpleado.nombres} {currentEmpleado.apellidos}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-[6px] border text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap ${roleBadgeClass}`}
                  >
                    {ETIQUETA_PERFIL[currentUser.perfil]}
                  </span>
                </div>
                <GhostButton
                  onClick={() => logout()}
                  className="!text-[13px] !min-h-[36px] !px-2.5"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </GhostButton>
              </div>

              <button
                type="button"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="md:hidden w-[40px] h-[40px] rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Menu className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Drawer (< 768px) */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[var(--border-subtle)] px-4 py-4 space-y-4 bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)] animate-ds-enter">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                    {currentEmpleado.nombres} {currentEmpleado.apellidos}
                  </p>
                  <span
                    className={`mt-1 inline-block px-2 py-0.5 rounded-[6px] border text-[11px] font-semibold ${roleBadgeClass}`}
                  >
                    {ETIQUETA_PERFIL[currentUser.perfil]}
                  </span>
                </div>
                <OutlineButton onClick={() => logout()} className="!min-h-[40px] !py-1.5 !px-3 !text-[13px]">
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </OutlineButton>
              </div>
              <nav aria-label="Navegación móvil" className="flex flex-col gap-1">
                {navLinks.map((item) => {
                  const active = isLinkActive(item);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-[10px] text-[14px] font-medium cursor-pointer transition-colors ${
                        active
                          ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary-text)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </header>
      )}

      {/* Toast Feedback Banner */}
      <ToastFeedbackBanner />

      {/* Main Viewport */}
      <main
        id="main-content"
        className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10"
      >
        {children}
      </main>

      {/* Quiet Operational Footer */}
      {currentUser && !currentUser.debeCambiarPassword && (
        <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 py-5">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">
              Plataforma de Solicitudes de Mantenimiento
            </span>
            <span className="tabular-nums">
              Rol: <strong className="font-semibold text-[var(--text-primary)]">{ETIQUETA_PERFIL[currentUser.perfil]}</strong>
            </span>
          </div>
        </footer>
      )}

      {/* Session expiry warning at 28 minutes (User Flow RC-02 / 4.7) */}
      <ModalDialog
        open={sessionExpiringSoon}
        title="Su sesión va a expirar"
        onClose={extendSession}
      >
        <p className="body-readable text-[var(--text-secondary)] mb-6">
          Por inactividad, la sesión se cerrará automáticamente al cumplir 30 minutos. ¿Desea continuar conectado?
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={extendSession}>Seguir conectado</PrimaryButton>
          <OutlineButton onClick={() => logout()}>Cerrar sesión</OutlineButton>
        </div>
      </ModalDialog>
    </div>
  );
}
