import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  EmptyState,
  FieldLabel,
  GhostButton,
  inputBaseClass,
  ModalDialog,
  OutlineButton,
  PrimaryButton,
} from '../components/CommonUI';
import { ErrorScreen } from './ErrorScreen';
import { PerfilUsuario } from '../types/domain';
import { formatearFecha } from '../services/domainRules';

export function UsersScreen() {
  const {
    isAdmin,
    empleados,
    usuarios,
    crearUsuario,
    toggleUsuarioActivo,
    cambiarPerfilUsuario,
    restablecerPasswordUsuario,
  } = useApp();

  const initialEmpParam = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('empleadoId');
    return raw ? Number(raw) : null;
  }, []);

  const empleadosSinUsuario = useMemo(
    () =>
      empleados.filter(
        (e) => e.activo && !usuarios.some((u) => u.empleadoId === e.id)
      ),
    [empleados, usuarios]
  );

  const [crearOpen, setCrearOpen] = useState(!!initialEmpParam);
  const [selectedEmpId, setSelectedEmpId] = useState<number>(
    initialEmpParam ?? empleadosSinUsuario[0]?.id ?? 0
  );
  const [perfilNuevo, setPerfilNuevo] = useState<PerfilUsuario>('EMPLEADO');
  const [errorRegla, setErrorRegla] = useState<string | null>(null);
  const [passwordUnica, setPasswordUnica] = useState<{
    empleado: string;
    password: string;
    motivo: string;
  } | null>(null);

  if (!isAdmin) return <ErrorScreen tipo="sin-permiso" />;

  const handleCrearUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorRegla(null);
    if (!selectedEmpId) return;
    const emp = empleados.find((em) => em.id === selectedEmpId);
    const res = crearUsuario(selectedEmpId, perfilNuevo);
    if (!res.ok) {
      setErrorRegla(res.error ?? 'No se pudo crear el usuario.');
      return;
    }
    setCrearOpen(false);
    if (res.data) {
      setPasswordUnica({
        empleado: emp ? `${emp.nombres} ${emp.apellidos}` : 'Usuario',
        password: res.data.passwordTemporal,
        motivo: 'Usuario creado',
      });
    }
  };

  const handleToggleActivo = (usuarioId: number) => {
    setErrorRegla(null);
    const res = toggleUsuarioActivo(usuarioId);
    if (!res.ok && res.error) setErrorRegla(res.error);
  };

  const handleCambiarPerfil = (usuarioId: number, perfil: PerfilUsuario) => {
    setErrorRegla(null);
    const res = cambiarPerfilUsuario(usuarioId, perfil);
    if (!res.ok && res.error) setErrorRegla(res.error);
  };

  const handleResetPassword = (usuarioId: number, nombre: string) => {
    setErrorRegla(null);
    const res = restablecerPasswordUsuario(usuarioId);
    if (!res.ok) {
      if (res.error) setErrorRegla(res.error);
      return;
    }
    if (res.data) {
      setPasswordUnica({
        empleado: nombre,
        password: res.data.passwordTemporal,
        motivo: 'Contraseña restablecida',
      });
    }
  };

  return (
    <section className="space-y-[36px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[24px]">
        <div className="space-y-[12px]">
          <p className="nav-label text-saffron-spark">Administración · M1</p>
          <h1 className="text-[42px] sm:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
            Usuarios y perfiles
          </h1>
          <p className="body-ultralight text-silver-mist max-w-[580px]">
            Cada usuario pertenece a un empleado y tiene perfil Administrador o Empleado. El sistema impide desactivar o degradar al último Administrador activo.
          </p>
        </div>

        <PrimaryButton
          onClick={() => {
            setSelectedEmpId(empleadosSinUsuario[0]?.id ?? 0);
            setCrearOpen(true);
          }}
          disabled={empleadosSinUsuario.length === 0}
        >
          Crear usuario
        </PrimaryButton>
      </div>

      {errorRegla && (
        <div
          role="alert"
          className="border border-saffron-spark/70 rounded-[12px] px-[16px] py-[12px] text-[14px] text-saffron-spark"
        >
          {errorRegla}
        </div>
      )}

      {usuarios.length === 0 ? (
        <EmptyState
          title="No hay usuarios registrados"
          description="Asocie un usuario a un empleado activo para habilitar el inicio de sesión."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                <th className="py-[12px] pr-[18px] font-semibold">Empleado</th>
                <th className="py-[12px] pr-[18px] font-semibold">Perfil</th>
                <th className="py-[12px] pr-[18px] font-semibold">Estado</th>
                <th className="py-[12px] pr-[18px] font-semibold">Último acceso</th>
                <th className="py-[12px] text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-[15px]">
              {usuarios.map((usr) => {
                const emp = empleados.find((e) => e.id === usr.empleadoId);
                const nombre = emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${usr.empleadoId}`;

                return (
                  <tr key={usr.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-[16px] pr-[18px]">
                      <div className="text-bone-white">{nombre}</div>
                      <div className="text-[13px] text-ash-gray">{emp?.correo ?? '—'}</div>
                    </td>
                    <td className="py-[16px] pr-[18px]">
                      <select
                        aria-label={`Perfil de ${nombre}`}
                        value={usr.perfil}
                        onChange={(e) =>
                          handleCambiarPerfil(usr.id, e.target.value as PerfilUsuario)
                        }
                        className="bg-void text-bone-white border border-white/20 rounded-[12px] px-[12px] py-[6px] text-[14px]"
                      >
                        <option value="EMPLEADO">Empleado</option>
                        <option value="ADMINISTRADOR">Administrador</option>
                      </select>
                    </td>
                    <td className="py-[16px] pr-[18px] text-[14px]">
                      <span className={usr.activo ? 'text-deep-verdant' : 'text-ash-gray'}>
                        {usr.activo ? 'Activo' : 'Desactivado'}
                      </span>
                      {usr.debeCambiarPassword && (
                        <span className="block text-[12px] text-saffron-spark">
                          Contraseña temporal pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-[16px] pr-[18px] tabular-nums text-[14px] text-silver-mist">
                      {formatearFecha(usr.ultimoAcceso)}
                    </td>
                    <td className="py-[16px] text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-[12px]">
                        <GhostButton
                          disabled={!usr.activo}
                          onClick={() => handleResetPassword(usr.id, nombre)}
                        >
                          Restablecer contraseña
                        </GhostButton>
                        <GhostButton onClick={() => handleToggleActivo(usr.id)}>
                          {usr.activo ? 'Desactivar' : 'Activar'}
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

      {/* Modal crear usuario */}
      <ModalDialog
        open={crearOpen}
        title="Crear usuario"
        onClose={() => setCrearOpen(false)}
      >
        {empleadosSinUsuario.length === 0 ? (
          <p className="body-ultralight text-silver-mist">
            Todos los empleados activos ya cuentan con un usuario asignado.
          </p>
        ) : (
          <form onSubmit={handleCrearUsuario} className="space-y-[18px]">
            <div>
              <FieldLabel htmlFor="usr-emp" required>
                Empleado activo sin usuario
              </FieldLabel>
              <select
                id="usr-emp"
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                className={inputBaseClass}
              >
                {empleadosSinUsuario.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombres} {e.apellidos} — {e.correo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="usr-perfil" required>
                Perfil de acceso
              </FieldLabel>
              <select
                id="usr-perfil"
                value={perfilNuevo}
                onChange={(e) => setPerfilNuevo(e.target.value as PerfilUsuario)}
                className={inputBaseClass}
              >
                <option value="EMPLEADO">Empleado</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </div>

            <div className="flex items-center gap-[12px] pt-[12px]">
              <PrimaryButton type="submit">Generar usuario</PrimaryButton>
              <OutlineButton onClick={() => setCrearOpen(false)}>Cancelar</OutlineButton>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* One-time temporary password modal (RS-01, RS-04) */}
      <ModalDialog
        open={!!passwordUnica}
        title={passwordUnica?.motivo ?? 'Contraseña temporal'}
        onClose={() => setPasswordUnica(null)}
      >
        {passwordUnica && (
          <div className="space-y-[18px]">
            <p className="body-ultralight text-silver-mist">
              Entregue esta contraseña temporal a <strong className="text-bone-white font-normal">{passwordUnica.empleado}</strong>. Se muestra una única vez y deberá cambiarla en su próximo inicio de sesión.
            </p>
            <div className="border border-saffron-spark/50 rounded-[12px] px-[18px] py-[14px] text-[20px] tabular-nums tracking-wide text-saffron-spark select-all">
              {passwordUnica.password}
            </div>
            <PrimaryButton onClick={() => setPasswordUnica(null)}>Entendido</PrimaryButton>
          </div>
        )}
      </ModalDialog>
    </section>
  );
}
