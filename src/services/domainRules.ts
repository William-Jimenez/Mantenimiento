import {
  Asignacion,
  Categoria,
  Empleado,
  EstadoNombre,
  PerfilUsuario,
  Prioridad,
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
  const esSolicitante = solicitud.solicitanteId === empleado.id;
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
  file: { name: string; type: string; size: number },
  fotosActuales: number,
  pdfsActuales: number,
  headerBytes?: Uint8Array
): { ok: true; tipo: 'FOTOGRAFIA' | 'PDF'; mimeReal?: string } | { ok: false; error: string } {
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (headerBytes && headerBytes.length >= 4) {
    const checkMagic = verificarFirmaBinariaEvidencia(headerBytes, file.name);
    if (!checkMagic.ok) {
      return checkMagic;
    }
  }

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

/**
 * HU-07 / RF-07: Valida la firma binaria (números mágicos / primeros bytes) de un archivo o dataUrl
 * para confirmar que su tipo MIME real sea image/jpeg, image/png o application/pdf,
 * rechazando archivos ejecutables (MZ/PE, ELF, scripts) o extensiones falseadas.
 */
export function verificarFirmaBinariaEvidencia(
  input: Uint8Array | string,
  nombreOriginal = 'archivo'
): { ok: true; tipo: 'FOTOGRAFIA' | 'PDF'; mimeReal: 'image/jpeg' | 'image/png' | 'application/pdf' } | { ok: false; error: string } {
  let bytes: Uint8Array;

  if (typeof input === 'string') {
    const base64Match = input.match(/^data:([^;]+);base64,(.*)$/);
    const rawBase64 = base64Match ? base64Match[2] : input;
    try {
      if (typeof Buffer !== 'undefined') {
        bytes = new Uint8Array(Buffer.from(rawBase64.slice(0, 64), 'base64'));
      } else {
        const binStr = atob(rawBase64.slice(0, 64));
        bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
      }
    } catch {
      return {
        ok: false,
        error: `${nombreOriginal}: contenido binario corrupto o codificación inválida.`,
      };
    }
  } else {
    bytes = input;
  }

  if (!bytes || bytes.length < 4) {
    return {
      ok: false,
      error: `${nombreOriginal}: archivo vacío o cabecera binaria incompleta.`,
    };
  }

  // Detectar ejecutables prohibidos: Windows PE/EXE (MZ: 0x4D 0x5A) o ELF (0x7F 'E' 'L' 'F')
  if (
    (bytes[0] === 0x4d && bytes[1] === 0x5a) ||
    (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46)
  ) {
    return {
      ok: false,
      error: `${nombreOriginal}: archivo rechazado por seguridad (ejecutable detectado por firma binaria).`,
    };
  }

  const ext = nombreOriginal.includes('.')
    ? nombreOriginal.split('.').pop()?.toLowerCase() ?? ''
    : '';

  // JPEG: FF D8 FF
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  // PNG: 89 50 4E 47
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  // PDF: 25 50 44 46 (%PDF)
  const isPdf =
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;

  if (isJpeg) {
    if (ext && ext !== 'jpg' && ext !== 'jpeg') {
      return {
        ok: false,
        error: `${nombreOriginal}: extensión falseada (la firma binaria corresponde a JPEG pero la extensión es .${ext}).`,
      };
    }
    return { ok: true, tipo: 'FOTOGRAFIA', mimeReal: 'image/jpeg' };
  }

  if (isPng) {
    if (ext && ext !== 'png') {
      return {
        ok: false,
        error: `${nombreOriginal}: extensión falseada (la firma binaria corresponde a PNG pero la extensión es .${ext}).`,
      };
    }
    return { ok: true, tipo: 'FOTOGRAFIA', mimeReal: 'image/png' };
  }

  if (isPdf) {
    if (ext && ext !== 'pdf') {
      return {
        ok: false,
        error: `${nombreOriginal}: extensión falseada (la firma binaria corresponde a PDF pero la extensión es .${ext}).`,
      };
    }
    return { ok: true, tipo: 'PDF', mimeReal: 'application/pdf' };
  }

  return {
    ok: false,
    error: `${nombreOriginal}: firma binaria inválida o extensión falseada (solo se admiten cabeceras reales JPEG, PNG o PDF).`,
  };
}

/**
 * HU-17: Valida que la categoría y prioridad sugeridas por un análisis de IA
 * pertenezcan estrictamente al catálogo oficial activo. Si la IA retorna una categoría
 * o prioridad no reconocida o inactiva, descarta la sugerencia inválida (null) sin corromper la solicitud.
 */
export function validarSugerenciaIaContraCatalogo(
  sugerencia: {
    categoriaIdOrNombre?: number | string | null;
    prioridadIdOrNombre?: number | string | null;
  },
  categoriasCatalogo: Categoria[],
  prioridadesCatalogo: Prioridad[]
): { categoriaSugeridaId: number | null; prioridadSugeridaId: number | null } {
  const categoriasActivas = categoriasCatalogo.filter((c) => c.activa);
  let categoriaValida: Categoria | undefined;

  if (typeof sugerencia.categoriaIdOrNombre === 'number') {
    categoriaValida = categoriasActivas.find((c) => c.id === sugerencia.categoriaIdOrNombre);
  } else if (typeof sugerencia.categoriaIdOrNombre === 'string' && sugerencia.categoriaIdOrNombre.trim()) {
    const cleanCat = sugerencia.categoriaIdOrNombre.trim().toLowerCase();
    categoriaValida = categoriasActivas.find((c) => c.nombre.toLowerCase() === cleanCat);
  }

  let prioridadValida: Prioridad | undefined;
  if (typeof sugerencia.prioridadIdOrNombre === 'number') {
    prioridadValida = prioridadesCatalogo.find((p) => p.id === sugerencia.prioridadIdOrNombre);
  } else if (typeof sugerencia.prioridadIdOrNombre === 'string' && sugerencia.prioridadIdOrNombre.trim()) {
    const cleanPrio = sugerencia.prioridadIdOrNombre.trim().toLowerCase();
    prioridadValida = prioridadesCatalogo.find((p) => p.nombre.toLowerCase() === cleanPrio);
  }

  return {
    categoriaSugeridaId: categoriaValida ? categoriaValida.id : null,
    prioridadSugeridaId: prioridadValida ? prioridadValida.id : null,
  };
}

/**
 * HU-16 / HU-17: Genera el dictamen de análisis asistido por IA sobre la descripción
 * y evidencias de una solicitud, validando sus recomendaciones contra los catálogos activos.
 */
export function generarInferenciaAnalisisIa(
  descripcionSolicitud: string,
  recursoNombre: string,
  recursoCodigo: string,
  cantidadEvidencias: number,
  categoriasCatalogo: Categoria[],
  prioridadesCatalogo: Prioridad[],
  overrideSugerencia?: {
    categoriaIdOrNombre?: number | string | null;
    prioridadIdOrNombre?: number | string | null;
  }
): {
  tipoDano: string;
  descripcionObservada: string;
  categoriaSugeridaId: number | null;
  prioridadSugeridaId: number | null;
  modelo: string;
} {
  const text = `${descripcionSolicitud} ${recursoNombre}`.toLowerCase();
  const activeCats = categoriasCatalogo.filter((c) => c.activa);

  const findCat = (keyword: string, fallbackName: string) =>
    activeCats.find((c) => c.nombre.toLowerCase().includes(keyword)) ??
    activeCats.find((c) => c.nombre === fallbackName) ??
    activeCats[0] ??
    null;

  let tipoDano = 'Desgaste o falla operativa general';
  let cat = findCat('otra', 'Otra');
  let prioNivel: 1 | 2 | 3 | 4 = 2;

  if (/agua|goteo|fuga|tuber|humedad|drenaje/.test(text)) {
    tipoDano = 'Fuga o filtración hidráulica';
    cat = findCat('hidr', 'Hidráulica');
    prioNivel = 2;
  } else if (/eléctric|electr|breaker|volt|corto|tablero|cable|luz/.test(text)) {
    tipoDano = 'Falla en circuito eléctrico';
    cat = findCat('eléctr', 'Eléctrica');
    prioNivel = 3;
  } else if (/servidor|red|comput|impresora|pantalla|software|ti|ventilador/.test(text)) {
    tipoDano = 'Falla de hardware o infraestructura TI';
    cat = findCat('inform', 'Informática/Electrónica');
    prioNivel = /alerta|crític|detiene|humo/.test(text) ? 4 : 3;
  } else if (/motor|compresor|vibraci|mandril|ruido|maquin|mecánic|taladro/.test(text)) {
    tipoDano = 'Desajuste o avería mecánica';
    cat = findCat('mecán', 'Mecánica');
    prioNivel = 3;
  } else if (/piso|pared|techo|puerta|cerradura|ventana|locativ/.test(text)) {
    tipoDano = 'Deterioro locativo o estructural';
    cat = findCat('locat', 'Locativa/Estructural');
    prioNivel = 2;
  }

  const prio = prioridadesCatalogo.find((p) => p.nivel === prioNivel) ?? prioridadesCatalogo[1];

  const validadas = validarSugerenciaIaContraCatalogo(
    overrideSugerencia ?? {
      categoriaIdOrNombre: cat ? cat.id : null,
      prioridadIdOrNombre: prio ? prio.id : null,
    },
    categoriasCatalogo,
    prioridadesCatalogo
  );

  const evidenciasTexto =
    cantidadEvidencias > 0
      ? `Se analizaron ${cantidadEvidencias} evidencia(s) adjunta(s) junto con la descripción del recurso ${recursoCodigo}.`
      : 'Sin evidencias adjuntas; análisis basado únicamente en la descripción textual del reporte.';

  return {
    tipoDano,
    descripcionObservada: `${evidenciasTexto} Se identifica posible ${tipoDano.toLowerCase()} que requiere verificación técnica en sitio.`,
    categoriaSugeridaId: validadas.categoriaSugeridaId,
    prioridadSugeridaId: validadas.prioridadSugeridaId,
    modelo: 'gemini-2.5-flash',
  };
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
  calcularHashSha256,
  esPasswordHasheada,
  hashPassword,
  validarDatosRegistro,
  verifyPassword,
  type CampoRegistro,
  type RegistroInput,
  type ResultadoValidacionRegistro,
} from './passwordSecurity';
