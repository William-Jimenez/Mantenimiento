import React, { useMemo } from 'react';
import { ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { useApp, useSolicitudesVisibles } from '../context/AppContext';
import { ESTADOS_ORDEN, formatearFecha } from '../services/domainRules';
import {
  EmptyState,
  EstadoLabel,
  FilterChip,
  GhostButton,
  inputBaseClass,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SurfaceCard,
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
    <section className="space-y-6">
      <PageHeader
        eyebrow={
          isAdmin
            ? 'M3 · M5 Seguimiento Global'
            : isTecnico
            ? 'Bandeja Técnica · Reparaciones Asignadas'
            : 'Portal de Cliente · Mis Solicitudes'
        }
        title={isTecnico ? 'Solicitudes asignadas' : isCliente ? 'Mis solicitudes' : 'Solicitudes'}
        description={
          isAdmin
            ? 'Consulte, asigne técnicos y filtre todas las solicitudes registradas en la plataforma.'
            : isTecnico
            ? 'Consulte únicamente las solicitudes asignadas a su cargo, actualice su estado y registre el trabajo realizado.'
            : 'Consulte el estado y avance de sus propias solicitudes de mantenimiento.'
        }
        actions={
          !isTecnico ? (
            <PrimaryButton onClick={() => navigate('/solicitudes/nueva')}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nueva solicitud</span>
            </PrimaryButton>
          ) : undefined
        }
      />

      {/* Filter Toolbar Card (HU-09) */}
      <SurfaceCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar por estado"
          >
            {ESTADOS_ORDEN.map((estado) => {
              const active = filtrosSolicitudes.estados.includes(estado);
              return (
                <FilterChip
                  key={estado}
                  active={active}
                  onClick={() => toggleEstado(estado)}
                >
                  {estado}
                </FilterChip>
              );
            })}
          </div>

          <span className="font-mono-code text-[13px] font-medium px-3 py-1.5 rounded-[8px] bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
            Total: {filtradas.length} resultado(s)
          </span>
        </div>

        {/* Role-specific additional filters */}
        {(isTecnico || isAdmin || hayFiltros) && (
          <div className="pt-3.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-3">
            {isTecnico && (
              <FilterChip
                variant="success"
                active={!!filtrosSolicitudes.soloAsignadasAMi}
                onClick={() =>
                  setFiltrosSolicitudes((prev) => ({
                    ...prev,
                    soloAsignadasAMi: !prev.soloAsignadasAMi,
                    page: 0,
                  }))
                }
              >
                Solo asignadas a mí
              </FilterChip>
            )}

            {isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-w-[260px]">
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
                  className={`${inputBaseClass} !min-h-[40px] !py-2 text-[14px]`}
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
                  className={`${inputBaseClass} !min-h-[40px] !py-2 text-[14px]`}
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
                  className={`${inputBaseClass} !min-h-[40px] !py-2 text-[14px]`}
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
                  className={`${inputBaseClass} !min-h-[40px] !py-2 text-[14px]`}
                />
              </div>
            )}

            {hayFiltros && (
              <GhostButton onClick={limpiarFiltros}>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Quitar filtros</span>
              </GhostButton>
            )}
          </div>
        )}
      </SurfaceCard>

      {/* Results Table (Desktop) + Stacked Cards (Mobile) */}
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
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Nueva solicitud</span>
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop / Tablet Data Table */}
          <SurfaceCard padded={false} className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)]/70 border-b border-[var(--border-subtle)] text-[12px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
                    <th className="py-3.5 pl-5 pr-4 font-semibold">Código</th>
                    <th className="py-3.5 px-4 font-semibold">Recurso</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    {isAdmin && (
                      <>
                        <th className="py-3.5 px-4 font-semibold">Solicitante</th>
                        <th className="py-3.5 px-4 font-semibold">Técnico</th>
                      </>
                    )}
                    {!isAdmin && (
                      <th className="py-3.5 px-4 font-semibold">Trabajo realizado</th>
                    )}
                    <th className="py-3.5 pl-4 pr-5 text-right font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[14px]">
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
                        className="group hover:bg-[var(--bg-subtle)]/60 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="py-4 pl-5 pr-4 whitespace-nowrap">
                          <a
                            href={`/solicitudes/${sol.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/solicitudes/${sol.id}`);
                            }}
                            className="font-mono-code text-[13px] font-semibold px-2 py-1 rounded-[6px] bg-[var(--bg-subtle)] text-[var(--text-primary)] group-hover:text-[var(--brand-primary-text)] transition-colors"
                          >
                            {sol.codigo}
                          </a>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-[var(--text-primary)]">
                            {rec?.nombre ?? 'Recurso'}
                          </div>
                          <div className="text-[12px] font-mono-code text-[var(--text-muted)] mt-0.5">
                            {rec?.codigo}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <EstadoLabel estado={sol.estado} />
                        </td>
                        {isAdmin ? (
                          <>
                            <td className="py-4 px-4 text-[var(--text-secondary)]">
                              {solEmp
                                ? `${solEmp.nombres} ${solEmp.apellidos}${
                                    !solEmp.activo ? ' (inactivo)' : ''
                                  }`
                                : '—'}
                            </td>
                            <td className="py-4 px-4 text-[var(--text-secondary)]">
                              {tecEmp ? (
                                `${tecEmp.nombres} ${tecEmp.apellidos}`
                              ) : (
                                <span className="text-[var(--text-muted)]">Sin asignar</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <td className="py-4 px-4 text-[var(--text-secondary)] max-w-[320px] truncate">
                            {sol.trabajoRealizado ||
                              sol.motivoCierre ||
                              'Pendiente de registro técnico'}
                          </td>
                        )}
                        <td className="py-4 pl-4 pr-5 text-right font-mono-code text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                          {formatearFecha(sol.creadaEn)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SurfaceCard>

          {/* Mobile Card List (< 768px) */}
          <div className="md:hidden space-y-3">
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
                <button
                  key={sol.id}
                  type="button"
                  onClick={() => navigate(`/solicitudes/${sol.id}`)}
                  className="w-full text-left surface-card p-4 space-y-3 hover:border-[var(--border-strong)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code text-[12px] font-semibold px-2 py-0.5 rounded-[6px] bg-[var(--bg-subtle)] text-[var(--brand-primary-text)]">
                      {sol.codigo}
                    </span>
                    <EstadoLabel estado={sol.estado} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                      {rec?.nombre ?? 'Recurso'}
                    </p>
                    <p className="text-[12px] font-mono-code text-[var(--text-muted)]">
                      {rec?.codigo}
                    </p>
                  </div>
                  <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
                    <span className="truncate">
                      {isAdmin
                        ? `${solEmp ? `${solEmp.nombres} ${solEmp.apellidos}` : '—'} · ${
                            tecEmp ? `${tecEmp.nombres} ${tecEmp.apellidos}` : 'Sin asignar'
                          }`
                        : sol.trabajoRealizado ||
                          sol.motivoCierre ||
                          'Pendiente de registro técnico'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 font-mono-code text-[var(--text-muted)]">
                      <span>{formatearFecha(sol.creadaEn)}</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination (20 per page, HU-08) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-[14px]">
              <span className="font-mono-code text-[13px] text-[var(--text-muted)]">
                Página {currentPage + 1} de {totalPages}
              </span>
              <div className="flex items-center gap-2.5">
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
