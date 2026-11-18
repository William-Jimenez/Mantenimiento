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
  FieldError,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  OutlineButton,
  PrimaryButton,
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

  // Cálculo de fortaleza de la contraseña (0 a 4)
  const strengthScore =
    (cumpleLongitud ? 1 : 0) +
    (cumpleLetra ? 1 : 0) +
    (cumpleNumero ? 1 : 0) +
    (cumpleMayusculaSimbolo ? 1 : 0);

  const strengthInfo =
    nueva.length === 0
      ? { label: 'Sin ingresar', color: 'text-ash-gray', barColor: 'bg-white/15' }
      : strengthScore <= 1
      ? { label: 'Débil', color: 'text-saffron-spark', barColor: 'bg-saffron-spark' }
      : strengthScore === 2
      ? { label: 'Regular', color: 'text-saffron-spark', barColor: 'bg-saffron-spark' }
      : strengthScore === 3
      ? { label: 'Buena (Cumple política)', color: 'text-electric-iris', barColor: 'bg-electric-iris' }
      : { label: 'Fuerte', color: 'text-deep-verdant', barColor: 'bg-deep-verdant' };

  // Paso 1: Verificar correo electrónico y enviar código
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

  // Reenviar código con temporizador anti-abuso
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

  // Paso 2: Validar el código de verificación de 6 dígitos
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

  // Paso 3: Establecer la nueva contraseña
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
        logout('Sesión cerrada');
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
      className="min-h-screen bg-void text-bone-white flex flex-col justify-between px-[18px] sm:px-[30px] py-[30px]"
    >
      {/* Top Bar */}
      <div className="max-w-[1280px] w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        <LogoLockup onClick={handleVolver} />
        <div className="flex flex-wrap items-center gap-[12px]">
          <ThemeLanguageControls />
          {currentUser ? (
            <GhostButton onClick={() => logout('Sesión cerrada')}>Cerrar sesión</GhostButton>
          ) : (
            <GhostButton onClick={() => navigate('/login')}>
              <span className="inline-flex items-center gap-[6px]">
                <ArrowLeft className="w-[14px] h-[14px]" aria-hidden="true" />
                <span>Volver al inicio de sesión</span>
              </span>
            </GhostButton>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[560px] w-full mx-auto py-[32px] sm:py-[44px] space-y-[28px]">
        {/* Stepper de 4 etapas para el proceso de recuperación en dos pasos */}
        {isRecoveryMode && (
          <nav
            aria-label="Progreso de restablecimiento de contraseña"
            className="grid grid-cols-4 gap-[8px] pb-[18px] border-b border-white/12"
          >
            {stepsMeta.map((s, idx) => {
              const isCompleted = idx < currentStepIdx || step === 'success';
              const isCurrent = idx === currentStepIdx && step !== 'success';
              return (
                <div
                  key={s.key}
                  className={`flex flex-col gap-[6px] ${
                    isCurrent
                      ? 'text-bone-white'
                      : isCompleted
                      ? 'text-deep-verdant'
                      : 'text-ash-gray'
                  }`}
                >
                  <div
                    className={`h-[3px] w-full rounded-full transition-colors ${
                      isCompleted
                        ? 'bg-deep-verdant'
                        : isCurrent
                        ? 'bg-electric-iris'
                        : 'bg-white/12'
                    }`}
                  />
                  <div className="flex items-center gap-[5px] text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.35px]">
                    <span className="tabular-nums">{s.num}</span>
                    <span className="truncate">{s.label}</span>
                  </div>
                </div>
              );
            })}
          </nav>
        )}

        {/* Header Contextual por Paso */}
        <div className="space-y-[12px]">
          <div className="inline-flex items-center gap-[8px]">
            <span
              aria-hidden="true"
              className="w-[28px] h-[28px] rounded-[8px] bg-saffron-spark/12 border border-saffron-spark/30 flex items-center justify-center text-saffron-spark"
            >
              <KeyRound className="w-[14px] h-[14px]" />
            </span>
            <p className="nav-label text-saffron-spark">
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

          <h1 className="text-[34px] sm:text-[44px] leading-[1.08] tracking-[-1.68px] text-bone-white">
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

          <p className="body-ultralight text-silver-mist">
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

        {/* ====================================================================
            PASO 1: INTRODUCCIÓN Y VERIFICACIÓN DE CORREO ELECTRÓNICO
           ==================================================================== */}
        {isRecoveryMode && step === 'email' && (
          <form
            onSubmit={handleSendCode}
            data-testid="form-paso-correo"
            className="space-y-[20px]"
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

            {/* Si el correo no existe: sugerencia amigable para registrarse o contactar soporte */}
            {fieldError?.campo === 'correo' && (
              <div
                role="status"
                data-testid="alerta-correo-no-registrado"
                className="rounded-[14px] border border-saffron-spark/40 bg-white/[0.03] p-[16px] space-y-[10px]"
              >
                <p className="text-[14px] text-bone-white font-medium">
                  ¿Aún no tiene una cuenta activa en la plataforma?
                </p>
                <p className="text-[13px] text-silver-mist leading-[1.45]">
                  Verifique que el correo esté bien escrito. Si es un nuevo usuario, puede registrarse directamente o contactar a soporte técnico / Administrador.
                </p>
                <div className="flex flex-wrap items-center gap-[12px] pt-[4px]">
                  <button
                    type="button"
                    onClick={() => navigate('/registro')}
                    className="inline-flex items-center gap-[6px] text-[13px] font-semibold text-saffron-spark hover:text-bone-white underline underline-offset-4 cursor-pointer"
                  >
                    <UserPlus className="w-[14px] h-[14px]" aria-hidden="true" />
                    <span>Ir a crear cuenta</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-[6px] flex flex-wrap items-center gap-[14px]">
              <PrimaryButton type="submit" data-testid="btn-enviar-codigo">
                Enviar Código
              </PrimaryButton>
              <OutlineButton type="button" onClick={() => navigate('/login')}>
                Cancelar
              </OutlineButton>
            </div>
          </form>
        )}

        {/* ====================================================================
            PASO 2: INTRODUCCIÓN Y VALIDACIÓN DEL CÓDIGO DE 6 DÍGITOS
           ==================================================================== */}
        {isRecoveryMode && step === 'code' && (
          <form
            onSubmit={handleVerifyCode}
            data-testid="form-paso-codigo"
            className="space-y-[20px]"
            noValidate
          >
            {/* Notificación de envío de código + código simulado para pruebas locales */}
            <div
              role="status"
              className="rounded-[14px] border border-electric-iris/45 bg-white/[0.03] p-[16px] space-y-[10px]"
            >
              <div className="flex items-start justify-between gap-[12px]">
                <div className="flex items-center gap-[10px]">
                  <Mail className="w-[18px] h-[18px] text-electric-iris shrink-0" aria-hidden="true" />
                  <span className="text-[14px] font-medium text-bone-white">
                    Código enviado a <span className="text-saffron-spark">{correo}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFieldError(null);
                    setStep('email');
                  }}
                  className="text-[12px] text-silver-mist hover:text-bone-white underline cursor-pointer shrink-0"
                >
                  Cambiar correo
                </button>
              </div>

              {codigoSimulado && (
                <div className="pt-[8px] border-t border-white/10 flex flex-wrap items-center justify-between gap-[10px] text-[13px]">
                  <span className="text-silver-mist">
                    Bandeja local de demostración · Código OTP:{' '}
                    <strong
                      data-testid="codigo-otp-generado"
                      className="text-saffron-spark font-mono text-[15px] tracking-[2px]"
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
                    className="text-electric-iris hover:underline font-medium cursor-pointer"
                  >
                    Usar código
                  </button>
                </div>
              )}
            </div>

            {resendNotice && (
              <div
                role="status"
                className="rounded-[12px] border border-deep-verdant/60 px-[14px] py-[10px] text-[13px] text-deep-verdant"
              >
                {resendNotice}
              </div>
            )}

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
                className={`${inputBaseClass} font-mono tracking-[4px] text-[18px]`}
              />
              <FieldError message={fieldError?.mensaje} />
            </div>

            {/* Opción de reenviar código con temporizador anti-abuso */}
            <div className="flex flex-wrap items-center justify-between gap-[12px] text-[13px]">
              <span className="text-ash-gray">¿No recibió el código en su bandeja?</span>
              <button
                type="button"
                data-testid="btn-reenviar-codigo"
                disabled={resendCooldown > 0}
                onClick={handleResendCode}
                className={`inline-flex items-center gap-[6px] font-medium transition-colors ${
                  resendCooldown > 0
                    ? 'text-ash-gray cursor-not-allowed opacity-60'
                    : 'text-saffron-spark hover:text-bone-white underline cursor-pointer'
                }`}
              >
                <RefreshCw className="w-[13px] h-[13px]" aria-hidden="true" />
                <span>
                  {resendCooldown > 0
                    ? `Reenviar código en ${resendCooldown}s`
                    : 'Reenviar nuevo código'}
                </span>
              </button>
            </div>

            <div className="pt-[6px] flex flex-wrap items-center gap-[14px]">
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

        {/* ====================================================================
            PASO 3 (O P-02): ESTABLECIMIENTO DE NUEVA CONTRASEÑA
           ==================================================================== */}
        {(!isRecoveryMode || step === 'password') && (
          <form
            onSubmit={handleResetPassword}
            data-testid="form-paso-password"
            className="space-y-[20px]"
            noValidate
          >
            <div>
              <FieldLabel htmlFor="new-pass" required>
                Nueva Contraseña
              </FieldLabel>

              {/* Indicador visual de fortaleza de contraseña */}
              <div className="mb-[10px] space-y-[6px]">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-ash-gray">Fortaleza de la contraseña:</span>
                  <span data-testid="password-strength-label" className={`font-semibold ${strengthInfo.color}`}>
                    {strengthInfo.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-[6px]" aria-hidden="true">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-[4px] rounded-full transition-colors ${
                        nueva.length > 0 && strengthScore >= level
                          ? strengthInfo.barColor
                          : 'bg-white/12'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Reglas de política de seguridad en tiempo real */}
              <ul
                id="new-pass-rules"
                className="mb-[10px] grid grid-cols-1 sm:grid-cols-2 gap-x-[14px] gap-y-[6px] text-[12px] text-silver-mist list-none p-0"
              >
                <li className="inline-flex items-center gap-[6px]">
                  <CheckCircle2
                    className={`w-[14px] h-[14px] shrink-0 ${
                      cumpleLongitud ? 'text-deep-verdant' : 'text-ash-gray/60'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Mínimo 10 caracteres</span>
                </li>
                <li className="inline-flex items-center gap-[6px]">
                  <CheckCircle2
                    className={`w-[14px] h-[14px] shrink-0 ${
                      cumpleLetra ? 'text-deep-verdant' : 'text-ash-gray/60'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Al menos 1 letra</span>
                </li>
                <li className="inline-flex items-center gap-[6px]">
                  <CheckCircle2
                    className={`w-[14px] h-[14px] shrink-0 ${
                      cumpleNumero ? 'text-deep-verdant' : 'text-ash-gray/60'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Al menos 1 número</span>
                </li>
                <li className="inline-flex items-center gap-[6px]">
                  <CheckCircle2
                    className={`w-[14px] h-[14px] shrink-0 ${
                      coincidenPasswords ? 'text-deep-verdant' : 'text-ash-gray/60'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Confirmación coincidente</span>
                </li>
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
                  className={`${inputBaseClass} pr-[46px]`}
                />
                <button
                  type="button"
                  onClick={() => setShowNueva((prev) => !prev)}
                  aria-label={showNueva ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 p-[6px] text-ash-gray hover:text-bone-white rounded-full cursor-pointer transition-colors"
                >
                  {showNueva ? (
                    <EyeOff className="w-[17px] h-[17px]" aria-hidden="true" />
                  ) : (
                    <Eye className="w-[17px] h-[17px]" aria-hidden="true" />
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
                  className={`${inputBaseClass} pr-[46px]`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmacion((prev) => !prev)}
                  aria-label={
                    showConfirmacion
                      ? 'Ocultar confirmación de contraseña'
                      : 'Mostrar confirmación de contraseña'
                  }
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 p-[6px] text-ash-gray hover:text-bone-white rounded-full cursor-pointer transition-colors"
                >
                  {showConfirmacion ? (
                    <EyeOff className="w-[17px] h-[17px]" aria-hidden="true" />
                  ) : (
                    <Eye className="w-[17px] h-[17px]" aria-hidden="true" />
                  )}
                </button>
              </div>
              <FieldError
                message={fieldError?.campo === 'confirmacion' ? fieldError.mensaje : null}
              />
            </div>

            {fieldError && !fieldError.campo && <FieldError message={fieldError.mensaje} />}

            <div className="pt-[8px] flex flex-wrap items-center gap-[14px]">
              <PrimaryButton type="submit" data-testid="btn-restablecer-password">
                {isRecoveryMode ? 'Restablecer Contraseña' : 'Guardar y continuar'}
              </PrimaryButton>
            </div>
          </form>
        )}

        {/* ====================================================================
            PASO 4 / 5: CONFIRMACIÓN DE RESTABLECIMIENTO EXITOSO
           ==================================================================== */}
        {isRecoveryMode && step === 'success' && (
          <div
            role="status"
            data-testid="confirmacion-restablecimiento"
            className="rounded-[20px] border border-deep-verdant/60 bg-white/[0.03] p-[24px] sm:p-[30px] space-y-[20px]"
          >
            <div className="flex items-center gap-[14px]">
              <span
                aria-hidden="true"
                className="w-[44px] h-[44px] rounded-full bg-deep-verdant/15 border border-deep-verdant/50 flex items-center justify-center text-deep-verdant shrink-0"
              >
                <ShieldCheck className="w-[24px] h-[24px]" />
              </span>
              <div className="space-y-[4px]">
                <h2 className="text-[22px] sm:text-[26px] leading-[1.15] tracking-[-0.48px] text-bone-white">
                  Tu contraseña ha sido restablecida con éxito.
                </h2>
                <p className="text-[14px] text-silver-mist">
                  La nueva clave para <strong className="text-bone-white">{correo}</strong> ya está activa.
                </p>
              </div>
            </div>

            <div className="pt-[6px]">
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
      </div>

      {/* Footer Note */}
      <div className="max-w-[1280px] w-full mx-auto text-[12px] text-ash-gray">
        Política de seguridad: verificación en 2 pasos por correo electrónico (OTP 6 dígitos) y contraseña de mínimo 10 caracteres con letras y números.
      </div>
    </div>
  );
}
