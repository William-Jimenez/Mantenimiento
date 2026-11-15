export type PerfilUsuario = 'ADMINISTRADOR' | 'EMPLEADO' | 'CLIENTE';

export type EstadoNombre =
  | 'Pendiente'
  | 'Asignada'
  | 'En proceso'
  | 'Finalizada'
  | 'Cancelada'
  | 'Rechazada';

export type TipoRecursoNombre =
  | 'Equipo tecnológico'
  | 'Instalación o edificio'
  | 'Maquinaria'
  | 'Herramienta';

export type PrioridadNombre = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export type EstadoAnalisisIa = 'EN_COLA' | 'COMPLETADO' | 'FALLIDO';

export type DecisionRevisionIa = 'PENDIENTE' | 'ACEPTADO' | 'MODIFICADO' | 'DESCARTADO';

export interface Empleado {
  id: number;
  documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  cargo: string;
  esTecnico: boolean;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Usuario {
  id: number;
  empleadoId: number;
  perfil: PerfilUsuario;
  password: string;
  debeCambiarPassword: boolean;
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  ultimoAcceso: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface TipoRecurso {
  id: number;
  nombre: TipoRecursoNombre;
}

export interface Recurso {
  id: number;
  codigo: string;
  nombre: string;
  tipoRecursoId: number;
  ubicacion: string;
  descripcion: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  activa: boolean;
}

export interface Prioridad {
  id: number;
  nombre: PrioridadNombre;
  nivel: 1 | 2 | 3 | 4;
  descripcion: string;
}

export interface Evidencia {
  id: number;
  solicitudId: number;
  tipo: 'FOTOGRAFIA' | 'PDF';
  nombreOriginal: string;
  nombreAlmacenado: string;
  tipoMime: string;
  tamanoBytes: number;
  hashSha256: string;
  subidaPorUsuarioId: number;
  subidaEn: string;
  dataUrl: string;
}

export interface Asignacion {
  id: number;
  solicitudId: number;
  tecnicoId: number;
  asignadaPorUsuarioId: number;
  asignadaEn: string;
  vigente: boolean;
  finalizadaEn: string | null;
  motivoFin: string | null;
}

export interface AnalisisIa {
  id: number;
  solicitudId: number;
  version: number;
  estadoAnalisis: EstadoAnalisisIa;
  tipoDano: string | null;
  descripcionObservada: string | null;
  categoriaSugeridaId: number | null;
  prioridadSugeridaId: number | null;
  modelo: string | null;
  solicitadoPorUsuarioId: number | null;
  creadoEn: string;
  completadoEn: string | null;
  errorDetalle: string | null;
  decisionRevision: DecisionRevisionIa;
  revisadoPorUsuarioId: number | null;
  revisadoEn: string | null;
}

export interface HistorialEstado {
  id: number;
  solicitudId: number;
  estadoAnterior: EstadoNombre | null;
  estadoNuevo: EstadoNombre;
  usuarioId: number;
  cambiadoEn: string;
  motivo: string | null;
}

export interface Solicitud {
  id: number;
  codigo: string;
  solicitanteId: number;
  registradaPorUsuarioId: number;
  recursoId: number;
  descripcion: string;
  estado: EstadoNombre;
  categoriaId: number | null;
  prioridadId: number | null;
  trabajoRealizado?: string | null;
  trabajoActualizadoEn?: string | null;
  motivoCierre: string | null;
  creadaEn: string;
  actualizadaEn: string;
  cerradaEn: string | null;
  version: number;
}

export interface SessionInfo {
  usuarioId: number;
  empleadoId: number;
  perfil: PerfilUsuario;
  esTecnico: boolean;
  iniciadaEn: number;
  ultimaActividad: number;
}

export interface SolicitudFiltros {
  estados: EstadoNombre[];
  solicitanteId?: number;
  tecnicoId?: number;
  soloAsignadasAMi?: boolean;
  desde?: string;
  hasta?: string;
  page: number;
}

export interface ToastMessage {
  id: string;
  tipo: 'exito' | 'error' | 'aviso';
  texto: string;
}
