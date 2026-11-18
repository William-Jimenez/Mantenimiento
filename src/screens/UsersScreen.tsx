import React, { useMemo, useState } from 'react';
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
    <section className="space-y-[36px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[24px]">
        <div className="space-y-[12px]">
          <p className="nav-label text-saffron-spark">Administración · Gestión de Usuarios y Roles</p>
          <h1 className="text-[42px] sm:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
            Usuarios y roles
          </h1>
          <p className="body-ultralight text-silver-mist max-w-[620px]">
            Cree, edite, desactive y cambie el rol de los usuarios entre Administrador, Empleado (Técnico) y Cliente. El sistema protege al último Administrador activo.
          </p>
        </div>

        <PrimaryButton onClick={handleOpenCrear}>
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
          description="Cree un usuario y asígnele su rol para habilitar el inicio de sesión."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-[12px] uppercase tracking-[0.35px] text-ash-gray">
                <th className="py-[12px] pr-[18px] font-semibold">Usuario</th>
                <th className="py-[12px] pr-[18px] font-semibold">Rol</th>
                <th className="py-[12px] pr-[18px] font-semibold">Estado</th>
                <th className="py-[12px] pr-[18px] font-semibold">Último acceso</th>
                <th className="py-[12px] text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-[15px]">
              {usuarios.map((usr) => {
                const emp = empleados.find((e) => e.id === usr.empleadoId);
                const nombre = emp ? `${emp.nombres} ${emp.apellidos}` : `Usuario #${usr.id}`;

                return (
                  <tr key={usr.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-[16px] pr-[18px]">
                      <div className="text-bone-white">{nombre}</div>
                      <div className="text-[13px] text-ash-gray">
                        {emp?.correo ?? '—'} {emp?.cargo ? `· ${emp.cargo}` : ''}
                      </div>
                    </td>
                    <td className="py-[16px] pr-[18px]">
                      <select
                        aria-label={`Rol de ${nombre}`}
                        value={usr.perfil}
                        onChange={(e) =>
                          handleCambiarPerfil(usr.id, e.target.value as PerfilUsuario)
                        }
                        className="bg-void text-bone-white border border-white/20 rounded-[12px] px-[12px] py-[6px] text-[14px]"
                      >
                        <option value="ADMINISTRADOR">Administrador</option>
                        <option value="EMPLEADO">Empleado (Técnico)</option>
                        <option value="CLIENTE">Cliente</option>
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
      )}

      {/* Modal crear usuario */}
      <ModalDialog
        open={crearOpen}
        title="Crear usuario"
        onClose={() => setCrearOpen(false)}
      >
        <form onSubmit={handleCrearUsuario} className="space-y-[18px]">
          {empleadosSinUsuario.length > 0 && (
            <div className="flex items-center gap-[8px] pb-[6px]">
              <button
                type="button"
                onClick={() => setModoCreacion('nuevo')}
                className={`px-[12px] py-[6px] rounded-full text-[13px] cursor-pointer transition-colors ${
                  modoCreacion === 'nuevo'
                    ? 'bg-electric-iris text-bone-white'
                    : 'border border-white/15 text-ash-gray hover:text-bone-white'
                }`}
              >
                Registrar persona nueva
              </button>
              <button
                type="button"
                onClick={() => setModoCreacion('existente')}
                className={`px-[12px] py-[6px] rounded-full text-[13px] cursor-pointer transition-colors ${
                  modoCreacion === 'existente'
                    ? 'bg-electric-iris text-bone-white'
                    : 'border border-white/15 text-ash-gray hover:text-bone-white'
                }`}
              >
                Asociar existente ({empleadosSinUsuario.length})
              </button>
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
            <div className="space-y-[14px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
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
                  <FieldLabel htmlFor="usr-nuevo-cargo">
                    Cargo / Área
                  </FieldLabel>
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

          <div className="flex items-center gap-[12px] pt-[12px]">
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
        <form onSubmit={handleGuardarEdicion} className="space-y-[16px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
            <div>
              <FieldLabel htmlFor="edit-usr-cargo">
                Cargo / Área
              </FieldLabel>
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

          <label className="flex items-center gap-[10px] pt-[4px] cursor-pointer">
            <input
              type="checkbox"
              checked={editActivo}
              onChange={(e) => setEditActivo(e.target.checked)}
              className="w-4 h-4 accent-electric-iris"
            />
            <span className="text-[14px] text-bone-white">Usuario activo</span>
          </label>

          <FieldError message={errorEditarModal} />

          <div className="flex items-center gap-[12px] pt-[10px]">
            <PrimaryButton type="submit">Guardar cambios</PrimaryButton>
            <OutlineButton onClick={() => setEditUsuarioId(null)}>Cancelar</OutlineButton>
          </div>
        </form>
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
