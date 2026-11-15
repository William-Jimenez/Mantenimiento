import React from 'react';
import { useApp, useSolicitudesVisibles } from '../context/AppContext';
import { ESTADOS_ORDEN, formatearFecha } from '../services/domainRules';
import { EmptyState, EstadoLabel, GhostButton, PrimaryButton } from '../components/CommonUI';
import { EstadoNombre } from '../types/domain';

export function DashboardScreen() {
  const {
    currentEmpleado,
    isAdmin,
    isTecnico,
    isCliente,
    navigate,
    setFiltrosSolicitudes,
    recursos,
    empleados,
    asignaciones,
    iaHabilitada,
    setIaHabilitada,
  } = useApp();

  const visibles = useSolicitudesVisibles();

  const contarPorEstado = (estado: EstadoNombre) =>
    visibles.filter((s) => s.estado === estado).length;

  const irAListadoFiltrado = (estado?: EstadoNombre) => {
    setFiltrosSolicitudes({
      estados: estado ? [estado] : [],
      soloAsignadasAMi: isTecnico,
      page: 0,
    });
    navigate(isTecnico ? '/tecnico/solicitudes' : '/solicitudes');
  };

  const recientes = [...visibles]
    .sort((a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime())
    .slice(0, 5);

  const asignadasAMi = isTecnico && currentEmpleado
    ? visibles.filter((sol) => {
        if (sol.estado !== 'Asignada' && sol.estado !== 'En proceso') return false;
        return asignaciones.some(
          (a) => a.vigente && a.solicitudId === sol.id && a.tecnicoId === currentEmpleado.id
        );
      })
    : [];

  return (
    <div className="space-y-[60px]">
      {/* Hero header */}
      <section className="relative overflow-hidden py-[12px]">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-[30px]">
          <div className="space-y-[18px] max-w-[760px]">
            <p className="nav-label text-saffron-spark">
              {isAdmin
                ? 'Panel de Administración'
                : isTecnico
                ? 'Panel de Empleado · Técnico de Mantenimiento'
                : 'Portal de Cliente · Solicitudes de Mantenimiento'}
            </p>
            <h1 className="text-[42px] sm:text-[60px] lg:text-[72px] leading-[1.05] tracking-[-1.68px] lg:tracking-[-2.88px] text-bone-white">
              Hola, {currentEmpleado?.nombres}.
            </h1>
            <p className="body-ultralight text-silver-mist max-w-[540px]">
              {isAdmin
                ? 'Gestione usuarios y roles, supervise todas las solicitudes de mantenimiento de la empresa y asigne técnicos responsables.'
                : isTecnico
                ? 'Consulte las solicitudes asignadas a su cargo, actualice su estado operativo y registre el trabajo de reparación realizado.'
                : 'Solicite mantenimiento desde la página web y consulte en tiempo real el estado de sus propias solicitudes.'}
            </p>
          </div>

          <div className="shrink-0">
            {isTecnico ? (
              <PrimaryButton onClick={() => navigate('/tecnico/solicitudes')}>
                Ver mis solicitudes asignadas
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => navigate('/solicitudes/nueva')}>
                Nueva solicitud
              </PrimaryButton>
            )}
          </div>
        </div>
      </section>

      {/* Counters by state (links to P-05 filtered) */}
      <section aria-labelledby="resumen-estados-titulo" className="space-y-[24px]">
        <div className="flex items-center justify-between gap-4">
          <h2 id="resumen-estados-titulo" className="text-[24px] tracking-[-0.48px] text-bone-white">
            {isAdmin
              ? 'Todas las solicitudes por estado'
              : isTecnico
              ? 'Mis solicitudes asignadas por estado'
              : 'Estado de mis solicitudes'}
          </h2>
          <GhostButton onClick={() => irAListadoFiltrado()}>
            Ver listado completo →
          </GhostButton>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-b border-white/12 divide-y sm:divide-y-0 sm:divide-x divide-white/12">
          {ESTADOS_ORDEN.map((estado) => {
            const count = contarPorEstado(estado);
            return (
              <button
                key={estado}
                type="button"
                onClick={() => irAListadoFiltrado(estado)}
                className="text-left p-[18px] hover:bg-white/[0.04] transition-colors cursor-pointer flex flex-col justify-between gap-[12px]"
              >
                <EstadoLabel estado={estado} />
                <span className="text-[36px] leading-none tracking-[-0.04em] tabular-nums text-bone-white">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Empleado Técnico: Asignadas a mí (User Flow 4.2, RC-05) */}
      {isTecnico && (
        <section aria-labelledby="asignadas-titulo" className="space-y-[24px]">
          <div className="flex items-center justify-between gap-4">
            <h2 id="asignadas-titulo" className="text-[24px] tracking-[-0.48px] text-bone-white">
              Asignadas a mí
            </h2>
            <GhostButton
              onClick={() => {
                setFiltrosSolicitudes({
                  estados: [],
                  soloAsignadasAMi: true,
                  page: 0,
                });
                navigate('/solicitudes');
              }}
            >
              Ver todas mis asignadas →
            </GhostButton>
          </div>

          {asignadasAMi.length === 0 ? (
            <EmptyState
              title="No tiene solicitudes asignadas"
              description="Cuando el Administrador le asigne una solicitud activa, aparecerá aquí para iniciar atención."
            />
          ) : (
            <div className="border-t border-white/12 divide-y divide-white/10">
              {asignadasAMi.map((sol) => {
                const rec = recursos.find((r) => r.id === sol.recursoId);
                return (
                  <button
                    key={sol.id}
                    type="button"
                    onClick={() => navigate(`/solicitudes/${sol.id}`)}
                    className="w-full text-left py-[18px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px] hover:bg-white/[0.03] px-[6px] transition-colors cursor-pointer"
                  >
                    <div className="space-y-[6px]">
                      <div className="flex flex-wrap items-center gap-[12px]">
                        <span className="tabular-nums text-[15px] text-saffron-spark">
                          {sol.codigo}
                        </span>
                        <span aria-hidden="true" className="text-ash-gray">·</span>
                        <EstadoLabel estado={sol.estado} />
                      </div>
                      <p className="text-[16px] text-bone-white">
                        {rec?.nombre ?? 'Recurso'} —{' '}
                        <span className="text-silver-mist font-extralight">
                          {sol.descripcion.slice(0, 95)}
                          {sol.descripcion.length > 95 ? '…' : ''}
                        </span>
                      </p>
                    </div>
                    <span className="text-[13px] tabular-nums text-ash-gray whitespace-nowrap">
                      {formatearFecha(sol.actualizadaEn)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Admin quick links to P-10, P-12, P-13, P-15 (User Flow 4.2) */}
      {isAdmin && (
        <section aria-labelledby="admin-accesos-titulo" className="space-y-[24px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="admin-accesos-titulo" className="text-[24px] tracking-[-0.48px] text-bone-white">
              Administración de plataforma
            </h2>
            <label className="flex items-center gap-[10px] text-[13px] text-ash-gray cursor-pointer">
              <input
                type="checkbox"
                checked={iaHabilitada}
                onChange={(e) => setIaHabilitada(e.target.checked)}
                className="w-4 h-4 accent-electric-iris"
              />
              <span>Servicio de IA (Fase 5) habilitado</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-b border-white/12 divide-y sm:divide-y-0 sm:divide-x divide-white/12">
            <button
              type="button"
              onClick={() => navigate('/admin/empleados')}
              className="text-left p-[24px] hover:bg-white/[0.04] transition-colors cursor-pointer space-y-[8px]"
            >
              <p className="nav-label text-saffron-spark">M1 · M4</p>
              <p className="text-[24px] tracking-[-0.48px] text-bone-white">Empleados</p>
              <p className="text-[14px] text-ash-gray">
                Altas, edición y marca de personal técnico.
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/usuarios')}
              className="text-left p-[24px] hover:bg-white/[0.04] transition-colors cursor-pointer space-y-[8px]"
            >
              <p className="nav-label text-saffron-spark">M1</p>
              <p className="text-[24px] tracking-[-0.48px] text-bone-white">Usuarios</p>
              <p className="text-[14px] text-ash-gray">
                Perfiles, activación y restablecimiento de claves.
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/recursos')}
              className="text-left p-[24px] hover:bg-white/[0.04] transition-colors cursor-pointer space-y-[8px]"
            >
              <p className="nav-label text-saffron-spark">M2</p>
              <p className="text-[24px] tracking-[-0.48px] text-bone-white">Recursos</p>
              <p className="text-[14px] text-ash-gray">
                Equipos, instalaciones, maquinaria y herramientas.
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/categorias')}
              className="text-left p-[24px] hover:bg-white/[0.04] transition-colors cursor-pointer space-y-[8px]"
            >
              <p className="nav-label text-saffron-spark">SU-06</p>
              <p className="text-[24px] tracking-[-0.48px] text-bone-white">Categorías</p>
              <p className="text-[14px] text-ash-gray">
                Catálogo de clasificación de daños.
              </p>
            </button>
          </div>
        </section>
      )}

      {/* 5 most recent requests (User Flow 4.2) */}
      <section aria-labelledby="recientes-titulo" className="space-y-[24px]">
        <h2 id="recientes-titulo" className="text-[24px] tracking-[-0.48px] text-bone-white">
          {isAdmin
            ? 'Solicitudes recientes'
            : isTecnico
            ? 'Mis asignaciones más recientes'
            : 'Mis 5 solicitudes más recientes'}
        </h2>

        {recientes.length === 0 ? (
          <EmptyState
            title={
              isTecnico
                ? 'No tiene solicitudes asignadas actualmente'
                : 'Aún no tiene solicitudes. Registre la primera'
            }
            description={
              isTecnico
                ? 'Solo verá en su bandeja las solicitudes que el Administrador le asigne para reparación.'
                : 'Describa el daño, seleccione el recurso afectado y adjunte fotografías o documentos PDF si dispone de ellos.'
            }
            action={
              !isTecnico ? (
                <PrimaryButton onClick={() => navigate('/solicitudes/nueva')}>
                  Nueva solicitud
                </PrimaryButton>
              ) : undefined
            }
          />
        ) : (
          <div className="border-t border-white/12 divide-y divide-white/10">
            {recientes.map((sol) => {
              const rec = recursos.find((r) => r.id === sol.recursoId);
              const solEmp = !isCliente ? empleados.find((e) => e.id === sol.solicitanteId) : undefined;
              return (
                <button
                  key={sol.id}
                  type="button"
                  onClick={() => navigate(`/solicitudes/${sol.id}`)}
                  className="w-full text-left py-[18px] px-[6px] hover:bg-white/[0.03] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]"
                >
                  <div className="space-y-[6px]">
                    <div className="flex flex-wrap items-center gap-[10px] text-[14px]">
                      <span className="tabular-nums text-bone-white">{sol.codigo}</span>
                      <span aria-hidden="true" className="text-ash-gray">·</span>
                      <EstadoLabel estado={sol.estado} />
                      {isAdmin && solEmp && (
                        <>
                          <span aria-hidden="true" className="text-ash-gray">·</span>
                          <span className="text-ash-gray">
                            {solEmp.nombres} {solEmp.apellidos}
                            {!solEmp.activo ? ' (inactivo)' : ''}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[16px] text-silver-mist font-extralight">
                      <span className="text-bone-white font-normal">{rec?.nombre ?? 'Recurso'}</span>
                      {' — '}
                      {sol.descripcion.slice(0, 100)}
                      {sol.descripcion.length > 100 ? '…' : ''}
                    </p>
                  </div>
                  <span className="text-[13px] tabular-nums text-ash-gray whitespace-nowrap">
                    {formatearFecha(sol.creadaEn)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
