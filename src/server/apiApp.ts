import express, { NextFunction, Request, Response } from 'express';
import {
  SEED_ANALISIS_IA,
  SEED_ASIGNACIONES,
  SEED_CATEGORIAS,
  SEED_EMPLEADOS,
  SEED_EVIDENCIAS,
  SEED_HISTORIAL,
  SEED_PRIORIDADES,
  SEED_RECURSOS,
  SEED_SOLICITUDES,
  SEED_TIPOS_RECURSO,
  SEED_USUARIOS,
} from '../data/seed';
import {
  calcularHashSha256,
  esEstadoFinal,
  generarCodigoSolicitud,
  generarInferenciaAnalisisIa,
  hashPassword,
  MAX_FOTO_BYTES,
  MAX_FOTOS,
  MAX_PDF_BYTES,
  MAX_PDFS,
  obtenerTransicionesPermitidas,
  puedeAdjuntarEvidencia,
  puedeAsignarTecnico,
  puedeCrearSolicitud,
  puedeGestionarUsuarios,
  puedeRegistrarTrabajo,
  puedeRevisarIa,
  puedeVerSolicitud,
  validarDatosRegistro,
  validarPoliticaPassword,
  verificarFirmaBinariaEvidencia,
  verifyPassword,
} from '../services/domainRules';
import {
  AnalisisIa,
  Asignacion,
  Categoria,
  DecisionRevisionIa,
  Empleado,
  EstadoNombre,
  Evidencia,
  HistorialEstado,
  PerfilUsuario,
  Prioridad,
  Recurso,
  Solicitud,
  TipoRecurso,
  Usuario,
} from '../types/domain';

export interface BackendStore {
  empleados: Empleado[];
  usuarios: Usuario[];
  tiposRecurso: TipoRecurso[];
  recursos: Recurso[];
  categorias: Categoria[];
  prioridades: Prioridad[];
  solicitudes: Solicitud[];
  evidencias: Evidencia[];
  asignaciones: Asignacion[];
  analisisIa: AnalisisIa[];
  historial: HistorialEstado[];
}

export function createInitialBackendStore(): BackendStore {
  return {
    empleados: structuredClone(SEED_EMPLEADOS),
    usuarios: structuredClone(SEED_USUARIOS),
    tiposRecurso: structuredClone(SEED_TIPOS_RECURSO),
    recursos: structuredClone(SEED_RECURSOS),
    categorias: structuredClone(SEED_CATEGORIAS),
    prioridades: structuredClone(SEED_PRIORIDADES),
    solicitudes: structuredClone(SEED_SOLICITUDES),
    evidencias: structuredClone(SEED_EVIDENCIAS),
    asignaciones: structuredClone(SEED_ASIGNACIONES),
    analisisIa: structuredClone(SEED_ANALISIS_IA),
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
  const recoveryCodes = new Map<
    string,
    { codigo: string; expiraEn: number; intentosFallidos: number; verificado: boolean }
  >();

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

  app.post('/api/auth/recovery/send-code', (req: Request, res: Response) => {
    const rawCorreo = String(req.body?.correo ?? '').trim().toLowerCase();
    const correo = rawCorreo === 'empleado@empresa.com' ? 'cliente@empresa.com' : rawCorreo;

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      res.status(400).json({
        ok: false,
        codigo: 'VALIDACION',
        campo: 'correo',
        error: 'Ingrese un correo electrónico válido.',
      });
      return;
    }

    const empleado = store.empleados.find((e) => e.correo.toLowerCase() === correo && e.activo);
    const usuario = empleado
      ? store.usuarios.find((u) => u.empleadoId === empleado.id && u.activo)
      : undefined;

    if (!empleado || !usuario) {
      res.status(404).json({
        ok: false,
        codigo: 'NO_ENCONTRADO',
        campo: 'correo',
        error:
          'Este correo electrónico no se encuentra registrado en el sistema. Puede crear una cuenta nueva o comunicarse con soporte técnico / el Administrador.',
      });
      return;
    }

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expiraEn = Date.now() + 10 * 60 * 1000;
    recoveryCodes.set(correo, {
      codigo,
      expiraEn,
      intentosFallidos: 0,
      verificado: false,
    });

    res.json({
      ok: true,
      mensaje: 'Código de verificación enviado al correo electrónico.',
      codigoSimulado: codigo,
      expiraEn,
    });
  });

  app.post('/api/auth/recovery/verify-code', (req: Request, res: Response) => {
    const rawCorreo = String(req.body?.correo ?? '').trim().toLowerCase();
    const correo = rawCorreo === 'empleado@empresa.com' ? 'cliente@empresa.com' : rawCorreo;
    const codigoInput = String(req.body?.codigo ?? '').trim();

    if (!/^\d{6}$/.test(codigoInput)) {
      res.status(400).json({
        ok: false,
        codigo: 'VALIDACION',
        campo: 'codigo',
        error: 'Ingrese el código numérico de 6 dígitos enviado a su correo.',
      });
      return;
    }

    const record = recoveryCodes.get(correo);
    if (!record || Date.now() > record.expiraEn) {
      recoveryCodes.delete(correo);
      res.status(400).json({
        ok: false,
        codigo: 'CODIGO_EXPIRADO',
        campo: 'codigo',
        error: 'El código de verificación es inválido o ha expirado. Solicite un nuevo código.',
      });
      return;
    }

    if (record.codigo !== codigoInput) {
      record.intentosFallidos += 1;
      if (record.intentosFallidos >= 5) {
        recoveryCodes.delete(correo);
      }
      res.status(400).json({
        ok: false,
        codigo: 'CODIGO_INVALIDO',
        campo: 'codigo',
        error: 'El código ingresado es incorrecto. Verifique los 6 dígitos o reenvíe un nuevo código.',
      });
      return;
    }

    record.verificado = true;
    res.json({
      ok: true,
      mensaje: 'Código de verificación validado correctamente.',
    });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    try {
      const rawCorreo = String(req.body?.correo ?? '').trim().toLowerCase();
      const correo = rawCorreo === 'empleado@empresa.com' ? 'cliente@empresa.com' : rawCorreo;
      const nuevaPassword = String(req.body?.nuevaPassword ?? '');
      const confirmacion = String(req.body?.confirmacion ?? '');

      if (!correo) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          campo: 'correo',
          error: 'Ingrese el correo electrónico asociado a su cuenta.',
        });
        return;
      }

      const empleado = store.empleados.find((e) => e.correo.toLowerCase() === correo && e.activo);
      const usuario = empleado
        ? store.usuarios.find((u) => u.empleadoId === empleado.id && u.activo)
        : undefined;

      if (!empleado || !usuario) {
        res.status(404).json({
          ok: false,
          codigo: 'NO_ENCONTRADO',
          campo: 'correo',
          error: 'No se encontró una cuenta activa asociada a este correo electrónico.',
        });
        return;
      }

      const policyError = validarPoliticaPassword(nuevaPassword);
      if (policyError) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          campo: 'nuevaPassword',
          error: policyError,
        });
        return;
      }

      if (nuevaPassword !== confirmacion) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          campo: 'confirmacion',
          error: 'Las contraseñas no coinciden.',
        });
        return;
      }

      usuario.password = hashPassword(nuevaPassword);
      usuario.debeCambiarPassword = false;
      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = null;

      res.json({
        ok: true,
        mensaje: 'Contraseña restablecida correctamente.',
      });
    } catch {
      res.status(500).json({
        ok: false,
        codigo: 'ERROR_INTERNO',
        error: 'No fue posible restablecer la contraseña en este momento.',
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
      const passwordInput = String(req.body?.password ?? '').trim();
      const passwordTemporal =
        passwordInput || `Temp${Math.floor(100000 + Math.random() * 899999)}a`;
      const nuevoUsuario: Usuario = {
        id: nextId,
        empleadoId,
        perfil,
        password: hashPassword(passwordTemporal),
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
          debeCambiarPassword: nuevoUsuario.debeCambiarPassword,
          passwordTemporal,
        },
      });
    }
  );

  // Función auxiliar HU-03: Verifica si un técnico tiene solicitudes activas (Asignada o En proceso)
  const obtenerSolicitudesActivasDeTecnico = (tecnicoId: number): Solicitud[] => {
    const asignacionesVigentes = store.asignaciones.filter(
      (a) => a.vigente && a.tecnicoId === tecnicoId
    );
    return asignacionesVigentes
      .map((a) => store.solicitudes.find((s) => s.id === a.solicitudId))
      .filter(
        (s): s is Solicitud =>
          !!s && (s.estado === 'Asignada' || s.estado === 'En proceso')
      );
  };

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

      const nuevoEsTecnico =
        typeof req.body?.esTecnico === 'boolean'
          ? req.body.esTecnico
          : nuevoPerfil === 'EMPLEADO' || (emp?.esTecnico && nuevoPerfil === 'ADMINISTRADOR');

      if (emp && emp.esTecnico && (!nuevoEsTecnico || req.body?.activo === false)) {
        const activas = obtenerSolicitudesActivasDeTecnico(emp.id);
        if (activas.length > 0) {
          res.status(400).json({
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: `El técnico tiene ${activas.length} solicitud(es) en estado Asignada o En proceso (${activas
              .map((s) => s.codigo)
              .join(', ')}). Reasígnelas antes de retirar su función técnica.`,
            solicitudesActivas: activas.map((s) => s.codigo),
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
        emp.esTecnico = Boolean(nuevoEsTecnico);
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
          esTecnico: emp?.esTecnico,
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

      const emp = store.empleados.find((e) => e.id === usr.empleadoId);
      const nuevoEsTecnico =
        typeof req.body?.esTecnico === 'boolean'
          ? req.body.esTecnico
          : perfil === 'EMPLEADO' || (emp?.esTecnico && perfil === 'ADMINISTRADOR');

      if (emp && emp.esTecnico && !nuevoEsTecnico) {
        const activas = obtenerSolicitudesActivasDeTecnico(emp.id);
        if (activas.length > 0) {
          res.status(400).json({
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: `No se puede retirar la función técnica mientras tenga solicitudes activas (${activas
              .map((s) => s.codigo)
              .join(', ')}). Reasígnelas primero.`,
            solicitudesActivas: activas.map((s) => s.codigo),
          });
          return;
        }
      }

      usr.perfil = perfil;
      if (emp) {
        emp.esTecnico = Boolean(nuevoEsTecnico);
      }

      res.json({ ok: true, data: { id: usr.id, perfil: usr.perfil, esTecnico: emp?.esTecnico } });
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

  // ============================================================================
  // HU-01 y HU-03: Registro, Edición y Habilitación Técnica de Empleados
  // ============================================================================
  app.get(
    '/api/admin/empleados',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (_req: Request, res: Response) => {
      res.json({ ok: true, data: store.empleados });
    }
  );

  app.post(
    '/api/admin/empleados',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const documento = String(req.body?.documento ?? '').trim();
      const nombres = String(req.body?.nombres ?? '').trim();
      const apellidos = String(req.body?.apellidos ?? '').trim();
      const correo = String(req.body?.correo ?? '').trim().toLowerCase();
      const cargo = String(req.body?.cargo ?? '').trim();
      const esTecnico = Boolean(req.body?.esTecnico);

      if (!documento || !nombres || !apellidos || !correo || !cargo) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          error: 'Complete todos los campos obligatorios (documento, nombres, apellidos, correo, cargo).',
        });
        return;
      }

      if (store.empleados.some((e) => e.documento.toLowerCase() === documento.toLowerCase())) {
        res.status(409).json({
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'documento',
          error: 'Ya existe un empleado con este documento de identidad.',
        });
        return;
      }

      if (store.empleados.some((e) => e.correo.toLowerCase() === correo)) {
        res.status(409).json({
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'correo',
          error: 'Ya existe un empleado registrado con este correo electrónico.',
        });
        return;
      }

      const now = new Date().toISOString();
      const nextId = Math.max(0, ...store.empleados.map((e) => e.id)) + 1;
      const nuevo: Empleado = {
        id: nextId,
        documento,
        nombres,
        apellidos,
        correo,
        cargo,
        esTecnico,
        activo: true,
        creadoEn: now,
        actualizadoEn: now,
      };
      store.empleados.push(nuevo);
      res.status(201).json({ ok: true, data: nuevo });
    }
  );

  app.put(
    '/api/admin/empleados/:id',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const empleadoId = Number(req.params.id);
      const emp = store.empleados.find((e) => e.id === empleadoId);
      if (!emp) {
        res.status(404).json({ ok: false, error: 'Empleado no encontrado.' });
        return;
      }

      const documento = req.body?.documento !== undefined ? String(req.body.documento).trim() : emp.documento;
      const nombres = req.body?.nombres !== undefined ? String(req.body.nombres).trim() : emp.nombres;
      const apellidos = req.body?.apellidos !== undefined ? String(req.body.apellidos).trim() : emp.apellidos;
      const correo = req.body?.correo !== undefined ? String(req.body.correo).trim().toLowerCase() : emp.correo;
      const cargo = req.body?.cargo !== undefined ? String(req.body.cargo).trim() : emp.cargo;
      const esTecnico = typeof req.body?.esTecnico === 'boolean' ? req.body.esTecnico : emp.esTecnico;
      const activo = typeof req.body?.activo === 'boolean' ? req.body.activo : emp.activo;

      if (store.empleados.some((e) => e.id !== emp.id && e.documento.toLowerCase() === documento.toLowerCase())) {
        res.status(409).json({
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'documento',
          error: 'Ya existe otro empleado con este documento de identidad.',
        });
        return;
      }

      if (store.empleados.some((e) => e.id !== emp.id && e.correo.toLowerCase() === correo)) {
        res.status(409).json({
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'correo',
          error: 'Ya existe otro empleado con este correo electrónico.',
        });
        return;
      }

      if (emp.esTecnico && (!esTecnico || !activo)) {
        const activas = obtenerSolicitudesActivasDeTecnico(emp.id);
        if (activas.length > 0) {
          res.status(400).json({
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: `El técnico tiene ${activas.length} solicitud(es) en estado Asignada o En proceso (${activas
              .map((s) => s.codigo)
              .join(', ')}). Reasígnelas antes de retirar la marca técnica.`,
            solicitudesActivas: activas.map((s) => s.codigo),
          });
          return;
        }
      }

      emp.documento = documento;
      emp.nombres = nombres;
      emp.apellidos = apellidos;
      emp.correo = correo;
      emp.cargo = cargo;
      emp.esTecnico = esTecnico;
      emp.activo = activo;
      emp.actualizadoEn = new Date().toISOString();

      res.json({ ok: true, data: emp });
    }
  );

  app.patch(
    '/api/admin/empleados/:id/tecnico',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const empleadoId = Number(req.params.id);
      const emp = store.empleados.find((e) => e.id === empleadoId);
      if (!emp) {
        res.status(404).json({ ok: false, error: 'Empleado no encontrado.' });
        return;
      }

      const nuevoValor =
        typeof req.body?.esTecnico === 'boolean' ? req.body.esTecnico : !emp.esTecnico;

      if (emp.esTecnico && !nuevoValor) {
        const activas = obtenerSolicitudesActivasDeTecnico(emp.id);
        if (activas.length > 0) {
          res.status(400).json({
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: `No se puede retirar la función técnica mientras tenga solicitudes activas (${activas
              .map((s) => s.codigo)
              .join(', ')}). Reasígnelas antes de confirmar.`,
            solicitudesActivas: activas.map((s) => s.codigo),
          });
          return;
        }
      }

      emp.esTecnico = nuevoValor;
      emp.actualizadoEn = new Date().toISOString();
      res.json({ ok: true, data: emp });
    }
  );

  // ============================================================================
  // HU-04: Gestión del Catálogo de Recursos Físicos
  // ============================================================================
  app.get('/api/recursos', requireAuth, (_req: Request, res: Response) => {
    res.json({ ok: true, data: store.recursos });
  });

  app.post(
    '/api/admin/recursos',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const codigo = String(req.body?.codigo ?? '').trim().toUpperCase();
      const nombre = String(req.body?.nombre ?? '').trim();
      const tipoRecursoId = Number(req.body?.tipoRecursoId);
      const ubicacion = String(req.body?.ubicacion ?? '').trim();
      const descripcion = String(req.body?.descripcion ?? '').trim();

      if (!codigo || !nombre || !ubicacion || !tipoRecursoId) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          error: 'Código, nombre, ubicación y tipo de recurso son obligatorios.',
        });
        return;
      }

      const tipo = store.tiposRecurso.find((t) => t.id === tipoRecursoId);
      if (!tipo) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          campo: 'tipoRecursoId',
          error: 'El recurso debe vincularse a una de las 4 tipologías canónicas.',
        });
        return;
      }

      if (store.recursos.some((r) => r.codigo.toUpperCase() === codigo)) {
        res.status(409).json({
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'codigo',
          error: 'Ya existe un recurso registrado con este código.',
        });
        return;
      }

      const now = new Date().toISOString();
      const nextId = Math.max(0, ...store.recursos.map((r) => r.id)) + 1;
      const nuevo: Recurso = {
        id: nextId,
        codigo,
        nombre,
        tipoRecursoId,
        ubicacion,
        descripcion,
        activo: true,
        creadoEn: now,
        actualizadoEn: now,
      };
      store.recursos.push(nuevo);
      res.status(201).json({ ok: true, data: nuevo });
    }
  );

  app.put(
    '/api/admin/recursos/:id',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const recursoId = Number(req.params.id);
      const rec = store.recursos.find((r) => r.id === recursoId);
      if (!rec) {
        res.status(404).json({ ok: false, error: 'Recurso no encontrado.' });
        return;
      }

      if (req.body?.codigo) {
        const cleanCod = String(req.body.codigo).trim().toUpperCase();
        if (store.recursos.some((r) => r.id !== rec.id && r.codigo.toUpperCase() === cleanCod)) {
          res.status(409).json({
            ok: false,
            codigo: 'DUPLICADO',
            campo: 'codigo',
            error: 'Ya existe otro recurso con este código.',
          });
          return;
        }
        rec.codigo = cleanCod;
      }
      if (req.body?.nombre) rec.nombre = String(req.body.nombre).trim();
      if (req.body?.ubicacion) rec.ubicacion = String(req.body.ubicacion).trim();
      if (req.body?.descripcion !== undefined) rec.descripcion = String(req.body.descripcion).trim();
      if (req.body?.tipoRecursoId) {
        const tipo = store.tiposRecurso.find((t) => t.id === Number(req.body.tipoRecursoId));
        if (!tipo) {
          res.status(400).json({ ok: false, codigo: 'VALIDACION', error: 'Tipología inválida.' });
          return;
        }
        rec.tipoRecursoId = tipo.id;
      }
      if (typeof req.body?.activo === 'boolean') rec.activo = req.body.activo;
      rec.actualizadoEn = new Date().toISOString();

      res.json({ ok: true, data: rec });
    }
  );

  app.delete(
    '/api/admin/recursos/:id',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const recursoId = Number(req.params.id);
      const rec = store.recursos.find((r) => r.id === recursoId);
      if (!rec) {
        res.status(404).json({ ok: false, error: 'Recurso no encontrado.' });
        return;
      }

      const tieneHistorial = store.solicitudes.some((s) => s.recursoId === recursoId);
      if (tieneHistorial) {
        res.status(409).json({
          ok: false,
          codigo: 'REGLA_NEGOCIO',
          error:
            'No se permite la eliminación física de un recurso con historial de solicitudes vinculadas. Utilice la inactivación lógica para resguardar la integridad histórica.',
        });
        return;
      }

      store.recursos = store.recursos.filter((r) => r.id !== recursoId);
      res.json({ ok: true, mensaje: 'Recurso eliminado.' });
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
      let eraReasignacion = false;
      store.asignaciones.forEach((a) => {
        if (a.solicitudId === solicitudId && a.vigente) {
          eraReasignacion = true;
          a.vigente = false;
          a.finalizadaEn = now;
          a.motivoFin = String(req.body?.motivo ?? '').trim() || 'Reasignación por Administrador';
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

      const estadoAnterior = sol.estado;
      sol.estado = 'Asignada';
      sol.actualizadaEn = now;
      sol.version += 1;

      store.historial.push({
        id: Math.max(0, ...store.historial.map((h) => h.id)) + 1,
        solicitudId: sol.id,
        estadoAnterior,
        estadoNuevo: 'Asignada',
        usuarioId: req.auth!.usuario.id,
        cambiadoEn: now,
        motivo: eraReasignacion
          ? `Reasignado a ${tecnico.nombres} ${tecnico.apellidos}`
          : `Asignado a ${tecnico.nombres} ${tecnico.apellidos}`,
      });

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

  const procesarCambioEstadoSolicitud = (req: Request, res: Response) => {
    const { usuario, empleado } = req.auth!;
    const solicitudId = Number(req.params.id);
    const destino = (req.body?.destino ?? req.body?.nuevoEstado) as EstadoNombre;
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
        error: 'Transición de estado no permitida para su rol o estado actual.',
      });
      return;
    }

    // HU-14 y HU-15: Motivo obligatorio de mínimo 10 caracteres en Cancelada, Rechazada o Retiro de asignación
    if (trans.requiereMotivo && motivo.length < 10) {
      res.status(400).json({
        ok: false,
        codigo: 'VALIDACION',
        campo: 'motivo',
        error: 'El motivo es obligatorio y debe tener al menos 10 caracteres.',
      });
      return;
    }

    const now = new Date().toISOString();
    const anterior = sol.estado;
    const cierra = esEstadoFinal(destino);
    const retiraAsignacion = destino === 'Pendiente' || cierra;

    sol.estado = destino;
    sol.actualizadaEn = now;
    if (destino === 'Finalizada' && motivo) {
      sol.trabajoRealizado = motivo;
      sol.trabajoActualizadoEn = now;
    }
    if (cierra) {
      sol.cerradaEn = now;
      sol.motivoCierre = motivo || sol.trabajoRealizado || `Estado cambiado a ${destino}`;
    }
    if (retiraAsignacion) {
      store.asignaciones.forEach((a) => {
        if (a.solicitudId === sol.id && a.vigente) {
          a.vigente = false;
          a.finalizadaEn = now;
          a.motivoFin = motivo || `Estado cambiado a ${destino}`;
        }
      });
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
  };

  app.patch(
    '/api/tecnico/solicitudes/:id/estado',
    requireAuth,
    requireRole('ADMINISTRADOR', 'EMPLEADO'),
    procesarCambioEstadoSolicitud
  );

  // HU-12, HU-13, HU-14, HU-15: Endpoint unificado de transición de estado (incluye cancelación de CLIENTE en Pendiente)
  app.patch('/api/solicitudes/:id/estado', requireAuth, procesarCambioEstadoSolicitud);

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

      let solicitanteId = empleado.id;
      let motivoInicial: string | null = 'Radicación inicial de solicitud';
      if (usuario.perfil === 'ADMINISTRADOR' && req.body?.solicitanteId) {
        const targetEmp = store.empleados.find(
          (e) => e.id === Number(req.body.solicitanteId) && e.activo
        );
        if (!targetEmp) {
          res.status(400).json({
            ok: false,
            codigo: 'VALIDACION',
            campo: 'solicitanteId',
            error: 'El empleado solicitante seleccionado no existe o está inactivo.',
          });
          return;
        }
        solicitanteId = targetEmp.id;
        if (targetEmp.id !== empleado.id) {
          motivoInicial = `Registrada por ${empleado.nombres} ${empleado.apellidos} a nombre de ${targetEmp.nombres} ${targetEmp.apellidos}`;
        }
      }

      const now = new Date().toISOString();
      const nextId = Math.max(0, ...store.solicitudes.map((s) => s.id)) + 1;
      const nueva: Solicitud = {
        id: nextId,
        codigo: generarCodigoSolicitud(nextId),
        solicitanteId,
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

      // HU-20: Registrar evento inicial en el historial forense de estados
      store.historial.push({
        id: Math.max(0, ...store.historial.map((h) => h.id)) + 1,
        solicitudId: nueva.id,
        estadoAnterior: null,
        estadoNuevo: 'Pendiente',
        usuarioId: usuario.id,
        cambiadoEn: now,
        motivo: motivoInicial,
      });

      // HU-16 y HU-17: Disparo automático del análisis de IA (v1) validado contra catálogos oficiales
      const inferencia = generarInferenciaAnalisisIa(
        nueva.descripcion,
        rec.nombre,
        rec.codigo,
        0,
        store.categorias,
        store.prioridades
      );
      store.analisisIa.push({
        id: Math.max(0, ...store.analisisIa.map((a) => a.id)) + 1,
        solicitudId: nueva.id,
        version: 1,
        estadoAnalisis: 'COMPLETADO',
        tipoDano: inferencia.tipoDano,
        descripcionObservada: inferencia.descripcionObservada,
        categoriaSugeridaId: inferencia.categoriaSugeridaId,
        prioridadSugeridaId: inferencia.prioridadSugeridaId,
        modelo: inferencia.modelo,
        solicitadoPorUsuarioId: usuario.id,
        creadoEn: now,
        completadoEn: now,
        errorDetalle: null,
        decisionRevision: 'PENDIENTE',
        revisadoPorUsuarioId: null,
        revisadoEn: null,
      });

      res.status(201).json({
        ok: true,
        data: sanitizarSolicitudParaRol(nueva, usuario.perfil),
      });
    }
  );

  // ============================================================================
  // HU-07 y HU-10: Adjunción, Validación Binaria, SHA-256 y Descarga Protegida de Evidencias
  // ============================================================================
  app.post('/api/solicitudes/:id/evidencias', requireAuth, (req: Request, res: Response) => {
    const { usuario, empleado } = req.auth!;
    const solicitudId = Number(req.params.id);
    const sol = store.solicitudes.find((s) => s.id === solicitudId);
    if (!sol) {
      res.status(404).json({ ok: false, error: 'Solicitud no encontrada.' });
      return;
    }

    const asig = store.asignaciones.find((a) => a.solicitudId === sol.id && a.vigente);
    if (!puedeAdjuntarEvidencia(usuario, empleado, sol, asig)) {
      res.status(403).json({
        ok: false,
        codigo: 'ACCESO_DENEGADO',
        error: 'No tiene permisos para adjuntar evidencias a esta solicitud.',
      });
      return;
    }

    const nombreOriginal = String(req.body?.nombreOriginal ?? '').trim();
    const dataUrl = String(req.body?.dataUrl ?? '').trim();
    const tamanoBytes = Number(req.body?.tamanoBytes ?? 0);

    if (!nombreOriginal || !dataUrl || tamanoBytes <= 0) {
      res.status(400).json({
        ok: false,
        codigo: 'VALIDACION',
        error: 'Debe proporcionar nombreOriginal, dataUrl (contenido binario base64) y tamanoBytes.',
      });
      return;
    }

    const firmaCheck = verificarFirmaBinariaEvidencia(dataUrl, nombreOriginal);
    if (!firmaCheck.ok) {
      res.status(400).json({
        ok: false,
        codigo: 'FIRMA_BINARIA_INVALIDA',
        error: firmaCheck.error,
      });
      return;
    }

    const existentes = store.evidencias.filter((e) => e.solicitudId === solicitudId);
    const fotosCount = existentes.filter((e) => e.tipo === 'FOTOGRAFIA').length;
    const pdfsCount = existentes.filter((e) => e.tipo === 'PDF').length;

    if (firmaCheck.tipo === 'FOTOGRAFIA') {
      if (fotosCount >= MAX_FOTOS) {
        res.status(400).json({
          ok: false,
          codigo: 'CUOTA_EXCEDIDA',
          error: `Máximo ${MAX_FOTOS} fotografías por solicitud.`,
        });
        return;
      }
      if (tamanoBytes > MAX_FOTO_BYTES) {
        res.status(400).json({
          ok: false,
          codigo: 'TAMANO_EXCEDIDO',
          error: 'La fotografía supera el límite máximo de 5 MB.',
        });
        return;
      }
    } else {
      if (pdfsCount >= MAX_PDFS) {
        res.status(400).json({
          ok: false,
          codigo: 'CUOTA_EXCEDIDA',
          error: `Máximo ${MAX_PDFS} documentos PDF por solicitud.`,
        });
        return;
      }
      if (tamanoBytes > MAX_PDF_BYTES) {
        res.status(400).json({
          ok: false,
          codigo: 'TAMANO_EXCEDIDO',
          error: 'El documento PDF supera el límite máximo de 10 MB.',
        });
        return;
      }
    }

    const hashSha256 = calcularHashSha256(dataUrl);
    const now = new Date().toISOString();
    const nextId = Math.max(0, ...store.evidencias.map((e) => e.id)) + 1;
    const nuevaEvidencia: Evidencia = {
      id: nextId,
      solicitudId,
      tipo: firmaCheck.tipo,
      nombreOriginal,
      nombreAlmacenado: `ev-${solicitudId}-${Date.now()}-${nextId}`,
      tipoMime: firmaCheck.mimeReal,
      tamanoBytes,
      hashSha256,
      subidaPorUsuarioId: usuario.id,
      subidaEn: now,
      dataUrl,
    };

    store.evidencias.push(nuevaEvidencia);
    res.status(201).json({ ok: true, data: nuevaEvidencia });
  });

  const procesarDescargaEvidencia = (req: Request, res: Response) => {
    const { usuario, empleado } = req.auth!;
    const evidenciaId = Number(req.params.evidenciaId ?? req.params.id);
    const ev = store.evidencias.find((e) => e.id === evidenciaId);
    if (!ev) {
      res.status(404).json({ ok: false, error: 'Evidencia no encontrada.' });
      return;
    }

    const sol = store.solicitudes.find((s) => s.id === ev.solicitudId);
    if (!sol) {
      res.status(404).json({ ok: false, error: 'Solicitud asociada no encontrada.' });
      return;
    }

    const asig = store.asignaciones.find((a) => a.solicitudId === sol.id && a.vigente);
    if (!puedeVerSolicitud(usuario, empleado, sol, asig)) {
      res.status(403).json({
        ok: false,
        codigo: 'ACCESO_DENEGADO',
        error: 'Acceso denegado: no tiene permisos para inspeccionar ni descargar evidencias de este expediente.',
      });
      return;
    }

    res.json({
      ok: true,
      auditadoPorUsuarioId: usuario.id,
      auditadoEn: new Date().toISOString(),
      data: ev,
    });
  };

  app.get('/api/solicitudes/:id/evidencias/:evidenciaId/descargar', requireAuth, procesarDescargaEvidencia);
  app.get('/api/evidencias/:evidenciaId/descargar', requireAuth, procesarDescargaEvidencia);

  // ============================================================================
  // HU-16, HU-17 y HU-18: Análisis Asistido por IA, Validación de Catálogo y Revisión Humana
  // ============================================================================
  app.get('/api/solicitudes/:id/analisis-ia', requireAuth, (req: Request, res: Response) => {
    const { usuario, empleado } = req.auth!;
    const solicitudId = Number(req.params.id);
    const sol = store.solicitudes.find((s) => s.id === solicitudId);
    if (!sol) {
      res.status(404).json({ ok: false, error: 'Solicitud no encontrada.' });
      return;
    }

    const asig = store.asignaciones.find((a) => a.solicitudId === sol.id && a.vigente);
    if (!puedeVerSolicitud(usuario, empleado, sol, asig)) {
      res.status(403).json({
        ok: false,
        codigo: 'ACCESO_DENEGADO',
        error: 'No tiene permisos para consultar el análisis de IA de esta solicitud.',
      });
      return;
    }

    const versiones = store.analisisIa
      .filter((a) => a.solicitudId === solicitudId)
      .sort((a, b) => b.version - a.version);
    res.json({ ok: true, data: versiones });
  });

  app.post(
    '/api/admin/solicitudes/:id/analisis-ia',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const { usuario } = req.auth!;
      const solicitudId = Number(req.params.id);
      const sol = store.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) {
        res.status(404).json({ ok: false, error: 'Solicitud no encontrada.' });
        return;
      }

      const rec = store.recursos.find((r) => r.id === sol.recursoId);
      const evsCount = store.evidencias.filter((e) => e.solicitudId === sol.id).length;
      const prevVersiones = store.analisisIa.filter((a) => a.solicitudId === solicitudId);
      const nextVersion = Math.max(0, ...prevVersiones.map((a) => a.version)) + 1;
      const nextId = Math.max(0, ...store.analisisIa.map((a) => a.id)) + 1;
      const now = new Date().toISOString();

      if (req.body?.simularFallo) {
        const analisisFallido: AnalisisIa = {
          id: nextId,
          solicitudId,
          version: nextVersion,
          estadoAnalisis: 'FALLIDO',
          tipoDano: null,
          descripcionObservada: null,
          categoriaSugeridaId: null,
          prioridadSugeridaId: null,
          modelo: 'gemini-2.5-flash',
          solicitadoPorUsuarioId: usuario.id,
          creadoEn: now,
          completadoEn: now,
          errorDetalle:
            String(req.body?.errorDetalle ?? '').trim() ||
            'Tiempo de espera agotado al contactar al servicio externo de IA.',
          decisionRevision: 'PENDIENTE',
          revisadoPorUsuarioId: null,
          revisadoEn: null,
        };
        store.analisisIa.push(analisisFallido);
        res.status(201).json({ ok: true, data: analisisFallido });
        return;
      }

      const inferencia = generarInferenciaAnalisisIa(
        sol.descripcion,
        rec?.nombre ?? '',
        rec?.codigo ?? '',
        evsCount,
        store.categorias,
        store.prioridades,
        req.body?.sugerenciaExterna
      );

      const nuevoAnalisis: AnalisisIa = {
        id: nextId,
        solicitudId,
        version: nextVersion,
        estadoAnalisis: 'COMPLETADO',
        tipoDano: inferencia.tipoDano,
        descripcionObservada: inferencia.descripcionObservada,
        categoriaSugeridaId: inferencia.categoriaSugeridaId,
        prioridadSugeridaId: inferencia.prioridadSugeridaId,
        modelo: inferencia.modelo,
        solicitadoPorUsuarioId: usuario.id,
        creadoEn: now,
        completadoEn: now,
        errorDetalle: null,
        decisionRevision: 'PENDIENTE',
        revisadoPorUsuarioId: null,
        revisadoEn: null,
      };
      store.analisisIa.push(nuevoAnalisis);
      res.status(201).json({ ok: true, data: nuevoAnalisis });
    }
  );

  app.post(
    '/api/admin/solicitudes/:id/analisis-ia/:analisisId/revisar',
    requireAuth,
    requireRole('ADMINISTRADOR'),
    (req: Request, res: Response) => {
      const { usuario } = req.auth!;
      if (!puedeRevisarIa(usuario)) {
        res.status(403).json({ ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' });
        return;
      }

      const solicitudId = Number(req.params.id);
      const analisisId = Number(req.params.analisisId);
      const decision = req.body?.decision as Exclude<DecisionRevisionIa, 'PENDIENTE'>;

      if (!['ACEPTADO', 'MODIFICADO', 'DESCARTADO'].includes(decision)) {
        res.status(400).json({
          ok: false,
          codigo: 'VALIDACION',
          error: 'Decisión inválida. Use ACEPTADO, MODIFICADO o DESCARTADO.',
        });
        return;
      }

      const sol = store.solicitudes.find((s) => s.id === solicitudId);
      const analisis = store.analisisIa.find(
        (a) => a.id === analisisId && a.solicitudId === solicitudId
      );
      if (!sol || !analisis) {
        res.status(404).json({ ok: false, error: 'Solicitud o análisis de IA no encontrado.' });
        return;
      }

      if (decision === 'ACEPTADO') {
        sol.categoriaId = analisis.categoriaSugeridaId;
        sol.prioridadId = analisis.prioridadSugeridaId;
      } else if (decision === 'MODIFICADO') {
        const catId = Number(req.body?.categoriaId);
        const prioId = Number(req.body?.prioridadId);
        const catValida = store.categorias.find((c) => c.id === catId && c.activa);
        const prioValida = store.prioridades.find((p) => p.id === prioId);
        if (!catValida || !prioValida) {
          res.status(400).json({
            ok: false,
            codigo: 'VALIDACION',
            error: 'Seleccione una categoría activa y una prioridad válidas del catálogo.',
          });
          return;
        }
        sol.categoriaId = catValida.id;
        sol.prioridadId = prioValida.id;
      } else if (decision === 'DESCARTADO') {
        sol.categoriaId = null;
        sol.prioridadId = null;
      }

      const now = new Date().toISOString();
      analisis.decisionRevision = decision;
      analisis.revisadoPorUsuarioId = usuario.id;
      analisis.revisadoEn = now;
      sol.actualizadaEn = now;
      sol.version += 1;

      res.json({
        ok: true,
        data: {
          solicitud: sol,
          analisis,
        },
      });
    }
  );

  // ============================================================================
  // HU-20: Trazabilidad y Consulta del Historial Cronológico de Estados
  // ============================================================================
  app.get('/api/solicitudes/:id/historial', requireAuth, (req: Request, res: Response) => {
    const { usuario, empleado } = req.auth!;
    const solicitudId = Number(req.params.id);
    const sol = store.solicitudes.find((s) => s.id === solicitudId);
    if (!sol) {
      res.status(404).json({ ok: false, error: 'Solicitud no encontrada.' });
      return;
    }

    const asig = store.asignaciones.find((a) => a.solicitudId === sol.id && a.vigente);
    if (!puedeVerSolicitud(usuario, empleado, sol, asig)) {
      res.status(403).json({
        ok: false,
        codigo: 'ACCESO_DENEGADO',
        error: 'No tiene permisos para consultar el historial de esta solicitud.',
      });
      return;
    }

    const bitacora = store.historial
      .filter((h) => h.solicitudId === solicitudId)
      .sort((a, b) => new Date(a.cambiadoEn).getTime() - new Date(b.cambiadoEn).getTime())
      .map((h) => {
        const usrActuante = store.usuarios.find((u) => u.id === h.usuarioId);
        const empActuante = usrActuante
          ? store.empleados.find((e) => e.id === usrActuante.empleadoId)
          : undefined;
        return {
          ...h,
          usuarioNombre: empActuante
            ? `${empActuante.nombres} ${empActuante.apellidos}`
            : 'Sistema',
          usuarioPerfil: usrActuante?.perfil ?? null,
        };
      });

    res.json({ ok: true, data: bitacora });
  });

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
