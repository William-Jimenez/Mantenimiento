import React from 'react';
import {
  ArrowRight,
  ChevronRight,
  Cpu,
  Plus,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
  Wrench,
} from 'lucide-react';
import { useApp, useSolicitudesVisibles } from '../context/AppContext';
import { ESTADOS_ORDEN, formatearFecha } from '../services/domainRules';
import {
  EmptyState,
  EstadoLabel,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SurfaceCard,
} from '../components/CommonUI';
import { EstadoNombre } from '../types/domain';

const STATE_ACCENT_BAR: Record<EstadoNombre, string> = {
  Pendiente: 'bg-[var(--brand-accent)]',
  Asignada: 'bg-[var(--status-info)]',
  'En proceso': 'bg-[var(--ai-accent)]',
  Finalizada: 'bg-[var(--status-success-text)]',
  Cancelada: 'bg-[var(--border-strong)]',
  Rechazada: 'bg-[var(--status-danger)]',
};

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

  const adminModules = [
    {
      code: 'M1 · M4',
      title: 'Empleados',
      desc: 'Altas, edición y marca de personal técnico.',
      path: '/admin/empleados',
      Icon: Users,
      iconBg: 'bg-[var(--brand-primary-soft)] border-[var(--brand-primary-border)] text-[var(--brand-primary-text)]',
    },
    {
      code: 'M1',
      title: 'Usuarios',
      desc: 'Perfiles, activación y restablecimiento de claves.',
      path: '/admin/usuarios',
      Icon: ShieldCheck,
      iconBg: 'bg-[var(--ai-accent-soft)] border-[var(--ai-accent-border)] text-[var(--ai-accent-text)]',
    },
    {
      code: 'M2',
      title: 'Recursos',
      desc: 'Equipos, instalaciones, maquinaria y herramientas.',
      path: '/admin/recursos',
      Icon: Cpu,
      iconBg: 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]',
    },
    {
      code: 'SU-06',
      title: 'Categorías',
      desc: 'Catálogo de clasificación de daños.',
      path: '/admin/categorias',
      Icon: Tags,
      iconBg: 'bg-[var(--status-warning-soft)] border-[var(--status-warning-border)] text-[var(--status-warning-text)]',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Executive Role Header */}
      <PageHeader
        eyebrow={
          isAdmin
            ? 'Panel de Administración'
            : isTecnico
            ? 'Panel de Empleado · Técnico de Mantenimiento'
            : 'Portal de Cliente · Solicitudes de Mantenimiento'
        }
        title={`Hola, ${currentEmpleado?.nombres}.`}
        description={
          isAdmin
            ? 'Gestione usuarios y roles, supervise todas las solicitudes de mantenimiento de la empresa y asigne técnicos responsables.'
            : isTecnico
            ? 'Consulte las solicitudes asignadas a su cargo, actualice su estado operativo y registre el trabajo de reparación realizado.'
            : 'Solicite mantenimiento desde la página web y consulte en tiempo real el estado de sus propias solicitudes.'
        }
        actions={
          isTecnico ? (
            <PrimaryButton onClick={() => navigate('/tecnico/solicitudes')}>
              <Wrench className="w-4 h-4" aria-hidden="true" />
              <span>Ver mis solicitudes asignadas</span>
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => navigate('/solicitudes/nueva')}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nueva solicitud</span>
            </PrimaryButton>
          )
        }
      />

      {/* Operational KPI Counters by State */}
      <section aria-labelledby="resumen-estados-titulo" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="resumen-estados-titulo"
            className="text-[19px] sm:text-[21px] font-bold tracking-[-0.015em] text-[var(--text-primary)]"
          >
            {isAdmin
              ? 'Todas las solicitudes por estado'
              : isTecnico
              ? 'Mis solicitudes asignadas por estado'
              : 'Estado de mis solicitudes'}
          </h2>
          <GhostButton onClick={() => irAListadoFiltrado()}>
            <span>Ver listado completo →</span>
          </GhostButton>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {ESTADOS_ORDEN.map((estado) => {
            const count = contarPorEstado(estado);
            return (
              <button
                key={estado}
                type="button"
                onClick={() => irAListadoFiltrado(estado)}
                className="group relative overflow-hidden surface-card text-left p-4 hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-[border-color,transform,box-shadow] duration-150 ease-out cursor-pointer flex flex-col justify-between gap-4 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2"
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-0 left-0 right-0 h-[3px] opacity-85 group-hover:opacity-100 transition-opacity ${STATE_ACCENT_BAR[estado]}`}
                />
                <div className="pt-0.5">
                  <EstadoLabel estado={estado} />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <span className="font-display text-[32px] sm:text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--text-primary)]">
                    {count}
                  </span>
                  <ArrowRight
                    className="w-4 h-4 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-[opacity,transform] duration-150"
                    aria-hidden="true"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Empleado Técnico: Asignadas a mí */}
      {isTecnico && (
        <section aria-labelledby="asignadas-titulo" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="asignadas-titulo"
              className="text-[19px] sm:text-[21px] font-bold tracking-[-0.015em] text-[var(--text-primary)]"
            >
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
            <SurfaceCard padded={false} className="overflow-hidden divide-y divide-[var(--border-subtle)]">
              {asignadasAMi.map((sol) => {
                const rec = recursos.find((r) => r.id === sol.recursoId);
                return (
                  <button
                    key={sol.id}
                    type="button"
                    onClick={() => navigate(`/solicitudes/${sol.id}`)}
                    className="group w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-subtle)]/70 transition-colors duration-150 cursor-pointer"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono-code text-[13px] font-semibold px-2 py-0.5 rounded-[6px] bg-[var(--bg-subtle)] text-[var(--brand-primary-text)]">
                          {sol.codigo}
                        </span>
                        <EstadoLabel estado={sol.estado} />
                      </div>
                      <p className="text-[15px] text-[var(--text-primary)] font-medium truncate">
                        {rec?.nombre ?? 'Recurso'}{' '}
                        <span className="text-[var(--text-secondary)] font-normal">
                          — {sol.descripcion.slice(0, 95)}
                          {sol.descripcion.length > 95 ? '…' : ''}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] font-mono-code text-[var(--text-muted)] whitespace-nowrap">
                        {formatearFecha(sol.actualizadaEn)}
                      </span>
                      <ChevronRight
                        className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-[color,transform]"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                );
              })}
            </SurfaceCard>
          )}
        </section>
      )}

      {/* Admin quick links to M1, M2, M4, SU-06 + AI Toggle */}
      {isAdmin && (
        <section aria-labelledby="admin-accesos-titulo" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2
              id="admin-accesos-titulo"
              className="text-[19px] sm:text-[21px] font-bold tracking-[-0.015em] text-[var(--text-primary)]"
            >
              Administración de plataforma
            </h2>
            <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-[10px] border border-[var(--ai-accent-border)] bg-[var(--ai-accent-soft)] text-[13px] font-medium text-[var(--text-primary)] cursor-pointer select-none">
              <Sparkles className="w-4 h-4 text-[var(--ai-accent-text)] shrink-0" aria-hidden="true" />
              <input
                type="checkbox"
                checked={iaHabilitada}
                onChange={(e) => setIaHabilitada(e.target.checked)}
                className="w-4 h-4 accent-[var(--ai-accent)] cursor-pointer"
              />
              <span>Servicio de IA (Fase 5) habilitado</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {adminModules.map(({ code, title, desc, path, Icon, iconBg }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className="group surface-card text-left p-5 hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-[border-color,transform,box-shadow] duration-150 ease-out cursor-pointer flex flex-col justify-between gap-4 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className={`w-10 h-10 rounded-[11px] border flex items-center justify-center shrink-0 ${iconBg}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-mono-code text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                    {code}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[18px] font-bold tracking-[-0.015em] text-[var(--text-primary)] group-hover:text-[var(--brand-primary-text)] transition-colors">
                      {title}
                    </p>
                    <ChevronRight
                      className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary-text)] group-hover:translate-x-0.5 transition-[color,transform]"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                    {desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 5 Most Recent Requests */}
      <section aria-labelledby="recientes-titulo" className="space-y-4">
        <h2
          id="recientes-titulo"
          className="text-[19px] sm:text-[21px] font-bold tracking-[-0.015em] text-[var(--text-primary)]"
        >
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
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Nueva solicitud</span>
                </PrimaryButton>
              ) : undefined
            }
          />
        ) : (
          <SurfaceCard padded={false} className="overflow-hidden divide-y divide-[var(--border-subtle)]">
            {recientes.map((sol) => {
              const rec = recursos.find((r) => r.id === sol.recursoId);
              const solEmp = !isCliente
                ? empleados.find((e) => e.id === sol.solicitanteId)
                : undefined;
              return (
                <button
                  key={sol.id}
                  type="button"
                  onClick={() => navigate(`/solicitudes/${sol.id}`)}
                  className="group w-full text-left px-5 py-4 hover:bg-[var(--bg-subtle)]/70 transition-colors duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
                      <span className="font-mono-code font-semibold px-2 py-0.5 rounded-[6px] bg-[var(--bg-subtle)] text-[var(--text-primary)] group-hover:text-[var(--brand-primary-text)] transition-colors">
                        {sol.codigo}
                      </span>
                      <EstadoLabel estado={sol.estado} />
                      {isAdmin && solEmp && (
                        <span className="text-[var(--text-muted)] text-[13px]">
                          {solEmp.nombres} {solEmp.apellidos}
                          {!solEmp.activo ? ' (inactivo)' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] text-[var(--text-secondary)] leading-[1.45] line-clamp-2 sm:line-clamp-1">
                      <span className="text-[var(--text-primary)] font-semibold">
                        {rec?.nombre ?? 'Recurso'}
                      </span>
                      {' — '}
                      {sol.descripcion.slice(0, 100)}
                      {sol.descripcion.length > 100 ? '…' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-mono-code text-[var(--text-muted)] whitespace-nowrap">
                      {formatearFecha(sol.creadaEn)}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-[color,transform]"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              );
            })}
          </SurfaceCard>
        )}
      </section>
    </div>
  );
}
