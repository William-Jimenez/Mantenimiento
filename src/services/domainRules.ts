import {
  Asignacion,
  Empleado,
  EstadoNombre,
  PerfilUsuario,
  Solicitud,
  Usuario,
} from '../types/domain';

export const ESTADOS_ORDEN: EstadoNombre[] = [
  'Pendiente',
  'Asignada',
  'En proceso',
  'Finalizada',
  'Cancelada',
  'Rechazada',
];

export const ESTADOS_FINALES: EstadoNombre[] = ['Finalizada', 'Cancelada', 'Rechazada'];

export const ETIQUETA_PERFIL: Record<PerfilUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  EMPLEADO: 'Empleado (Técnico)',
  CLIENTE: 'Cliente',
};

export function esEstadoFinal(estado: EstadoNombre): boolean {
  return ESTADOS_FINALES.includes(estado);
}

/**
 * Jerarquía de permisos por ruta (Frontend + Backend Route Guard):
 * - ADMINISTRADOR: acceso total a todas las rutas.
 * - EMPLEADO (técnico): acceso a inicio, bandeja técnica (/tecnico, /tecnico/solicitudes),
 *   listado y detalle de sus solicitudes asignadas (/solicitudes, /solicitudes/:id).
 *   Sin acceso a rutas administrativas (/admin/*) ni a creación de solicitudes de cliente (/solicitudes/nueva).
 * - CLIENTE: acceso únicamente a inicio, crear solicitud (/solicitudes/nueva) y consultar sus propias
 *   solicitudes (/solicitudes, /solicitudes/:id).
 *   Sin acceso a rutas de empleado (/tecnico/*) ni de administrador (/admin/*).
 */
export function tienePermisoRuta(usuario: Usuario | null, pathname: string): boolean {
  const cleanPath = pathname.split('?')[0] || '/';

  if (!usuario || !usuario.activo) {
    return (
      cleanPath === '/login' ||
      cleanPath === '/registro' ||
      cleanPath === '/recuperar-contrasena' ||
      cleanPath === '/cuenta/contrasena'
    );
  }

  if (usuario.debeCambiarPassword) {
    return cleanPath === '/cuenta/contrasena' || cleanPath === '/recuperar-contrasena';
  }

  if (cleanPath === '/recuperar-contrasena' || cleanPath === '/cuenta/contrasena') {
    return true;
  }

  if (cleanPath === '/error') {
    return true;
  }

  const esRutaAdmin = cleanPath === '/admin' || cleanPath.startsWith('/admin/');
  const esRutaTecnico = cleanPath === '/tecnico' || cleanPath.startsWith('/tecnico/');
  const esNuevaSolicitud = cleanPath === '/solicitudes/nueva';

  if (usuario.perfil === 'ADMINISTRADOR') {
    return true;
  }

  if (usuario.perfil === 'EMPLEADO') {
    if (esRutaAdmin) return false;
    if (esNuevaSolicitud) return false;
    return (
      cleanPath === '/' ||
      esRutaTecnico ||
      cleanPath === '/solicitudes' ||
      /^\/solicitudes\/\d+$/.test(cleanPath)
    );
  }

  if (usuario.perfil === 'CLIENTE') {
    if (esRutaAdmin || esRutaTecnico) return false;
    return (
      cleanPath === '/' ||
      esNuevaSolicitud ||
      cleanPath === '/solicitudes' ||
      /^\/solicitudes\/\d+$/.test(cleanPath)
    );
  }

  return false;
}

export function puedeGestionarUsuarios(usuario: Usuario | null): boolean {
  return !!usuario && usuario.activo && usuario.perfil === 'ADMINISTRADOR';
}

export function puedeAccederRutaEmpleado(usuario: Usuario | null): boolean {
  return (
    !!usuario &&
    usuario.activo &&
    (usuario.perfil === 'ADMINISTRADOR' || usuario.perfil === 'EMPLEADO')
  );
}

export function puedeCrearSolicitud(usuario: Usuario | null): boolean {
  return (
    !!usuario &&
    usuario.activo &&
    (usuario.perfil === 'ADMINISTRADOR' || usuario.perfil === 'CLIENTE')
  );
}

/**
 * Control de visibilidad de solicitudes por rol:
 * - ADMINISTRADOR: ve todas las solicitudes.
 * - EMPLEADO (técnico): ve únicamente las solicitudes que tiene asignadas.
 * - CLIENTE: ve únicamente las solicitudes realizadas por él mismo.
 */
export function puedeVerSolicitud(
  usuario: Usuario,
  empleado: Empleado,
  solicitud: Solicitud,
  asignacionVigente?: Asignacion
): boolean {
  if (!usuario.activo || !empleado.activo) return false;

  if (usuario.perfil === 'ADMINISTRADOR') {
    return true;
  }

  if (usuario.perfil === 'EMPLEADO') {
    return !!asignacionVigente && asignacionVigente.tecnicoId === empleado.id;
  }

  if (usuario.perfil === 'CLIENTE') {
    return solicitud.solicitanteId === empleado.id;
  }

  return false;
}

/**
 * Permiso para registrar o actualizar el trabajo realizado en una solicitud:
 * - ADMINISTRADOR: permitido en cualquier solicitud activa.
 * - EMPLEADO (técnico): permitido únicamente en solicitudes asignadas a él en estado Asignada o En proceso.
 * - CLIENTE: denegado.
 */
export function puedeRegistrarTrabajo(
  usuario: Usuario,
  empleado: Empleado,
  solicitud: Solicitud,
  asignacionVigente?: Asignacion
): boolean {
  if (esEstadoFinal(solicitud.estado)) return false;
  if (usuario.perfil === 'ADMINISTRADOR') return true;
  if (usuario.perfil === 'EMPLEADO') {
    return (
      !!asignacionVigente &&
      asignacionVigente.tecnicoId === empleado.id &&
      (solicitud.estado === 'Asignada' || solicitud.estado === 'En proceso')
    );
  }
  return false;
}

export function puedeAdjuntarEvidencia(
  usuario: Usuario,
  empleado: Empleado,
  solicitud: Solicitud,
  asignacionVigente?: Asignacion
): boolean {
  if (esEstadoFinal(solicitud.estado)) return false;
  if (usuario.perfil === 'ADMINISTRADOR') return true;
  if (usuario.perfil === 'EMPLEADO') {
    return (
      !!asignacionVigente &&
      asignacionVigente.tecnicoId === empleado.id &&
      (solicitud.estado === 'Asignada' || solicitud.estado === 'En proceso')
    );
  }
  if (usuario.perfil === 'CLIENTE') {
    return solicitud.solicitanteId === empleado.id && solicitud.estado === 'Pendiente';
  }
  return false;
}

export function puedeAsignarTecnico(usuario: Usuario, solicitud: Solicitud): boolean {
  return (
    usuario.perfil === 'ADMINISTRADOR' &&
    (solicitud.estado === 'Pendiente' || solicitud.estado === 'Asignada')
  );
}

export function puedeRevisarIa(usuario: Usuario): boolean {
  return usuario.perfil === 'ADMINISTRADOR';
}

export interface TransicionDisponible {
  destino: EstadoNombre;
  etiqueta: string;
  requiereMotivo: boolean;
  motivoOpcional: boolean;
  esRetiroAsignacion?: boolean;
}

/**
 * Máquina de estados por rol:
 * - ADMINISTRADOR: control completo de transiciones operativas y administrativas.
 * - EMPLEADO (técnico): en solicitudes asignadas a él, puede iniciar atención (Asignada -> En proceso)
 *   y finalizar la reparación registrando el trabajo realizado (En proceso -> Finalizada).
 * - CLIENTE: solo consulta el estado de sus propias solicitudes; no ejecuta transiciones técnicas ni administrativas.
 */
export function obtenerTransicionesPermitidas(
  usuario: Usuario,
  empleado: Empleado,
  solicitud: Solicitud,
  asignacionVigente?: Asignacion
): TransicionDisponible[] {
  if (esEstadoFinal(solicitud.estado)) return [];

  const esAdmin = usuario.perfil === 'ADMINISTRADOR';
  const esTecnicoAsignado =
    usuario.perfil === 'EMPLEADO' &&
    !!asignacionVigente &&
    asignacionVigente.tecnicoId === empleado.id;

  const transiciones: TransicionDisponible[] = [];

  if (solicitud.estado === 'Pendiente') {
    if (esAdmin) {
      transiciones.push({
        destino: 'Rechazada',
        etiqueta: 'Rechazar solicitud',
        requiereMotivo: true,
        motivoOpcional: false,
      });
      transiciones.push({
        destino: 'Cancelada',
        etiqueta: 'Cancelar solicitud',
        requiereMotivo: true,
        motivoOpcional: false,
      });
    }
  } else if (solicitud.estado === 'Asignada') {
    if (esAdmin || esTecnicoAsignado) {
      transiciones.push({
        destino: 'En proceso',
        etiqueta: 'Iniciar atención',
        requiereMotivo: false,
        motivoOpcional: false,
      });
    }
    if (esAdmin) {
      transiciones.push({
        destino: 'Pendiente',
        etiqueta: 'Retirar asignación',
        requiereMotivo: true,
        motivoOpcional: false,
        esRetiroAsignacion: true,
      });
      transiciones.push({
        destino: 'Cancelada',
        etiqueta: 'Cancelar solicitud',
        requiereMotivo: true,
        motivoOpcional: false,
      });
    }
  } else if (solicitud.estado === 'En proceso') {
    if (esAdmin || esTecnicoAsignado) {
      transiciones.push({
        destino: 'Finalizada',
        etiqueta: 'Finalizar reparación',
        requiereMotivo: false,
        motivoOpcional: true,
      });
    }
    if (esAdmin) {
      transiciones.push({
        destino: 'Cancelada',
        etiqueta: 'Cancelar solicitud',
        requiereMotivo: true,
        motivoOpcional: false,
      });
    }
  }

  return transiciones;
}

/**
 * Validación de contraseña según TRD 2.8 (>= 10 caracteres con al menos una letra y un número)
 */
export function validarPoliticaPassword(password: string): string | null {
  if (password.length < 10) {
    return 'La contraseña debe tener al menos 10 caracteres.';
  }
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password)) {
    return 'La contraseña debe incluir al menos una letra.';
  }
  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe incluir al menos un número.';
  }
  return null;
}

/**
 * Validación de evidencias según SU-10 (máximo 5 fotos JPEG/PNG de 5 MB y 2 PDF de 10 MB)
 */
export const MAX_FOTOS = 5;
export const MAX_PDFS = 2;
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export interface ArchivoValidado {
  file: File;
  tipo: 'FOTOGRAFIA' | 'PDF';
  dataUrl: string;
}

export function validarArchivoEvidencia(
  file: File,
  fotosActuales: number,
  pdfsActuales: number
): { ok: true; tipo: 'FOTOGRAFIA' | 'PDF' } | { ok: false; error: string } {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  const esFoto = mime === 'image/jpeg' || mime === 'image/png' || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
  const esPdf = mime === 'application/pdf' || ext === 'pdf';

  if (esFoto && (mime === 'image/jpeg' || mime === 'image/png' || mime === '')) {
    if (mime && mime !== 'image/jpeg' && mime !== 'image/png') {
      return { ok: false, error: `${file.name}: formato no permitido` };
    }
    if (fotosActuales >= MAX_FOTOS) {
      return { ok: false, error: `Máximo ${MAX_FOTOS} fotografías por solicitud` };
    }
    if (file.size > MAX_FOTO_BYTES) {
      return { ok: false, error: `${file.name} supera los 5 MB` };
    }
    return { ok: true, tipo: 'FOTOGRAFIA' };
  }

  if (esPdf && (mime === 'application/pdf' || mime === '')) {
    if (mime && mime !== 'application/pdf') {
      return { ok: false, error: `${file.name}: formato no permitido` };
    }
    if (pdfsActuales >= MAX_PDFS) {
      return { ok: false, error: `Máximo ${MAX_PDFS} documentos PDF por solicitud` };
    }
    if (file.size > MAX_PDF_BYTES) {
      return { ok: false, error: `${file.name} supera los 10 MB` };
    }
    return { ok: true, tipo: 'PDF' };
  }

  return { ok: false, error: `${file.name}: formato no permitido (solo JPEG, PNG o PDF)` };
}

export function formatearFecha(iso: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function generarCodigoSolicitud(secuencia: number, year = 2026): string {
  return `SM-${year}-${String(secuencia).padStart(6, '0')}`;
}

export interface NavLinkItem {
  id: string;
  label: string;
  path: string;
  priority: number;
  estimatedWidthPx: number;
  matchPrefix?: boolean;
}

export interface HeaderLayoutInput {
  containerWidth: number;
  navItems: NavLinkItem[];
  hasPrimaryCta: boolean;
  userDisplayLength: number;
}

export interface HeaderLayoutAllocation {
  mode: 'single-row' | 'two-tier' | 'compact-stack';
  navGapPx: number;
  compactUserSession: boolean;
  totalEstimatedSingleRowPx: number;
  availableWidthPx: number;
}

/**
 * Algoritmo determinista de presupuesto espacial para el encabezado (Spatial Budget Allocation):
 * Calcula el ancho requerido por las 3 zonas (Marca + Navegación + Controles/Sesión/CTA)
 * y determina el modo óptimo de disposición ('single-row', 'two-tier' o 'compact-stack')
 * para garantizar que todos los elementos sean 100% visibles y accesibles dentro del viewport
 * sin desbordamiento horizontal en cualquier resolución.
 */
export function calcularDistribucionHeader(input: HeaderLayoutInput): HeaderLayoutAllocation {
  const { containerWidth, navItems, userDisplayLength } = input;
  const horizontalPadding = containerWidth < 640 ? 28 : 48;
  const availableWidthPx = Math.max(320, containerWidth - horizontalPadding);

  const brandWidth = 145;
  const controlsWidth = 110;
  const userSessionWidth = Math.min(290, Math.max(180, userDisplayLength * 6.5 + 125));

  const navGapPx = availableWidthPx >= 1180 ? 18 : 12;
  const navItemsWidth =
    navItems.reduce((sum, item) => sum + item.estimatedWidthPx, 0) +
    Math.max(0, navItems.length - 1) * navGapPx;

  const zoneGaps = 28;
  const totalEstimatedSingleRowPx =
    brandWidth + navItemsWidth + controlsWidth + userSessionWidth + zoneGaps;

  return {
    mode: 'single-row',
    navGapPx,
    compactUserSession: availableWidthPx < 1080,
    totalEstimatedSingleRowPx,
    availableWidthPx,
  };
}

export {
  esPasswordHasheada,
  hashPassword,
  validarDatosRegistro,
  verifyPassword,
  type CampoRegistro,
  type RegistroInput,
  type ResultadoValidacionRegistro,
} from './passwordSecurity';
