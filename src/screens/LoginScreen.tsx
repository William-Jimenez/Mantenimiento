import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConstellationCanvas, LogoLockup } from '../components/ConstellationCanvas';
import { FieldError, FieldLabel, inputBaseClass, PrimaryButton } from '../components/CommonUI';

export function LoginScreen() {
  const { login, loginNotice, clearLoginNotice, resetDemoData } = useApp();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <div className="min-h-screen bg-void text-bone-white flex flex-col justify-between px-[18px] sm:px-[30px] py-[30px]">
      <div className="max-w-[1280px] w-full mx-auto">
        <LogoLockup />
      </div>

      <div className="max-w-[1280px] w-full mx-auto py-[36px] lg:py-[60px] grid grid-cols-1 lg:grid-cols-12 gap-[48px] items-center">
        {/* Left column: Oversized Dala headline + login form */}
        <div className="lg:col-span-6 space-y-[30px]">
          <div className="space-y-[18px]">
            <p className="nav-label text-saffron-spark">
              Plataforma corporativa · Acceso
            </p>
            <h1 className="text-[42px] sm:text-[60px] lg:text-[72px] leading-[1.05] tracking-[-1.68px] lg:tracking-[-2.88px] text-bone-white">
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

          <form onSubmit={handleSubmit} className="space-y-[18px] max-w-[440px]" noValidate>
            <div>
              <FieldLabel htmlFor="login-correo" required>
                Correo electrónico
              </FieldLabel>
              <input
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

            <div className="pt-[6px] flex flex-wrap items-center gap-[18px]">
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? 'Ingresando…' : 'Ingresar'}
              </PrimaryButton>
            </div>
          </form>

          {/* SU-08: mandatory administrator contact message */}
          <p className="text-[14px] text-ash-gray max-w-[440px]">
            ¿Olvidó su contraseña? Comuníquese con el Administrador.
          </p>

          <details className="max-w-[440px] pt-[6px] text-[13px] text-ash-gray">
            <summary className="cursor-pointer hover:text-bone-white transition-colors select-none">
              Cuentas disponibles para verificación de flujo
            </summary>
            <div className="mt-[12px] space-y-[8px] border-t border-white/12 pt-[12px]">
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
                <span>Empleado (empleado@empresa.com)</span>
                <button
                  type="button"
                  onClick={() => prefill('empleado@empresa.com', 'Empleado2026')}
                  className="text-saffron-spark hover:underline cursor-pointer"
                >
                  Usar
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Contraseña temporal P-02 (mateo.rojas@empresa.com)</span>
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
        <div className="hidden lg:block lg:col-span-6 h-[480px] relative">
          <ConstellationCanvas mode="constellation" className="w-full h-full" />
        </div>
      </div>

      <div className="max-w-[1280px] w-full mx-auto text-[12px] text-ash-gray flex flex-wrap justify-between gap-4">
        <span>Plataforma de Solicitudes de Mantenimiento</span>
        <span>Acceso restringido a personal autorizado</span>
      </div>
    </div>
  );
}
