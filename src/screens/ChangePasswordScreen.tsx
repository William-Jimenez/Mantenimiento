import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AlertBanner,
  FieldError,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  OutlineButton,
  PrimaryButton,
  SurfaceCard,
} from '../components/CommonUI';
import { LogoLockup } from '../components/ConstellationCanvas';
import { ThemeLanguageControls } from '../components/ThemeLanguageControls';

type RecoveryStep = 'email' | 'code' | 'password' | 'success';

const RESEND_COOLDOWN_SECONDS = 60;

export function ChangePasswordScreen() {
  const {
    currentUser,
    currentEmpleado,
    cambiarPasswordInicial,
    solicitarCodigoRecuperacion,
    verificarCodigoRecuperacion,
    restablecerPasswordPorCorreo,
    navigate,
    logout,
  } = useApp();

  const isRecoveryMode = !currentUser;

  const [step, setStep] = useState<RecoveryStep>('email');
  const [correo, setCorreo] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('correo') ?? '';
    } catch {
      return '';
    }
  });
  const [codigo, setCodigo] = useState('');
  const [codigoSimulado, setCodigoSimulado] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [fieldError, setFieldError] = useState<{ campo?: string; mensaje: string } | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const cumpleLongitud = nueva.length >= 10;
  const cumpleLetra = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(nueva);
  const cumpleNumero = /[0-9]/.test(nueva);
  const cumpleMayusculaSimbolo =
    /[A-ZÁÉÍÓÚÑ]/.test(nueva) && /[a-záéíóúñ]/.test(nueva) && (/[^A-Za-z0-9]/.test(nueva) || nueva.length >= 12);
  const coincidenPasswords = nueva.length > 0 && nueva === confirmacion;

  const strengthScore =
    (cumpleLongitud ? 1 : 0) +
    (cumpleLetra ? 1 : 0) +
    (cumpleNumero ? 1 : 0) +
    (cumpleMayusculaSimbolo ? 1 : 0);

  const strengthInfo =
    nueva.length === 0
      ? { label: 'Sin ingresar', color: 'text-[var(--text-muted)]', barColor: 'bg-[var(--border-default)]' }
      : strengthScore <= 1
      ? { label: 'Débil', color: 'text-[var(--status-danger-text)]', barColor: 'bg-[var(--status-danger)]' }
      : strengthScore === 2
      ? { label: 'Regular', color: 'text-[var(--status-warning-text)]', barColor: 'bg-[var(--brand-accent)]' }
      : strengthScore === 3
      ? { label: 'Buena (Cumple política)', color: 'text-[var(--brand-primary-text)]', barColor: 'bg-[var(--brand-primary)]' }
      : { label: 'Fuerte', color: 'text-[var(--status-success-text)]', barColor: 'bg-[var(--status-success)]' };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setResendNotice(null);

    const res = solicitarCodigoRecuperacion(correo);
    if (!res.ok) {
      setFieldError({
        campo: res.campo ?? 'correo',
        mensaje: res.error ?? 'No se pudo verificar el correo electrónico.',
      });
      return;
    }

    setCodigo('');
    setCodigoSimulado(res.data?.codigoSimulado ?? null);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setStep('code');
  };

  const handleResendCode = () => {
    if (resendCooldown > 0) return;
    setFieldError(null);
    const res = solicitarCodigoRecuperacion(correo);
    if (!res.ok) {
      setFieldError({
        campo: 'codigo',
        mensaje: res.error ?? 'No fue posible reenviar el código.',
      });
      return;
    }
    setCodigo('');
    setCodigoSimulado(res.data?.codigoSimulado ?? null);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setResendNotice('Se ha enviado un nuevo código de verificación de 6 dígitos a su correo.');
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setResendNotice(null);

    const res = verificarCodigoRecuperacion(correo, codigo);
    if (!res.ok) {
      setFieldError({
        campo: 'codigo',
        mensaje: res.error ?? 'El código ingresado es inválido o ha expirado.',
      });
      return;
    }

    setStep('password');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (isRecoveryMode) {
      const res = restablecerPasswordPorCorreo(correo, nueva, confirmacion, {
        stayOnPage: true,
      });
      if (!res.ok && res.error) {
        setFieldError({ campo: res.campo, mensaje: res.error });
        return;
      }
      setStep('success');
      return;
    }

    const res = cambiarPasswordInicial(nueva, confirmacion);
    if (!res.ok && res.error) {
      setFieldError({ campo: res.campo, mensaje: res.error });
    }
  };

  const handleVolver = () => {
    if (currentUser) {
      if (currentUser.debeCambiarPassword) {
        logout();
      } else {
        navigate('/');
      }
    } else {
      navigate('/login');
    }
  };

  const stepsMeta: Array<{ key: RecoveryStep; num: string; label: string }> = [
    { key: 'email', num: '01', label: 'Correo' },
    { key: 'code', num: '02', label: 'Verificación' },
    { key: 'password', num: '03', label: 'Nueva Clave' },
    { key: 'success', num: '04', label: 'Confirmación' },
  ];

  const currentStepIdx = stepsMeta.findIndex((s) => s.key === step);

  return (
    <div
      data-testid="pantalla-cambio-contrasena"
      className="technical-grid-bg min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between"
    >
      {/* Top Bar */}
      <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur-md">
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">
          <LogoLockup onClick={handleVolver} />
          <div className="flex items-center gap-2.5">
            <ThemeLanguageControls />
            {currentUser ? (
              <GhostButton onClick={() => logout()}>Cerrar sesión</GhostButton>
            ) : (
              <GhostButton onClick={() => navigate('/login')}>
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Volver al inicio de sesión</span>
              </GhostButton>
            )}
          </div>
        </div>
      </header>

      {/* Centered Security Card */}
      <main className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <SurfaceCard className="space-y-6">
          {/* 4-Step Recovery Progress Stepper */}
          {isRecoveryMode && (
            <nav
              aria-label="Progreso de restablecimiento de contraseña"
              className="grid grid-cols-4 gap-2 pb-5 border-b border-[var(--border-subtle)]"
            >
              {stepsMeta.map((s, idx) => {
                const isCompleted = idx < currentStepIdx || step === 'success';
                const isCurrent = idx === currentStepIdx && step !== 'success';
                return (
                  <div
                    key={s.key}
                    className={`flex flex-col gap-1.5 ${
                      isCurrent
                        ? 'text-[var(--text-primary)]'
                        : isCompleted
                        ? 'text-[var(--status-success-text)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <div
                      className={`h-1 w-full rounded-full transition-colors ${
                        isCompleted
                          ? 'bg-[var(--status-success-text)]'
                          : isCurrent
                          ? 'bg-[var(--brand-primary)]'
                          : 'bg-[var(--border-default)]'
                      }`}
                    />
                    <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em]">
                      <span className="font-mono-code">{s.num}</span>
                      <span className="truncate">{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </nav>
          )}

          {/* Contextual Header */}
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-7 h-7 rounded-[8px] bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-border)] flex items-center justify-center text-[var(--brand-primary-text)]"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </span>
              <p className="nav-label text-[var(--brand-primary-text)]">
                {!isRecoveryMode
                  ? 'Cambio obligatorio · Primer acceso'
                  : step === 'email'
                  ? 'Paso 1 de 3 · Verificación de Correo Electrónico'
                  : step === 'code'
                  ? 'Paso 2 de 3 · Validación de Código de Seguridad'
                  : step === 'password'
                  ? 'Paso 3 de 3 · Establecimiento de Nueva Contraseña'
                  : 'Proceso Completado · Cuenta Recuperada'}
              </p>
            </div>

            <h1 className="text-[26px] sm:text-[32px] leading-[1.12] tracking-[-0.025em] font-bold text-[var(--text-primary)]">
              {!isRecoveryMode
                ? 'Defina su nueva contraseña.'
                : step === 'email'
                ? 'Restablezca su contraseña.'
                : step === 'code'
                ? 'Ingrese el código de verificación.'
                : step === 'password'
                ? 'Cree su nueva contraseña.'
                : 'Contraseña actualizada.'}
            </h1>

            <p className="body-readable text-[var(--text-secondary)]">
              {!isRecoveryMode
                ? `${
                    currentEmpleado ? `${currentEmpleado.nombres}, está` : 'Está'
                  } ingresando con una contraseña temporal. Debe establecer una contraseña personal de al menos 10 caracteres que incluya letras y números antes de continuar.`
                : step === 'email'
                ? 'Introduzca el correo electrónico asociado a su cuenta. Verificaremos su registro y le enviaremos un código de seguridad de 6 dígitos.'
                : step === 'code'
                ? `Hemos enviado un código de verificación de un solo uso (6 dígitos) al correo electrónico ${correo}. El código expira en 10 minutos.`
                : step === 'password'
                ? 'Su identidad ha sido verificada. Establezca ahora una contraseña segura que cumpla con todos los requisitos de protección.'
                : 'Su credencial de acceso ha sido actualizada y cifrada correctamente en el sistema.'}
            </p>
          </div>

          {/* PASO 1: CORREO ELECTRÓNICO */}
          {isRecoveryMode && step === 'email' && (
            <form
              onSubmit={handleSendCode}
              data-testid="form-paso-correo"
              className="space-y-5"
              noValidate
            >
              <div>
                <FieldLabel htmlFor="recovery-correo" required>
                  Correo Electrónico
                </FieldLabel>
                <input
                  id="recovery-correo"
                  name="correo"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  autoCapitalize="none"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    setFieldError(null);
                  }}
                  placeholder="nombre@empresa.com"
                  className={inputBaseClass}
                />
                <FieldError message={fieldError?.mensaje} />
              </div>

              {fieldError?.campo === 'correo' && (
                <div
                  role="status"
                  data-testid="alerta-correo-no-registrado"
                  className="rounded-[12px] border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] p-4 space-y-2"
                >
                  <p className="text-[14px] text-[var(--text-primary)] font-semibold">
                    ¿Aún no tiene una cuenta activa en la plataforma?
                  </p>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-[1.5]">
                    Verifique que el correo esté bien escrito. Si es un nuevo usuario, puede registrarse directamente o contactar a soporte técnico / Administrador.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/registro')}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand-primary-text)] hover:underline underline-offset-4 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" aria-hidden="true" />
                      <span>Ir a crear cuenta</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <PrimaryButton type="submit" data-testid="btn-enviar-codigo">
                  Enviar Código
                </PrimaryButton>
                <OutlineButton type="button" onClick={() => navigate('/login')}>
                  Cancelar
                </OutlineButton>
              </div>
            </form>
          )}

          {/* PASO 2: CÓDIGO DE 6 DÍGITOS */}
          {isRecoveryMode && step === 'code' && (
            <form
              onSubmit={handleVerifyCode}
              data-testid="form-paso-codigo"
              className="space-y-5"
              noValidate
            >
              <div
                role="status"
                className="rounded-[12px] border border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail
                      className="w-[18px] h-[18px] text-[var(--brand-primary-text)] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                      Código enviado a{' '}
                      <strong className="font-semibold text-[var(--brand-primary-text)]">
                        {correo}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFieldError(null);
                      setStep('email');
                    }}
                    className="text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4 cursor-pointer shrink-0"
                  >
                    Cambiar correo
                  </button>
                </div>

                {codigoSimulado && (
                  <div className="pt-2.5 border-t border-[var(--brand-primary-border)] flex flex-wrap items-center justify-between gap-2.5 text-[13px]">
                    <span className="text-[var(--text-secondary)]">
                      Bandeja local de demostración · Código OTP:{' '}
                      <strong
                        data-testid="codigo-otp-generado"
                        className="text-[var(--status-warning-text)] font-mono-code text-[15px] tracking-[2px]"
                      >
                        {codigoSimulado}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCodigo(codigoSimulado);
                        setFieldError(null);
                      }}
                      className="px-2.5 py-1 rounded-[6px] bg-[var(--brand-primary)] text-white text-[12px] font-semibold hover:bg-[var(--brand-primary-hover)] transition-colors cursor-pointer"
                    >
                      Usar código
                    </button>
                  </div>
                )}
              </div>

              {resendNotice && <AlertBanner variant="success">{resendNotice}</AlertBanner>}

              <div>
                <FieldLabel htmlFor="recovery-codigo" required>
                  Código de Verificación (6 dígitos)
                </FieldLabel>
                <input
                  id="recovery-codigo"
                  name="codigo"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={codigo}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCodigo(digitsOnly);
                    setFieldError(null);
                  }}
                  placeholder="Ej. 482910"
                  className={`${inputBaseClass} font-mono-code tracking-[0.35em] text-[20px] font-semibold`}
                />
                <FieldError message={fieldError?.mensaje} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                <span className="text-[var(--text-muted)]">¿No recibió el código en su bandeja?</span>
                <button
                  type="button"
                  data-testid="btn-reenviar-codigo"
                  disabled={resendCooldown > 0}
                  onClick={handleResendCode}
                  className={`inline-flex items-center gap-1.5 font-semibold transition-colors ${
                    resendCooldown > 0
                      ? 'text-[var(--text-muted)] cursor-not-allowed opacity-60'
                      : 'text-[var(--brand-primary-text)] hover:underline underline-offset-4 cursor-pointer'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="tabular-nums">
                    {resendCooldown > 0
                      ? `Reenviar código en ${resendCooldown}s`
                      : 'Reenviar nuevo código'}
                  </span>
                </button>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <PrimaryButton type="submit" data-testid="btn-verificar-codigo">
                  Verificar Código
                </PrimaryButton>
                <OutlineButton
                  type="button"
                  onClick={() => {
                    setFieldError(null);
                    setStep('email');
                  }}
                >
                  Atrás
                </OutlineButton>
              </div>
            </form>
          )}

          {/* PASO 3 (O P-02): NUEVA CONTRASEÑA */}
          {(!isRecoveryMode || step === 'password') && (
            <form
              onSubmit={handleResetPassword}
              data-testid="form-paso-password"
              className="space-y-5"
              noValidate
            >
              <div>
                <FieldLabel htmlFor="new-pass" required>
                  Nueva Contraseña
                </FieldLabel>

                {/* Password Strength Meter */}
                <div className="mb-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--text-muted)]">Fortaleza de la contraseña:</span>
                    <span
                      data-testid="password-strength-label"
                      className={`font-semibold ${strengthInfo.color}`}
                    >
                      {strengthInfo.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 rounded-full transition-colors duration-200 ${
                          nueva.length > 0 && strengthScore >= level
                            ? strengthInfo.barColor
                            : 'bg-[var(--bg-subtle)]'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Security Policy Rules */}
                <ul
                  id="new-pass-rules"
                  className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-1.5 text-[12px] text-[var(--text-secondary)] list-none p-0"
                >
                  {[
                    { ok: cumpleLongitud, text: 'Mínimo 10 caracteres' },
                    { ok: cumpleLetra, text: 'Al menos 1 letra' },
                    { ok: cumpleNumero, text: 'Al menos 1 número' },
                    { ok: coincidenPasswords, text: 'Confirmación coincidente' },
                  ].map((rule) => (
                    <li key={rule.text} className="inline-flex items-center gap-1.5">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          rule.ok
                            ? 'text-[var(--status-success-text)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{rule.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative">
                  <input
                    id="new-pass"
                    type={showNueva ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={nueva}
                    onChange={(e) => {
                      setNueva(e.target.value);
                      setFieldError(null);
                    }}
                    placeholder="Mínimo 10 caracteres, letra y número"
                    className={`${inputBaseClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNueva((prev) => !prev)}
                    aria-label={showNueva ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[36px] h-[36px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-[8px] cursor-pointer transition-colors"
                  >
                    {showNueva ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <FieldError
                  message={fieldError?.campo === 'nuevaPassword' ? fieldError.mensaje : null}
                />
              </div>

              <div>
                <FieldLabel htmlFor="confirm-pass" required>
                  Confirmar Nueva Contraseña
                </FieldLabel>
                <div className="relative">
                  <input
                    id="confirm-pass"
                    type={showConfirmacion ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmacion}
                    onChange={(e) => {
                      setConfirmacion(e.target.value);
                      setFieldError(null);
                    }}
                    placeholder="Repita la nueva contraseña"
                    className={`${inputBaseClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmacion((prev) => !prev)}
                    aria-label={
                      showConfirmacion
                        ? 'Ocultar confirmación de contraseña'
                        : 'Mostrar confirmación de contraseña'
                    }
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[36px] h-[36px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-[8px] cursor-pointer transition-colors"
                  >
                    {showConfirmacion ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <FieldError
                  message={fieldError?.campo === 'confirmacion' ? fieldError.mensaje : null}
                />
              </div>

              {fieldError && !fieldError.campo && <FieldError message={fieldError.mensaje} />}

              <div className="pt-2">
                <PrimaryButton type="submit" data-testid="btn-restablecer-password">
                  {isRecoveryMode ? 'Restablecer Contraseña' : 'Guardar y continuar'}
                </PrimaryButton>
              </div>
            </form>
          )}

          {/* PASO 4: CONFIRMACIÓN EXITOSA */}
          {isRecoveryMode && step === 'success' && (
            <div
              role="status"
              data-testid="confirmacion-restablecimiento"
              className="rounded-[14px] border border-[var(--status-success-border)] bg-[var(--status-success-soft)] p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="w-11 h-11 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--status-success-border)] flex items-center justify-center text-[var(--status-success-text)] shrink-0"
                >
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <div className="space-y-1">
                  <h2 className="text-[20px] leading-[1.2] tracking-[-0.015em] font-bold text-[var(--text-primary)]">
                    Tu contraseña ha sido restablecida con éxito.
                  </h2>
                  <p className="text-[14px] text-[var(--text-secondary)]">
                    La nueva clave para{' '}
                    <strong className="font-semibold text-[var(--text-primary)]">{correo}</strong>{' '}
                    ya está activa.
                  </p>
                </div>
              </div>

              <div>
                <PrimaryButton
                  type="button"
                  data-testid="btn-ir-a-iniciar-sesion"
                  onClick={() => navigate('/login')}
                >
                  Ir a Iniciar Sesión
                </PrimaryButton>
              </div>
            </div>
          )}
        </SurfaceCard>
      </main>

      {/* Footer Note */}
      <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1280px] w-full mx-auto text-[12px] text-[var(--text-muted)]">
          Política de seguridad: verificación en 2 pasos por correo electrónico (OTP 6 dígitos) y contraseña de mínimo 10 caracteres con letras y números.
        </div>
      </footer>
    </div>
  );
}
