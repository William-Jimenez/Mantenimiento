import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
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
      className="fixed bottom-[36px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-[12px] max-w-[420px] w-[calc(100%-36px)] pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-full bg-void border border-white/25 rounded-[24px] px-[20px] py-[14px] flex items-center justify-between gap-[12px] shadow-lg"
        >
          <span
            className={`text-[14px] ${
              toast.tipo === 'error'
                ? 'text-saffron-spark'
                : toast.tipo === 'aviso'
                ? 'text-saffron-spark'
                : 'text-deep-verdant'
            }`}
          >
            {toast.texto}
          </span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Cerrar notificación"
            className="text-ash-gray hover:text-bone-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
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

  return (
    <div className="min-h-screen bg-void text-bone-white flex flex-col">
      {/* Top Navigation Bar — Single-Line Layout without top 'Nueva solicitud' CTA */}
      {currentUser && currentEmpleado && !currentUser.debeCambiarPassword && (
        <header
          ref={headerRef}
          data-layout-mode={layoutAllocation.mode}
          className="w-full bg-void border-b border-white/10"
        >
          <div className="max-w-[1280px] w-full mx-auto px-[14px] sm:px-[24px] h-[72px] flex items-center justify-between gap-[10px] lg:gap-[18px] flex-nowrap overflow-x-auto no-scrollbar">
            {/* Zone 1: Brand wordmark */}
            <LogoLockup onClick={() => handleNavClick('/')} />

            {/* Zone 2: Single-line navigation links */}
            <nav
              aria-label="Navegación principal"
              className="hidden md:flex items-center flex-nowrap shrink-0"
              style={{ gap: `${layoutAllocation.navGapPx}px` }}
            >
              {navLinks.map((item) => {
                const active = isLinkActive(item);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={`nav-label !text-[13px] whitespace-nowrap shrink-0 py-[6px] cursor-pointer transition-colors ${
                      active
                        ? 'text-bone-white border-b-2 border-electric-iris'
                        : 'text-ash-gray hover:text-bone-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Theme & Language Controls + User session in the same single line */}
            <div className="flex items-center gap-[10px] lg:gap-[12px] shrink-0 flex-nowrap">
              <ThemeLanguageControls />

              <div className="hidden md:flex items-center gap-[8px] lg:gap-[10px] text-[13px] whitespace-nowrap shrink-0">
                <span className="text-silver-mist whitespace-nowrap max-w-[150px] lg:max-w-[190px] truncate">
                  {currentEmpleado.nombres} {currentEmpleado.apellidos}
                </span>
                <span className="px-[9px] py-[2px] rounded-full border border-white/15 text-[10px] lg:text-[11px] uppercase tracking-[0.35px] text-saffron-spark whitespace-nowrap">
                  {ETIQUETA_PERFIL[currentUser.perfil]}
                </span>
                <span aria-hidden="true" className="text-ash-gray">
                  ·
                </span>
                <GhostButton onClick={() => logout()} className="!text-[13px] !min-h-[34px]">
                  Cerrar sesión
                </GhostButton>
              </div>

              <button
                type="button"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="md:hidden p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-bone-white cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer (< 768px) */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/12 px-[18px] py-[18px] space-y-[14px] bg-void">
              <div className="flex items-center justify-between text-[13px] pb-[10px] border-b border-white/10">
                <span className="text-silver-mist">
                  {currentEmpleado.nombres} {currentEmpleado.apellidos} (
                  {ETIQUETA_PERFIL[currentUser.perfil]})
                </span>
                <GhostButton onClick={() => logout()}>Cerrar sesión</GhostButton>
              </div>
              <nav aria-label="Navegación móvil" className="flex flex-col gap-[10px]">
                {navLinks.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={`text-left nav-label py-[6px] cursor-pointer ${
                      isLinkActive(item) ? 'text-bone-white' : 'text-ash-gray'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </header>
      )}

      {/* Toast Feedback Banner (parte media-baja de la pantalla, máx 3 s) */}
      <ToastFeedbackBanner />

      {/* Main Viewport */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-[18px] sm:px-[30px] py-[36px] sm:py-[60px]">
        {children}
      </main>

      {/* Quiet Footer */}
      {currentUser && !currentUser.debeCambiarPassword && (
        <footer className="w-full border-t border-white/10 py-[24px]">
          <div className="max-w-[1280px] mx-auto px-[18px] sm:px-[30px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] text-[12px] text-ash-gray">
            <span>Plataforma de Solicitudes de Mantenimiento</span>
            <span>Rol: {ETIQUETA_PERFIL[currentUser.perfil]}</span>
          </div>
        </footer>
      )}

      {/* Session expiry warning at 28 minutes (User Flow RC-02 / 4.7) */}
      <ModalDialog
        open={sessionExpiringSoon}
        title="Su sesión va a expirar"
        onClose={extendSession}
      >
        <p className="body-ultralight text-silver-mist mb-[24px]">
          Por inactividad, la sesión se cerrará automáticamente al cumplir 30 minutos. ¿Desea continuar conectado?
        </p>
        <div className="flex flex-wrap items-center gap-[18px]">
          <PrimaryButton onClick={extendSession}>Seguir conectado</PrimaryButton>
          <OutlineButton onClick={() => logout()}>Cerrar sesión</OutlineButton>
        </div>
      </ModalDialog>
    </div>
  );
}
