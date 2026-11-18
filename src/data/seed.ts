import {
  AnalisisIa,
  Asignacion,
  Categoria,
  Empleado,
  Evidencia,
  HistorialEstado,
  Prioridad,
  Recurso,
  Solicitud,
  TipoRecurso,
  Usuario,
} from '../types/domain';

function createSvgIllustrationDataUrl(title: string, subtitle: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
    <rect width="800" height="520" fill="#07070a"/>
    <g stroke="${accent}" stroke-opacity="0.35" stroke-width="1">
      <line x1="60" y1="80" x2="740" y2="80"/>
      <line x1="60" y1="440" x2="740" y2="440"/>
      <line x1="60" y1="80" x2="60" y2="440"/>
      <line x1="740" y1="80" x2="740" y2="440"/>
      <circle cx="400" cy="250" r="110" fill="none" stroke-dasharray="6 6"/>
      <polygon points="400,160 480,310 320,310" fill="none" stroke-width="1.5"/>
    </g>
    <text x="400" y="370" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="20">${title}</text>
    <text x="400" y="400" text-anchor="middle" fill="#9a9a9a" font-family="sans-serif" font-size="14">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createSamplePdfDataUrl(titulo: string, detalle: string): string {
  const safeTitle = titulo.replace(/[()\\]/g, '');
  const safeDetail = detalle.replace(/[()\\]/g, '');
  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 120 >> stream
BT /F1 14 Tf 60 720 Td (${safeTitle}) Tj 0 -28 Td /F1 11 Tf (${safeDetail}) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000412 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
480
%%EOF`;
  return `data:application/pdf;charset=utf-8,${encodeURIComponent(pdf)}`;
}

export const SEED_TIPOS_RECURSO: TipoRecurso[] = [
  { id: 1, nombre: 'Equipo tecnológico' },
  { id: 2, nombre: 'Instalación o edificio' },
  { id: 3, nombre: 'Maquinaria' },
  { id: 4, nombre: 'Herramienta' },
];

export const SEED_CATEGORIAS: Categoria[] = [
  { id: 1, nombre: 'Eléctrica', activa: true },
  { id: 2, nombre: 'Mecánica', activa: true },
  { id: 3, nombre: 'Hidráulica', activa: true },
  { id: 4, nombre: 'Locativa/Estructural', activa: true },
  { id: 5, nombre: 'Informática/Electrónica', activa: true },
  { id: 6, nombre: 'Otra', activa: true },
];

export const SEED_PRIORIDADES: Prioridad[] = [
  {
    id: 1,
    nombre: 'Baja',
    nivel: 1,
    descripcion: 'Molestia o mejora sin impacto en la operación.',
  },
  {
    id: 2,
    nombre: 'Media',
    nivel: 2,
    descripcion: 'Afecta una operación con alternativa disponible.',
  },
  {
    id: 3,
    nombre: 'Alta',
    nivel: 3,
    descripcion: 'Afecta una operación importante sin riesgo inmediato.',
  },
  {
    id: 4,
    nombre: 'Crítica',
    nivel: 4,
    descripcion: 'Riesgo para personas o detiene una operación completa; requiere atención inmediata.',
  },
];

export const SEED_EMPLEADOS: Empleado[] = [
  {
    id: 1,
    documento: '1014250101',
    nombres: 'William',
    apellidos: 'Jiménez',
    correo: 'admin@empresa.com',
    cargo: 'Jefe de Mantenimiento',
    esTecnico: false,
    activo: true,
    creadoEn: '2026-09-01T13:00:00Z',
    actualizadoEn: '2026-09-01T13:00:00Z',
  },
  {
    id: 2,
    documento: '1020334455',
    nombres: 'Carlos',
    apellidos: 'Mendoza',
    correo: 'tecnico@empresa.com',
    cargo: 'Técnico Electromecánico',
    esTecnico: true,
    activo: true,
    creadoEn: '2026-09-02T14:00:00Z',
    actualizadoEn: '2026-09-02T14:00:00Z',
  },
  {
    id: 3,
    documento: '1030998877',
    nombres: 'Laura',
    apellidos: 'Salazar',
    correo: 'laura.salazar@empresa.com',
    cargo: 'Técnica de Infraestructura TI',
    esTecnico: true,
    activo: true,
    creadoEn: '2026-09-05T15:00:00Z',
    actualizadoEn: '2026-09-05T15:00:00Z',
  },
  {
    id: 4,
    documento: '1045112233',
    nombres: 'Andrea',
    apellidos: 'Gómez',
    correo: 'cliente@empresa.com',
    cargo: 'Cliente — Área de Operaciones',
    esTecnico: false,
    activo: true,
    creadoEn: '2026-09-10T10:00:00Z',
    actualizadoEn: '2026-09-10T10:00:00Z',
  },
  {
    id: 5,
    documento: '1050667788',
    nombres: 'Mateo',
    apellidos: 'Rojas',
    correo: 'mateo.rojas@empresa.com',
    cargo: 'Cliente — Área de Logística',
    esTecnico: false,
    activo: true,
    creadoEn: '2026-10-01T09:00:00Z',
    actualizadoEn: '2026-10-01T09:00:00Z',
  },
  {
    id: 6,
    documento: '1099001122',
    nombres: 'Lucía',
    apellidos: 'Pardo',
    correo: 'lucia.pardo@empresa.com',
    cargo: 'Operaria de Planta',
    esTecnico: false,
    activo: false,
    creadoEn: '2026-08-15T08:00:00Z',
    actualizadoEn: '2026-10-20T17:00:00Z',
  },
];

export const SEED_USUARIOS: Usuario[] = [
  {
    id: 1,
    empleadoId: 1,
    perfil: 'ADMINISTRADOR',
    password: '$pbkdf2-sha256$10000$2d440b6cc34eda3a9f55087656ddcc94$4df5fb3725e686b5adb2887ffdd2ea00340c22bc7b26a91a0f5699cd656dec19',
    debeCambiarPassword: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: '2026-11-14T11:30:00Z',
    activo: true,
    creadoEn: '2026-09-01T13:05:00Z',
  },
  {
    id: 2,
    empleadoId: 2,
    perfil: 'EMPLEADO',
    password: 'Tecnico2026',
    debeCambiarPassword: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: '2026-11-14T09:15:00Z',
    activo: true,
    creadoEn: '2026-09-02T14:10:00Z',
  },
  {
    id: 3,
    empleadoId: 3,
    perfil: 'EMPLEADO',
    password: 'Tecnica2026',
    debeCambiarPassword: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: '2026-11-13T16:40:00Z',
    activo: true,
    creadoEn: '2026-09-05T15:10:00Z',
  },
  {
    id: 4,
    empleadoId: 4,
    perfil: 'CLIENTE',
    password: 'Cliente2026',
    debeCambiarPassword: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: '2026-11-14T10:00:00Z',
    activo: true,
    creadoEn: '2026-09-10T10:10:00Z',
  },
  {
    id: 5,
    empleadoId: 5,
    perfil: 'CLIENTE',
    password: 'Temporal2026',
    debeCambiarPassword: true,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: null,
    activo: true,
    creadoEn: '2026-11-12T12:00:00Z',
  },
];

export const SEED_RECURSOS: Recurso[] = [
  {
    id: 1,
    codigo: 'REC-TI-001',
    nombre: 'Servidor Rack Principal Dell R750',
    tipoRecursoId: 1,
    ubicacion: 'Cuarto de Datos — Piso 2',
    descripcion: 'Servidor principal de aplicaciones internas y respaldo.',
    activo: true,
    creadoEn: '2026-09-01T14:00:00Z',
    actualizadoEn: '2026-09-01T14:00:00Z',
  },
  {
    id: 2,
    codigo: 'REC-INS-014',
    nombre: 'Unidad Climatización Sala Juntas 3',
    tipoRecursoId: 2,
    ubicacion: 'Edificio Administrativo — Piso 3',
    descripcion: 'Equipo split de climatización de 24 000 BTU.',
    activo: true,
    creadoEn: '2026-09-03T10:00:00Z',
    actualizadoEn: '2026-09-03T10:00:00Z',
  },
  {
    id: 3,
    codigo: 'REC-MAQ-008',
    nombre: 'Compresor Industrial Atlas GA-22',
    tipoRecursoId: 3,
    ubicacion: 'Planta Norte — Bahía B',
    descripcion: 'Compresor de tornillo rotativo para línea de empaque.',
    activo: true,
    creadoEn: '2026-09-04T09:00:00Z',
    actualizadoEn: '2026-09-04T09:00:00Z',
  },
  {
    id: 4,
    codigo: 'REC-HER-021',
    nombre: 'Taladro Percutor Bosch GBH 2-28',
    tipoRecursoId: 4,
    ubicacion: 'Bodega Central — Estante 4',
    descripcion: 'Herramienta rotomartillo para trabajos locativos.',
    activo: true,
    creadoEn: '2026-09-06T11:30:00Z',
    actualizadoEn: '2026-09-06T11:30:00Z',
  },
  {
    id: 5,
    codigo: 'REC-TI-009',
    nombre: 'Impresora Multifuncional Área Contable',
    tipoRecursoId: 1,
    ubicacion: 'Oficina Contabilidad — Piso 1',
    descripcion: 'Equipo retirado por reemplazo de contrato.',
    activo: false,
    creadoEn: '2026-08-10T09:00:00Z',
    actualizadoEn: '2026-10-15T16:00:00Z',
  },
];

export const SEED_SOLICITUDES: Solicitud[] = [
  {
    id: 1,
    codigo: 'SM-2026-000001',
    solicitanteId: 4,
    registradaPorUsuarioId: 4,
    recursoId: 2,
    descripcion:
      'La unidad de aire acondicionado de la sala 3 presenta goteo constante sobre el piso técnico y el flujo de aire disminuyó desde ayer por la tarde.',
    estado: 'Pendiente',
    categoriaId: null,
    prioridadId: null,
    motivoCierre: null,
    creadaEn: '2026-11-14T08:15:00Z',
    actualizadaEn: '2026-11-14T08:15:00Z',
    cerradaEn: null,
    version: 1,
  },
  {
    id: 2,
    codigo: 'SM-2026-000002',
    solicitanteId: 4,
    registradaPorUsuarioId: 4,
    recursoId: 4,
    descripcion:
      'El mandril del taladro percutor se bloquea al cambiar de broca y genera vibración excesiva en la empuñadura durante perforaciones en concreto.',
    estado: 'Pendiente',
    categoriaId: null,
    prioridadId: null,
    motivoCierre: null,
    creadaEn: '2026-11-13T17:40:00Z',
    actualizadaEn: '2026-11-13T17:40:00Z',
    cerradaEn: null,
    version: 1,
  },
  {
    id: 3,
    codigo: 'SM-2026-000003',
    solicitanteId: 5,
    registradaPorUsuarioId: 1,
    recursoId: 3,
    descripcion:
      'El compresor Atlas GA-22 dispara la alarma de alta temperatura después de 20 minutos continuos de operación en la línea de empaque.',
    estado: 'Asignada',
    categoriaId: 2,
    prioridadId: 3,
    motivoCierre: null,
    creadaEn: '2026-11-12T15:10:00Z',
    actualizadaEn: '2026-11-12T16:00:00Z',
    cerradaEn: null,
    version: 2,
  },
  {
    id: 4,
    codigo: 'SM-2026-000004',
    solicitanteId: 4,
    registradaPorUsuarioId: 4,
    recursoId: 1,
    descripcion:
      'Uno de los ventiladores frontales del servidor Dell R750 emite ruido agudo intermitente y el panel frontal muestra alerta amarilla de refrigeración.',
    estado: 'En proceso',
    categoriaId: 5,
    prioridadId: 4,
    trabajoRealizado:
      'Diagnóstico térmico completado; se desmontó el módulo de ventilación frontal 2 para reemplazo de rodamiento.',
    trabajoActualizadoEn: '2026-11-11T14:30:00Z',
    motivoCierre: null,
    creadaEn: '2026-11-11T09:20:00Z',
    actualizadaEn: '2026-11-11T14:05:00Z',
    cerradaEn: null,
    version: 3,
  },
  {
    id: 5,
    codigo: 'SM-2026-000005',
    solicitanteId: 6,
    registradaPorUsuarioId: 1,
    recursoId: 2,
    descripcion:
      'Revisión de tablero eléctrico secundario por disparo repetido del breaker de iluminación en el pasillo oeste.',
    estado: 'Finalizada',
    categoriaId: 1,
    prioridadId: 3,
    trabajoRealizado:
      'Se reemplazó el interruptor termomagnético de 20 A y se verificó carga estable.',
    trabajoActualizadoEn: '2026-11-06T16:30:00Z',
    motivoCierre: 'Se reemplazó el interruptor termomagnético de 20 A y se verificó carga estable.',
    creadaEn: '2026-11-05T10:00:00Z',
    actualizadaEn: '2026-11-06T16:30:00Z',
    cerradaEn: '2026-11-06T16:30:00Z',
    version: 4,
  },
  {
    id: 6,
    codigo: 'SM-2026-000006',
    solicitanteId: 4,
    registradaPorUsuarioId: 4,
    recursoId: 5,
    descripcion:
      'La bandeja auxiliar de la impresora del área contable presenta atasco frecuente de papel tamaño oficio.',
    estado: 'Cancelada',
    categoriaId: null,
    prioridadId: null,
    motivoCierre: 'El equipo fue retirado por renovación de contrato de impresión.',
    creadaEn: '2026-10-14T11:10:00Z',
    actualizadaEn: '2026-10-15T16:05:00Z',
    cerradaEn: '2026-10-15T16:05:00Z',
    version: 2,
  },
  {
    id: 7,
    codigo: 'SM-2026-000007',
    solicitanteId: 5,
    registradaPorUsuarioId: 5,
    recursoId: 4,
    descripcion:
      'Solicitud de cambio de color de pintura en estantería metálica de la bodega central por preferencia estética.',
    estado: 'Rechazada',
    categoriaId: 6,
    prioridadId: 1,
    motivoCierre: 'No corresponde a un daño operativo ni a mantenimiento correctivo o preventivo.',
    creadaEn: '2026-10-08T14:20:00Z',
    actualizadaEn: '2026-10-09T09:00:00Z',
    cerradaEn: '2026-10-09T09:00:00Z',
    version: 2,
  },
];

export const SEED_EVIDENCIAS: Evidencia[] = [
  {
    id: 1,
    solicitudId: 1,
    tipo: 'FOTOGRAFIA',
    nombreOriginal: 'goteo_unidad_sala3.png',
    nombreAlmacenado: 'ev-9f31c0b2-a118-4e20-901a-001.png',
    tipoMime: 'image/png',
    tamanoBytes: 428540,
    hashSha256: 'a84c2d81e12f9b1102a740098871c2b8c3f1149f9b2011',
    subidaPorUsuarioId: 4,
    subidaEn: '2026-11-14T08:15:00Z',
    dataUrl: createSvgIllustrationDataUrl(
      'Evidencia fotográfica · Sala Juntas 3',
      'Condensación y goteo bajo unidad interior',
      '#8052ff'
    ),
  },
  {
    id: 2,
    solicitudId: 1,
    tipo: 'PDF',
    nombreOriginal: 'registro_inspeccion_sala3.pdf',
    nombreAlmacenado: 'ev-9f31c0b2-a118-4e20-901a-002.pdf',
    tipoMime: 'application/pdf',
    tamanoBytes: 184320,
    hashSha256: 'c20193ff09120ab11420cc87129911f0a22841a08821',
    subidaPorUsuarioId: 4,
    subidaEn: '2026-11-14T08:15:00Z',
    dataUrl: createSamplePdfDataUrl(
      'SM-2026-000001 - Registro de inspeccion inicial',
      'Unidad climatizacion Sala 3: goteo detectado en bandeja de drenaje.'
    ),
  },
  {
    id: 3,
    solicitudId: 4,
    tipo: 'FOTOGRAFIA',
    nombreOriginal: 'alerta_panel_r750.png',
    nombreAlmacenado: 'ev-71a0e921-b440-4110-8112-003.png',
    tipoMime: 'image/png',
    tamanoBytes: 512000,
    hashSha256: 'd11294fa990182ab4451cc01928374650918273645ab',
    subidaPorUsuarioId: 4,
    subidaEn: '2026-11-11T09:20:00Z',
    dataUrl: createSvgIllustrationDataUrl(
      'Evidencia fotográfica · Servidor Dell R750',
      'Indicador frontal de falla en módulo de ventilación 2',
      '#ffb829'
    ),
  },
];

export const SEED_ASIGNACIONES: Asignacion[] = [
  {
    id: 1,
    solicitudId: 3,
    tecnicoId: 2,
    asignadaPorUsuarioId: 1,
    asignadaEn: '2026-11-12T16:00:00Z',
    vigente: true,
    finalizadaEn: null,
    motivoFin: null,
  },
  {
    id: 2,
    solicitudId: 4,
    tecnicoId: 2,
    asignadaPorUsuarioId: 1,
    asignadaEn: '2026-11-11T10:10:00Z',
    vigente: true,
    finalizadaEn: null,
    motivoFin: null,
  },
  {
    id: 3,
    solicitudId: 5,
    tecnicoId: 2,
    asignadaPorUsuarioId: 1,
    asignadaEn: '2026-11-05T11:00:00Z',
    vigente: false,
    finalizadaEn: '2026-11-06T16:30:00Z',
    motivoFin: 'Solicitud finalizada',
  },
];

export const SEED_ANALISIS_IA: AnalisisIa[] = [
  {
    id: 1,
    solicitudId: 1,
    version: 1,
    estadoAnalisis: 'COMPLETADO',
    tipoDano: 'Obstrucción de drenaje / fuga de condensado en equipo de climatización',
    descripcionObservada:
      'La fotografía muestra acumulación de humedad bajo la unidad interior; el reporte describe goteo continuo y reducción del caudal de aire.',
    categoriaSugeridaId: 3,
    prioridadSugeridaId: 2,
    modelo: 'AnalizadorIa-v1',
    solicitadoPorUsuarioId: 4,
    creadoEn: '2026-11-14T08:15:02Z',
    completadoEn: '2026-11-14T08:15:06Z',
    errorDetalle: null,
    decisionRevision: 'PENDIENTE',
    revisadoPorUsuarioId: null,
    revisadoEn: null,
  },
  {
    id: 2,
    solicitudId: 2,
    version: 1,
    estadoAnalisis: 'FALLIDO',
    tipoDano: null,
    descripcionObservada: null,
    categoriaSugeridaId: null,
    prioridadSugeridaId: null,
    modelo: 'AnalizadorIa-v1',
    solicitadoPorUsuarioId: 4,
    creadoEn: '2026-11-13T17:40:02Z',
    completadoEn: '2026-11-13T17:41:02Z',
    errorDetalle: 'Tiempo de espera agotado al consultar el proveedor externo (60 s).',
    decisionRevision: 'PENDIENTE',
    revisadoPorUsuarioId: null,
    revisadoEn: null,
  },
  {
    id: 3,
    solicitudId: 3,
    version: 1,
    estadoAnalisis: 'COMPLETADO',
    tipoDano: 'Sobrecalentamiento en circuito de compresión',
    descripcionObservada:
      'Según la descripción, el equipo activa protección térmica tras 20 minutos de carga continua.',
    categoriaSugeridaId: 2,
    prioridadSugeridaId: 3,
    modelo: 'AnalizadorIa-v1',
    solicitadoPorUsuarioId: 1,
    creadoEn: '2026-11-12T15:10:02Z',
    completadoEn: '2026-11-12T15:10:06Z',
    errorDetalle: null,
    decisionRevision: 'ACEPTADO',
    revisadoPorUsuarioId: 1,
    revisadoEn: '2026-11-12T15:58:00Z',
  },
  {
    id: 4,
    solicitudId: 4,
    version: 1,
    estadoAnalisis: 'COMPLETADO',
    tipoDano: 'Falla de ventilador en chasis de servidor',
    descripcionObservada:
      'El indicador frontal muestra alerta térmica ámbar consistente con falla de ventilación en bahía frontal.',
    categoriaSugeridaId: 5,
    prioridadSugeridaId: 4,
    modelo: 'AnalizadorIa-v1',
    solicitadoPorUsuarioId: 4,
    creadoEn: '2026-11-11T09:20:03Z',
    completadoEn: '2026-11-11T09:20:07Z',
    errorDetalle: null,
    decisionRevision: 'ACEPTADO',
    revisadoPorUsuarioId: 1,
    revisadoEn: '2026-11-11T10:05:00Z',
  },
];

export const SEED_HISTORIAL: HistorialEstado[] = [
  {
    id: 1,
    solicitudId: 1,
    estadoAnterior: null,
    estadoNuevo: 'Pendiente',
    usuarioId: 4,
    cambiadoEn: '2026-11-14T08:15:00Z',
    motivo: null,
  },
  {
    id: 2,
    solicitudId: 2,
    estadoAnterior: null,
    estadoNuevo: 'Pendiente',
    usuarioId: 4,
    cambiadoEn: '2026-11-13T17:40:00Z',
    motivo: null,
  },
  {
    id: 3,
    solicitudId: 3,
    estadoAnterior: null,
    estadoNuevo: 'Pendiente',
    usuarioId: 1,
    cambiadoEn: '2026-11-12T15:10:00Z',
    motivo: 'Registrada por Administrador a nombre de Mateo Rojas',
  },
  {
    id: 4,
    solicitudId: 3,
    estadoAnterior: 'Pendiente',
    estadoNuevo: 'Asignada',
    usuarioId: 1,
    cambiadoEn: '2026-11-12T16:00:00Z',
    motivo: 'Asignado a Carlos Mendoza',
  },
  {
    id: 5,
    solicitudId: 4,
    estadoAnterior: null,
    estadoNuevo: 'Pendiente',
    usuarioId: 4,
    cambiadoEn: '2026-11-11T09:20:00Z',
    motivo: null,
  },
  {
    id: 6,
    solicitudId: 4,
    estadoAnterior: 'Pendiente',
    estadoNuevo: 'Asignada',
    usuarioId: 1,
    cambiadoEn: '2026-11-11T10:10:00Z',
    motivo: 'Asignado a Carlos Mendoza',
  },
  {
    id: 7,
    solicitudId: 4,
    estadoAnterior: 'Asignada',
    estadoNuevo: 'En proceso',
    usuarioId: 2,
    cambiadoEn: '2026-11-11T14:05:00Z',
    motivo: null,
  },
  {
    id: 8,
    solicitudId: 5,
    estadoAnterior: null,
    estadoNuevo: 'Pendiente',
    usuarioId: 1,
    cambiadoEn: '2026-11-05T10:00:00Z',
    motivo: null,
  },
  {
    id: 9,
    solicitudId: 5,
    estadoAnterior: 'Pendiente',
    estadoNuevo: 'Asignada',
    usuarioId: 1,
    cambiadoEn: '2026-11-05T11:00:00Z',
    motivo: null,
  },
  {
    id: 10,
    solicitudId: 5,
    estadoAnterior: 'Asignada',
    estadoNuevo: 'En proceso',
    usuarioId: 2,
    cambiadoEn: '2026-11-05T14:00:00Z',
    motivo: null,
  },
  {
    id: 11,
    solicitudId: 5,
    estadoAnterior: 'En proceso',
    estadoNuevo: 'Finalizada',
    usuarioId: 2,
    cambiadoEn: '2026-11-06T16:30:00Z',
    motivo: 'Se reemplazó el interruptor termomagnético de 20 A y se verificó carga estable.',
  },
  {
    id: 12,
    solicitudId: 6,
    estadoAnterior: null,
    estadoNuevo: 'Pendiente',
    usuarioId: 4,
    cambiadoEn: '2026-10-14T11:10:00Z',
    motivo: null,
  },
  {
    id: 13,
    solicitudId: 6,
    estadoAnterior: 'Pendiente',
    estadoNuevo: 'Cancelada',
    usuarioId: 4,
    cambiadoEn: '2026-10-15T16:05:00Z',
    motivo: 'El equipo fue retirado por renovación de contrato de impresión.',
  },
  {
    id: 14,
    solicitudId: 7,
    estadoAnterior: null,
    estadoNuevo: 'Pendiente',
    usuarioId: 5,
    cambiadoEn: '2026-10-08T14:20:00Z',
    motivo: null,
  },
  {
    id: 15,
    solicitudId: 7,
    estadoAnterior: 'Pendiente',
    estadoNuevo: 'Rechazada',
    usuarioId: 1,
    cambiadoEn: '2026-10-09T09:00:00Z',
    motivo: 'No corresponde a un daño operativo ni a mantenimiento correctivo o preventivo.',
  },
];
