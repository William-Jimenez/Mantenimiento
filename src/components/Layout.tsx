import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoLockup } from './ConstellationCanvas';
import { GhostButton, ModalDialog, OutlineButton, PrimaryButton } from './CommonUI';
import { ThemeLanguageControls } from './ThemeLanguageControls';
import { ETIQUETA_PERFIL, puedeCrearSolicitud } from '../services/domainRules';

interface NavLinkItem {
  label: string;
  path: string;
  matchPrefix?: boolean;
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
    toasts,
    dismissToast,
    sessionExpiringSoon,
    extendSession,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: NavLinkItem[] = isAdmin
    ? [
        { label: 'Inicio', path: '/' },
        { label: 'Solicitudes', path: '/solicitudes', matchPrefix: true },
        { label: 'Usuarios', path: '/admin/usuarios' },
        { label: 'Empleados', path: '/admin/empleados', matchPrefix: true },
        { label: 'Recursos', path: '/admin/recursos', matchPrefix: true },
        { label: 'Categorías', path: '/admin/categorias' },
      ]
    : isTecnico
    ? [
        { label: 'Inicio', path: '/' },
        { label: 'Mis Asignaciones', path: '/tecnico/solicitudes', matchPrefix: true },
      ]
    : [
        { label: 'Inicio', path: '/' },
        { label: 'Mis Solicitudes', path: '/solicitudes', matchPrefix: true },
      ];

  const mostrarBotonNuevaSolicitud =
    puedeCrearSolicitud(currentUser) && pathname !== '/solicitudes/nueva';

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
      {/* Top Navigation Bar — 3-zone contract */}
      {currentUser && currentEmpleado && !currentUser.debeCambiarPassword && (
        <header className="w-full bg-void border-b border-white/10">
          <div className="max-w-[1280px] mx-auto px-[18px] sm:px-[30px] h-[76px] flex items-center justify-between gap-4 sm:gap-8">
            {/* Zone 1: Brand wordmark */}
            <LogoLockup onClick={() => handleNavClick('/')} />

            {/* Zone 2: Single-line nav links (desktop) */}
            <nav aria-label="Navegación principal" className="hidden lg:flex items-center gap-[24px]">
              {navLinks.map((item) => {
                const active = isLinkActive(item);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={`nav-label whitespace-nowrap shrink-0 py-[6px] cursor-pointer transition-colors ${
                      active
                        ? 'text-bone-white border-b border-electric-iris'
                        : 'text-ash-gray hover:text-bone-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Theme & Language Controls + User session + Primary CTA */}
            <div className="flex items-center gap-[12px] sm:gap-[16px] shrink-0">
              <ThemeLanguageControls />

              <div className="hidden md:flex items-center gap-[12px] text-[14px]">
                <span className="text-silver-mist whitespace-nowrap">
                  {currentEmpleado.nombres} {currentEmpleado.apellidos}
                </span>
                <span className="px-[10px] py-[2px] rounded-full border border-white/15 text-[11px] uppercase tracking-[0.35px] text-saffron-spark">
                  {ETIQUETA_PERFIL[currentUser.perfil]}
                </span>
                <span aria-hidden="true" className="text-ash-gray">·</span>
                <GhostButton onClick={() => logout('Sesión cerrada')}>
                  Cerrar sesión
                </GhostButton>
              </div>

              {mostrarBotonNuevaSolicitud && (
                <PrimaryButton
                  onClick={() => handleNavClick('/solicitudes/nueva')}
                  className="hidden sm:inline-flex"
                >
                  Nueva solicitud
                </PrimaryButton>
              )}

              <button
                type="button"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-bone-white cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer (< 1024px, usable down to 360px per RNF-03) */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white/12 px-[18px] py-[24px] space-y-[18px] bg-void">
              <div className="flex items-center justify-between text-[14px] pb-[12px] border-b border-white/10">
                <span className="text-silver-mist">
                  {currentEmpleado.nombres} {currentEmpleado.apellidos} ({ETIQUETA_PERFIL[currentUser.perfil]})
                </span>
                <GhostButton onClick={() => logout('Sesión cerrada')}>
                  Cerrar sesión
                </GhostButton>
              </div>
              <nav aria-label="Navegación móvil" className="flex flex-col gap-[12px]">
                {navLinks.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={`text-left nav-label py-[8px] cursor-pointer ${
                      isLinkActive(item) ? 'text-bone-white' : 'text-ash-gray'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              {mostrarBotonNuevaSolicitud && (
                <div className="pt-[6px]">
                  <PrimaryButton
                    onClick={() => handleNavClick('/solicitudes/nueva')}
                    className="w-full"
                  >
                    Nueva solicitud
                  </PrimaryButton>
                </div>
              )}
            </div>
          )}
        </header>
      )}

      {/* Toast Feedback Banner */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-[24px] right-[24px] z-50 flex flex-col gap-[12px] max-w-[400px] w-[calc(100%-36px)]"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-void border border-white/25 rounded-[24px] px-[20px] py-[14px] flex items-center justify-between gap-[12px]"
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
      )}

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
          <OutlineButton onClick={() => logout('Sesión cerrada')}>Cerrar sesión</OutlineButton>
        </div>
      </ModalDialog>
    </div>
  );
}
