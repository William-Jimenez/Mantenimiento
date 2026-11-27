import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoLockup } from '../components/ConstellationCanvas';
import {
  AlertBanner,
  FieldError,
  FieldLabel,
  inputBaseClass,
  OutlineButton,
  PrimaryButton,
  SurfaceCard,
} from '../components/CommonUI';
import { ThemeLanguageControls } from '../components/ThemeLanguageControls';
import { ServiceScrollNarrative } from '../components/ServiceScrollNarrative';
import { CampoRegistro, validarDatosRegistro } from '../services/domainRules';

const HeroModel3D = lazy(() => import('../components/HeroModel3D'));

export function LoginScreen() {
  const { pathname, navigate, login, registrarCuenta, loginNotice, clearLoginNotice, resetDemoData } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    pathname === '/registro' ? 'register' : 'login'
  );

  // Estado de inicio de sesión
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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
    <div className="bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Initial Viewport: Precision Industrial Gateway */}
      <div
        ref={topSectionRef}
        className="technical-grid-bg min-h-screen flex flex-col justify-between"
      >
        {/* Top Utility Header */}
        <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur-md">
          <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-3">
            <LogoLockup />
            <div className="flex items-center gap-2.5">
              <ThemeLanguageControls />
              <OutlineButton
                onClick={scrollToNarrative}
                className="!min-h-[40px] !py-1.5 !px-3.5 !text-[13px] hidden sm:inline-flex"
              >
                <span>Conocer el servicio</span>
                <ArrowDown
                  className="w-3.5 h-3.5 text-[var(--brand-primary-text)]"
                  aria-hidden="true"
                />
              </OutlineButton>
            </div>
          </div>
        </header>

        {/* Main Split Composition */}
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex items-center py-8 lg:py-12">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left column: Value Proposition + Structured Auth Card */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <p className="nav-label text-[var(--brand-primary-text)] flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-[var(--brand-accent)] inline-block"
                  />
                  <span>
                    {authMode === 'register'
                      ? 'Plataforma corporativa · Registro de cliente'
                      : 'Plataforma corporativa · Acceso'}
                  </span>
                </p>
                <h1 className="text-[32px] sm:text-[42px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-bold text-[var(--text-primary)]">
                  {authMode === 'register'
                    ? 'Cree su cuenta para reportar y dar seguimiento.'
                    : 'Cada falla reportada, en un solo lugar.'}
                </h1>
                <p className="body-readable text-[var(--text-secondary)] max-w-[500px] text-[15px] sm:text-[16px]">
                  {authMode === 'register'
                    ? 'Complete sus datos para habilitar su acceso como cliente y gestionar solicitudes de mantenimiento en tiempo real.'
                    : 'Registre daños en equipos, instalaciones, maquinaria o herramientas, adjunte evidencias y dé seguimiento hasta su cierre.'}
                </p>
              </div>

              <SurfaceCard className="max-w-[500px] space-y-5">
                {/* Segmented Mode Switcher: Iniciar sesión / Crear cuenta */}
                <div
                  role="tablist"
                  aria-label="Opciones de acceso"
                  className="grid grid-cols-2 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1 gap-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'login'}
                    onClick={() => switchMode('login')}
                    className={`px-4 py-2 min-h-[40px] rounded-[9px] text-[13px] font-semibold tracking-[0.01em] transition-[background-color,color,box-shadow] duration-150 cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
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
                    className={`px-4 py-2 min-h-[40px] rounded-[9px] text-[13px] font-semibold tracking-[0.01em] transition-[background-color,color,box-shadow] duration-150 cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                      authMode === 'register'
                        ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Crear cuenta</span>
                  </button>
                </div>

                {loginNotice && (
                  <AlertBanner variant="warning">{loginNotice}</AlertBanner>
                )}

                {authMode === 'login' ? (
                  <>
                    {errorMsg && <AlertBanner variant="error">{errorMsg}</AlertBanner>}

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                        <div className="relative">
                          <input
                            id="login-password"
                            name="password"
                            type={showLoginPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••"
                            className={`${inputBaseClass} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((prev) => !prev)}
                            aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            aria-pressed={showLoginPassword}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[36px] h-[36px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-[8px] cursor-pointer transition-colors"
                          >
                            {showLoginPassword ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        <FieldError message={null} />
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-3">
                        <PrimaryButton
                          type="submit"
                          loading={submitting}
                          className="flex-1 sm:flex-initial min-w-[140px]"
                        >
                          {submitting ? 'Ingresando…' : 'Ingresar'}
                        </PrimaryButton>
                        <OutlineButton
                          type="button"
                          onClick={() => switchMode('register')}
                          className="flex-1 sm:flex-initial"
                        >
                          Registrarse
                        </OutlineButton>
                      </div>
                    </form>

                    {/* SU-08: módulo "¿Olvidó su contraseña?" */}
                    <div
                      data-testid="modulo-olvido-contrasena"
                      className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-4 py-3.5 flex items-start gap-3 transition-colors hover:border-[var(--border-default)]"
                    >
                      <span
                        aria-hidden="true"
                        className="w-9 h-9 rounded-[9px] bg-[var(--status-warning-soft)] border border-[var(--status-warning-border)] flex items-center justify-center shrink-0 text-[var(--status-warning-text)] mt-0.5"
                      >
                        <KeyRound className="w-4 h-4" />
                      </span>
                      <div className="flex flex-col gap-1 min-w-0">
                        <a
                          href="/recuperar-contrasena"
                          data-testid="link-cambiar-contrasena"
                          onClick={(e) => {
                            e.preventDefault();
                            clearLoginNotice();
                            const targetUrl = correo.trim()
                              ? `/recuperar-contrasena?correo=${encodeURIComponent(correo.trim())}`
                              : '/recuperar-contrasena';
                            navigate(targetUrl);
                          }}
                          className="inline-flex items-center gap-1.5 text-[13px] sm:text-[14px] font-semibold text-[var(--brand-primary-text)] hover:underline underline-offset-4 transition-colors cursor-pointer w-fit"
                        >
                          <span>Ir a cambio y recuperación de contraseña</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        </a>
                        <p className="text-[13px] leading-[1.45] text-[var(--text-muted)]">
                          <span className="font-medium text-[var(--text-secondary)]">
                            ¿Olvidó su contraseña?
                          </span>{' '}
                          Comuníquese con el{' '}
                          <span className="text-[var(--status-warning-text)] font-medium">
                            Administrador
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {regFormError && <AlertBanner variant="error">{regFormError}</AlertBanner>}

                    <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                              className="mt-1.5 text-[13px] font-medium text-[var(--status-danger-text)]"
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
                              className="mt-1.5 text-[13px] font-medium text-[var(--status-danger-text)]"
                            >
                              {regFieldErrors.apellidos}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                              className="mt-1.5 text-[13px] font-medium text-[var(--status-danger-text)]"
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
                              className="mt-1.5 text-[13px] font-medium text-[var(--status-danger-text)]"
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

                        <ul
                          id="reg-password-rules"
                          className="mb-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-[var(--text-secondary)] list-none p-0"
                        >
                          <li className="inline-flex items-center gap-1.5">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${
                                cumpleLongitud
                                  ? 'text-[var(--status-success-text)]'
                                  : 'text-[var(--text-muted)]'
                              }`}
                              aria-hidden="true"
                            />
                            <span>Mínimo 10 caracteres</span>
                          </li>
                          <li className="inline-flex items-center gap-1.5">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${
                                cumpleLetra
                                  ? 'text-[var(--status-success-text)]'
                                  : 'text-[var(--text-muted)]'
                              }`}
                              aria-hidden="true"
                            />
                            <span>Al menos 1 letra</span>
                          </li>
                          <li className="inline-flex items-center gap-1.5">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${
                                cumpleNumero
                                  ? 'text-[var(--status-success-text)]'
                                  : 'text-[var(--text-muted)]'
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
                            className={`${getValidatedInputClass('password', regPassword)} pr-11`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword((prev) => !prev)}
                            aria-label={showRegPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            aria-pressed={showRegPassword}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[36px] h-[36px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-[8px] cursor-pointer transition-colors"
                          >
                            {showRegPassword ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>

                        {regFieldErrors.password && (
                          <p
                            id="reg-password-error"
                            data-error
                            role="alert"
                            className="mt-1.5 text-[13px] font-medium text-[var(--status-danger-text)]"
                          >
                            {regFieldErrors.password}
                          </p>
                        )}
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-3.5">
                        <PrimaryButton type="submit" loading={regSubmitting}>
                          {regSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
                        </PrimaryButton>
                        <button
                          type="button"
                          onClick={() => switchMode('login')}
                          className="text-[13px] font-medium text-[var(--brand-primary-text)] hover:underline underline-offset-4 cursor-pointer min-h-[40px]"
                        >
                          ¿Ya tiene cuenta? Iniciar sesión
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </SurfaceCard>

              {/* Collapsible Demo Accounts Card */}
              <details className="max-w-[500px] rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 px-4 py-3 text-[13px] text-[var(--text-secondary)] group">
                <summary className="flex items-center justify-between gap-2 cursor-pointer font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors select-none list-none">
                  <span>Cuentas disponibles para verificación de flujo</span>
                  <ChevronDown
                    className="w-4 h-4 text-[var(--text-muted)] transition-transform duration-150 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                  {[
                    { label: 'Administrador', email: 'admin@empresa.com', pass: '' },
                    { label: 'Empleado Técnico', email: 'tecnico@empresa.com', pass: 'Tecnico2026' },
                    { label: 'Cliente', email: 'cliente@empresa.com', pass: 'Cliente2026' },
                    { label: 'Cliente · Clave temporal P-02', email: 'mateo.rojas@empresa.com', pass: 'Temporal2026' },
                  ].map((acc) => (
                    <div
                      key={acc.email}
                      className="flex items-center justify-between gap-2 py-1"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-[var(--text-primary)]">{acc.label}</span>{' '}
                        <span className="font-mono-code text-[12px] text-[var(--text-muted)]">
                          ({acc.email})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => prefill(acc.email, acc.pass)}
                        className="px-2.5 py-1 rounded-[6px] bg-[var(--brand-primary-soft)] text-[var(--brand-primary-text)] hover:bg-[var(--brand-primary)] hover:text-white text-[12px] font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        Usar
                      </button>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={resetDemoData}
                      className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-4 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Restablecer datos iniciales</span>
                    </button>
                  </div>
                </div>
              </details>
            </div>

            {/* Right column: Featured interactive 3D maintenance core model (unclipped, zero zoom) */}
            <div className="lg:col-span-6 h-[320px] sm:h-[400px] lg:h-[520px] xl:h-[560px] relative">
              <Suspense
                fallback={
                  <div
                    aria-hidden="true"
                    className="w-full h-full flex items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-[var(--brand-primary-border)] animate-pulse" />
                  </div>
                }
              >
                <HeroModel3D className="w-full h-full" />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Mobile scroll cue */}
        <div className="sm:hidden px-4 pb-5 flex justify-center">
          <OutlineButton onClick={scrollToNarrative} className="!min-h-[40px] !py-1.5 !px-4 !text-[13px]">
            <span>Conocer el servicio</span>
            <ArrowDown className="w-3.5 h-3.5 text-[var(--brand-primary-text)]" aria-hidden="true" />
          </OutlineButton>
        </div>
      </div>

      {/* Scroll-Driven Narrative Screens with 3D Interactive Scenes */}
      <ServiceScrollNarrative onBackToLogin={scrollToLogin} />
    </div>
  );
}
