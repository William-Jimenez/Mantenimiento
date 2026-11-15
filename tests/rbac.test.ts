import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { SEED_ASIGNACIONES, SEED_EMPLEADOS, SEED_SOLICITUDES, SEED_USUARIOS } from '../src/data/seed';
import { createApiApp, encodeSessionToken } from '../src/server/apiApp';
import {
  obtenerTransicionesPermitidas,
  puedeAccederRutaEmpleado,
  puedeAsignarTecnico,
  puedeCrearSolicitud,
  puedeGestionarUsuarios,
  puedeRegistrarTrabajo,
  puedeVerSolicitud,
  tienePermisoRuta,
} from '../src/services/domainRules';

describe('Control de Acceso Basado en Roles (RBAC): Administrador, Empleado y Cliente', () => {
  const adminUser = SEED_USUARIOS.find((u) => u.perfil === 'ADMINISTRADOR')!;
  const adminEmp = SEED_EMPLEADOS.find((e) => e.id === adminUser.empleadoId)!;

  const tecnicoUser = SEED_USUARIOS.find((u) => u.id === 2 && u.perfil === 'EMPLEADO')!;
  const tecnicoEmp = SEED_EMPLEADOS.find((e) => e.id === tecnicoUser.empleadoId)!;

  const otroTecnicoUser = SEED_USUARIOS.find((u) => u.id === 3 && u.perfil === 'EMPLEADO')!;
  const otroTecnicoEmp = SEED_EMPLEADOS.find((e) => e.id === otroTecnicoUser.empleadoId)!;

  const clienteUser = SEED_USUARIOS.find((u) => u.id === 4 && u.perfil === 'CLIENTE')!;
  const clienteEmp = SEED_EMPLEADOS.find((e) => e.id === clienteUser.empleadoId)!;

  let server: http.Server;
  let baseUrl = '';

  const tokenAdmin = encodeSessionToken(adminUser.id, adminUser.perfil);
  const tokenTecnico = encodeSessionToken(tecnicoUser.id, tecnicoUser.perfil);
  const tokenCliente = encodeSessionToken(clienteUser.id, clienteUser.perfil);

  before(async () => {
    const app = createApiApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address();
    if (addr && typeof addr === 'object') {
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  async function apiRequest(
    path: string,
    options: { method?: string; token?: string; body?: unknown } = {}
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  // ==========================================================================
  // 1. Pruebas de Reglas de Dominio y Guardias de Rutas en Interfaz
  // ==========================================================================
  it('verifica que un CLIENTE no puede acceder a rutas de empleado ni de administrador en la interfaz', () => {
    // Rutas permitidas para CLIENTE
    assert.equal(tienePermisoRuta(clienteUser, '/'), true);
    assert.equal(tienePermisoRuta(clienteUser, '/solicitudes'), true);
    assert.equal(tienePermisoRuta(clienteUser, '/solicitudes/nueva'), true);
    assert.equal(tienePermisoRuta(clienteUser, '/solicitudes/1'), true);

    // Rutas de EMPLEADO bloqueadas para CLIENTE
    assert.equal(tienePermisoRuta(clienteUser, '/tecnico'), false);
    assert.equal(tienePermisoRuta(clienteUser, '/tecnico/solicitudes'), false);
    assert.equal(puedeAccederRutaEmpleado(clienteUser), false);

    // Rutas de ADMINISTRADOR bloqueadas para CLIENTE
    assert.equal(tienePermisoRuta(clienteUser, '/admin'), false);
    assert.equal(tienePermisoRuta(clienteUser, '/admin/usuarios'), false);
    assert.equal(tienePermisoRuta(clienteUser, '/admin/empleados'), false);
    assert.equal(tienePermisoRuta(clienteUser, '/admin/empleados/nuevo'), false);
    assert.equal(tienePermisoRuta(clienteUser, '/admin/recursos'), false);
    assert.equal(tienePermisoRuta(clienteUser, '/admin/categorias'), false);
    assert.equal(puedeGestionarUsuarios(clienteUser), false);
  });

  it('verifica que un EMPLEADO (técnico) no puede gestionar usuarios ni acceder a rutas administrativas', () => {
    // Rutas permitidas para EMPLEADO
    assert.equal(tienePermisoRuta(tecnicoUser, '/'), true);
    assert.equal(tienePermisoRuta(tecnicoUser, '/tecnico'), true);
    assert.equal(tienePermisoRuta(tecnicoUser, '/tecnico/solicitudes'), true);
    assert.equal(tienePermisoRuta(tecnicoUser, '/solicitudes'), true);
    assert.equal(tienePermisoRuta(tecnicoUser, '/solicitudes/3'), true);

    // Gestión de usuarios y rutas de ADMINISTRADOR bloqueadas para EMPLEADO
    assert.equal(puedeGestionarUsuarios(tecnicoUser), false);
    assert.equal(tienePermisoRuta(tecnicoUser, '/admin/usuarios'), false);
    assert.equal(tienePermisoRuta(tecnicoUser, '/admin/empleados'), false);
    assert.equal(tienePermisoRuta(tecnicoUser, '/admin/recursos'), false);
    assert.equal(tienePermisoRuta(tecnicoUser, '/admin/categorias'), false);

    // Creación de solicitudes de cliente bloqueada para EMPLEADO
    assert.equal(puedeCrearSolicitud(tecnicoUser), false);
    assert.equal(tienePermisoRuta(tecnicoUser, '/solicitudes/nueva'), false);
  });

  it('verifica la visibilidad de solicitudes y permisos de trabajo según el rol', () => {
    const solDeCliente4SinAsignar = SEED_SOLICITUDES.find((s) => s.id === 1)!; // solicitanteId = 4, sin asignar
    const solDeCliente5AsignadaATecnico2 = SEED_SOLICITUDES.find((s) => s.id === 3)!; // solicitanteId = 5, asignada a tecnico 2
    const asigSol3 = SEED_ASIGNACIONES.find((a) => a.solicitudId === 3 && a.vigente);

    // Cliente 4 ve su propia solicitud (#1), pero NO ve la solicitud de otro cliente (#3)
    assert.equal(puedeVerSolicitud(clienteUser, clienteEmp, solDeCliente4SinAsignar, undefined), true);
    assert.equal(
      puedeVerSolicitud(clienteUser, clienteEmp, solDeCliente5AsignadaATecnico2, asigSol3),
      false
    );

    // Técnico 2 ve la solicitud asignada a él (#3), pero NO ve solicitudes no asignadas (#1)
    assert.equal(
      puedeVerSolicitud(tecnicoUser, tecnicoEmp, solDeCliente5AsignadaATecnico2, asigSol3),
      true
    );
    assert.equal(
      puedeVerSolicitud(tecnicoUser, tecnicoEmp, solDeCliente4SinAsignar, undefined),
      false
    );

    // Otro técnico (#3) NO ve ni registra trabajo en la solicitud asignada al Técnico 2 (#3)
    assert.equal(
      puedeVerSolicitud(otroTecnicoUser, otroTecnicoEmp, solDeCliente5AsignadaATecnico2, asigSol3),
      false
    );
    assert.equal(
      puedeRegistrarTrabajo(otroTecnicoUser, otroTecnicoEmp, solDeCliente5AsignadaATecnico2, asigSol3),
      false
    );

    // Técnico 2 SÍ puede registrar trabajo y avanzar estado en su solicitud asignada (#3)
    assert.equal(
      puedeRegistrarTrabajo(tecnicoUser, tecnicoEmp, solDeCliente5AsignadaATecnico2, asigSol3),
      true
    );
    const transTecnico = obtenerTransicionesPermitidas(
      tecnicoUser,
      tecnicoEmp,
      solDeCliente5AsignadaATecnico2,
      asigSol3
    );
    assert.equal(transTecnico.some((t) => t.destino === 'En proceso'), true);

    // Cliente NO puede registrar trabajo técnico ni asignar técnicos
    assert.equal(
      puedeRegistrarTrabajo(clienteUser, clienteEmp, solDeCliente4SinAsignar, undefined),
      false
    );
    assert.equal(puedeAsignarTecnico(clienteUser, solDeCliente4SinAsignar), false);
  });

  // ==========================================================================
  // 2. Pruebas de Backend API (Bloqueo de peticiones directas por rol)
  // ==========================================================================
  it('bloquea en el backend (HTTP 403) a un CLIENTE que intenta acceder a rutas de empleado o administrador', async () => {
    // Intento de acceso a rutas de EMPLEADO (técnico)
    const resBandejaTecnico = await apiRequest('/api/tecnico/solicitudes', {
      token: tokenCliente,
    });
    assert.equal(resBandejaTecnico.status, 403);
    assert.equal(resBandejaTecnico.body.codigo, 'ACCESO_DENEGADO');

    const resRegistrarTrabajo = await apiRequest('/api/tecnico/solicitudes/4/trabajo', {
      method: 'POST',
      token: tokenCliente,
      body: { trabajoRealizado: 'Intento no autorizado de cliente' },
    });
    assert.equal(resRegistrarTrabajo.status, 403);

    const resCambiarEstado = await apiRequest('/api/tecnico/solicitudes/4/estado', {
      method: 'PATCH',
      token: tokenCliente,
      body: { destino: 'Finalizada' },
    });
    assert.equal(resCambiarEstado.status, 403);

    // Intento de acceso a rutas de ADMINISTRADOR
    const resListarUsuarios = await apiRequest('/api/admin/usuarios', {
      token: tokenCliente,
    });
    assert.equal(resListarUsuarios.status, 403);

    const resCrearUsuario = await apiRequest('/api/admin/usuarios', {
      method: 'POST',
      token: tokenCliente,
      body: { empleadoId: 6, perfil: 'ADMINISTRADOR' },
    });
    assert.equal(resCrearUsuario.status, 403);

    const resListarEmpleados = await apiRequest('/api/admin/empleados', {
      token: tokenCliente,
    });
    assert.equal(resListarEmpleados.status, 403);

    const resAsignarTecnico = await apiRequest('/api/admin/solicitudes/1/asignar', {
      method: 'POST',
      token: tokenCliente,
      body: { tecnicoId: 2 },
    });
    assert.equal(resAsignarTecnico.status, 403);
  });

  it('bloquea en el backend (HTTP 403) a un EMPLEADO que intenta gestionar usuarios o asignar solicitudes', async () => {
    // Listar usuarios -> 403
    const resListar = await apiRequest('/api/admin/usuarios', {
      token: tokenTecnico,
    });
    assert.equal(resListar.status, 403);
    assert.equal(resListar.body.codigo, 'ACCESO_DENEGADO');

    // Crear usuario -> 403
    const resCrear = await apiRequest('/api/admin/usuarios', {
      method: 'POST',
      token: tokenTecnico,
      body: {
        documento: '900112233',
        nombres: 'Nuevo',
        apellidos: 'Usuario',
        correo: 'nuevo@empresa.com',
        perfil: 'CLIENTE',
      },
    });
    assert.equal(resCrear.status, 403);

    // Editar usuario -> 403
    const resEditar = await apiRequest('/api/admin/usuarios/4', {
      method: 'PUT',
      token: tokenTecnico,
      body: {
        nombres: 'Andrea',
        apellidos: 'Gómez',
        correo: 'cliente@empresa.com',
        perfil: 'ADMINISTRADOR',
        activo: true,
      },
    });
    assert.equal(resEditar.status, 403);

    // Cambiar rol de usuario -> 403
    const resCambiarRol = await apiRequest('/api/admin/usuarios/4/rol', {
      method: 'PATCH',
      token: tokenTecnico,
      body: { perfil: 'ADMINISTRADOR' },
    });
    assert.equal(resCambiarRol.status, 403);

    // Desactivar usuario -> 403
    const resDesactivar = await apiRequest('/api/admin/usuarios/4/estado', {
      method: 'PATCH',
      token: tokenTecnico,
      body: { activo: false },
    });
    assert.equal(resDesactivar.status, 403);

    // Asignar técnico -> 403
    const resAsignar = await apiRequest('/api/admin/solicitudes/1/asignar', {
      method: 'POST',
      token: tokenTecnico,
      body: { tecnicoId: 2 },
    });
    assert.equal(resAsignar.status, 403);
  });

  it('garantiza que un CLIENTE solo ve sus propias solicitudes sin datos de empleados ni de otros clientes, y que un EMPLEADO solo opera sobre sus asignadas', async () => {
    // Cliente consulta sus solicitudes: solo recibe las suyas (solicitanteId = 4) y sin campos internos
    const resClienteList = await apiRequest('/api/solicitudes', {
      token: tokenCliente,
    });
    assert.equal(resClienteList.status, 200);
    assert.equal(Array.isArray(resClienteList.body.data), true);
    assert.equal(resClienteList.body.data.length > 0, true);
    for (const item of resClienteList.body.data) {
      assert.equal('registradaPorUsuarioId' in item, false);
      assert.equal('solicitanteId' in item, false);
    }

    // Cliente intenta consultar la solicitud #3 (de otro cliente, Mateo Rojas) -> 403
    const resOtraSolicitud = await apiRequest('/api/solicitudes/3', {
      token: tokenCliente,
    });
    assert.equal(resOtraSolicitud.status, 403);

    // Empleado consulta sus asignadas (#3 y #4) y registra trabajo en #3 -> 200
    const resTecnicoAsignadas = await apiRequest('/api/tecnico/solicitudes', {
      token: tokenTecnico,
    });
    assert.equal(resTecnicoAsignadas.status, 200);
    assert.equal(
      resTecnicoAsignadas.body.data.every((s: { id: number }) => s.id === 3 || s.id === 4),
      true
    );

    // Empleado intenta ver o registrar trabajo en la solicitud #1 (no asignada a él) -> 403
    const resTecnicoNoAsignada = await apiRequest('/api/solicitudes/1', {
      token: tokenTecnico,
    });
    assert.equal(resTecnicoNoAsignada.status, 403);

    const resTrabajoNoAsignada = await apiRequest('/api/tecnico/solicitudes/1/trabajo', {
      method: 'POST',
      token: tokenTecnico,
      body: { trabajoRealizado: 'Revisión de unidad climatizadora en sala 3.' },
    });
    assert.equal(resTrabajoNoAsignada.status, 403);

    // Empleado registra trabajo en su solicitud asignada #3 -> 200
    const resTrabajoOk = await apiRequest('/api/tecnico/solicitudes/3/trabajo', {
      method: 'POST',
      token: tokenTecnico,
      body: { trabajoRealizado: 'Se limpió radiador de enfriamiento y se ajustó sensor térmico.' },
    });
    assert.equal(resTrabajoOk.status, 200);
    assert.equal(
      resTrabajoOk.body.data.trabajoRealizado,
      'Se limpió radiador de enfriamiento y se ajustó sensor térmico.'
    );

    // Administrador puede gestionar usuarios (crear, cambiar rol, desactivar) -> 200/201
    const resAdminUsuarios = await apiRequest('/api/admin/usuarios', {
      token: tokenAdmin,
    });
    assert.equal(resAdminUsuarios.status, 200);

    const resAdminCrearUsuario = await apiRequest('/api/admin/usuarios', {
      method: 'POST',
      token: tokenAdmin,
      body: {
        documento: '1088990011',
        nombres: 'Sofía',
        apellidos: 'Restrepo',
        correo: 'sofia.restrepo@empresa.com',
        cargo: 'Cliente — Compras',
        perfil: 'CLIENTE',
      },
    });
    assert.equal(resAdminCrearUsuario.status, 201);
    assert.equal(resAdminCrearUsuario.body.data.perfil, 'CLIENTE');
  });
});
