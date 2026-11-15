import express, { NextFunction, Request, Response } from 'express';
import {
  SEED_ASIGNACIONES,
  SEED_EMPLEADOS,
  SEED_HISTORIAL,
  SEED_RECURSOS,
  SEED_SOLICITUDES,
  SEED_USUARIOS,
} from '../data/seed';
import {
  generarCodigoSolicitud,
  hashPassword,
  obtenerTransicionesPermitidas,
  puedeAsignarTecnico,
  puedeCrearSolicitud,
  puedeGestionarUsuarios,
  puedeRegistrarTrabajo,
  puedeVerSolicitud,
  validarDatosRegistro,
  verifyPassword,
} from '../services/domainRules';
import {
  Asignacion,
  Empleado,
  EstadoNombre,
  HistorialEstado,
  PerfilUsuario,
  Recurso,
  Solicitud,
  Usuario,
} from '../types/domain';

export interface BackendStore {
  empleados: Empleado[];
  usuarios: Usuario[];
  recursos: Recurso[];
  solicitudes: Solicitud[];
  asignaciones: Asignacion[];
  historial: HistorialEstado[];
}

export function createInitialBackendStore(): BackendStore {
  return {
    empleados: structuredClone(SEED_EMPLEADOS),
    usuarios: structuredClone(SEED_USUARIOS),
    recursos: structuredClone(SEED_RECURSOS),
    solicitudes: structuredClone(SEED_SOLICITUDES),
    asignaciones: structuredClone(SEED_ASIGNACIONES),
    historial: structuredClone(SEED_HISTORIAL),
  };
}

export interface AuthContext {
  usuario: Usuario;
  empleado: Empleado;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function encodeSessionToken(usuarioId: number, perfil: PerfilUsuario): string {
  return Buffer.from(JSON.stringify({ usuarioId, perfil }), 'utf-8').toString('base64url');
}

export function decodeSessionToken(token: string): { usuarioId: number; perfil: PerfilUsuario } | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed?.usuarioId === 'number' && typeof parsed?.perfil === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitiza la solicitud para el rol CLIENTE, ocultando referencias internas de empleados
 * y garantizando que el cliente solo reciba información de su propio reporte.
 */
export function sanitizarSolicitudParaRol(solicitud: Solicitud, perfil: PerfilUsuario) {
  if (perfil === 'CLIENTE') {
    return {
      id: solicitud.id,
      codigo: solicitud.codigo,
      recursoId: solicitud.recursoId,
      descripcion: solicitud.descripcion,
      estado: solicitud.estado,
      trabajoRealizado: solicitud.trabajoRealizado ?? null,
      trabajoActualizadoEn: solicitud.trabajoActualizadoEn ?? null,
      motivoCierre: solicitud.motivoCierre,
      creadaEn: solicitud.creadaEn,
      actualizadaEn: solicitud.actualizadaEn,
      cerradaEn: solicitud.cerradaEn,
    };
  }
  return solicitud;
}

export function createApiApp(customStore?: BackendStore) {
  const store = customStore ?? createInitialBackendStore();
  const app = express();
  app.use(express.json());

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    let usuarioId: number | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = decodeSessionToken(authHeader.slice(7).trim());
      if (decoded) {
        usuarioId = decoded.usuarioId;
      }
    } else if (req.headers['x-user-id']) {
      const parsedId = Number(req.headers['x-user-id']);
      if (!Number.isNaN(parsedId)) {
        usuarioId = parsedId;
      }
    }

    if (!usuarioId) {
      res.status(401).json({
        ok: false,
        codigo: 'NO_AUTENTICADO',
        error: 'Debe iniciar sesión para acceder a este recurso.',
      });
      return;
    }

    const usuario = store.usuarios.find((u) => u.id === usuarioId && u.activo);
    const empleado = usuario
      ? store.empleados.find((e) => e.id === usuario.empleadoId && e.activo)
      : undefined;

    if (!usuario || !empleado) {
      res.status(401).json({
        ok: false,
        codigo: 'NO_AUTENTICADO',
        error: 'Sesión inválida o usuario desactivado.',
      });
      return;
    }

    req.auth = { usuario, empleado };
    next();
  };

  const requireRole =
    (...rolesPermitidos: PerfilUsuario[]) =>
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.auth) {
        res.status(401).json({
          ok: false,
          codigo: 'NO_AUTENTICADO',
          error: 'Debe iniciar sesión.',
        });
        return;
      }

      if (!rolesPermitidos.includes(req.auth.usuario.perfil)) {
        res.status(403).json({
          ok: false,
          codigo: 'ACCESO_DENEGADO',
          error: 'No tiene permisos para acceder a esta ruta o ejecutar esta acción.',
        });
        return;
      }

      next();
    };

  // ============================================================================
  // Autenticación y Registro
  // ============================================================================
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const validacion = validarDatosRegistro(req.body ?? {});
      if (!validacion.ok || !validacion.datos) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          campo: validacion.campo,
          error: validacion.error ?? 'Verifique los datos ingresados.',
          erroresPorCampo: validacion.erroresPorCampo,
        });
        return;
      }

      const { nombres, apellidos, documento, correo, password } = validacion.datos;

      const correoDuplicado = store.empleados.find(
        (e) => e.correo.toLowerCase() === correo
      );
      if (correoDuplicado) {
        res.status(409).json({
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'correo',
          error: 'Ya existe una cuenta registrada con este correo electrónico.',
        });
        return;
      }

      const docDuplicado = store.empleados.find(
        (e) => e.documento.toLowerCase() === documento.toLowerCase()
      );
      if (docDuplicado) {
        res.status(409).json({
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'documento',
          error: 'Ya existe un usuario registrado con este documento de identidad.',
        });
        return;
      }

      const passwordHasheada = hashPassword(password);
      const now = new Date().toISOString();
      const nextEmpId = Math.max(0, ...store.empleados.map((e) => e.id)) + 1;
      const nextUsrId = Math.max(0, ...store.usuarios.map((u) => u.id)) + 1;

      const nuevoEmpleado: Empleado = {
        id: nextEmpId,
        documento,
        nombres,
        apellidos,
        correo,
        cargo: 'Cliente',
        esTecnico: false,
        activo: true,
        creadoEn: now,
        actualizadoEn: now,
      };

      const nuevoUsuario: Usuario = {
        id: nextUsrId,
        empleadoId: nextEmpId,
        perfil: 'CLIENTE',
        password: passwordHasheada,
        debeCambiarPassword: false,
        activo: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimoAcceso: now,
        creadoEn: now,
      };

      store.empleados.push(nuevoEmpleado);
      store.usuarios.push(nuevoUsuario);

      const token = encodeSessionToken(nuevoUsuario.id, nuevoUsuario.perfil);
      res.status(201).json({
        ok: true,
        mensaje: 'Cuenta creada exitosamente.',
        token,
        debeCambiarPassword: false,
        usuario: {
          id: nuevoUsuario.id,
          empleadoId: nuevoEmpleado.id,
          perfil: nuevoUsuario.perfil,
          documento: nuevoEmpleado.documento,
          nombres: nuevoEmpleado.nombres,
          apellidos: nuevoEmpleado.apellidos,
          correo: nuevoEmpleado.correo,
        },
      });
    } catch {
      res.status(500).json({
        ok: false,
        codigo: 'ERROR_INTERNO',
        error: 'No fue posible procesar el registro en este momento. Intente nuevamente.',
      });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const rawCorreo = String(req.body?.correo ?? '').trim().toLowerCase();
      const correo = rawCorreo === 'empleado@empresa.com' ? 'cliente@empresa.com' : rawCorreo;
      const password = String(req.body?.password ?? '');

      const empleado = store.empleados.find((e) => e.correo.toLowerCase() === correo);
      const usuario = empleado
        ? store.usuarios.find((u) => u.empleadoId === empleado.id)
        : undefined;

      if (
        !empleado ||
        !usuario ||
        !empleado.activo ||
        !usuario.activo ||
        !verifyPassword(password, usuario.password)
      ) {
        res.status(401).json({
          ok: false,
          codigo: 'CREDENCIALES_INVALIDAS',
          error: 'Correo o contraseña incorrectos.',
        });
        return;
      }

      const token = encodeSessionToken(usuario.id, usuario.perfil);
      res.json({
        ok: true,
        token,
        usuario: {
          id: usuario.id,
          empleadoId: empleado.id,
          perfil: usuario.perfil,
          nombres: empleado.nombres,
          apellidos: empleado.apellidos,
          correo: empleado.correo,
        },
      });
    } catch {
      res.status(500).json({
        ok: false,
        codigo: 'ERROR_INTERNO',
        error: 'No fue posible procesar el inicio de sesión en este momento.',
      });
    }
  });

  app.get('/api/me', requireAuth, (req: Request, res: Response) => {
    const { usuario, empleado } = req.auth!;
    res.json({
      ok: true,
      usuario: {
        id: usuario.id,
        empleadoId: empleado.id,
        perfil: usuario.perfil,
        nombres: empleado.nombres,
        apellidos: empleado.apellidos,
        correo: empleado.correo,
      },
    });
  });

  // ============================================================================
  // Rutas de Administrador (/api/admin/*) — Exclusivas para ADMINISTRADOR
  // ============================================================================
  app.get(
    '/api/admin/usuarios',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (_req: Request, res: Response) => {
      const data = store.usuarios.map((u) => {
        const emp = store.empleados.find((e) => e.id === u.empleadoId);
        return {
          id: u.id,
          empleadoId: u.empleadoId,
          perfil: u.perfil,
          activo: u.activo,
          ultimoAcceso: u.ultimoAcceso,
          nombres: emp?.nombres ?? '',
          apellidos: emp?.apellidos ?? '',
          correo: emp?.correo ?? '',
          cargo: emp?.cargo ?? '',
        };
      });
      res.json({ ok: true, data });
    }
  );

  app.post(
    '/api/admin/usuarios',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      if (!puedeGestionarUsuarios(req.auth!.usuario)) {
        res.status(403).json({ ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' });
        return;
      }

      const perfil: PerfilUsuario = req.body?.perfil;
      if (!['ADMINISTRADOR', 'EMPLEADO', 'CLIENTE'].includes(perfil)) {
        res.status(400).json({ ok: false, codigo: 'VALIDACION', error: 'Rol de usuario inválido.' });
        return;
      }

      let empleadoId = Number(req.body?.empleadoId || 0);
      const now = new Date().toISOString();

      if (!empleadoId) {
        const nombres = String(req.body?.nombres ?? '').trim();
        const apellidos = String(req.body?.apellidos ?? '').trim();
        const documento = String(req.body?.documento ?? '').trim();
        const correo = String(req.body?.correo ?? '').trim().toLowerCase();
        const cargo =
          String(req.body?.cargo ?? '').trim() ||
          (perfil === 'CLIENTE'
            ? 'Cliente'
            : perfil === 'EMPLEADO'
            ? 'Técnico de Mantenimiento'
            : 'Administrador');

        if (!nombres || !apellidos || !documento || !correo) {
          res.status(400).json({
            ok: false,
            codigo: 'VALIDACION',
            error: 'Complete documento, nombres, apellidos y correo.',
          });
          return;
        }

        if (store.empleados.some((e) => e.correo.toLowerCase() === correo)) {
          res.status(409).json({
            ok: false,
            codigo: 'DUPLICADO',
            error: 'Ya existe un registro con ese correo.',
          });
          return;
        }

        empleadoId = Math.max(0, ...store.empleados.map((e) => e.id)) + 1;
        store.empleados.push({
          id: empleadoId,
          documento,
          nombres,
          apellidos,
          correo,
          cargo,
          esTecnico: perfil === 'EMPLEADO',
          activo: true,
          creadoEn: now,
          actualizadoEn: now,
        });
      } else {
        const emp = store.empleados.find((e) => e.id === empleadoId);
        if (!emp) {
          res.status(404).json({ ok: false, error: 'Persona no encontrada.' });
          return;
        }
        if (store.usuarios.some((u) => u.empleadoId === empleadoId)) {
          res.status(409).json({
            ok: false,
            codigo: 'DUPLICADO',
            error: 'Esta persona ya cuenta con un usuario.',
          });
          return;
        }
        emp.esTecnico = perfil === 'EMPLEADO';
      }

      const nextId = Math.max(0, ...store.usuarios.map((u) => u.id)) + 1;
      const passwordTemporal = `Temp${Math.floor(100000 + Math.random() * 899999)}a`;
      const nuevoUsuario: Usuario = {
        id: nextId,
        empleadoId,
        perfil,
        password: passwordTemporal,
        debeCambiarPassword: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimoAcceso: null,
        activo: true,
        creadoEn: now,
      };
      store.usuarios.push(nuevoUsuario);

      res.status(201).json({
        ok: true,
        data: {
          id: nuevoUsuario.id,
          empleadoId: nuevoUsuario.empleadoId,
          perfil: nuevoUsuario.perfil,
          activo: nuevoUsuario.activo,
          passwordTemporal,
        },
      });
    }
  );

  app.put(
    '/api/admin/usuarios/:id',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const usuarioId = Number(req.params.id);
      const usr = store.usuarios.find((u) => u.id === usuarioId);
      if (!usr) {
        res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
        return;
      }

      const emp = store.empleados.find((e) => e.id === usr.empleadoId);
      const nuevoPerfil = (req.body?.perfil as PerfilUsuario | undefined) ?? usr.perfil;
      if (!['ADMINISTRADOR', 'EMPLEADO', 'CLIENTE'].includes(nuevoPerfil)) {
        res.status(400).json({ ok: false, codigo: 'VALIDACION', error: 'Rol inválido.' });
        return;
      }

      if (usr.perfil === 'ADMINISTRADOR' && nuevoPerfil !== 'ADMINISTRADOR' && usr.activo) {
        const adminsActivos = store.usuarios.filter(
          (u) => u.activo && u.perfil === 'ADMINISTRADOR'
        );
        if (adminsActivos.length <= 1) {
          res.status(400).json({
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: 'No se puede degradar al último Administrador activo.',
          });
          return;
        }
      }

      usr.perfil = nuevoPerfil;
      if (typeof req.body?.activo === 'boolean') {
        usr.activo = req.body.activo;
      }

      if (emp) {
        if (req.body?.nombres) emp.nombres = String(req.body.nombres).trim();
        if (req.body?.apellidos) emp.apellidos = String(req.body.apellidos).trim();
        if (req.body?.correo) emp.correo = String(req.body.correo).trim().toLowerCase();
        if (req.body?.cargo) emp.cargo = String(req.body.cargo).trim();
        emp.esTecnico = nuevoPerfil === 'EMPLEADO';
        emp.actualizadoEn = new Date().toISOString();
      }

      res.json({
        ok: true,
        data: {
          id: usr.id,
          perfil: usr.perfil,
          activo: usr.activo,
          nombres: emp?.nombres,
          apellidos: emp?.apellidos,
          correo: emp?.correo,
          cargo: emp?.cargo,
        },
      });
    }
  );

  app.patch(
    '/api/admin/usuarios/:id/rol',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const usuarioId = Number(req.params.id);
      const perfil = req.body?.perfil as PerfilUsuario;
      if (!['ADMINISTRADOR', 'EMPLEADO', 'CLIENTE'].includes(perfil)) {
        res.status(400).json({ ok: false, codigo: 'VALIDACION', error: 'Rol inválido.' });
        return;
      }

      const usr = store.usuarios.find((u) => u.id === usuarioId);
      if (!usr) {
        res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
        return;
      }

      if (usr.perfil === 'ADMINISTRADOR' && perfil !== 'ADMINISTRADOR' && usr.activo) {
        const adminsActivos = store.usuarios.filter(
          (u) => u.activo && u.perfil === 'ADMINISTRADOR'
        );
        if (adminsActivos.length <= 1) {
          res.status(400).json({
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: 'No se puede degradar al último Administrador activo.',
          });
          return;
        }
      }

      usr.perfil = perfil;
      const emp = store.empleados.find((e) => e.id === usr.empleadoId);
      if (emp) {
        emp.esTecnico = perfil === 'EMPLEADO';
      }

      res.json({ ok: true, data: { id: usr.id, perfil: usr.perfil } });
    }
  );

  app.patch(
    '/api/admin/usuarios/:id/estado',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const usuarioId = Number(req.params.id);
      const usr = store.usuarios.find((u) => u.id === usuarioId);
      if (!usr) {
        res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
        return;
      }

      const nuevoEstado =
        typeof req.body?.activo === 'boolean' ? req.body.activo : !usr.activo;

      if (usr.activo && !nuevoEstado && usr.perfil === 'ADMINISTRADOR') {
        const adminsActivos = store.usuarios.filter(
          (u) => u.activo && u.perfil === 'ADMINISTRADOR'
        );
        if (adminsActivos.length <= 1) {
          res.status(400).json({
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: 'No se puede desactivar al último Administrador activo.',
          });
          return;
        }
      }

      usr.activo = nuevoEstado;
      res.json({ ok: true, data: { id: usr.id, activo: usr.activo } });
    }
  );

  app.get(
    '/api/admin/empleados',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (_req: Request, res: Response) => {
      res.json({ ok: true, data: store.empleados });
    }
  );

  app.post(
    '/api/admin/solicitudes/:id/asignar',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const solicitudId = Number(req.params.id);
      const tecnicoId = Number(req.body?.tecnicoId);
      const sol = store.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) {
        res.status(404).json({ ok: false, error: 'Solicitud no encontrada.' });
        return;
      }

      if (!puedeAsignarTecnico(req.auth!.usuario, sol)) {
        res.status(400).json({
          ok: false,
          codigo: 'TRANSICION_INVALIDA',
          error: 'No se puede asignar técnico en el estado actual.',
        });
        return;
      }

      const tecnico = store.empleados.find(
        (e) => e.id === tecnicoId && e.activo && e.esTecnico
      );
      if (!tecnico) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          error: 'El técnico seleccionado no es válido o no está activo.',
        });
        return;
      }

      const now = new Date().toISOString();
      store.asignaciones.forEach((a) => {
        if (a.solicitudId === solicitudId && a.vigente) {
          a.vigente = false;
          a.finalizadaEn = now;
          a.motivoFin = 'Reasignación por Administrador';
        }
      });

      const nextAsigId = Math.max(0, ...store.asignaciones.map((a) => a.id)) + 1;
      store.asignaciones.push({
        id: nextAsigId,
        solicitudId,
        tecnicoId: tecnico.id,
        asignadaPorUsuarioId: req.auth!.usuario.id,
        asignadaEn: now,
        vigente: true,
        finalizadaEn: null,
        motivoFin: null,
      });

      sol.estado = 'Asignada';
      sol.actualizadaEn = now;
      sol.version += 1;

      res.json({ ok: true, data: sol });
    }
  );

  // ============================================================================
  // Rutas de Empleado Técnico (/api/tecnico/*) — Bloqueadas para CLIENTE
  // ============================================================================
  app.get(
    '/api/tecnico/solicitudes',
    requireAuth,
    requireRole('ADMINISTRADOR', 'EMPLEADO'),
    (req: Request, res: Response) => {
      const { usuario, empleado } = req.auth!;
      const asignadas = store.solicitudes.filter((sol) => {
        const asig = store.asignaciones.find(
          (a) => a.solicitudId === sol.id && a.vigente
        );
        if (usuario.perfil === 'ADMINISTRADOR') {
          return !!asig;
        }
        return !!asig && asig.tecnicoId === empleado.id;
      });
      res.json({ ok: true, data: asignadas });
    }
  );

  app.post(
    '/api/tecnico/solicitudes/:id/trabajo',
    requireAuth,
    requireRole('ADMINISTRADOR', 'EMPLEADO'),
    (req: Request, res: Response) => {
      const { usuario, empleado } = req.auth!;
      const solicitudId = Number(req.params.id);
      const sol = store.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) {
        res.status(404).json({ ok: false, error: 'Solicitud no encontrada.' });
        return;
      }

      const asig = store.asignaciones.find(
        (a) => a.solicitudId === sol.id && a.vigente
      );

      if (!puedeRegistrarTrabajo(usuario, empleado, sol, asig)) {
        res.status(403).json({
          ok: false,
          codigo: 'ACCESO_DENEGADO',
          error: 'No tiene permiso para registrar trabajo en esta solicitud.',
        });
        return;
      }

      const trabajo = String(req.body?.trabajoRealizado ?? '').trim();
      if (trabajo.length < 10) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          error: 'Describa el trabajo realizado (mínimo 10 caracteres).',
        });
        return;
      }

      const now = new Date().toISOString();
      sol.trabajoRealizado = trabajo;
      sol.trabajoActualizadoEn = now;
      sol.actualizadaEn = now;
      sol.version += 1;

      res.json({ ok: true, data: sol });
    }
  );

  app.patch(
    '/api/tecnico/solicitudes/:id/estado',
    requireAuth,
    requireRole('ADMINISTRADOR', 'EMPLEADO'),
    (req: Request, res: Response) => {
      const { usuario, empleado } = req.auth!;
      const solicitudId = Number(req.params.id);
      const destino = req.body?.destino as EstadoNombre;
      const motivo = String(req.body?.motivo ?? '').trim();

      const sol = store.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) {
        res.status(404).json({ ok: false, error: 'Solicitud no encontrada.' });
        return;
      }

      const asig = store.asignaciones.find(
        (a) => a.solicitudId === sol.id && a.vigente
      );

      if (!puedeVerSolicitud(usuario, empleado, sol, asig)) {
        res.status(403).json({
          ok: false,
          codigo: 'ACCESO_DENEGADO',
          error: 'No tiene permiso sobre esta solicitud.',
        });
        return;
      }

      const permitidas = obtenerTransicionesPermitidas(usuario, empleado, sol, asig);
      const trans = permitidas.find((t) => t.destino === destino);
      if (!trans) {
        res.status(403).json({
          ok: false,
          codigo: 'TRANSICION_INVALIDA',
          error: 'Transición de estado no permitida para su rol.',
        });
        return;
      }

      const now = new Date().toISOString();
      const anterior = sol.estado;
      sol.estado = destino;
      sol.actualizadaEn = now;
      if (motivo) {
        sol.trabajoRealizado = motivo;
        sol.trabajoActualizadoEn = now;
      }
      if (destino === 'Finalizada') {
        sol.cerradaEn = now;
        sol.motivoCierre = motivo || sol.trabajoRealizado || 'Reparación finalizada.';
      }
      sol.version += 1;

      store.historial.push({
        id: Math.max(0, ...store.historial.map((h) => h.id)) + 1,
        solicitudId: sol.id,
        estadoAnterior: anterior,
        estadoNuevo: destino,
        usuarioId: usuario.id,
        cambiadoEn: now,
        motivo: motivo || null,
      });

      res.json({ ok: true, data: sol });
    }
  );

  // ============================================================================
  // Rutas de Solicitudes (/api/solicitudes/*)
  // ============================================================================
  app.get('/api/solicitudes', requireAuth, (req: Request, res: Response) => {
    const { usuario, empleado } = req.auth!;
    const visibles = store.solicitudes
      .filter((sol) => {
        const asig = store.asignaciones.find(
          (a) => a.solicitudId === sol.id && a.vigente
        );
        return puedeVerSolicitud(usuario, empleado, sol, asig);
      })
      .map((sol) => sanitizarSolicitudParaRol(sol, usuario.perfil));

    res.json({ ok: true, data: visibles });
  });

  app.get('/api/solicitudes/:id', requireAuth, (req: Request, res: Response) => {
    const { usuario, empleado } = req.auth!;
    const solicitudId = Number(req.params.id);
    const sol = store.solicitudes.find((s) => s.id === solicitudId);
    if (!sol) {
      res.status(404).json({ ok: false, error: 'Solicitud no encontrada.' });
      return;
    }

    const asig = store.asignaciones.find(
      (a) => a.solicitudId === sol.id && a.vigente
    );
    if (!puedeVerSolicitud(usuario, empleado, sol, asig)) {
      res.status(403).json({
        ok: false,
        codigo: 'ACCESO_DENEGADO',
        error: 'No tiene permiso para consultar esta solicitud.',
      });
      return;
    }

    res.json({
      ok: true,
      data: sanitizarSolicitudParaRol(sol, usuario.perfil),
    });
  });

  app.post(
    '/api/solicitudes',
    requireAuth,
    requireRole('ADMINISTRADOR', 'CLIENTE'),
    (req: Request, res: Response) => {
      const { usuario, empleado } = req.auth!;
      if (!puedeCrearSolicitud(usuario)) {
        res.status(403).json({
          ok: false,
          codigo: 'ACCESO_DENEGADO',
          error: 'Su rol no permite crear solicitudes de cliente.',
        });
        return;
      }

      const recursoId = Number(req.body?.recursoId);
      const descripcion = String(req.body?.descripcion ?? '').trim();
      const rec = store.recursos.find((r) => r.id === recursoId && r.activo);
      if (!rec) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          error: 'Seleccione un recurso activo válido.',
        });
        return;
      }
      if (descripcion.length < 20) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          error: 'La descripción debe tener al menos 20 caracteres.',
        });
        return;
      }

      const now = new Date().toISOString();
      const nextId = Math.max(0, ...store.solicitudes.map((s) => s.id)) + 1;
      const nueva: Solicitud = {
        id: nextId,
        codigo: generarCodigoSolicitud(nextId),
        solicitanteId:
          usuario.perfil === 'ADMINISTRADOR' && req.body?.solicitanteId
            ? Number(req.body.solicitanteId)
            : empleado.id,
        registradaPorUsuarioId: usuario.id,
        recursoId: rec.id,
        descripcion,
        estado: 'Pendiente',
        categoriaId: null,
        prioridadId: null,
        trabajoRealizado: null,
        trabajoActualizadoEn: null,
        motivoCierre: null,
        creadaEn: now,
        actualizadaEn: now,
        cerradaEn: null,
        version: 1,
      };
      store.solicitudes.unshift(nueva);

      res.status(201).json({
        ok: true,
        data: sanitizarSolicitudParaRol(nueva, usuario.perfil),
      });
    }
  );

  // Manejador global de errores del servidor sin exponer trazas ni detalles internos
  app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      ok: false,
      codigo: 'ERROR_INTERNO',
      error: 'Ocurrió un error en el servidor. Por favor, intente nuevamente.',
    });
  });

  return app;
}
