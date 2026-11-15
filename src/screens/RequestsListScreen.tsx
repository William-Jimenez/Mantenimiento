import React, { useMemo } from 'react';
import { useApp, useSolicitudesVisibles } from '../context/AppContext';
import { ESTADOS_ORDEN, formatearFecha } from '../services/domainRules';
import {
  EmptyState,
  EstadoLabel,
  GhostButton,
  inputBaseClass,
  OutlineButton,
  PrimaryButton,
} from '../components/CommonUI';
import { EstadoNombre } from '../types/domain';

const PAGE_SIZE = 20;

export function RequestsListScreen() {
  const {
    isAdmin,
    isTecnico,
    isCliente,
    currentEmpleado,
    empleados,
    recursos,
    asignaciones,
    filtrosSolicitudes,
    setFiltrosSolicitudes,
    navigate,
  } = useApp();

  const visibles = useSolicitudesVisibles();

  const toggleEstado = (estado: EstadoNombre) => {
    setFiltrosSolicitudes((prev) => {
      const existe = prev.estados.includes(estado);
      const estados = existe
        ? prev.estados.filter((e) => e !== estado)
        : [...prev.estados, estado];
      return { ...prev, estados, page: 0 };
    });
  };

  const limpiarFiltros = () => {
    setFiltrosSolicitudes({
      estados: [],
      solicitanteId: undefined,
      tecnicoId: undefined,
      soloAsignadasAMi: false,
      desde: undefined,
      hasta: undefined,
      page: 0,
    });
  };

  const filtradas = useMemo(() => {
    return [...visibles]
      .filter((sol) => {
        if (
          filtrosSolicitudes.estados.length > 0 &&
          !filtrosSolicitudes.estados.includes(sol.estado)
        ) {
          return false;
        }
        if (filtrosSolicitudes.soloAsignadasAMi && currentEmpleado) {
          const asignada = asignaciones.some(
            (a) => a.vigente && a.solicitudId === sol.id && a.tecnicoId === currentEmpleado.id
          );
          if (!asignada) return false;
        }
        if (isAdmin && filtrosSolicitudes.solicitanteId) {
          if (sol.solicitanteId !== filtrosSolicitudes.solicitanteId) return false;
        }
        if (isAdmin && filtrosSolicitudes.tecnicoId) {
          const asignada = asignaciones.some(
            (a) =>
              a.vigente &&
              a.solicitudId === sol.id &&
              a.tecnicoId === filtrosSolicitudes.tecnicoId
          );
          if (!asignada) return false;
        }
        if (isAdmin && filtrosSolicitudes.desde) {
          if (sol.creadaEn.slice(0, 10) < filtrosSolicitudes.desde) return false;
        }
        if (isAdmin && filtrosSolicitudes.hasta) {
          if (sol.creadaEn.slice(0, 10) > filtrosSolicitudes.hasta) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime());
  }, [visibles, filtrosSolicitudes, currentEmpleado, asignaciones, isAdmin]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const currentPage = Math.min(filtrosSolicitudes.page, totalPages - 1);
  const paginaItems = filtradas.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  const hayFiltros =
    filtrosSolicitudes.estados.length > 0 ||
    !!filtrosSolicitudes.soloAsignadasAMi ||
    !!filtrosSolicitudes.solicitanteId ||
    !!filtrosSolicitudes.tecnicoId ||
    !!filtrosSolicitudes.desde ||
    !!filtrosSolicitudes.hasta;

  const tecnicosActivos = empleados.filter((e) => e.esTecnico);

  return (
    <section className="space-y-[36px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[24px]">
        <div className="space-y-[12px]">
          <p className="nav-label text-saffron-spark">
            {isAdmin
              ? 'M3 · M5 Seguimiento Global'
              : isTecnico
              ? 'Bandeja Técnica · Reparaciones Asignadas'
              : 'Portal de Cliente · Mis Solicitudes'}
          </p>
          <h1 className="text-[42px] sm:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
            {isTecnico ? 'Solicitudes asignadas' : isCliente ? 'Mis solicitudes' : 'Solicitudes'}
          </h1>
          <p className="body-ultralight text-silver-mist">
            {isAdmin
              ? 'Consulte, asigne técnicos y filtre todas las solicitudes registradas en la plataforma.'
              : isTecnico
              ? 'Consulte únicamente las solicitudes asignadas a su cargo, actualice su estado y registre el trabajo realizado.'
              : 'Consulte el estado y avance de sus propias solicitudes de mantenimiento.'}
          </p>
        </div>

        {!isTecnico && (
          <PrimaryButton onClick={() => navigate('/solicitudes/nueva')}>
            Nueva solicitud
          </PrimaryButton>
        )}
      </div>

      {/* Multi-state filter bar (HU-09) */}
      <div className="space-y-[18px] pb-[24px] border-b border-white/12">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <div className="flex flex-wrap items-center gap-[8px]" role="group" aria-label="Filtrar por estado">
            {ESTADOS_ORDEN.map((estado) => {
              const active = filtrosSolicitudes.estados.includes(estado);
              return (
                <button
                  key={estado}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleEstado(estado)}
                  className={`px-[14px] py-[8px] rounded-[24px] text-[13px] uppercase tracking-[0.35px] cursor-pointer transition-colors ${
                    active
                      ? 'bg-electric-iris text-bone-white font-semibold'
                      : 'text-ash-gray hover:text-bone-white border border-white/15'
                  }`}
                >
                  {estado}
                </button>
              );
            })}
          </div>

          <span className="text-[14px] tabular-nums text-silver-mist">
            Total: {filtradas.length} resultado(s)
          </span>
        </div>

        {/* Role-specific additional filters */}
        <div className="flex flex-wrap items-center gap-[12px]">
          {isTecnico && (
            <button
              type="button"
              aria-pressed={!!filtrosSolicitudes.soloAsignadasAMi}
              onClick={() =>
                setFiltrosSolicitudes((prev) => ({
                  ...prev,
                  soloAsignadasAMi: !prev.soloAsignadasAMi,
                  page: 0,
                }))
              }
              className={`px-[14px] py-[8px] rounded-[24px] text-[13px] cursor-pointer transition-colors ${
                filtrosSolicitudes.soloAsignadasAMi
                  ? 'bg-deep-verdant text-bone-white font-semibold'
                  : 'text-ash-gray hover:text-bone-white border border-white/15'
              }`}
            >
              Solo asignadas a mí
            </button>
          )}

          {isAdmin && (
            <>
              <select
                aria-label="Filtrar por solicitante"
                value={filtrosSolicitudes.solicitanteId ?? 0}
                onChange={(e) =>
                  setFiltrosSolicitudes((prev) => ({
                    ...prev,
                    solicitanteId: Number(e.target.value) || undefined,
                    page: 0,
                  }))
                }
                className={`${inputBaseClass} w-auto text-[14px] py-[8px]`}
              >
                <option value={0}>Todos los solicitantes</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombres} {e.apellidos}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por técnico"
                value={filtrosSolicitudes.tecnicoId ?? 0}
                onChange={(e) =>
                  setFiltrosSolicitudes((prev) => ({
                    ...prev,
                    tecnicoId: Number(e.target.value) || undefined,
                    page: 0,
                  }))
                }
                className={`${inputBaseClass} w-auto text-[14px] py-[8px]`}
              >
                <option value={0}>Todos los técnicos</option>
                {tecnicosActivos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombres} {e.apellidos}
                  </option>
                ))}
              </select>

              <input
                type="date"
                aria-label="Fecha desde"
                value={filtrosSolicitudes.desde ?? ''}
                onChange={(e) =>
                  setFiltrosSolicitudes((prev) => ({
                    ...prev,
                    desde: e.target.value || undefined,
                    page: 0,
                  }))
                }
                className={`${inputBaseClass} w-auto text-[14px] py-[8px]`}
              />

              <input
                type="date"
                aria-label="Fecha hasta"
                value={filtrosSolicitudes.hasta ?? ''}
                onChange={(e) =>
                  setFiltrosSolicitudes((prev) => ({
                    ...prev,
                    hasta: e.target.value || undefined,
                    page: 0,
                  }))
                }
                className={`${inputBaseClass} w-auto text-[14px] py-[8px]`}
              />
            </>
          )}

          {hayFiltros && (
            <GhostButton onClick={limpiarFiltros}>Quitar filtros</GhostButton>
          )}
        </div>
      </div>

      {/* Results table / empty states per User Flow 4.6 */}
      {paginaItems.length === 0 ? (
        <EmptyState
          title={
            hayFiltros && filtrosSolicitudes.estados.length > 0
              ? `No hay solicitudes en estado ${filtrosSolicitudes.estados.join(', ')}`
              : isTecnico
              ? 'No tiene solicitudes asignadas'
              : 'No hay solicitudes'
          }
          description={
            hayFiltros
              ? 'Pruebe cambiando o quitando los filtros seleccionados.'
              : isTecnico
              ? 'Cuando el Administrador le asigne una solicitud para reparación, aparecerá en esta bandeja.'
              : 'Registre una nueva solicitud de mantenimiento para comenzar.'
          }
          action={
            hayFiltros ? (
              <OutlineButton onClick={limpiarFiltros}>Quitar filtro</OutlineButton>
            ) : !isTecnico ? (
              <PrimaryButton onClick={() => navigate('/solicitudes/nueva')}>
                Nueva solicitud
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-[24px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/15 text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                  <th className="py-[12px] pr-[18px] font-semibold">Código</th>
                  <th className="py-[12px] pr-[18px] font-semibold">Recurso</th>
                  <th className="py-[12px] pr-[18px] font-semibold">Estado</th>
                  {isAdmin && (
                    <>
                      <th className="py-[12px] pr-[18px] font-semibold">Solicitante</th>
                      <th className="py-[12px] pr-[18px] font-semibold">Técnico</th>
                    </>
                  )}
                  {!isAdmin && (
                    <th className="py-[12px] pr-[18px] font-semibold">Trabajo realizado</th>
                  )}
                  <th className="py-[12px] text-right font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-[15px]">
                {paginaItems.map((sol) => {
                  const rec = recursos.find((r) => r.id === sol.recursoId);
                  const solEmp = isAdmin
                    ? empleados.find((e) => e.id === sol.solicitanteId)
                    : undefined;
                  const asig = isAdmin
                    ? asignaciones.find((a) => a.vigente && a.solicitudId === sol.id)
                    : undefined;
                  const tecEmp =
                    isAdmin && asig
                      ? empleados.find((e) => e.id === asig.tecnicoId)
                      : undefined;

                  return (
                    <tr
                      key={sol.id}
                      onClick={() => navigate(`/solicitudes/${sol.id}`)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <td className="py-[16px] pr-[18px] tabular-nums text-bone-white whitespace-nowrap">
                        <a
                          href={`/solicitudes/${sol.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/solicitudes/${sol.id}`);
                          }}
                          className="hover:text-electric-iris transition-colors"
                        >
                          {sol.codigo}
                        </a>
                      </td>
                      <td className="py-[16px] pr-[18px]">
                        <div className="text-bone-white">{rec?.nombre ?? 'Recurso'}</div>
                        <div className="text-[13px] text-ash-gray tabular-nums">
                          {rec?.codigo}
                        </div>
                      </td>
                      <td className="py-[16px] pr-[18px]">
                        <EstadoLabel estado={sol.estado} />
                      </td>
                      {isAdmin ? (
                        <>
                          <td className="py-[16px] pr-[18px] text-silver-mist text-[14px]">
                            {solEmp
                              ? `${solEmp.nombres} ${solEmp.apellidos}${
                                  !solEmp.activo ? ' (inactivo)' : ''
                                }`
                              : '—'}
                          </td>
                          <td className="py-[16px] pr-[18px] text-silver-mist text-[14px]">
                            {tecEmp ? `${tecEmp.nombres} ${tecEmp.apellidos}` : 'Sin asignar'}
                          </td>
                        </>
                      ) : (
                        <td className="py-[16px] pr-[18px] text-silver-mist text-[14px] max-w-[320px] truncate">
                          {sol.trabajoRealizado || sol.motivoCierre || 'Pendiente de registro técnico'}
                        </td>
                      )}
                      <td className="py-[16px] text-right tabular-nums text-[14px] text-ash-gray whitespace-nowrap">
                        {formatearFecha(sol.creadaEn)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination (20 per page, HU-08) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-[12px] border-t border-white/10 text-[14px]">
              <span className="tabular-nums text-ash-gray">
                Página {currentPage + 1} de {totalPages}
              </span>
              <div className="flex items-center gap-[12px]">
                <OutlineButton
                  disabled={currentPage === 0}
                  onClick={() =>
                    setFiltrosSolicitudes((prev) => ({
                      ...prev,
                      page: Math.max(0, currentPage - 1),
                    }))
                  }
                >
                  Anterior
                </OutlineButton>
                <OutlineButton
                  disabled={currentPage >= totalPages - 1}
                  onClick={() =>
                    setFiltrosSolicitudes((prev) => ({
                      ...prev,
                      page: Math.min(totalPages - 1, currentPage + 1),
                    }))
                  }
                >
                  Siguiente
                </OutlineButton>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
