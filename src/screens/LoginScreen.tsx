import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, CheckCircle2, Eye, EyeOff, KeyRound, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConstellationCanvas, LogoLockup } from '../components/ConstellationCanvas';
import { FieldError, FieldLabel, inputBaseClass, OutlineButton, PrimaryButton } from '../components/CommonUI';
import { ServiceScrollNarrative } from '../components/ServiceScrollNarrative';
import { CampoRegistro, validarDatosRegistro } from '../services/domainRules';

export function LoginScreen() {
  const { pathname, navigate, login, registrarCuenta, loginNotice, clearLoginNotice, resetDemoData } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    pathname === '/registro' ? 'register' : 'login'
  );

  // Estado de inicio de sesión
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estado de registro de usuario (autofill-sign-up-form & validate-input-after-interaction)
  const [regNombres, setRegNombres] = useState('');
  const [regApellidos, setRegApellidos] = useState('');
  const [regDocumento, setRegDocumento] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regTouched, setRegTouched] = useState<Partial<Record<CampoRegistro, boolean>>>({});
  const [regFieldErrors, setRegFieldErrors] = useState<Partial<Record<CampoRegistro, string>>>({});
  const [regFormError, setRegFormError] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);

  const topSectionRef = useRef<HTMLDivElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const regFirstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (pathname === '/registro' && authMode !== 'register') {
      setAuthMode('register');
    } else if (pathname === '/login' && authMode !== 'login') {
      setAuthMode('login');
    }
  }, [pathname, authMode]);

  const switchMode = (nextMode: 'login' | 'register') => {
    clearLoginNotice();
    setErrorMsg(null);
    setRegFormError(null);
    setAuthMode(nextMode);
    const targetPath = nextMode === 'register' ? '/registro' : '/login';
    if (pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
    window.setTimeout(() => {
      if (nextMode === 'register') {
        regFirstInputRef.current?.focus({ preventScroll: true });
      } else {
        emailInputRef.current?.focus({ preventScroll: true });
      }
    }, 60);
  };

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
      if (authMode === 'register') {
        regFirstInputRef.current?.focus({ preventScroll: true });
      } else {
        emailInputRef.current?.focus({ preventScroll: true });
      }
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

  const validateSingleField = (
    field: CampoRegistro,
    overrides?: Partial<Record<CampoRegistro, string>>
  ) => {
    const snapshot = {
      nombres: overrides?.nombres ?? regNombres,
      apellidos: overrides?.apellidos ?? regApellidos,
      documento: overrides?.documento ?? regDocumento,
      correo: overrides?.correo ?? regCorreo,
      password: overrides?.password ?? regPassword,
    };
    const res = validarDatosRegistro(snapshot);
    setRegFieldErrors((prev) => ({
      ...prev,
      [field]: res.erroresPorCampo[field],
    }));
  };

  const handleFieldBlur = (field: CampoRegistro) => {
    setRegTouched((prev) => ({ ...prev, [field]: true }));
    validateSingleField(field);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearLoginNotice();
    setRegFormError(null);

    const allTouched: Record<CampoRegistro, boolean> = {
      nombres: true,
      apellidos: true,
      documento: true,
      correo: true,
      password: true,
    };
    setRegTouched(allTouched);

    const validacion = validarDatosRegistro({
      nombres: regNombres,
      apellidos: regApellidos,
      documento: regDocumento,
      correo: regCorreo,
      password: regPassword,
    });

    if (!validacion.ok) {
      setRegFieldErrors(validacion.erroresPorCampo);
      setRegFormError(validacion.error ?? 'Por favor corrija los campos señalados.');
      return;
    }

    setRegFieldErrors({});
    setRegSubmitting(true);

    const res = registrarCuenta({
      nombres: regNombres,
      apellidos: regApellidos,
      documento: regDocumento,
      correo: regCorreo,
      password: regPassword,
    });

    setRegSubmitting(false);
    if (!res.ok) {
      if (res.erroresPorCampo) {
        setRegFieldErrors(res.erroresPorCampo);
      }
      setRegFormError(res.error ?? 'No se pudo completar el registro.');
    }
  };

  const prefill = (email: string, pass: string) => {
    if (authMode !== 'login') {
      switchMode('login');
    }
    setCorreo(email);
    setPassword(pass);
    setErrorMsg(null);
  };

  const cumpleLongitud = regPassword.length >= 10;
  const cumpleLetra = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(regPassword);
  const cumpleNumero = /[0-9]/.test(regPassword);

  const getValidatedInputClass = (field: CampoRegistro, value: string) => {
    const touched = Boolean(regTouched[field]);
    const hasError = Boolean(regFieldErrors[field]);
    const stateClass = touched
      ? hasError
        ? 'user-invalid-fallback'
        : value.trim().length > 0
        ? 'user-valid-fallback'
        : ''
      : '';
    return `${inputBaseClass} form-input-validated ${stateClass}`;
  };

  return (
    <div className="bg-void text-bone-white">
      {/* Initial Viewport: Login / Registration Form */}
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
            {/* Left column: Oversized Dala headline + Login / Register form */}
            <div className="lg:col-span-6 space-y-[18px]">
              <div className="space-y-[10px]">
                <p className="nav-label text-saffron-spark">
                  {authMode === 'register'
                    ? 'Plataforma corporativa · Registro de cliente'
                    : 'Plataforma corporativa · Acceso'}
                </p>
                <h1 className="text-[34px] sm:text-[46px] lg:text-[56px] leading-[1.06] tracking-[-1.68px] lg:tracking-[-2.2px] text-bone-white">
                  {authMode === 'register'
                    ? 'Cree su cuenta para reportar y dar seguimiento.'
                    : 'Cada falla reportada, en un solo lugar.'}
                </h1>
                <p className="body-ultralight text-silver-mist max-w-[480px]">
                  {authMode === 'register'
                    ? 'Complete sus datos para habilitar su acceso como cliente y gestionar solicitudes de mantenimiento en tiempo real.'
                    : 'Registre daños en equipos, instalaciones, maquinaria o herramientas, adjunte evidencias y dé seguimiento hasta su cierre.'}
                </p>
              </div>

              {/* Mode Switcher: Iniciar sesión / Crear cuenta */}
              <div
                role="tablist"
                aria-label="Opciones de acceso"
                className="inline-flex rounded-[14px] border border-white/15 bg-white/[0.03] p-[4px] gap-[4px]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'login'}
                  onClick={() => switchMode('login')}
                  className={`px-[16px] py-[8px] rounded-[10px] text-[13px] font-semibold uppercase tracking-[0.35px] transition-colors cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-electric-iris text-bone-white'
                      : 'text-silver-mist hover:text-bone-white'
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'register'}
                  onClick={() => switchMode('register')}
                  data-testid="tab-crear-cuenta"
                  className={`px-[16px] py-[8px] rounded-[10px] text-[13px] font-semibold uppercase tracking-[0.35px] transition-colors cursor-pointer inline-flex items-center gap-[6px] ${
                    authMode === 'register'
                      ? 'bg-electric-iris text-bone-white'
                      : 'text-silver-mist hover:text-bone-white'
                  }`}
                >
                  <UserPlus className="w-[14px] h-[14px]" aria-hidden="true" />
                  <span>Crear cuenta</span>
                </button>
              </div>

              {loginNotice && (
                <div
                  role="status"
                  className="border border-saffron-spark/50 rounded-[12px] px-[16px] py-[12px] text-[14px] text-saffron-spark max-w-[460px]"
                >
                  {loginNotice}
                </div>
              )}

              {authMode === 'login' ? (
                <>
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
                        name="email"
                        type="email"
                        autoComplete="email"
                        spellCheck={false}
                        autoCapitalize="none"
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
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        className={inputBaseClass}
                      />
                      <FieldError message={null} />
                    </div>

                    <div className="pt-[4px] flex flex-wrap items-center gap-[14px]">
                      <PrimaryButton type="submit" disabled={submitting}>
                        {submitting ? 'Ingresando…' : 'Ingresar'}
                      </PrimaryButton>
                      <OutlineButton
                        type="button"
                        onClick={() => switchMode('register')}
                      >
                        Registrarse
                      </OutlineButton>
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
                </>
              ) : (
                <>
                  {regFormError && (
                    <div
                      role="alert"
                      className="border border-saffron-spark/70 rounded-[12px] px-[16px] py-[12px] text-[14px] text-saffron-spark max-w-[460px]"
                    >
                      {regFormError}
                    </div>
                  )}

                  <form
                    onSubmit={handleRegisterSubmit}
                    className="space-y-[14px] max-w-[460px]"
                    noValidate
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                      <div>
                        <FieldLabel htmlFor="reg-nombres" required>
                          Nombre(s)
                        </FieldLabel>
                        <input
                          ref={regFirstInputRef}
                          id="reg-nombres"
                          name="given-name"
                          type="text"
                          autoComplete="given-name"
                          required
                          minLength={2}
                          value={regNombres}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegNombres(val);
                            if (regTouched.nombres) {
                              validateSingleField('nombres', { nombres: val });
                            }
                          }}
                          onBlur={() => handleFieldBlur('nombres')}
                          aria-invalid={Boolean(regFieldErrors.nombres)}
                          aria-describedby={regFieldErrors.nombres ? 'reg-nombres-error' : undefined}
                          placeholder="Ej. Laura"
                          className={getValidatedInputClass('nombres', regNombres)}
                        />
                        {regFieldErrors.nombres && (
                          <p
                            id="reg-nombres-error"
                            data-error
                            role="alert"
                            className="mt-[6px] text-[13px] text-saffron-spark"
                          >
                            {regFieldErrors.nombres}
                          </p>
                        )}
                      </div>

                      <div>
                        <FieldLabel htmlFor="reg-apellidos" required>
                          Apellidos
                        </FieldLabel>
                        <input
                          id="reg-apellidos"
                          name="family-name"
                          type="text"
                          autoComplete="family-name"
                          required
                          minLength={2}
                          value={regApellidos}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegApellidos(val);
                            if (regTouched.apellidos) {
                              validateSingleField('apellidos', { apellidos: val });
                            }
                          }}
                          onBlur={() => handleFieldBlur('apellidos')}
                          aria-invalid={Boolean(regFieldErrors.apellidos)}
                          aria-describedby={regFieldErrors.apellidos ? 'reg-apellidos-error' : undefined}
                          placeholder="Ej. Méndez Ríos"
                          className={getValidatedInputClass('apellidos', regApellidos)}
                        />
                        {regFieldErrors.apellidos && (
                          <p
                            id="reg-apellidos-error"
                            data-error
                            role="alert"
                            className="mt-[6px] text-[13px] text-saffron-spark"
                          >
                            {regFieldErrors.apellidos}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                      <div>
                        <FieldLabel htmlFor="reg-documento" required>
                          Documento de identidad
                        </FieldLabel>
                        <input
                          id="reg-documento"
                          name="documento"
                          type="text"
                          autoComplete="off"
                          required
                          minLength={4}
                          value={regDocumento}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegDocumento(val);
                            if (regTouched.documento) {
                              validateSingleField('documento', { documento: val });
                            }
                          }}
                          onBlur={() => handleFieldBlur('documento')}
                          aria-invalid={Boolean(regFieldErrors.documento)}
                          aria-describedby={regFieldErrors.documento ? 'reg-documento-error' : undefined}
                          placeholder="Ej. 1032456789"
                          className={getValidatedInputClass('documento', regDocumento)}
                        />
                        {regFieldErrors.documento && (
                          <p
                            id="reg-documento-error"
                            data-error
                            role="alert"
                            className="mt-[6px] text-[13px] text-saffron-spark"
                          >
                            {regFieldErrors.documento}
                          </p>
                        )}
                      </div>

                      <div>
                        <FieldLabel htmlFor="reg-correo" required>
                          Correo electrónico
                        </FieldLabel>
                        <input
                          id="reg-correo"
                          name="email"
                          type="email"
                          autoComplete="email"
                          spellCheck={false}
                          autoCapitalize="none"
                          required
                          value={regCorreo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegCorreo(val);
                            if (regTouched.correo) {
                              validateSingleField('correo', { correo: val });
                            }
                          }}
                          onBlur={() => handleFieldBlur('correo')}
                          aria-invalid={Boolean(regFieldErrors.correo)}
                          aria-describedby={regFieldErrors.correo ? 'reg-correo-error' : undefined}
                          placeholder="nombre@empresa.com"
                          className={getValidatedInputClass('correo', regCorreo)}
                        />
                        {regFieldErrors.correo && (
                          <p
                            id="reg-correo-error"
                            data-error
                            role="alert"
                            className="mt-[6px] text-[13px] text-saffron-spark"
                          >
                            {regFieldErrors.correo}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="reg-password" required>
                        Contraseña
                      </FieldLabel>

                      {/* Password rules placed ABOVE the input per validate-input-after-interaction */}
                      <ul
                        id="reg-password-rules"
                        className="mb-[8px] flex flex-wrap gap-x-[14px] gap-y-[4px] text-[12px] text-silver-mist list-none p-0"
                      >
                        <li className="inline-flex items-center gap-[5px]">
                          <CheckCircle2
                            className={`w-[13px] h-[13px] ${
                              cumpleLongitud ? 'text-deep-verdant' : 'text-ash-gray/60'
                            }`}
                            aria-hidden="true"
                          />
                          <span>Mínimo 10 caracteres</span>
                        </li>
                        <li className="inline-flex items-center gap-[5px]">
                          <CheckCircle2
                            className={`w-[13px] h-[13px] ${
                              cumpleLetra ? 'text-deep-verdant' : 'text-ash-gray/60'
                            }`}
                            aria-hidden="true"
                          />
                          <span>Al menos 1 letra</span>
                        </li>
                        <li className="inline-flex items-center gap-[5px]">
                          <CheckCircle2
                            className={`w-[13px] h-[13px] ${
                              cumpleNumero ? 'text-deep-verdant' : 'text-ash-gray/60'
                            }`}
                            aria-hidden="true"
                          />
                          <span>Al menos 1 número</span>
                        </li>
                      </ul>

                      <div className="relative">
                        <input
                          id="reg-password"
                          name="password"
                          type={showRegPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          minLength={10}
                          pattern="(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*[0-9]).{10,}"
                          value={regPassword}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegPassword(val);
                            if (regTouched.password) {
                              validateSingleField('password', { password: val });
                            }
                          }}
                          onBlur={() => handleFieldBlur('password')}
                          aria-invalid={Boolean(regFieldErrors.password)}
                          aria-describedby={
                            regFieldErrors.password
                              ? 'reg-password-rules reg-password-error'
                              : 'reg-password-rules'
                          }
                          placeholder="Mínimo 10 caracteres (letras y números)"
                          className={`${getValidatedInputClass('password', regPassword)} pr-[46px]`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          aria-label={showRegPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          aria-pressed={showRegPassword}
                          className="absolute right-[10px] top-1/2 -translate-y-1/2 p-[6px] text-ash-gray hover:text-bone-white rounded-full cursor-pointer transition-colors"
                        >
                          {showRegPassword ? (
                            <EyeOff className="w-[17px] h-[17px]" aria-hidden="true" />
                          ) : (
                            <Eye className="w-[17px] h-[17px]" aria-hidden="true" />
                          )}
                        </button>
                      </div>

                      {regFieldErrors.password && (
                        <p
                          id="reg-password-error"
                          data-error
                          role="alert"
                          className="mt-[6px] text-[13px] text-saffron-spark"
                        >
                          {regFieldErrors.password}
                        </p>
                      )}
                    </div>

                    <div className="pt-[4px] flex flex-wrap items-center gap-[14px]">
                      <PrimaryButton type="submit" disabled={regSubmitting}>
                        {regSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
                      </PrimaryButton>
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="text-[13px] text-silver-mist hover:text-bone-white underline underline-offset-4 cursor-pointer"
                      >
                        ¿Ya tiene cuenta? Iniciar sesión
                      </button>
                    </div>
                  </form>
                </>
              )}

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

            {/* Right column: Dispersed 3D maintenance & geometric field */}
            <div className="hidden lg:block lg:col-span-6 h-[520px] xl:h-[560px] relative">
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
