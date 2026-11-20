import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { createApiApp, createInitialBackendStore } from '../src/server/apiApp';
import { MaintenanceApiClient } from '../src/services/apiClient';
import { isGeminiApiKeyConfigured } from '../src/services/geminiAiService';

describe('Pruebas de Integración End-to-End (Frontend ApiClient <-> Express API <-> Servicio IA)', () => {
  const store = createInitialBackendStore();
  let server: http.Server;
  let baseUrl = '';

  before(async () => {
    const app = createApiApp(store);
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

  it('ejecuta el flujo completo de una solicitud vía MaintenanceApiClient (registro, creación, IA, asignación y cierre técnico)', async () => {
    const clientCliente = new MaintenanceApiClient(baseUrl);
    const clientAdmin = new MaintenanceApiClient(baseUrl);
    const clientTecnico = new MaintenanceApiClient(baseUrl);

    // 1. Autorregistro de cliente y consulta de perfil (/api/auth/register + /api/me)
    const regRes = await clientCliente.register({
      nombres: 'Sofía',
      apellidos: 'Navarro',
      documento: '1088776655',
      correo: 'sofia.navarro@empresa.com',
      password: 'Password2026!',
    });
    assert.equal(regRes.ok, true);
    assert.equal(regRes.status, 201);
    assert.ok(clientCliente.getAuthToken());

    const meRes = await clientCliente.getMe();
    assert.equal(meRes.ok, true);
    assert.equal(meRes.status, 200);

    // 2. Cliente crea una solicitud de mantenimiento
    const createRes = await clientCliente.createSolicitud({
      recursoId: 1,
      descripcion: 'Sobrecalentamiento crítico en el tablero eléctrico del servidor principal.',
    });
    assert.equal(createRes.ok, true);
    assert.equal(createRes.status, 201);
    assert.ok(createRes.data?.id);
    const solicitudId = createRes.data!.id;

    // Cliente consulta sus propias solicitudes
    const listClienteRes = await clientCliente.getSolicitudes();
    assert.equal(listClienteRes.ok, true);
    assert.ok(Array.isArray(listClienteRes.data));
    assert.ok(listClienteRes.data!.some((s) => s.id === solicitudId));

    // 3. Administrador inicia sesión, ejecuta análisis IA y revisa la sugerencia
    const adminLogin = await clientAdmin.login('admin@empresa.com', 'admin12345');
    assert.equal(adminLogin.ok, true);
    assert.equal(adminLogin.status, 200);

    const iaRes = await clientAdmin.triggerAnalisisIa(solicitudId);
    assert.equal(iaRes.ok, true);
    assert.equal(iaRes.status, 201);
    assert.equal(iaRes.data?.estadoAnalisis, 'COMPLETADO');
    assert.equal(iaRes.data?.modelo, 'gemini-2.5-flash');
    assert.ok(iaRes.origen === 'gemini-api' || iaRes.origen === 'fallback-reglas');

    const reviewRes = await clientAdmin.reviewAnalisisIa(solicitudId, iaRes.data!.id, {
      decision: 'ACEPTADO',
      categoriaId: iaRes.data!.categoriaSugeridaId,
      prioridadId: iaRes.data!.prioridadSugeridaId,
    });
    assert.equal(reviewRes.ok, true);
    assert.equal(reviewRes.status, 200);

    // 4. Administrador asigna técnico (Carlos Mendoza, empleadoId = 2)
    const assignRes = await clientAdmin.assignTecnico(solicitudId, { tecnicoId: 2 });
    assert.equal(assignRes.ok, true);
    assert.equal(assignRes.status, 200);
    assert.equal(assignRes.data?.estado, 'Asignada');

    // 5. Técnico inicia sesión, cambia estado a En proceso, registra trabajo y finaliza
    const tecLogin = await clientTecnico.login('tecnico@empresa.com', 'Tecnico2026');
    assert.equal(tecLogin.ok, true);

    const enProcesoRes = await clientTecnico.updateSolicitudEstado(solicitudId, {
      nuevoEstado: 'En proceso',
      motivo: 'Iniciando inspección termográfica del tablero.',
    });
    assert.equal(enProcesoRes.ok, true);
    assert.equal(enProcesoRes.data?.estado, 'En proceso');

    const trabajoRes = await clientTecnico.registerTrabajo(
      solicitudId,
      'Se reemplazó el breaker térmico de 40A y se verificó voltaje estable.'
    );
    assert.equal(trabajoRes.ok, true);

    const finalRes = await clientTecnico.updateSolicitudEstado(solicitudId, {
      nuevoEstado: 'Finalizada',
      motivo: 'Equipo operando dentro de parámetros nominales.',
    });
    assert.equal(finalRes.ok, true);
    assert.equal(finalRes.data?.estado, 'Finalizada');
  });

  it('valida CRUD de recursos, rechazo de duplicados (409) y bloqueo RBAC (403) a través de MaintenanceApiClient', async () => {
    const clientAdmin = new MaintenanceApiClient(baseUrl);
    const clientCliente = new MaintenanceApiClient(baseUrl);

    await clientAdmin.login('admin@empresa.com', 'admin12345');
    await clientCliente.login('cliente@empresa.com', 'Cliente2026');

    const recList = await clientCliente.getRecursos();
    assert.equal(recList.ok, true);
    assert.ok(Array.isArray(recList.data) && recList.data.length > 0);

    // Cliente no puede crear recursos -> 403
    const forbiddenCreate = await clientCliente.createRecurso({
      codigo: 'TEST-403',
      nombre: 'Recurso no autorizado',
      tipoRecursoId: 1,
      ubicacion: 'Sede Norte',
      descripcion: 'Intento de creación por cliente',
    });
    assert.equal(forbiddenCreate.ok, false);
    assert.equal(forbiddenCreate.status, 403);

    // Admin crea recurso correctamente -> 201
    const created = await clientAdmin.createRecurso({
      codigo: 'UPS-INT-99',
      nombre: 'UPS Integración 20kVA',
      tipoRecursoId: 1,
      ubicacion: 'Cuarto Eléctrico Piso 2',
      descripcion: 'Unidad de respaldo de energía para pruebas de integración.',
    });
    assert.equal(created.ok, true);
    assert.equal(created.status, 201);

    // Código duplicado -> 409 Conflict
    const duplicated = await clientAdmin.createRecurso({
      codigo: 'UPS-INT-99',
      nombre: 'UPS Duplicado',
      tipoRecursoId: 1,
      ubicacion: 'Cuarto Eléctrico Piso 2',
      descripcion: 'Duplicado esperado.',
    });
    assert.equal(duplicated.ok, false);
    assert.equal(duplicated.status, 409);
  });

  it('maneja con resiliencia errores de red en MaintenanceApiClient y detecta correctamente claves placeholder de Gemini', async () => {
    assert.equal(isGeminiApiKeyConfigured(''), false);
    assert.equal(isGeminiApiKeyConfigured('MY_GEMINI_API_KEY'), false);
    assert.equal(isGeminiApiKeyConfigured('AIzaSyDemoKeyValue123456'), true);

    const offlineClient = new MaintenanceApiClient('http://127.0.0.1:1');
    const res = await offlineClient.getRecursos();
    assert.equal(res.ok, false);
    assert.equal(res.status, 0);
    assert.ok(res.error);
  });
});
