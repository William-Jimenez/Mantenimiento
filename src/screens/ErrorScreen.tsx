import React from 'react';
import { Home, SearchX, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PrimaryButton, SurfaceCard } from '../components/CommonUI';

export function ErrorScreen({
  tipo = 'no-encontrado',
}: {
  tipo?: 'sin-permiso' | 'no-encontrado';
}) {
  const { navigate } = useApp();
  const isDenied = tipo === 'sin-permiso';

  return (
    <section className="py-12 sm:py-20 flex justify-center">
      <SurfaceCard className="max-w-[540px] w-full text-center space-y-5 p-8 sm:p-10">
        <div className="flex justify-center">
          <span
            aria-hidden="true"
            className={`w-14 h-14 rounded-[16px] border flex items-center justify-center ${
              isDenied
                ? 'bg-[var(--status-danger-soft)] border-[var(--status-danger-border)] text-[var(--status-danger-text)]'
                : 'bg-[var(--status-warning-soft)] border-[var(--status-warning-border)] text-[var(--status-warning-text)]'
            }`}
          >
            {isDenied ? <ShieldAlert className="w-7 h-7" /> : <SearchX className="w-7 h-7" />}
          </span>
        </div>

        <div className="space-y-2">
          <p
            className={`nav-label ${
              isDenied ? 'text-[var(--status-danger-text)]' : 'text-[var(--status-warning-text)]'
            }`}
          >
            {isDenied ? 'Acceso denegado' : 'No encontrado'}
          </p>
          <h1 className="text-[28px] sm:text-[34px] leading-[1.12] tracking-[-0.025em] font-bold text-[var(--text-primary)]">
            {isDenied ? 'No tiene permiso para ver esta sección.' : 'No encontrado.'}
          </h1>
          <p className="body-readable text-[var(--text-secondary)]">
            {isDenied
              ? 'Su perfil actual no cuenta con autorización para acceder a este recurso.'
              : 'El elemento solicitado no existe o no se encuentra disponible para su usuario.'}
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <PrimaryButton onClick={() => navigate('/')}>
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Ir al inicio</span>
          </PrimaryButton>
        </div>
      </SurfaceCard>
    </section>
  );
}
