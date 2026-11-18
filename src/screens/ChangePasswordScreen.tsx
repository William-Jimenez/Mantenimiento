import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
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

export function ChangePasswordScreen() {
  const {
    currentUser,
    currentEmpleado,
    cambiarPasswordInicial,
    restablecerPasswordPorCorreo,
    navigate,
    logout,
  } = useApp();

  const isRecoveryMode = !currentUser;

  const [correo, setCorreo] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('correo') ?? '';
    } catch {
      return '';
    }
  });
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [fieldError, setFieldError] = useState<{ campo?: string; mensaje: string } | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qCorreo = params.get('correo');
      if (qCorreo && !correo) {
        setCorreo(qCorreo);
      }
    } catch {
      // ignore
    }
  }, [correo]);

  const cumpleLongitud = nueva.length >= 10;
  const cumpleLetra = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(nueva);
  const cumpleNumero = /[0-9]/.test(nueva);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (isRecoveryMode) {
      const res = restablecerPasswordPorCorreo(correo, nueva, confirmacion);
      if (!res.ok && res.error) {
        setFieldError({ campo: res.campo, mensaje: res.error });
      }
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

  return (
    <div
      data-testid="pantalla-cambio-contrasena"
      className="min-h-screen bg-void text-bone-white flex flex-col justify-between px-[18px] sm:px-[30px] py-[30px]"
    >
      <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between gap-4">
        <LogoLockup onClick={handleVolver} />
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

      <div className="max-w-[560px] w-full mx-auto py-[36px] sm:py-[48px] space-y-[28px]">
        <div className="space-y-[12px]">
          <div className="inline-flex items-center gap-[8px]">
            <span
              aria-hidden="true"
              className="w-[28px] h-[28px] rounded-[8px] bg-saffron-spark/12 border border-saffron-spark/30 flex items-center justify-center text-saffron-spark"
            >
              <KeyRound className="w-[14px] h-[14px]" />
            </span>
            <p className="nav-label text-saffron-spark">
              {isRecoveryMode
                ? 'Recuperación de cuenta · Cambio de contraseña'
                : 'Cambio obligatorio · Primer acceso'}
            </p>
          </div>
          <h1 className="text-[36px] sm:text-[46px] leading-[1.08] tracking-[-1.68px] text-bone-white">
            {isRecoveryMode ? 'Restablezca su contraseña.' : 'Defina su nueva contraseña.'}
          </h1>
          <p className="body-ultralight text-silver-mist">
            {isRecoveryMode
              ? 'Ingrese el correo electrónico asociado a su cuenta corporativa y establezca una nueva contraseña personal de al menos 10 caracteres que incluya letras y números.'
              : `${
                  currentEmpleado ? `${currentEmpleado.nombres}, está` : 'Está'
                } ingresando con una contraseña temporal. Debe establecer una contraseña personal de al menos 10 caracteres que incluya letras y números antes de continuar.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[18px]" noValidate>
          {isRecoveryMode && (
            <div>
              <FieldLabel htmlFor="recovery-correo" required>
                Correo electrónico de la cuenta
              </FieldLabel>
              <input
                id="recovery-correo"
                name="correo"
                type="email"
                autoComplete="email"
                spellCheck={false}
                autoCapitalize="none"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@empresa.com"
                className={inputBaseClass}
              />
              <FieldError
                message={fieldError?.campo === 'correo' ? fieldError.mensaje : null}
              />
            </div>
          )}

          <div>
            <FieldLabel htmlFor="new-pass" required>
              Nueva contraseña
            </FieldLabel>

            <ul
              id="new-pass-rules"
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
                id="new-pass"
                type={showNueva ? 'text' : 'password'}
                autoComplete="new-password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
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
              Confirmar contraseña
            </FieldLabel>
            <div className="relative">
              <input
                id="confirm-pass"
                type={showConfirmacion ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
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

          <div className="pt-[12px] flex flex-wrap items-center gap-[14px]">
            <PrimaryButton type="submit">
              {isRecoveryMode ? 'Actualizar contraseña' : 'Guardar y continuar'}
            </PrimaryButton>
            {isRecoveryMode && (
              <OutlineButton type="button" onClick={() => navigate('/login')}>
                Volver al login
              </OutlineButton>
            )}
          </div>
        </form>
      </div>

      <div className="max-w-[1280px] w-full mx-auto text-[12px] text-ash-gray">
        Política de seguridad: mínimo 10 caracteres con al menos una letra y un número.
      </div>
    </div>
  );
}
