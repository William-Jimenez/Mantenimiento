import React, { useRef, useState } from 'react';
import { ArrowDown, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConstellationCanvas, LogoLockup } from '../components/ConstellationCanvas';
import { FieldError, FieldLabel, inputBaseClass, PrimaryButton } from '../components/CommonUI';
import { ServiceScrollNarrative } from '../components/ServiceScrollNarrative';

export function LoginScreen() {
  const { login, loginNotice, clearLoginNotice, resetDemoData } = useApp();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const topSectionRef = useRef<HTMLDivElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToNarrative = () => {
    const el = document.getElementById('servicio-narrativa');
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  };

  const scrollToLogin = () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (topSectionRef.current) {
      topSectionRef.current.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'start',
      });
    } else {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    }
    window.setTimeout(() => {
      emailInputRef.current?.focus({ preventScroll: true });
    }, prefersReduced ? 0 : 420);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearLoginNotice();
    setErrorMsg(null);

    if (!correo.trim() || !password) {
      setErrorMsg('Ingrese su correo y contraseña.');
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      const res = login(correo, password);
      setSubmitting(false);
      if (!res.ok) {
        // E-01 / E-02 / E-03: preserve email, clear password
        setPassword('');
        setErrorMsg(res.mensaje);
      }
    }, 180);
  };

  const prefill = (email: string, pass: string) => {
    setCorreo(email);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="bg-void text-bone-white">
      {/* Initial Viewport: Login Form */}
      <div
        ref={topSectionRef}
        className="min-h-screen flex flex-col justify-between px-[18px] sm:px-[30px] py-[20px] sm:py-[24px]"
      >
        <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between gap-4">
          <LogoLockup />
          <button
            type="button"
            onClick={scrollToNarrative}
            className="inline-flex items-center gap-[8px] px-[14px] py-[6px] rounded-full border border-white/15 hover:border-white/35 text-[12px] text-silver-mist hover:text-bone-white transition-colors cursor-pointer"
          >
            <span>Conocer el servicio</span>
            <ArrowDown className="w-[13px] h-[13px] text-saffron-spark" aria-hidden="true" />
          </button>
        </div>

        <div className="max-w-[1280px] w-full mx-auto flex-1 flex items-center py-[16px] lg:py-[24px]">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-[36px] lg:gap-[48px] items-center">
            {/* Left column: Oversized Dala headline + login form */}
            <div className="lg:col-span-6 space-y-[20px]">
              <div className="space-y-[12px]">
                <p className="nav-label text-saffron-spark">
                  Plataforma corporativa · Acceso
                </p>
                <h1 className="text-[36px] sm:text-[50px] lg:text-[60px] leading-[1.06] tracking-[-1.68px] lg:tracking-[-2.4px] text-bone-white">
                  Cada falla reportada, en un solo lugar.
                </h1>
                <p className="body-ultralight text-silver-mist max-w-[480px]">
                  Registre daños en equipos, instalaciones, maquinaria o herramientas, adjunte evidencias y dé seguimiento hasta su cierre.
                </p>
              </div>

              {loginNotice && (
                <div
                  role="status"
                  className="border border-saffron-spark/50 rounded-[12px] px-[16px] py-[12px] text-[14px] text-saffron-spark max-w-[440px]"
                >
                  {loginNotice}
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="border border-saffron-spark/70 rounded-[12px] px-[16px] py-[12px] text-[14px] text-saffron-spark max-w-[440px]"
                >
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-[14px] max-w-[440px]" noValidate>
                <div>
                  <FieldLabel htmlFor="login-correo" required>
                    Correo electrónico
                  </FieldLabel>
                  <input
                    ref={emailInputRef}
                    id="login-correo"
                    type="email"
                    autoComplete="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="nombre@empresa.com"
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="login-password" required>
                    Contraseña
                  </FieldLabel>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className={inputBaseClass}
                  />
                  <FieldError message={null} />
                </div>

                <div className="pt-[4px] flex flex-wrap items-center gap-[18px]">
                  <PrimaryButton type="submit" disabled={submitting}>
                    {submitting ? 'Ingresando…' : 'Ingresar'}
                  </PrimaryButton>
                </div>
              </form>

              {/* SU-08: mandatory administrator contact message — elevated and styled */}
              <div className="max-w-[440px] rounded-[14px] border border-white/12 bg-white/[0.03] backdrop-blur-sm px-[16px] py-[12px] flex items-center gap-[12px] transition-colors hover:border-white/22">
                <span
                  aria-hidden="true"
                  className="w-[32px] h-[32px] rounded-[10px] bg-saffron-spark/12 border border-saffron-spark/30 flex items-center justify-center shrink-0 text-saffron-spark"
                >
                  <KeyRound className="w-[15px] h-[15px]" />
                </span>
                <p className="text-[13px] sm:text-[14px] leading-[1.45] text-silver-mist">
                  <span className="font-medium text-bone-white">¿Olvidó su contraseña?</span>{' '}
                  Comuníquese con el <span className="text-saffron-spark font-medium">Administrador</span>.
                </p>
              </div>

              <details className="max-w-[440px] pt-[2px] text-[13px] text-ash-gray">
                <summary className="cursor-pointer hover:text-bone-white transition-colors select-none">
                  Cuentas disponibles para verificación de flujo
                </summary>
                <div className="mt-[10px] space-y-[8px] border-t border-white/12 pt-[10px]">
                  <div className="flex items-center justify-between gap-2">
                    <span>Administrador (admin@empresa.com)</span>
                    <button
                      type="button"
                      onClick={() => prefill('admin@empresa.com', 'Admin2026Seguro')}
                      className="text-saffron-spark hover:underline cursor-pointer"
                    >
                      Usar
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Empleado Técnico (tecnico@empresa.com)</span>
                    <button
                      type="button"
                      onClick={() => prefill('tecnico@empresa.com', 'Tecnico2026')}
                      className="text-saffron-spark hover:underline cursor-pointer"
                    >
                      Usar
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Cliente (cliente@empresa.com)</span>
                    <button
                      type="button"
                      onClick={() => prefill('cliente@empresa.com', 'Cliente2026')}
                      className="text-saffron-spark hover:underline cursor-pointer"
                    >
                      Usar
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Cliente · Clave temporal P-02 (mateo.rojas@empresa.com)</span>
                    <button
                      type="button"
                      onClick={() => prefill('mateo.rojas@empresa.com', 'Temporal2026')}
                      className="text-saffron-spark hover:underline cursor-pointer"
                    >
                      Usar
                    </button>
                  </div>
                  <div className="pt-[6px]">
                    <button
                      type="button"
                      onClick={resetDemoData}
                      className="text-ash-gray hover:text-bone-white underline cursor-pointer"
                    >
                      Restablecer datos iniciales
                    </button>
                  </div>
                </div>
              </details>
            </div>

            {/* Right column: Signature triangular particle constellation */}
            <div className="hidden lg:block lg:col-span-6 h-[460px] relative">
              <ConstellationCanvas mode="constellation" className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll-Driven Narrative Screens with 3D Interactive Scenes */}
      <ServiceScrollNarrative onBackToLogin={scrollToLogin} />
    </div>
  );
}
