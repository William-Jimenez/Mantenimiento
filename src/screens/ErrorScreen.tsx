import React from 'react';
import { useApp } from '../context/AppContext';
import { PrimaryButton } from '../components/CommonUI';

export function ErrorScreen({
  tipo = 'no-encontrado',
}: {
  tipo?: 'sin-permiso' | 'no-encontrado';
}) {
  const { navigate } = useApp();

  return (
    <section className="py-[60px] space-y-[24px] max-w-[640px]">
      <p className="nav-label text-saffron-spark">
        {tipo === 'sin-permiso' ? 'Acceso denegado' : 'No encontrado'}
      </p>
      <h1 className="text-[42px] sm:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
        {tipo === 'sin-permiso' ? 'No tiene permiso para ver esta sección.' : 'No encontrado.'}
      </h1>
      <p className="body-ultralight text-silver-mist">
        {tipo === 'sin-permiso'
          ? 'Su perfil actual no cuenta con autorización para acceder a este recurso.'
          : 'El elemento solicitado no existe o no se encuentra disponible para su usuario.'}
      </p>
      <div className="pt-[12px]">
        <PrimaryButton onClick={() => navigate('/')}>Ir al inicio</PrimaryButton>
      </div>
    </section>
  );
}
