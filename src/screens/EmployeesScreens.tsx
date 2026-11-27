import React, { useState } from 'react';
import { Plus, Search, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AlertBanner,
  EmptyState,
  FieldError,
  FieldLabel,
  FilterChip,
  GhostButton,
  inputBaseClass,
  ModalDialog,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SurfaceCard,
} from '../components/CommonUI';
import { ErrorScreen } from './ErrorScreen';
import { Solicitud } from '../types/domain';

export function EmployeesListScreen() {
  const {
    isAdmin,
    empleados,
    usuarios,
    asignaciones,
    navigate,
    toggleTecnicoEmpleado,
  } = useApp();

  const [filtroSoloTecnicos, setFiltroSoloTecnicos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [alertaTecnico, setAlertaTecnico] = useState<{
    empleadoNombre: string;
    mensaje: string;
    solicitudes: Solicitud[];
  } | null>(null);

  if (!isAdmin) return <ErrorScreen tipo="sin-permiso" />;

  const filtrados = empleados.filter((e) => {
    if (filtroSoloTecnicos && !e.esTecnico) return false;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      return (
        `${e.nombres} ${e.apellidos}`.toLowerCase().includes(q) ||
        e.documento.toLowerCase().includes(q) ||
        e.correo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleTecnico = (empId: number, nombre: string) => {
    const res = toggleTecnicoEmpleado(empId);
    if (!res.ok && res.data?.solicitudesActivas) {
      setAlertaTecnico({
        empleadoNombre: nombre,
        mensaje: res.error ?? 'No se puede desmarcar mientras tenga solicitudes activas.',
        solicitudes: res.data.solicitudesActivas,
      });
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Administración · M1 y M4"
        title="Empleados"
        description="Gestione los trabajadores de la empresa e identifique quiénes desempeñan funciones técnicas."
        actions={
          <PrimaryButton onClick={() => navigate('/admin/empleados/nuevo')}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nuevo empleado</span>
          </PrimaryButton>
        }
      />

      {/* Filter Bar */}
      <SurfaceCard className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={!filtroSoloTecnicos}
            onClick={() => setFiltroSoloTecnicos(false)}
          >
            Todos ({empleados.length})
          </FilterChip>
          <FilterChip
            active={filtroSoloTecnicos}
            onClick={() => setFiltroSoloTecnicos(true)}
          >
            Solo técnicos ({empleados.filter((e) => e.esTecnico && e.activo).length})
          </FilterChip>
        </div>

        <div className="relative sm:max-w-[320px] w-full">
          <Search
            className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Buscar empleado"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, documento o correo…"
            className={`${inputBaseClass} !min-h-[40px] !py-2 pl-10 text-[14px]`}
          />
        </div>
      </SurfaceCard>

      {filtrados.length === 0 ? (
        <EmptyState
          title="No hay empleados registrados"
          description="No existen registros que coincidan con el filtro aplicado."
          action={
            <PrimaryButton onClick={() => navigate('/admin/empleados/nuevo')}>
              Registrar primer empleado
            </PrimaryButton>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <SurfaceCard padded={false} className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)]/70 border-b border-[var(--border-subtle)] text-[12px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
                    <th className="py-3.5 pl-5 pr-4 font-semibold">Nombre</th>
                    <th className="py-3.5 px-4 font-semibold">Documento</th>
                    <th className="py-3.5 px-4 font-semibold">Cargo</th>
                    <th className="py-3.5 px-4 font-semibold">Función técnica</th>
                    <th className="py-3.5 px-4 font-semibold">Usuario</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    <th className="py-3.5 pl-4 pr-5 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[14px]">
                  {filtrados.map((emp) => {
                    const usr = usuarios.find((u) => u.empleadoId === emp.id);
                    const activasCount = asignaciones.filter(
                      (a) => a.vigente && a.tecnicoId === emp.id
                    ).length;

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-[var(--bg-subtle)]/50 transition-colors"
                      >
                        <td className="py-4 pl-5 pr-4">
                          <div className="font-semibold text-[var(--text-primary)]">
                            {emp.nombres} {emp.apellidos}
                          </div>
                          <div className="text-[12px] font-mono-code text-[var(--text-muted)] mt-0.5">
                            {emp.correo}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono-code text-[13px] text-[var(--text-secondary)]">
                          {emp.documento}
                        </td>
                        <td className="py-4 px-4 text-[var(--text-secondary)]">{emp.cargo}</td>
                        <td className="py-4 px-4">
                          {emp.esTecnico ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-border)] text-[var(--brand-primary-text)] text-[12px] font-semibold whitespace-nowrap">
                              <Wrench className="w-3 h-3" aria-hidden="true" />
                              <span>
                                Técnico activo
                                {activasCount > 0 ? ` · ${activasCount} asignada(s)` : ''}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[13px]">No</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[13px]">
                          {usr ? (
                            <span className="px-2 py-0.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                              {usr.perfil}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/usuarios?empleadoId=${emp.id}`)}
                              className="text-[var(--brand-primary-text)] font-semibold hover:underline cursor-pointer"
                            >
                              Crear usuario
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[13px]">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] border text-[12px] font-semibold ${
                              emp.activo
                                ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                                : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`w-1.5 h-1.5 rounded-full ${
                                emp.activo
                                  ? 'bg-[var(--status-success-text)]'
                                  : 'bg-[var(--text-muted)]'
                              }`}
                            />
                            {emp.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <GhostButton
                              onClick={() =>
                                handleToggleTecnico(emp.id, `${emp.nombres} ${emp.apellidos}`)
                              }
                            >
                              {emp.esTecnico ? 'Quitar técnico' : 'Marcar técnico'}
                            </GhostButton>
                            <GhostButton onClick={() => navigate(`/admin/empleados/${emp.id}`)}>
                              Editar
                            </GhostButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SurfaceCard>

          {/* Mobile / Tablet Cards */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtrados.map((emp) => {
              const usr = usuarios.find((u) => u.empleadoId === emp.id);
              const activasCount = asignaciones.filter(
                (a) => a.vigente && a.tecnicoId === emp.id
              ).length;

              return (
                <SurfaceCard key={emp.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold text-[var(--text-primary)] truncate">
                        {emp.nombres} {emp.apellidos}
                      </p>
                      <p className="text-[12px] font-mono-code text-[var(--text-muted)] truncate">
                        {emp.correo}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-[6px] border text-[11px] font-semibold shrink-0 ${
                        emp.activo
                          ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                      }`}
                    >
                      {emp.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="text-[13px] space-y-1.5 text-[var(--text-secondary)]">
                    <p>
                      <span className="text-[var(--text-muted)]">Documento:</span>{' '}
                      <span className="font-mono-code">{emp.documento}</span>
                    </p>
                    <p>
                      <span className="text-[var(--text-muted)]">Cargo:</span> {emp.cargo}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {emp.esTecnico && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-border)] text-[var(--brand-primary-text)] text-[12px] font-semibold">
                          Técnico activo{activasCount > 0 ? ` · ${activasCount} asignada(s)` : ''}
                        </span>
                      )}
                      {usr ? (
                        <span className="px-2 py-0.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[12px]">
                          {usr.perfil}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/usuarios?empleadoId=${emp.id}`)}
                          className="text-[var(--brand-primary-text)] text-[12px] font-semibold hover:underline cursor-pointer"
                        >
                          Crear usuario
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                    <OutlineButton
                      onClick={() =>
                        handleToggleTecnico(emp.id, `${emp.nombres} ${emp.apellidos}`)
                      }
                      className="!min-h-[38px] !py-1.5 !px-3 !text-[13px]"
                    >
                      {emp.esTecnico ? 'Quitar técnico' : 'Marcar técnico'}
                    </OutlineButton>
                    <GhostButton onClick={() => navigate(`/admin/empleados/${emp.id}`)}>
                      Editar
                    </GhostButton>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        </>
      )}

      {/* RS-01 Guard modal when technician still has active requests */}
      <ModalDialog
        open={!!alertaTecnico}
        title="Reasignación requerida"
        onClose={() => setAlertaTecnico(null)}
      >
        {alertaTecnico && (
          <div className="space-y-4">
            <AlertBanner variant="warning">{alertaTecnico.mensaje}</AlertBanner>
            <ul className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-[12px] overflow-hidden list-none p-0">
              {alertaTecnico.solicitudes.map((s) => (
                <li
                  key={s.id}
                  className="px-4 py-3 flex items-center justify-between gap-4 text-[14px] bg-[var(--bg-canvas)]/50"
                >
                  <span className="font-mono-code font-medium text-[var(--text-primary)]">
                    {s.codigo} · {s.estado}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAlertaTecnico(null);
                      navigate(`/solicitudes/${s.id}`);
                    }}
                    className="text-[var(--brand-primary-text)] font-semibold hover:underline cursor-pointer"
                  >
                    Abrir solicitud
                  </button>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <OutlineButton onClick={() => setAlertaTecnico(null)}>Entendido</OutlineButton>
            </div>
          </div>
        )}
      </ModalDialog>
    </section>
  );
}

export function EmployeeFormScreen({ empleadoId }: { empleadoId?: number }) {
  const { isAdmin, empleados, usuarios, guardarEmpleado, navigate } = useApp();

  const existing = empleadoId ? empleados.find((e) => e.id === empleadoId) : undefined;

  const [documento, setDocumento] = useState(existing?.documento ?? '');
  const [nombres, setNombres] = useState(existing?.nombres ?? '');
  const [apellidos, setApellidos] = useState(existing?.apellidos ?? '');
  const [correo, setCorreo] = useState(existing?.correo ?? '');
  const [cargo, setCargo] = useState(existing?.cargo ?? '');
  const [esTecnico, setEsTecnico] = useState(existing?.esTecnico ?? false);
  const [activo, setActivo] = useState(existing?.activo ?? true);
  const [errorInfo, setErrorInfo] = useState<{ campo?: string; mensaje: string } | null>(null);

  if (!isAdmin) return <ErrorScreen tipo="sin-permiso" />;
  if (empleadoId && !existing) return <ErrorScreen tipo="no-encontrado" />;

  const usuarioAsociado = existing
    ? usuarios.find((u) => u.empleadoId === existing.id)
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    const res = guardarEmpleado({
      id: existing?.id,
      documento,
      nombres,
      apellidos,
      correo,
      cargo,
      esTecnico,
      activo,
    });
    if (!res.ok) {
      setErrorInfo({ campo: res.campo, mensaje: res.error ?? 'Error al guardar.' });
      return;
    }
    navigate('/admin/empleados');
  };

  return (
    <section className="max-w-[720px] space-y-6">
      <PageHeader
        backAction={
          <GhostButton onClick={() => navigate('/admin/empleados')} className="-ml-2.5">
            ← Volver a empleados
          </GhostButton>
        }
        eyebrow="Administración · M1 y M4"
        title={existing ? 'Editar empleado' : 'Nuevo empleado'}
      />

      {errorInfo && !errorInfo.campo && (
        <AlertBanner variant="error">{errorInfo.mensaje}</AlertBanner>
      )}

      <SurfaceCard>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="emp-doc" required>
                Documento de identidad
              </FieldLabel>
              <input
                id="emp-doc"
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className={inputBaseClass}
              />
              <FieldError message={errorInfo?.campo === 'documento' ? errorInfo.mensaje : null} />
            </div>

            <div>
              <FieldLabel htmlFor="emp-cargo" required>
                Cargo
              </FieldLabel>
              <input
                id="emp-cargo"
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className={inputBaseClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="emp-nombres" required>
                Nombres
              </FieldLabel>
              <input
                id="emp-nombres"
                type="text"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                className={inputBaseClass}
              />
            </div>

            <div>
              <FieldLabel htmlFor="emp-apellidos" required>
                Apellidos
              </FieldLabel>
              <input
                id="emp-apellidos"
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className={inputBaseClass}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="emp-correo" required>
              Correo corporativo
            </FieldLabel>
            <input
              id="emp-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={inputBaseClass}
            />
            <FieldError message={errorInfo?.campo === 'correo' ? errorInfo.mensaje : null} />
          </div>

          <div className="space-y-2.5 pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 cursor-pointer hover:border-[var(--border-default)] transition-colors">
              <input
                type="checkbox"
                checked={esTecnico}
                onChange={(e) => setEsTecnico(e.target.checked)}
                className="w-4 h-4 accent-[var(--brand-primary)]"
              />
              <span className="text-[14px] font-medium text-[var(--text-primary)]">
                Es técnico (habilitado para recibir asignaciones de mantenimiento)
              </span>
            </label>

            {existing && (
              <label className="flex items-center gap-3 p-3.5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 cursor-pointer hover:border-[var(--border-default)] transition-colors">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 accent-[var(--brand-primary)]"
                />
                <span className="text-[14px] font-medium text-[var(--text-primary)]">
                  Empleado activo
                </span>
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <PrimaryButton type="submit">Guardar empleado</PrimaryButton>
            <OutlineButton onClick={() => navigate('/admin/empleados')}>Cancelar</OutlineButton>
            {existing && !usuarioAsociado && (
              <GhostButton onClick={() => navigate(`/admin/usuarios?empleadoId=${existing.id}`)}>
                Crear usuario para este empleado →
              </GhostButton>
            )}
          </div>
        </form>
      </SurfaceCard>
    </section>
  );
}
