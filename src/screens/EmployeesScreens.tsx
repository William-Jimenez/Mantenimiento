import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  EmptyState,
  FieldError,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  ModalDialog,
  OutlineButton,
  PrimaryButton,
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
    <section className="space-y-[36px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[24px]">
        <div className="space-y-[12px]">
          <p className="nav-label text-saffron-spark">Administración · M1 y M4</p>
          <h1 className="text-[42px] sm:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
            Empleados
          </h1>
          <p className="body-ultralight text-silver-mist max-w-[580px]">
            Gestione los trabajadores de la empresa e identifique quiénes desempeñan funciones técnicas.
          </p>
        </div>
        <PrimaryButton onClick={() => navigate('/admin/empleados/nuevo')}>
          Nuevo empleado
        </PrimaryButton>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[18px] pb-[18px] border-b border-white/12">
        <div className="flex items-center gap-[12px]">
          <button
            type="button"
            onClick={() => setFiltroSoloTecnicos(false)}
            className={`px-[14px] py-[8px] rounded-[24px] text-[14px] cursor-pointer transition-colors ${
              !filtroSoloTecnicos
                ? 'bg-electric-iris text-bone-white'
                : 'text-ash-gray hover:text-bone-white border border-white/15'
            }`}
          >
            Todos ({empleados.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroSoloTecnicos(true)}
            className={`px-[14px] py-[8px] rounded-[24px] text-[14px] cursor-pointer transition-colors ${
              filtroSoloTecnicos
                ? 'bg-electric-iris text-bone-white'
                : 'text-ash-gray hover:text-bone-white border border-white/15'
            }`}
          >
            Solo técnicos ({empleados.filter((e) => e.esTecnico && e.activo).length})
          </button>
        </div>

        <input
          type="search"
          aria-label="Buscar empleado"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, documento o correo…"
          className={`${inputBaseClass} sm:max-w-[320px]`}
        />
      </div>

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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                <th className="py-[12px] pr-[18px] font-semibold">Nombre</th>
                <th className="py-[12px] pr-[18px] font-semibold">Documento</th>
                <th className="py-[12px] pr-[18px] font-semibold">Cargo</th>
                <th className="py-[12px] pr-[18px] font-semibold">Función técnica</th>
                <th className="py-[12px] pr-[18px] font-semibold">Usuario</th>
                <th className="py-[12px] pr-[18px] font-semibold">Estado</th>
                <th className="py-[12px] text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-[15px]">
              {filtrados.map((emp) => {
                const usr = usuarios.find((u) => u.empleadoId === emp.id);
                const activasCount = asignaciones.filter(
                  (a) => a.vigente && a.tecnicoId === emp.id
                ).length;

                return (
                  <tr key={emp.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-[16px] pr-[18px]">
                      <div className="text-bone-white">
                        {emp.nombres} {emp.apellidos}
                      </div>
                      <div className="text-[13px] text-ash-gray">{emp.correo}</div>
                    </td>
                    <td className="py-[16px] pr-[18px] tabular-nums text-silver-mist">
                      {emp.documento}
                    </td>
                    <td className="py-[16px] pr-[18px] text-silver-mist">{emp.cargo}</td>
                    <td className="py-[16px] pr-[18px]">
                      {emp.esTecnico ? (
                        <span className="text-electric-iris text-[14px]">
                          Técnico activo{activasCount > 0 ? ` · ${activasCount} asignada(s)` : ''}
                        </span>
                      ) : (
                        <span className="text-ash-gray text-[14px]">No</span>
                      )}
                    </td>
                    <td className="py-[16px] pr-[18px] text-[14px]">
                      {usr ? (
                        <span className="text-silver-mist">{usr.perfil}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/usuarios?empleadoId=${emp.id}`)}
                          className="text-saffron-spark hover:underline cursor-pointer"
                        >
                          Crear usuario
                        </button>
                      )}
                    </td>
                    <td className="py-[16px] pr-[18px] text-[14px]">
                      <span className={emp.activo ? 'text-deep-verdant' : 'text-ash-gray'}>
                        {emp.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-[16px] text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-[12px]">
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
      )}

      {/* RS-01 Guard modal when technician still has active requests */}
      <ModalDialog
        open={!!alertaTecnico}
        title="Reasignación requerida"
        onClose={() => setAlertaTecnico(null)}
      >
        {alertaTecnico && (
          <div className="space-y-[18px]">
            <p className="body-ultralight text-silver-mist">{alertaTecnico.mensaje}</p>
            <ul className="divide-y divide-white/10 border-t border-b border-white/10">
              {alertaTecnico.solicitudes.map((s) => (
                <li
                  key={s.id}
                  className="py-[12px] flex items-center justify-between gap-4 text-[14px]"
                >
                  <span className="tabular-nums text-bone-white">
                    {s.codigo} · {s.estado}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAlertaTecnico(null);
                      navigate(`/solicitudes/${s.id}`);
                    }}
                    className="text-saffron-spark hover:underline cursor-pointer"
                  >
                    Abrir solicitud
                  </button>
                </li>
              ))}
            </ul>
            <div className="pt-[6px]">
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
    <section className="max-w-[680px] space-y-[36px]">
      <div className="space-y-[12px]">
        <GhostButton onClick={() => navigate('/admin/empleados')}>
          ← Volver a empleados
        </GhostButton>
        <h1 className="text-[42px] leading-[1.1] tracking-[-1.68px] text-bone-white">
          {existing ? 'Editar empleado' : 'Nuevo empleado'}
        </h1>
      </div>

      {errorInfo && !errorInfo.campo && (
        <div role="alert" className="border border-saffron-spark/60 rounded-[12px] px-[16px] py-[12px] text-[14px] text-saffron-spark">
          {errorInfo.mensaje}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-[24px]" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px]">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px]">
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

        <div className="space-y-[12px] pt-[6px]">
          <label className="flex items-center gap-[12px] cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={esTecnico}
              onChange={(e) => setEsTecnico(e.target.checked)}
              className="w-5 h-5 accent-electric-iris"
            />
            <span className="text-[16px] text-bone-white">
              Es técnico (habilitado para recibir asignaciones de mantenimiento)
            </span>
          </label>

          {existing && (
            <label className="flex items-center gap-[12px] cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-5 h-5 accent-electric-iris"
              />
              <span className="text-[16px] text-bone-white">Empleado activo</span>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-[18px] pt-[12px]">
          <PrimaryButton type="submit">Guardar empleado</PrimaryButton>
          <OutlineButton onClick={() => navigate('/admin/empleados')}>Cancelar</OutlineButton>
          {existing && !usuarioAsociado && (
            <GhostButton onClick={() => navigate(`/admin/usuarios?empleadoId=${existing.id}`)}>
              Crear usuario para este empleado →
            </GhostButton>
          )}
        </div>
      </form>
    </section>
  );
}
