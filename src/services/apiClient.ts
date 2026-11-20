import {
  AnalisisIa,
  DecisionRevisionIa,
  Empleado,
  EstadoNombre,
  Evidencia,
  Recurso,
  Solicitud,
  Usuario,
} from '../types/domain';

const TOKEN_STORAGE_KEY = 'plataforma_mantenimiento_jwt';

export interface ApiEnvelope<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  codigo?: string;
  token?: string;
  origen?: string;
  raw?: Record<string, unknown>;
}

export class MaintenanceApiClient {
  private baseUrl: string;
  private memoryToken: string | null = null;

  constructor(baseUrl?: string) {
    if (typeof baseUrl === 'string') {
      this.baseUrl = baseUrl.replace(/\/+$/, '');
    } else if (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL) {
      this.baseUrl = (import.meta as { env: Record<string, string> }).env.VITE_API_BASE_URL.replace(/\/+$/, '');
    } else {
      this.baseUrl = '';
    }
  }

  setAuthToken(token: string | null): void {
    this.memoryToken = token;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        if (token) {
          window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
          window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        // Ignorar errores de almacenamiento en entornos restringidos
      }
    }
  }

  getAuthToken(): string | null {
    if (this.memoryToken) return this.memoryToken;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
      } catch {
        return null;
      }
    }
    return null;
  }

  clearAuthToken(): void {
    this.setAuthToken(null);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiEnvelope<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return {
        ok: response.ok && json.ok !== false,
        status: response.status,
        data: (json.data ?? json.solicitud ?? json.evidencia ?? json.usuario) as T | undefined,
        error: typeof json.error === 'string' ? json.error : undefined,
        codigo: typeof json.codigo === 'string' ? json.codigo : undefined,
        token: typeof json.token === 'string' ? json.token : undefined,
        origen: typeof json.origen === 'string' ? json.origen : undefined,
        raw: json,
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : 'Error de red al contactar la API.',
      };
    }
  }

  async login(correo: string, password: string) {
    const res = await this.request<{ usuario?: Usuario; empleado?: Empleado }>(
      'POST',
      '/api/auth/login',
      { correo, password }
    );
    if (res.ok && res.token) {
      this.setAuthToken(res.token);
    }
    return res;
  }

  async register(payload: {
    nombres: string;
    apellidos: string;
    documento: string;
    correo: string;
    password: string;
  }) {
    const res = await this.request<{ usuario?: Usuario; empleado?: Empleado }>(
      'POST',
      '/api/auth/register',
      payload
    );
    if (res.ok && res.token) {
      this.setAuthToken(res.token);
    }
    return res;
  }

  async getMe() {
    return this.request<{ usuario: Usuario; empleado: Empleado }>('GET', '/api/me');
  }

  async sendRecoveryCode(correo: string) {
    return this.request<{ codigoDemo?: string; expiraEn?: string }>(
      'POST',
      '/api/auth/recovery/send-code',
      { correo }
    );
  }

  async verifyRecoveryCode(correo: string, codigo: string) {
    return this.request<{ verificado?: boolean }>('POST', '/api/auth/recovery/verify-code', {
      correo,
      codigo,
    });
  }

  async resetPassword(correo: string, codigo: string, nuevaPassword: string) {
    return this.request<{ mensaje?: string }>('POST', '/api/auth/reset-password', {
      correo,
      codigo,
      nuevaPassword,
    });
  }

  async getSolicitudes() {
    return this.request<Solicitud[]>('GET', '/api/solicitudes');
  }

  async getSolicitudById(id: number) {
    return this.request<Solicitud>('GET', `/api/solicitudes/${id}`);
  }

  async createSolicitud(payload: {
    recursoId: number;
    descripcion: string;
    solicitanteId?: number;
    categoriaId?: number | null;
    prioridadId?: number | null;
  }) {
    return this.request<Solicitud>('POST', '/api/solicitudes', payload);
  }

  async assignTecnico(
    solicitudId: number,
    payload: {
      tecnicoId: number;
      categoriaId?: number | null;
      prioridadId?: number | null;
      motivoReasignacion?: string | null;
    }
  ) {
    return this.request<Solicitud>(
      'POST',
      `/api/admin/solicitudes/${solicitudId}/asignar`,
      payload
    );
  }

  async updateSolicitudEstado(
    solicitudId: number,
    payload: {
      nuevoEstado: EstadoNombre;
      motivo?: string | null;
      trabajoRealizado?: string | null;
      version?: number;
    }
  ) {
    return this.request<Solicitud>(
      'PATCH',
      `/api/solicitudes/${solicitudId}/estado`,
      payload
    );
  }

  async registerTrabajo(solicitudId: number, trabajoRealizado: string) {
    return this.request<Solicitud>(
      'POST',
      `/api/tecnico/solicitudes/${solicitudId}/trabajo`,
      { trabajoRealizado }
    );
  }

  async uploadEvidencia(
    solicitudId: number,
    payload: {
      tipo: 'FOTOGRAFIA' | 'PDF';
      nombreOriginal: string;
      tipoMime: string;
      tamanoBytes: number;
      dataUrl: string;
    }
  ) {
    return this.request<Evidencia>(
      'POST',
      `/api/solicitudes/${solicitudId}/evidencias`,
      payload
    );
  }

  async triggerAnalisisIa(
    solicitudId: number,
    payload?: {
      simularFallo?: boolean;
      errorDetalle?: string;
      sugerenciaExterna?: {
        categoriaIdOrNombre?: string | number | null;
        prioridadIdOrNombre?: string | number | null;
      };
    }
  ) {
    return this.request<AnalisisIa>(
      'POST',
      `/api/admin/solicitudes/${solicitudId}/analisis-ia`,
      payload ?? {}
    );
  }

  async reviewAnalisisIa(
    solicitudId: number,
    analisisId: number,
    payload: {
      decision: Exclude<DecisionRevisionIa, 'PENDIENTE'>;
      categoriaId?: number | null;
      prioridadId?: number | null;
    }
  ) {
    return this.request<AnalisisIa>(
      'POST',
      `/api/admin/solicitudes/${solicitudId}/analisis-ia/${analisisId}/revisar`,
      payload
    );
  }

  async getRecursos() {
    return this.request<Recurso[]>('GET', '/api/recursos');
  }

  async createRecurso(payload: {
    codigo: string;
    nombre: string;
    tipoRecursoId: number;
    ubicacion: string;
    descripcion: string;
  }) {
    return this.request<Recurso>('POST', '/api/admin/recursos', payload);
  }

  async getUsuarios() {
    return this.request<Usuario[]>('GET', '/api/admin/usuarios');
  }

  async getEmpleados() {
    return this.request<Empleado[]>('GET', '/api/admin/empleados');
  }
}

export const apiClient = new MaintenanceApiClient();
