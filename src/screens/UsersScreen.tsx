import React, { useMemo, useState } from 'react';
import { KeyRound, UserPlus } from 'lucide-react';
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
import { PerfilUsuario } from '../types/domain';
import { ETIQUETA_PERFIL, formatearFecha, puedeGestionarUsuarios } from '../services/domainRules';

export function UsersScreen() {
  const {
    currentUser,
    isAdmin,
    empleados,
    usuarios,
    crearUsuario,
    editarUsuario,
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
  const [modoCreacion, setModoCreacion] = useState<'nuevo' | 'existente'>(
    initialEmpParam || empleadosSinUsuario.length > 0 ? 'existente' : 'nuevo'
  );
  const [selectedEmpId, setSelectedEmpId] = useState<number>(
    initialEmpParam ?? empleadosSinUsuario[0]?.id ?? 0
  );
  const [nuevoDoc, setNuevoDoc] = useState('');
  const [nuevoNombres, setNuevoNombres] = useState('');
  const [nuevoApellidos, setNuevoApellidos] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nuevoCargo, setNuevoCargo] = useState('');
  const [perfilNuevo, setPerfilNuevo] = useState<PerfilUsuario>('CLIENTE');
  const [passwordInicial, setPasswordInicial] = useState('');
  const [errorCrearModal, setErrorCrearModal] = useState<string | null>(null);

  const [editUsuarioId, setEditUsuarioId] = useState<number | null>(null);
  const [editNombres, setEditNombres] = useState('');
  const [editApellidos, setEditApellidos] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editPerfil, setEditPerfil] = useState<PerfilUsuario>('CLIENTE');
  const [editActivo, setEditActivo] = useState(true);
  const [errorEditarModal, setErrorEditarModal] = useState<string | null>(null);

  const [errorRegla, setErrorRegla] = useState<string | null>(null);
  const [passwordUnica, setPasswordUnica] = useState<{
    empleado: string;
    password: string;
    motivo: string;
  } | null>(null);

  if (!isAdmin || !puedeGestionarUsuarios(currentUser)) {
    return <ErrorScreen tipo="sin-permiso" />;
  }

  const handleOpenCrear = () => {
    setErrorCrearModal(null);
    setErrorRegla(null);
    if (empleadosSinUsuario.length > 0) {
      setModoCreacion('existente');
      setSelectedEmpId(empleadosSinUsuario[0].id);
    } else {
      setModoCreacion('nuevo');
    }
    setNuevoDoc('');
    setNuevoNombres('');
    setNuevoApellidos('');
    setNuevoCorreo('');
    setNuevoCargo('');
    setPerfilNuevo('CLIENTE');
    setPasswordInicial('');
    setCrearOpen(true);
  };

  const handleCrearUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCrearModal(null);
    setErrorRegla(null);

    if (modoCreacion === 'existente') {
      if (!selectedEmpId) {
        setErrorCrearModal('Seleccione un registro existente.');
        return;
      }
      const emp = empleados.find((em) => em.id === selectedEmpId);
      const res = crearUsuario(selectedEmpId, perfilNuevo, undefined, passwordInicial);
      if (!res.ok) {
        setErrorCrearModal(res.error ?? 'No se pudo crear el usuario.');
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
      return;
    }

    const res = crearUsuario(
      0,
      perfilNuevo,
      {
        documento: nuevoDoc,
        nombres: nuevoNombres,
        apellidos: nuevoApellidos,
        correo: nuevoCorreo,
        cargo: nuevoCargo,
      },
      passwordInicial
    );
    if (!res.ok) {
      setErrorCrearModal(res.error ?? 'No se pudo crear el usuario.');
      return;
    }
    setCrearOpen(false);
    if (res.data) {
      setPasswordUnica({
        empleado: `${nuevoNombres.trim()} ${nuevoApellidos.trim()}`,
        password: res.data.passwordTemporal,
        motivo: 'Usuario creado',
      });
    }
  };

  const handleOpenEditar = (usuarioId: number) => {
    const usr = usuarios.find((u) => u.id === usuarioId);
    if (!usr) return;
    const emp = empleados.find((e) => e.id === usr.empleadoId);
    setErrorEditarModal(null);
    setEditUsuarioId(usr.id);
    setEditNombres(emp?.nombres ?? '');
    setEditApellidos(emp?.apellidos ?? '');
    setEditCorreo(emp?.correo ?? '');
    setEditCargo(emp?.cargo ?? '');
    setEditPerfil(usr.perfil);
    setEditActivo(usr.activo);
  };

  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsuarioId) return;
    setErrorEditarModal(null);
    const res = editarUsuario(editUsuarioId, {
      nombres: editNombres,
      apellidos: editApellidos,
      correo: editCorreo,
      cargo: editCargo,
      perfil: editPerfil,
      activo: editActivo,
    });
    if (!res.ok) {
      setErrorEditarModal(res.error ?? 'No se pudo actualizar el usuario.');
      return;
    }
    setEditUsuarioId(null);
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
    <section className="space-y-6">
      <PageHeader
        eyebrow="Administración · Gestión de Usuarios y Roles"
        title="Usuarios y roles"
        description="Cree, edite, desactive y cambie el rol de los usuarios entre Administrador, Empleado (Técnico) y Cliente. El sistema protege al último Administrador activo."
        actions={
          <PrimaryButton onClick={handleOpenCrear}>
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Crear usuario</span>
          </PrimaryButton>
        }
      />

      {errorRegla && <AlertBanner variant="error">{errorRegla}</AlertBanner>}

      {usuarios.length === 0 ? (
        <EmptyState
          title="No hay usuarios registrados"
          description="Cree un usuario y asígnele su rol para habilitar el inicio de sesión."
        />
      ) : (
        <>
          {/* Desktop Table */}
          <SurfaceCard padded={false} className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)]/70 border-b border-[var(--border-subtle)] text-[12px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
                    <th className="py-3.5 pl-5 pr-4 font-semibold">Usuario</th>
                    <th className="py-3.5 px-4 font-semibold">Rol</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    <th className="py-3.5 px-4 font-semibold">Último acceso</th>
                    <th className="py-3.5 pl-4 pr-5 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[14px]">
                  {usuarios.map((usr) => {
                    const emp = empleados.find((e) => e.id === usr.empleadoId);
                    const nombre = emp ? `${emp.nombres} ${emp.apellidos}` : `Usuario #${usr.id}`;

                    return (
                      <tr
                        key={usr.id}
                        className="hover:bg-[var(--bg-subtle)]/50 transition-colors"
                      >
                        <td className="py-4 pl-5 pr-4">
                          <div className="font-semibold text-[var(--text-primary)]">{nombre}</div>
                          <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
                            <span className="font-mono-code">{emp?.correo ?? '—'}</span>
                            {emp?.cargo ? ` · ${emp.cargo}` : ''}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <select
                            aria-label={`Rol de ${nombre}`}
                            value={usr.perfil}
                            onChange={(e) =>
                              handleCambiarPerfil(usr.id, e.target.value as PerfilUsuario)
                            }
                            className="bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] focus:border-[var(--brand-primary-text)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium outline-none cursor-pointer"
                          >
                            <option value="ADMINISTRADOR">Administrador</option>
                            <option value="EMPLEADO">Empleado (Técnico)</option>
                            <option value="CLIENTE">Cliente</option>
                          </select>
                        </td>
                        <td className="py-4 px-4 text-[13px] space-y-1">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] border text-[12px] font-semibold ${
                                usr.activo
                                  ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                                  : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`w-1.5 h-1.5 rounded-full ${
                                  usr.activo
                                    ? 'bg-[var(--status-success-text)]'
                                    : 'bg-[var(--text-muted)]'
                                }`}
                              />
                              {usr.activo ? 'Activo' : 'Desactivado'}
                            </span>
                          </div>
                          {usr.debeCambiarPassword && (
                            <span className="inline-block text-[11px] font-medium text-[var(--status-warning-text)]">
                              Contraseña temporal pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono-code text-[12px] text-[var(--text-secondary)]">
                          {formatearFecha(usr.ultimoAcceso)}
                        </td>
                        <td className="py-4 pl-4 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <GhostButton onClick={() => handleOpenEditar(usr.id)}>
                              Editar
                            </GhostButton>
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
          </SurfaceCard>

          {/* Mobile / Tablet Cards */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {usuarios.map((usr) => {
              const emp = empleados.find((e) => e.id === usr.empleadoId);
              const nombre = emp ? `${emp.nombres} ${emp.apellidos}` : `Usuario #${usr.id}`;

              return (
                <SurfaceCard key={usr.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold text-[var(--text-primary)] truncate">
                        {nombre}
                      </p>
                      <p className="text-[12px] font-mono-code text-[var(--text-muted)] truncate">
                        {emp?.correo ?? '—'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-[6px] border text-[11px] font-semibold shrink-0 ${
                        usr.activo
                          ? 'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                      }`}
                    >
                      {usr.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <select
                      aria-label={`Rol de ${nombre}`}
                      value={usr.perfil}
                      onChange={(e) =>
                        handleCambiarPerfil(usr.id, e.target.value as PerfilUsuario)
                      }
                      className={`${inputBaseClass} !min-h-[40px] !py-1.5 text-[13px]`}
                    >
                      <option value="ADMINISTRADOR">Administrador</option>
                      <option value="EMPLEADO">Empleado (Técnico)</option>
                      <option value="CLIENTE">Cliente</option>
                    </select>
                    {usr.debeCambiarPassword && (
                      <p className="text-[12px] font-medium text-[var(--status-warning-text)]">
                        Contraseña temporal pendiente
                      </p>
                    )}
                    <p className="text-[12px] font-mono-code text-[var(--text-muted)]">
                      Último acceso: {formatearFecha(usr.ultimoAcceso)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                    <OutlineButton
                      onClick={() => handleOpenEditar(usr.id)}
                      className="!min-h-[38px] !py-1.5 !px-3 !text-[13px]"
                    >
                      Editar
                    </OutlineButton>
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
                </SurfaceCard>
              );
            })}
          </div>
        </>
      )}

      {/* Modal crear usuario */}
      <ModalDialog
        open={crearOpen}
        title="Crear usuario"
        onClose={() => setCrearOpen(false)}
      >
        <form onSubmit={handleCrearUsuario} className="space-y-4">
          {empleadosSinUsuario.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <FilterChip
                active={modoCreacion === 'nuevo'}
                onClick={() => setModoCreacion('nuevo')}
              >
                Registrar persona nueva
              </FilterChip>
              <FilterChip
                active={modoCreacion === 'existente'}
                onClick={() => setModoCreacion('existente')}
              >
                Asociar existente ({empleadosSinUsuario.length})
              </FilterChip>
            </div>
          )}

          {modoCreacion === 'existente' && empleadosSinUsuario.length > 0 ? (
            <div>
              <FieldLabel htmlFor="usr-emp" required>
                Registro existente sin usuario
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
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <FieldLabel htmlFor="usr-nuevo-nombres" required>
                    Nombres
                  </FieldLabel>
                  <input
                    id="usr-nuevo-nombres"
                    type="text"
                    value={nuevoNombres}
                    onChange={(e) => setNuevoNombres(e.target.value)}
                    className={inputBaseClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="usr-nuevo-apellidos" required>
                    Apellidos
                  </FieldLabel>
                  <input
                    id="usr-nuevo-apellidos"
                    type="text"
                    value={nuevoApellidos}
                    onChange={(e) => setNuevoApellidos(e.target.value)}
                    className={inputBaseClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <FieldLabel htmlFor="usr-nuevo-doc" required>
                    Documento
                  </FieldLabel>
                  <input
                    id="usr-nuevo-doc"
                    type="text"
                    value={nuevoDoc}
                    onChange={(e) => setNuevoDoc(e.target.value)}
                    className={inputBaseClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="usr-nuevo-cargo">Cargo / Área</FieldLabel>
                  <input
                    id="usr-nuevo-cargo"
                    type="text"
                    value={nuevoCargo}
                    onChange={(e) => setNuevoCargo(e.target.value)}
                    placeholder={ETIQUETA_PERFIL[perfilNuevo]}
                    className={inputBaseClass}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="usr-nuevo-correo" required>
                  Correo electrónico
                </FieldLabel>
                <input
                  id="usr-nuevo-correo"
                  type="email"
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className={inputBaseClass}
                />
              </div>
            </div>
          )}

          <div>
            <FieldLabel htmlFor="usr-perfil" required>
              Rol de acceso
            </FieldLabel>
            <select
              id="usr-perfil"
              value={perfilNuevo}
              onChange={(e) => setPerfilNuevo(e.target.value as PerfilUsuario)}
              className={inputBaseClass}
            >
              <option value="CLIENTE">Cliente</option>
              <option value="EMPLEADO">Empleado (Técnico)</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="usr-password-inicial">
              Contraseña inicial (opcional)
            </FieldLabel>
            <input
              id="usr-password-inicial"
              type="text"
              value={passwordInicial}
              onChange={(e) => setPasswordInicial(e.target.value)}
              placeholder="Dejar vacía para autogenerar contraseña temporal"
              className={inputBaseClass}
            />
          </div>

          <FieldError message={errorCrearModal} />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <PrimaryButton type="submit">Generar usuario</PrimaryButton>
            <OutlineButton onClick={() => setCrearOpen(false)}>Cancelar</OutlineButton>
          </div>
        </form>
      </ModalDialog>

      {/* Modal editar usuario */}
      <ModalDialog
        open={editUsuarioId !== null}
        title="Editar usuario y rol"
        onClose={() => setEditUsuarioId(null)}
      >
        <form onSubmit={handleGuardarEdicion} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <FieldLabel htmlFor="edit-usr-nombres" required>
                Nombres
              </FieldLabel>
              <input
                id="edit-usr-nombres"
                type="text"
                value={editNombres}
                onChange={(e) => setEditNombres(e.target.value)}
                className={inputBaseClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="edit-usr-apellidos" required>
                Apellidos
              </FieldLabel>
              <input
                id="edit-usr-apellidos"
                type="text"
                value={editApellidos}
                onChange={(e) => setEditApellidos(e.target.value)}
                className={inputBaseClass}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="edit-usr-correo" required>
              Correo electrónico
            </FieldLabel>
            <input
              id="edit-usr-correo"
              type="email"
              value={editCorreo}
              onChange={(e) => setEditCorreo(e.target.value)}
              className={inputBaseClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <FieldLabel htmlFor="edit-usr-cargo">Cargo / Área</FieldLabel>
              <input
                id="edit-usr-cargo"
                type="text"
                value={editCargo}
                onChange={(e) => setEditCargo(e.target.value)}
                className={inputBaseClass}
              />
            </div>

            <div>
              <FieldLabel htmlFor="edit-usr-rol" required>
                Rol
              </FieldLabel>
              <select
                id="edit-usr-rol"
                value={editPerfil}
                onChange={(e) => setEditPerfil(e.target.value as PerfilUsuario)}
                className={inputBaseClass}
              >
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="EMPLEADO">Empleado (Técnico)</option>
                <option value="CLIENTE">Cliente</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 cursor-pointer">
            <input
              type="checkbox"
              checked={editActivo}
              onChange={(e) => setEditActivo(e.target.checked)}
              className="w-4 h-4 accent-[var(--brand-primary)]"
            />
            <span className="text-[14px] font-medium text-[var(--text-primary)]">
              Usuario activo
            </span>
          </label>

          <FieldError message={errorEditarModal} />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <PrimaryButton type="submit">Guardar cambios</PrimaryButton>
            <OutlineButton onClick={() => setEditUsuarioId(null)}>Cancelar</OutlineButton>
          </div>
        </form>
      </ModalDialog>

      {/* One-time temporary password modal */}
      <ModalDialog
        open={!!passwordUnica}
        title={passwordUnica?.motivo ?? 'Contraseña temporal'}
        onClose={() => setPasswordUnica(null)}
      >
        {passwordUnica && (
          <div className="space-y-5">
            <p className="body-readable text-[var(--text-secondary)]">
              Entregue esta contraseña temporal a{' '}
              <strong className="font-semibold text-[var(--text-primary)]">
                {passwordUnica.empleado}
              </strong>
              . Se muestra una única vez y deberá cambiarla en su próximo inicio de sesión.
            </p>
            <div className="flex items-center gap-3 border border-[var(--status-warning-border)] bg-[var(--status-warning-soft)] rounded-[12px] px-4 py-3.5">
              <KeyRound
                className="w-5 h-5 text-[var(--status-warning-text)] shrink-0"
                aria-hidden="true"
              />
              <span className="font-mono-code text-[20px] font-bold tracking-[0.06em] text-[var(--status-warning-text)] select-all">
                {passwordUnica.password}
              </span>
            </div>
            <PrimaryButton onClick={() => setPasswordUnica(null)}>Entendido</PrimaryButton>
          </div>
        )}
      </ModalDialog>
    </section>
  );
}
