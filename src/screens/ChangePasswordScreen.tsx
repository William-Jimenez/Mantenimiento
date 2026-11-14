import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FieldError,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  PrimaryButton,
} from '../components/CommonUI';
import { LogoLockup } from '../components/ConstellationCanvas';

export function ChangePasswordScreen() {
  const { currentEmpleado, cambiarPasswordInicial, logout } = useApp();
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [fieldError, setFieldError] = useState<{ campo?: string; mensaje: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const res = cambiarPasswordInicial(nueva, confirmacion);
    if (!res.ok && res.error) {
      setFieldError({ campo: res.campo, mensaje: res.error });
    }
  };

  return (
    <div className="min-h-screen bg-void text-bone-white flex flex-col justify-between px-[18px] sm:px-[30px] py-[30px]">
      <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between gap-4">
        <LogoLockup />
        <GhostButton onClick={() => logout('Sesión cerrada')}>Cerrar sesión</GhostButton>
      </div>

      <div className="max-w-[560px] w-full mx-auto py-[48px] space-y-[30px]">
        <div className="space-y-[12px]">
          <p className="nav-label text-saffron-spark">Cambio obligatorio · Primer acceso</p>
          <h1 className="text-[42px] sm:text-[48px] leading-[1.1] tracking-[-1.68px] text-bone-white">
            Defina su nueva contraseña.
          </h1>
          <p className="body-ultralight text-silver-mist">
            {currentEmpleado ? `${currentEmpleado.nombres}, está` : 'Está'} ingresando con una contraseña temporal. Debe establecer una contraseña personal de al menos 10 caracteres que incluya letras y números antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[18px]" noValidate>
          <div>
            <FieldLabel htmlFor="new-pass" required>
              Nueva contraseña
            </FieldLabel>
            <input
              id="new-pass"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Mínimo 10 caracteres, letra y número"
              className={inputBaseClass}
            />
            <FieldError
              message={fieldError?.campo === 'nuevaPassword' ? fieldError.mensaje : null}
            />
          </div>

          <div>
            <FieldLabel htmlFor="confirm-pass" required>
              Confirmar contraseña
            </FieldLabel>
            <input
              id="confirm-pass"
              type="password"
              autoComplete="new-password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder="Repita la nueva contraseña"
              className={inputBaseClass}
            />
            <FieldError
              message={fieldError?.campo === 'confirmacion' ? fieldError.mensaje : null}
            />
          </div>

          {fieldError && !fieldError.campo && <FieldError message={fieldError.mensaje} />}

          <div className="pt-[12px]">
            <PrimaryButton type="submit">Guardar y continuar</PrimaryButton>
          </div>
        </form>
      </div>

      <div className="max-w-[1280px] w-full mx-auto text-[12px] text-ash-gray">
        Política de seguridad: mínimo 10 caracteres con al menos una letra y un número.
      </div>
    </div>
  );
}
