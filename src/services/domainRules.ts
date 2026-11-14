import {
  Asignacion,
  Empleado,
  EstadoNombre,
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

export function esEstadoFinal(estado: EstadoNombre): boolean {
  return ESTADOS_FINALES.includes(estado);
}

/**
 * Matriz de permisos provisional (SU-03, PRD 1.7)
 */
export function puedeVerSolicitud(
  usuario: Usuario,
  empleado: Empleado,
  solicitud: Solicitud,
  asignacionVigente?: Asignacion
): boolean {
  if (usuario.perfil === 'ADMINISTRADOR') return true;
  if (solicitud.solicitanteId === empleado.id) return true;
  if (empleado.esTecnico && asignacionVigente && asignacionVigente.tecnicoId === empleado.id) {
    return true;
  }
  return false;
}

export function puedeAdjuntarEvidencia(
  usuario: Usuario,
  empleado: Empleado,
  solicitud: Solicitud
): boolean {
  if (esEstadoFinal(solicitud.estado)) return false;
  if (usuario.perfil === 'ADMINISTRADOR') return true;
  return solicitud.solicitanteId === empleado.id && solicitud.estado === 'Pendiente';
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
 * Máquina de estados (SU-04, PRD 1.8)
 */
export function obtenerTransicionesPermitidas(
  usuario: Usuario,
  empleado: Empleado,
  solicitud: Solicitud,
  asignacionVigente?: Asignacion
): TransicionDisponible[] {
  if (esEstadoFinal(solicitud.estado)) return [];

  const esAdmin = usuario.perfil === 'ADMINISTRADOR';
  const esSolicitante = solicitud.solicitanteId === empleado.id;
  const esTecnicoAsignado =
    empleado.esTecnico &&
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
    }
    if (esAdmin || esSolicitante) {
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
        etiqueta: 'Finalizar',
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
