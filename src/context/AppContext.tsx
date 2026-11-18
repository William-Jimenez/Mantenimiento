import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  SessionInfo,
  Solicitud,
  SolicitudFiltros,
  TipoRecurso,
  ToastMessage,
  Usuario,
} from '../types/domain';
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
  CampoRegistro,
  esEstadoFinal,
  ETIQUETA_PERFIL,
  generarCodigoSolicitud,
  hashPassword,
  obtenerTransicionesPermitidas,
  puedeAdjuntarEvidencia,
  puedeAsignarTecnico,
  puedeCrearSolicitud,
  puedeGestionarUsuarios,
  puedeRegistrarTrabajo,
  puedeVerSolicitud,
  validarDatosRegistro,
  validarPoliticaPassword,
  verifyPassword,
} from '../services/domainRules';
import {
  applyLanguageToDOM,
  LANG_STORAGE_KEY,
  Language,
  THEME_STORAGE_KEY,
  ThemeMode,
  translateText,
} from '../i18n/translations';

const STORAGE_KEY = 'plataforma_mantenimiento_v2';
const INACTIVITY_WARNING_MS = 28 * 60 * 1000;
const INACTIVITY_EXPIRE_MS = 30 * 60 * 1000;

interface PersistedState {
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
  session: SessionInfo | null;
  iaHabilitada: boolean;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed && Array.isArray(parsed.empleados) && Array.isArray(parsed.solicitudes)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed data
  }
  return {
    empleados: SEED_EMPLEADOS,
    usuarios: SEED_USUARIOS,
    tiposRecurso: SEED_TIPOS_RECURSO,
    recursos: SEED_RECURSOS,
    categorias: SEED_CATEGORIAS,
    prioridades: SEED_PRIORIDADES,
    solicitudes: SEED_SOLICITUDES,
    evidencias: SEED_EVIDENCIAS,
    asignaciones: SEED_ASIGNACIONES,
    analisisIa: SEED_ANALISIS_IA,
    historial: SEED_HISTORIAL,
    session: null,
    iaHabilitada: true,
  };
}

export type LoginResult =
  | { ok: true; debeCambiarPassword: boolean }
  | { ok: false; tipo: 'credenciales' | 'bloqueada'; mensaje: string };

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  codigo?: 'VALIDACION' | 'DUPLICADO' | 'CONFLICTO_VERSION' | 'TRANSICION_INVALIDA' | 'ACCESO_DENEGADO' | 'REGLA_NEGOCIO';
  campo?: string;
  data?: T;
}

interface AppContextValue {
  pathname: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  currentUser: Usuario | null;
  currentEmpleado: Empleado | null;
  isAdmin: boolean;
  isTecnico: boolean;
  isCliente: boolean;
  loginNotice: string | null;
  clearLoginNotice: () => void;
  sessionExpiringSoon: boolean;
  extendSession: () => void;
  toasts: ToastMessage[];
  pushToast: (tipo: ToastMessage['tipo'], texto: string) => void;
  dismissToast: (id: string) => void;

  // Theme & Language (Dark/Light, ES/EN)
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (text: string) => string;

  // Data collections
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
  iaHabilitada: boolean;
  setIaHabilitada: (habilitada: boolean) => void;

  // Filters preserved across P-05 <-> P-06 (RC-08)
  filtrosSolicitudes: SolicitudFiltros;
  setFiltrosSolicitudes: React.Dispatch<React.SetStateAction<SolicitudFiltros>>;

  // Auth (RC-01, P-01, P-02)
  login: (correo: string, password: string) => LoginResult;
  registrarCuenta: (datos: {
    nombres: string;
    apellidos: string;
    documento: string;
    correo: string;
    password: string;
  }) => ActionResult<{ usuarioId: number }> & {
    erroresPorCampo?: Partial<Record<CampoRegistro, string>>;
  };
  logout: (motivo?: string) => void;
  cambiarPasswordInicial: (nuevaPassword: string, confirmacion: string) => ActionResult;
  restablecerPasswordPorCorreo: (
    correo: string,
    nuevaPassword: string,
    confirmacion: string
  ) => ActionResult;

  // M1 Empleados & Usuarios (RS-01, RS-04)
  guardarEmpleado: (
    data: {
      id?: number;
      documento: string;
      nombres: string;
      apellidos: string;
      correo: string;
      cargo: string;
      esTecnico: boolean;
      activo: boolean;
    }
  ) => ActionResult<Empleado>;
  toggleTecnicoEmpleado: (empleadoId: number) => ActionResult<{ solicitudesActivas?: Solicitud[] }>;
  crearUsuario: (
    empleadoId: number,
    perfil: PerfilUsuario,
    nuevoRegistro?: {
      documento: string;
      nombres: string;
      apellidos: string;
      correo: string;
      cargo: string;
    }
  ) => ActionResult<{ passwordTemporal: string }>;
  editarUsuario: (
    usuarioId: number,
    data: {
      nombres: string;
      apellidos: string;
      correo: string;
      cargo: string;
      perfil: PerfilUsuario;
      activo: boolean;
    }
  ) => ActionResult;
  toggleUsuarioActivo: (usuarioId: number) => ActionResult;
  cambiarPerfilUsuario: (usuarioId: number, perfil: PerfilUsuario) => ActionResult;
  restablecerPasswordUsuario: (usuarioId: number) => ActionResult<{ passwordTemporal: string }>;

  // M2 Recursos & Categorías (RS-02, RS-03)
  guardarRecurso: (
    data: {
      id?: number;
      codigo: string;
      nombre: string;
      tipoRecursoId: number;
      ubicacion: string;
      descripcion: string;
      activo: boolean;
    }
  ) => ActionResult<Recurso>;
  toggleRecursoActivo: (recursoId: number) => ActionResult;
  crearCategoria: (nombre: string) => ActionResult<Categoria>;
  renombrarCategoria: (id: number, nombre: string) => ActionResult;
  toggleCategoriaActiva: (id: number) => ActionResult;

  // M3, M4, M5 Solicitudes, Evidencias, Asignaciones, Estados
  crearSolicitud: (input: {
    submissionToken: string;
    recursoId: number;
    descripcion: string;
    solicitanteId?: number;
    archivos: Array<{
      tipo: 'FOTOGRAFIA' | 'PDF';
      nombreOriginal: string;
      tipoMime: string;
      tamanoBytes: number;
      dataUrl: string;
    }>;
  }) => ActionResult<Solicitud>;
  agregarEvidencias: (
    solicitudId: number,
    archivos: Array<{
      tipo: 'FOTOGRAFIA' | 'PDF';
      nombreOriginal: string;
      tipoMime: string;
      tamanoBytes: number;
      dataUrl: string;
    }>
  ) => ActionResult;
  asignarTecnico: (solicitudId: number, tecnicoId: number, expectedVersion: number) => ActionResult;
  registrarTrabajoRealizado: (
    solicitudId: number,
    trabajoRealizado: string,
    expectedVersion: number
  ) => ActionResult;
  cambiarEstadoSolicitud: (
    solicitudId: number,
    destino: EstadoNombre,
    motivo: string,
    expectedVersion: number
  ) => ActionResult;

  // M6 IA (F5)
  solicitarNuevoAnalisisIa: (solicitudId: number) => ActionResult;
  revisarAnalisisIa: (
    solicitudId: number,
    analisisId: number,
    decision: Exclude<DecisionRevisionIa, 'PENDIENTE'>,
    categoriaId?: number | null,
    prioridadId?: number | null
  ) => ActionResult;

  // Reset demo data
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');
  const [intendedPath, setIntendedPath] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [sessionExpiringSoon, setSessionExpiringSoon] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [filtrosSolicitudes, setFiltrosSolicitudes] = useState<SolicitudFiltros>({
    estados: [],
    page: 0,
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'es') return saved;
    } catch {
      // ignore
    }
    return 'es';
  });

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setLanguage = useCallback((nextLang: Language) => {
    setLanguageState(nextLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === 'es' ? 'en' : 'es';
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const t = useCallback((text: string) => translateText(text, language), [language]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.classList.remove('theme-dark', 'theme-light', 'dark', 'light');
    html.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.title =
      language === 'en'
        ? 'Maintenance Request Platform'
        : 'Plataforma de Solicitudes de Mantenimiento';
    applyLanguageToDOM(document.body, language);

    let applying = false;
    const observer = new MutationObserver(() => {
      if (applying) return;
      applying = true;
      applyLanguageToDOM(document.body, language);
      applying = false;
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [language, pathname, state]);

  const submissionCacheRef = useRef<Map<string, Solicitud>>(new Map());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors on large uploaded evidence previews
    }
  }, [state]);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const pushToast = useCallback((tipo: ToastMessage['tipo'], texto: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, tipo, texto }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const url = new URL(to, window.location.origin);
    const nextPath = url.pathname + url.search;
    if (options?.replace) {
      window.history.replaceState(null, '', nextPath);
    } else {
      window.history.pushState(null, '', nextPath);
    }
    setPathname(url.pathname);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const currentUser = useMemo(() => {
    if (!state.session) return null;
    const u = state.usuarios.find((usr) => usr.id === state.session?.usuarioId);
    if (!u || !u.activo) return null;
    return u;
  }, [state.session, state.usuarios]);

  const currentEmpleado = useMemo(() => {
    if (!currentUser) return null;
    const e = state.empleados.find((emp) => emp.id === currentUser.empleadoId);
    if (!e || !e.activo) return null;
    return e;
  }, [currentUser, state.empleados]);

  // If user or employee was deactivated while logged in (User Flow 4.7)
  useEffect(() => {
    if (state.session && (!currentUser || !currentEmpleado)) {
      setState((prev) => ({ ...prev, session: null }));
      setLoginNotice('Su sesión se cerró porque el usuario fue desactivado.');
      navigate('/login', { replace: true });
    }
  }, [state.session, currentUser, currentEmpleado, navigate]);

  const logout = useCallback(
    (motivo = 'Sesión cerrada') => {
      setState((prev) => ({ ...prev, session: null }));
      setSessionExpiringSoon(false);
      setIntendedPath(null);
      setLoginNotice(motivo);
      navigate('/login', { replace: true });
    },
    [navigate]
  );

  // Route guard enforcing User Flow 4.3 & RC-01 (P-01, P-02, P-03)
  useEffect(() => {
    if (!currentUser || !currentEmpleado) {
      if (
        pathname !== '/login' &&
        pathname !== '/registro' &&
        pathname !== '/recuperar-contrasena' &&
        pathname !== '/cuenta/contrasena'
      ) {
        setIntendedPath(pathname + window.location.search);
        navigate('/login', { replace: true });
      }
      return;
    }

    if (currentUser.debeCambiarPassword) {
      if (pathname !== '/cuenta/contrasena' && pathname !== '/recuperar-contrasena') {
        navigate('/cuenta/contrasena', { replace: true });
      }
      return;
    }

    if (pathname === '/login' || pathname === '/registro') {
      navigate('/', { replace: true });
    }
  }, [currentUser, currentEmpleado, pathname, navigate]);

  // Inactivity timer (28 min warning, 30 min expiry per RC-02 / 4.7)
  useEffect(() => {
    if (!state.session) return;

    const recordActivity = () => {
      setState((prev) => {
        if (!prev.session) return prev;
        return {
          ...prev,
          session: { ...prev.session, ultimaActividad: Date.now() },
        };
      });
      setSessionExpiringSoon(false);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleEvent = () => {
      if (!sessionExpiringSoon) {
        recordActivity();
      }
    };
    events.forEach((ev) => window.addEventListener(ev, handleEvent, { passive: true }));

    const interval = window.setInterval(() => {
      setState((prev) => {
        if (!prev.session) return prev;
        const elapsed = Date.now() - prev.session.ultimaActividad;
        if (elapsed >= INACTIVITY_EXPIRE_MS) {
          setSessionExpiringSoon(false);
          setLoginNotice('Su sesión expiró, inicie sesión de nuevo');
          navigate('/login', { replace: true });
          return { ...prev, session: null };
        }
        if (elapsed >= INACTIVITY_WARNING_MS) {
          setSessionExpiringSoon(true);
        }
        return prev;
      });
    }, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleEvent));
      window.clearInterval(interval);
    };
  }, [state.session, sessionExpiringSoon, navigate]);

  const extendSession = useCallback(() => {
    setState((prev) => {
      if (!prev.session) return prev;
      return {
        ...prev,
        session: { ...prev.session, ultimaActividad: Date.now() },
      };
    });
    setSessionExpiringSoon(false);
  }, []);

  // Async AI queue processor (Phase 5 - M6: EN_COLA -> COMPLETADO / FALLIDO)
  useEffect(() => {
    const queued = state.analisisIa.filter((a) => a.estadoAnalisis === 'EN_COLA');
    if (queued.length === 0) return;

    const timers = queued.map((item) =>
      window.setTimeout(() => {
        setState((prev) => {
          const current = prev.analisisIa.find((a) => a.id === item.id);
          if (!current || current.estadoAnalisis !== 'EN_COLA') return prev;
          const sol = prev.solicitudes.find((s) => s.id === current.solicitudId);
          const rec = sol ? prev.recursos.find((r) => r.id === sol.recursoId) : undefined;
          const evs = prev.evidencias.filter((e) => e.solicitudId === current.solicitudId);

          if (!sol || !prev.iaHabilitada) {
            return {
              ...prev,
              analisisIa: prev.analisisIa.map((a) =>
                a.id === item.id
                  ? {
                      ...a,
                      estadoAnalisis: 'FALLIDO',
                      completadoEn: new Date().toISOString(),
                      errorDetalle: 'El análisis automático fue deshabilitado antes de completarse.',
                    }
                  : a
              ),
            };
          }

          // Infer deterministic, domain-grounded classification using active catalogs
          const text = `${sol.descripcion} ${rec?.nombre ?? ''}`.toLowerCase();
          const activeCats = prev.categorias.filter((c) => c.activa);

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

          const prio = prev.prioridades.find((p) => p.nivel === prioNivel) ?? prev.prioridades[1];
          const evidenciasTexto =
            evs.length > 0
              ? `Se analizaron ${evs.length} evidencia(s) adjunta(s) junto con la descripción del recurso ${rec?.codigo ?? ''}.`
              : 'Sin evidencias adjuntas; análisis basado únicamente en la descripción textual del reporte.';

          return {
            ...prev,
            analisisIa: prev.analisisIa.map((a) =>
              a.id === item.id
                ? {
                    ...a,
                    estadoAnalisis: 'COMPLETADO',
                    tipoDano,
                    descripcionObservada: `${evidenciasTexto} Se identifica posible ${tipoDano.toLowerCase()} que requiere verificación técnica en sitio.`,
                    categoriaSugeridaId: cat ? cat.id : null,
                    prioridadSugeridaId: prio ? prio.id : null,
                    modelo: 'AnalizadorIa-v1',
                    completadoEn: new Date().toISOString(),
                    errorDetalle: null,
                  }
                : a
            ),
          };
        });
      }, 3500)
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [state.analisisIa]);

  const login = useCallback(
    (correo: string, password: string): LoginResult => {
      const rawNormalized = correo.trim().toLowerCase();
      const normalized =
        rawNormalized === 'empleado@empresa.com' ? 'cliente@empresa.com' : rawNormalized;
      const empleado = state.empleados.find((e) => e.correo.toLowerCase() === normalized);
      const usuario = empleado
        ? state.usuarios.find((u) => u.empleadoId === empleado.id)
        : undefined;

      // Generic error if user/employee doesn't exist or is deactivated (E-01 / E-03)
      if (!empleado || !usuario || !empleado.activo || !usuario.activo) {
        return {
          ok: false,
          tipo: 'credenciales',
          mensaje: 'Correo o contraseña incorrectos',
        };
      }

      // Check lockout (E-02)
      if (usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta).getTime() > Date.now()) {
        return {
          ok: false,
          tipo: 'bloqueada',
          mensaje: 'Cuenta bloqueada temporalmente. Intente de nuevo en 15 minutos',
        };
      }

      if (!verifyPassword(password, usuario.password)) {
        const nuevosIntentos = usuario.intentosFallidos + 1;
        const bloqueadoHasta =
          nuevosIntentos >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

        setState((prev) => ({
          ...prev,
          usuarios: prev.usuarios.map((u) =>
            u.id === usuario.id
              ? {
                  ...u,
                  intentosFallidos: nuevosIntentos,
                  bloqueadoHasta,
                }
              : u
          ),
        }));

        if (bloqueadoHasta) {
          return {
            ok: false,
            tipo: 'bloqueada',
            mensaje: 'Cuenta bloqueada temporalmente. Intente de nuevo en 15 minutos',
          };
        }

        return {
          ok: false,
          tipo: 'credenciales',
          mensaje: 'Correo o contraseña incorrectos',
        };
      }

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      setState((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === usuario.id
            ? {
                ...u,
                intentosFallidos: 0,
                bloqueadoHasta: null,
                ultimoAcceso: nowIso,
              }
            : u
        ),
        session: {
          usuarioId: usuario.id,
          empleadoId: empleado.id,
          perfil: usuario.perfil,
          esTecnico: empleado.esTecnico,
          iniciadaEn: nowMs,
          ultimaActividad: nowMs,
        },
      }));
      setLoginNotice(null);

      if (usuario.debeCambiarPassword) {
        navigate('/cuenta/contrasena', { replace: true });
      } else if (intendedPath && intendedPath !== '/login') {
        const target = intendedPath;
        setIntendedPath(null);
        navigate(target, { replace: true });
      } else {
        navigate('/', { replace: true });
      }

      return { ok: true, debeCambiarPassword: usuario.debeCambiarPassword };
    },
    [state.empleados, state.usuarios, intendedPath, navigate]
  );

  const registrarCuenta: AppContextValue['registrarCuenta'] = useCallback(
    (datos) => {
      try {
        const validacion = validarDatosRegistro(datos);
        if (!validacion.ok || !validacion.datos) {
          return {
            ok: false,
            codigo: 'VALIDACION',
            campo: validacion.campo,
            error: validacion.error ?? 'Verifique los campos obligatorios.',
            erroresPorCampo: validacion.erroresPorCampo,
          };
        }

        const clean = validacion.datos;

        const correoExistente = state.empleados.find(
          (e) => e.correo.toLowerCase() === clean.correo
        );
        if (correoExistente) {
          return {
            ok: false,
            codigo: 'DUPLICADO',
            campo: 'correo',
            error: 'Ya existe una cuenta registrada con este correo electrónico.',
            erroresPorCampo: {
              correo: 'Ya existe una cuenta registrada con este correo electrónico.',
            },
          };
        }

        const docExistente = state.empleados.find(
          (e) => e.documento.toLowerCase() === clean.documento.toLowerCase()
        );
        if (docExistente) {
          return {
            ok: false,
            codigo: 'DUPLICADO',
            campo: 'documento',
            error: 'Ya existe un usuario registrado con este documento de identidad.',
            erroresPorCampo: {
              documento: 'Ya existe un usuario registrado con este documento de identidad.',
            },
          };
        }

        const passwordHasheada = hashPassword(clean.password);
        const nowIso = new Date().toISOString();
        const nowMs = Date.now();
        const nextEmpId = Math.max(0, ...state.empleados.map((e) => e.id)) + 1;
        const nextUsrId = Math.max(0, ...state.usuarios.map((u) => u.id)) + 1;

        const nuevoEmpleado: Empleado = {
          id: nextEmpId,
          documento: clean.documento,
          nombres: clean.nombres,
          apellidos: clean.apellidos,
          correo: clean.correo,
          cargo: 'Cliente',
          esTecnico: false,
          activo: true,
          creadoEn: nowIso,
          actualizadoEn: nowIso,
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
          ultimoAcceso: nowIso,
          creadoEn: nowIso,
        };

        setState((prev) => ({
          ...prev,
          empleados: [...prev.empleados, nuevoEmpleado],
          usuarios: [...prev.usuarios, nuevoUsuario],
          session: {
            usuarioId: nuevoUsuario.id,
            empleadoId: nuevoEmpleado.id,
            perfil: 'CLIENTE',
            esTecnico: false,
            iniciadaEn: nowMs,
            ultimaActividad: nowMs,
          },
        }));

        setLoginNotice(null);
        pushToast('exito', `Cuenta creada exitosamente. Bienvenido/a, ${clean.nombres}.`);
        navigate('/', { replace: true });

        return {
          ok: true,
          data: { usuarioId: nuevoUsuario.id },
        };
      } catch {
        return {
          ok: false,
          error: 'No fue posible procesar el registro en este momento. Intente nuevamente.',
        };
      }
    },
    [state.empleados, state.usuarios, navigate, pushToast]
  );

  const cambiarPasswordInicial = useCallback(
    (nuevaPassword: string, confirmacion: string): ActionResult => {
      if (!currentUser) {
        return { ok: false, error: 'Sesión no válida' };
      }
      const policyError = validarPoliticaPassword(nuevaPassword);
      if (policyError) {
        return { ok: false, codigo: 'VALIDACION', campo: 'nuevaPassword', error: policyError };
      }
      if (nuevaPassword !== confirmacion) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'confirmacion',
          error: 'Las contraseñas no coinciden.',
        };
      }
      if (verifyPassword(nuevaPassword, currentUser.password)) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'nuevaPassword',
          error: 'Debe elegir una contraseña distinta a la actual.',
        };
      }

      const passwordHasheada = hashPassword(nuevaPassword);
      setState((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === currentUser.id
            ? { ...u, password: passwordHasheada, debeCambiarPassword: false }
            : u
        ),
      }));

      pushToast('exito', 'Contraseña actualizada correctamente.');
      const target =
        intendedPath &&
        intendedPath !== '/login' &&
        intendedPath !== '/recuperar-contrasena' &&
        intendedPath !== '/cuenta/contrasena'
          ? intendedPath
          : '/';
      setIntendedPath(null);
      navigate(target, { replace: true });
      return { ok: true };
    },
    [currentUser, intendedPath, navigate, pushToast]
  );

  const restablecerPasswordPorCorreo = useCallback(
    (correo: string, nuevaPassword: string, confirmacion: string): ActionResult => {
      const cleanCorreo = correo.trim().toLowerCase();
      if (!cleanCorreo) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'correo',
          error: 'Ingrese el correo electrónico asociado a su cuenta.',
        };
      }

      const normalized =
        cleanCorreo === 'empleado@empresa.com' ? 'cliente@empresa.com' : cleanCorreo;
      const empleado = state.empleados.find(
        (e) => e.correo.toLowerCase() === normalized && e.activo
      );
      const usuario = empleado
        ? state.usuarios.find((u) => u.empleadoId === empleado.id && u.activo)
        : undefined;

      if (!empleado || !usuario) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'correo',
          error: 'No se encontró una cuenta activa asociada a este correo electrónico.',
        };
      }

      const policyError = validarPoliticaPassword(nuevaPassword);
      if (policyError) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'nuevaPassword',
          error: policyError,
        };
      }

      if (nuevaPassword !== confirmacion) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'confirmacion',
          error: 'Las contraseñas no coinciden.',
        };
      }

      const passwordHasheada = hashPassword(nuevaPassword);
      setState((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === usuario.id
            ? {
                ...u,
                password: passwordHasheada,
                debeCambiarPassword: false,
                intentosFallidos: 0,
                bloqueadoHasta: null,
              }
            : u
        ),
      }));

      setLoginNotice(
        'Contraseña restablecida correctamente. Ya puede iniciar sesión con su nueva clave.'
      );
      pushToast('exito', 'Contraseña actualizada con éxito.');
      navigate('/login', { replace: true });
      return { ok: true };
    },
    [state.empleados, state.usuarios, navigate, pushToast]
  );

  const guardarEmpleado: AppContextValue['guardarEmpleado'] = useCallback(
    (data) => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'No tiene permiso para esta acción.' };
      }

      const docClean = data.documento.trim();
      const correoClean = data.correo.trim().toLowerCase();
      if (!docClean || !data.nombres.trim() || !data.apellidos.trim() || !correoClean || !data.cargo.trim()) {
        return { ok: false, codigo: 'VALIDACION', error: 'Complete todos los campos obligatorios.' };
      }

      const dupDoc = state.empleados.find(
        (e) => e.documento.toLowerCase() === docClean.toLowerCase() && e.id !== data.id
      );
      if (dupDoc) {
        return {
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'documento',
          error: 'Ya existe un empleado con este documento de identidad.',
        };
      }

      const dupCorreo = state.empleados.find(
        (e) => e.correo.toLowerCase() === correoClean && e.id !== data.id
      );
      if (dupCorreo) {
        return {
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'correo',
          error: 'Ya existe un empleado registrado con este correo.',
        };
      }

      // Check technician guard if unmarking esTecnico or deactivating (HU-03, RS-01)
      if (data.id) {
        const existing = state.empleados.find((e) => e.id === data.id);
        if (existing && existing.esTecnico && (!data.esTecnico || !data.activo)) {
          const asignacionesActivas = state.asignaciones.filter(
            (a) => a.vigente && a.tecnicoId === existing.id
          );
          const solicitudesActivas = asignacionesActivas
            .map((a) => state.solicitudes.find((s) => s.id === a.solicitudId))
            .filter(
              (s): s is Solicitud =>
                !!s && (s.estado === 'Asignada' || s.estado === 'En proceso')
            );
          if (solicitudesActivas.length > 0) {
            return {
              ok: false,
              codigo: 'REGLA_NEGOCIO',
              error: `El técnico tiene ${solicitudesActivas.length} solicitud(es) en estado Asignada o En proceso (${solicitudesActivas
                .map((s) => s.codigo)
                .join(', ')}). Reasígnelas antes de continuar.`,
            };
          }
        }
      }

      const now = new Date().toISOString();
      if (data.id) {
        let updatedEmp!: Empleado;
        setState((prev) => ({
          ...prev,
          empleados: prev.empleados.map((e) => {
            if (e.id !== data.id) return e;
            updatedEmp = {
              ...e,
              documento: docClean,
              nombres: data.nombres.trim(),
              apellidos: data.apellidos.trim(),
              correo: correoClean,
              cargo: data.cargo.trim(),
              esTecnico: data.esTecnico,
              activo: data.activo,
              actualizadoEn: now,
            };
            return updatedEmp;
          }),
        }));
        pushToast('exito', 'Empleado actualizado correctamente.');
        return { ok: true, data: updatedEmp };
      }

      const nextId = Math.max(0, ...state.empleados.map((e) => e.id)) + 1;
      const nuevo: Empleado = {
        id: nextId,
        documento: docClean,
        nombres: data.nombres.trim(),
        apellidos: data.apellidos.trim(),
        correo: correoClean,
        cargo: data.cargo.trim(),
        esTecnico: data.esTecnico,
        activo: data.activo,
        creadoEn: now,
        actualizadoEn: now,
      };
      setState((prev) => ({
        ...prev,
        empleados: [...prev.empleados, nuevo],
      }));
      pushToast('exito', 'Empleado registrado correctamente.');
      return { ok: true, data: nuevo };
    },
    [currentUser, state.empleados, state.asignaciones, state.solicitudes, pushToast]
  );

  const toggleTecnicoEmpleado = useCallback(
    (empleadoId: number): ActionResult<{ solicitudesActivas?: Solicitud[] }> => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const emp = state.empleados.find((e) => e.id === empleadoId);
      if (!emp) return { ok: false, error: 'Empleado no encontrado.' };

      if (emp.esTecnico) {
        const asignacionesActivas = state.asignaciones.filter(
          (a) => a.vigente && a.tecnicoId === emp.id
        );
        const solicitudesActivas = asignacionesActivas
          .map((a) => state.solicitudes.find((s) => s.id === a.solicitudId))
          .filter(
            (s): s is Solicitud =>
              !!s && (s.estado === 'Asignada' || s.estado === 'En proceso')
          );

        if (solicitudesActivas.length > 0) {
          return {
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: `No se puede desmarcar como técnico: tiene solicitudes activas (${solicitudesActivas
              .map((s) => s.codigo)
              .join(', ')}). Reasígnelas antes de confirmar.`,
            data: { solicitudesActivas },
          };
        }
      }

      setState((prev) => ({
        ...prev,
        empleados: prev.empleados.map((e) =>
          e.id === empleadoId
            ? { ...e, esTecnico: !e.esTecnico, actualizadoEn: new Date().toISOString() }
            : e
        ),
      }));
      pushToast(
        'exito',
        emp.esTecnico ? `${emp.nombres} ya no figura como técnico.` : `${emp.nombres} marcado como técnico.`
      );
      return { ok: true };
    },
    [currentUser, state.empleados, state.asignaciones, state.solicitudes, pushToast]
  );

  const crearUsuario: AppContextValue['crearUsuario'] = useCallback(
    (empleadoId, perfil, nuevoRegistro): ActionResult<{ passwordTemporal: string }> => {
      if (!puedeGestionarUsuarios(currentUser)) {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado: solo el Administrador puede gestionar usuarios.' };
      }

      const now = new Date().toISOString();
      let targetEmpId = empleadoId;
      let nombreCompleto = '';

      if (nuevoRegistro) {
        const docClean = nuevoRegistro.documento.trim();
        const nombresClean = nuevoRegistro.nombres.trim();
        const apellidosClean = nuevoRegistro.apellidos.trim();
        const correoClean = nuevoRegistro.correo.trim().toLowerCase();
        const cargoClean =
          nuevoRegistro.cargo.trim() ||
          (perfil === 'CLIENTE'
            ? 'Cliente'
            : perfil === 'EMPLEADO'
            ? 'Técnico de Mantenimiento'
            : 'Administrador');

        if (!docClean || !nombresClean || !apellidosClean || !correoClean) {
          return {
            ok: false,
            codigo: 'VALIDACION',
            error: 'Complete documento, nombres, apellidos y correo electrónico.',
          };
        }

        if (state.empleados.some((e) => e.documento.toLowerCase() === docClean.toLowerCase())) {
          return {
            ok: false,
            codigo: 'DUPLICADO',
            error: 'Ya existe un registro con ese documento de identidad.',
          };
        }

        if (state.empleados.some((e) => e.correo.toLowerCase() === correoClean)) {
          return {
            ok: false,
            codigo: 'DUPLICADO',
            error: 'Ya existe un usuario o registro con ese correo electrónico.',
          };
        }

        targetEmpId = Math.max(0, ...state.empleados.map((e) => e.id)) + 1;
        nombreCompleto = `${nombresClean} ${apellidosClean}`;
        const nuevoEmp: Empleado = {
          id: targetEmpId,
          documento: docClean,
          nombres: nombresClean,
          apellidos: apellidosClean,
          correo: correoClean,
          cargo: cargoClean,
          esTecnico: perfil === 'EMPLEADO',
          activo: true,
          creadoEn: now,
          actualizadoEn: now,
        };

        const passwordTemporal = `Temp${Math.floor(100000 + Math.random() * 899999)}a`;
        const nextId = Math.max(0, ...state.usuarios.map((u) => u.id)) + 1;
        const nuevo: Usuario = {
          id: nextId,
          empleadoId: targetEmpId,
          perfil,
          password: passwordTemporal,
          debeCambiarPassword: true,
          intentosFallidos: 0,
          bloqueadoHasta: null,
          ultimoAcceso: null,
          activo: true,
          creadoEn: now,
        };

        setState((prev) => ({
          ...prev,
          empleados: [...prev.empleados, nuevoEmp],
          usuarios: [...prev.usuarios, nuevo],
        }));
        pushToast('exito', `Usuario (${ETIQUETA_PERFIL[perfil]}) creado para ${nombreCompleto}.`);
        return { ok: true, data: { passwordTemporal } };
      }

      const emp = state.empleados.find((e) => e.id === targetEmpId);
      if (!emp) return { ok: false, error: 'Persona no encontrada.' };
      if (state.usuarios.some((u) => u.empleadoId === targetEmpId)) {
        return { ok: false, codigo: 'DUPLICADO', error: 'Este registro ya tiene un usuario asociado.' };
      }

      const passwordTemporal = `Temp${Math.floor(100000 + Math.random() * 899999)}a`;
      const nextId = Math.max(0, ...state.usuarios.map((u) => u.id)) + 1;
      const nuevo: Usuario = {
        id: nextId,
        empleadoId: targetEmpId,
        perfil,
        password: passwordTemporal,
        debeCambiarPassword: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimoAcceso: null,
        activo: true,
        creadoEn: now,
      };
      setState((prev) => ({
        ...prev,
        empleados: prev.empleados.map((e) =>
          e.id === targetEmpId
            ? { ...e, esTecnico: perfil === 'EMPLEADO', actualizadoEn: now }
            : e
        ),
        usuarios: [...prev.usuarios, nuevo],
      }));
      pushToast('exito', `Usuario (${ETIQUETA_PERFIL[perfil]}) creado para ${emp.nombres} ${emp.apellidos}.`);
      return { ok: true, data: { passwordTemporal } };
    },
    [currentUser, state.empleados, state.usuarios, pushToast]
  );

  const editarUsuario: AppContextValue['editarUsuario'] = useCallback(
    (usuarioId, data) => {
      if (!puedeGestionarUsuarios(currentUser)) {
        return {
          ok: false,
          codigo: 'ACCESO_DENEGADO',
          error: 'Acceso denegado: solo el Administrador puede editar usuarios.',
        };
      }
      const usr = state.usuarios.find((u) => u.id === usuarioId);
      if (!usr) return { ok: false, error: 'Usuario no encontrado.' };

      const nombresClean = data.nombres.trim();
      const apellidosClean = data.apellidos.trim();
      const correoClean = data.correo.trim().toLowerCase();
      const cargoClean = data.cargo.trim();

      if (!nombresClean || !apellidosClean || !correoClean) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          error: 'Nombres, apellidos y correo electrónico son obligatorios.',
        };
      }

      const dupCorreo = state.empleados.find(
        (e) => e.correo.toLowerCase() === correoClean && e.id !== usr.empleadoId
      );
      if (dupCorreo) {
        return {
          ok: false,
          codigo: 'DUPLICADO',
          error: 'Ya existe otro usuario con este correo electrónico.',
        };
      }

      if (
        usr.perfil === 'ADMINISTRADOR' &&
        (data.perfil !== 'ADMINISTRADOR' || !data.activo) &&
        usr.activo
      ) {
        const adminsActivos = state.usuarios.filter(
          (u) => u.activo && u.perfil === 'ADMINISTRADOR'
        );
        if (adminsActivos.length <= 1) {
          return {
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: 'No se puede desactivar ni degradar al último Administrador activo.',
          };
        }
      }

      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === usuarioId
            ? { ...u, perfil: data.perfil, activo: data.activo }
            : u
        ),
        empleados: prev.empleados.map((e) =>
          e.id === usr.empleadoId
            ? {
                ...e,
                nombres: nombresClean,
                apellidos: apellidosClean,
                correo: correoClean,
                cargo: cargoClean || e.cargo,
                esTecnico: data.perfil === 'EMPLEADO',
                activo: data.activo,
                actualizadoEn: now,
              }
            : e
        ),
      }));

      pushToast('exito', 'Datos y rol del usuario actualizados.');
      return { ok: true };
    },
    [currentUser, state.usuarios, state.empleados, pushToast]
  );

  const toggleUsuarioActivo = useCallback(
    (usuarioId: number): ActionResult => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const usr = state.usuarios.find((u) => u.id === usuarioId);
      if (!usr) return { ok: false, error: 'Usuario no encontrado.' };

      if (usr.activo && usr.perfil === 'ADMINISTRADOR') {
        const adminsActivos = state.usuarios.filter(
          (u) => u.activo && u.perfil === 'ADMINISTRADOR'
        );
        if (adminsActivos.length <= 1) {
          return {
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: 'No se puede desactivar al último Administrador activo de la plataforma.',
          };
        }
      }

      setState((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === usuarioId ? { ...u, activo: !u.activo } : u
        ),
      }));
      pushToast('exito', usr.activo ? 'Usuario desactivado.' : 'Usuario activado.');
      return { ok: true };
    },
    [currentUser, state.usuarios, pushToast]
  );

  const cambiarPerfilUsuario = useCallback(
    (usuarioId: number, perfil: PerfilUsuario): ActionResult => {
      if (!puedeGestionarUsuarios(currentUser)) {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const usr = state.usuarios.find((u) => u.id === usuarioId);
      if (!usr) return { ok: false, error: 'Usuario no encontrado.' };

      if (usr.perfil === 'ADMINISTRADOR' && perfil !== 'ADMINISTRADOR' && usr.activo) {
        const adminsActivos = state.usuarios.filter(
          (u) => u.activo && u.perfil === 'ADMINISTRADOR'
        );
        if (adminsActivos.length <= 1) {
          return {
            ok: false,
            codigo: 'REGLA_NEGOCIO',
            error: 'No se puede degradar al último Administrador activo de la plataforma.',
          };
        }
      }

      setState((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.id === usuarioId ? { ...u, perfil } : u)),
        empleados: prev.empleados.map((e) =>
          e.id === usr.empleadoId
            ? { ...e, esTecnico: perfil === 'EMPLEADO', actualizadoEn: new Date().toISOString() }
            : e
        ),
      }));
      pushToast('exito', `Rol actualizado a ${ETIQUETA_PERFIL[perfil]}.`);
      return { ok: true };
    },
    [currentUser, state.usuarios, pushToast]
  );

  const restablecerPasswordUsuario = useCallback(
    (usuarioId: number): ActionResult<{ passwordTemporal: string }> => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const usr = state.usuarios.find((u) => u.id === usuarioId);
      if (!usr || !usr.activo) {
        return { ok: false, codigo: 'REGLA_NEGOCIO', error: 'No disponible para usuarios desactivados.' };
      }
      const passwordTemporal = `Reset${Math.floor(100000 + Math.random() * 899999)}b`;
      setState((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === usuarioId
            ? {
                ...u,
                password: passwordTemporal,
                debeCambiarPassword: true,
                intentosFallidos: 0,
                bloqueadoHasta: null,
              }
            : u
        ),
      }));
      pushToast('exito', 'Contraseña temporal generada.');
      return { ok: true, data: { passwordTemporal } };
    },
    [currentUser, state.usuarios, pushToast]
  );

  const guardarRecurso: AppContextValue['guardarRecurso'] = useCallback(
    (data) => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const codigoClean = data.codigo.trim().toUpperCase();
      if (!codigoClean || !data.nombre.trim() || !data.ubicacion.trim() || !data.tipoRecursoId) {
        return { ok: false, codigo: 'VALIDACION', error: 'Complete todos los campos obligatorios.' };
      }
      const dup = state.recursos.find(
        (r) => r.codigo.toUpperCase() === codigoClean && r.id !== data.id
      );
      if (dup) {
        return {
          ok: false,
          codigo: 'DUPLICADO',
          campo: 'codigo',
          error: 'Ya existe un recurso con este código.',
        };
      }

      const now = new Date().toISOString();
      if (data.id) {
        let updated!: Recurso;
        setState((prev) => ({
          ...prev,
          recursos: prev.recursos.map((r) => {
            if (r.id !== data.id) return r;
            updated = {
              ...r,
              codigo: codigoClean,
              nombre: data.nombre.trim(),
              tipoRecursoId: data.tipoRecursoId,
              ubicacion: data.ubicacion.trim(),
              descripcion: data.descripcion.trim(),
              activo: data.activo,
              actualizadoEn: now,
            };
            return updated;
          }),
        }));
        pushToast('exito', 'Recurso actualizado.');
        return { ok: true, data: updated };
      }

      const nextId = Math.max(0, ...state.recursos.map((r) => r.id)) + 1;
      const nuevo: Recurso = {
        id: nextId,
        codigo: codigoClean,
        nombre: data.nombre.trim(),
        tipoRecursoId: data.tipoRecursoId,
        ubicacion: data.ubicacion.trim(),
        descripcion: data.descripcion.trim(),
        activo: data.activo,
        creadoEn: now,
        actualizadoEn: now,
      };
      setState((prev) => ({ ...prev, recursos: [...prev.recursos, nuevo] }));
      pushToast('exito', 'Recurso registrado.');
      return { ok: true, data: nuevo };
    },
    [currentUser, state.recursos, pushToast]
  );

  const toggleRecursoActivo = useCallback(
    (recursoId: number): ActionResult => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const rec = state.recursos.find((r) => r.id === recursoId);
      if (!rec) return { ok: false, error: 'Recurso no encontrado.' };
      setState((prev) => ({
        ...prev,
        recursos: prev.recursos.map((r) =>
          r.id === recursoId
            ? { ...r, activo: !r.activo, actualizadoEn: new Date().toISOString() }
            : r
        ),
      }));
      pushToast('exito', rec.activo ? 'Recurso desactivado.' : 'Recurso activado.');
      return { ok: true };
    },
    [currentUser, state.recursos, pushToast]
  );

  const crearCategoria = useCallback(
    (nombre: string): ActionResult<Categoria> => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const clean = nombre.trim();
      if (!clean) return { ok: false, codigo: 'VALIDACION', error: 'Ingrese el nombre de la categoría.' };
      if (state.categorias.some((c) => c.nombre.toLowerCase() === clean.toLowerCase())) {
        return { ok: false, codigo: 'DUPLICADO', error: 'Ya existe una categoría con ese nombre.' };
      }
      const nextId = Math.max(0, ...state.categorias.map((c) => c.id)) + 1;
      const nueva: Categoria = { id: nextId, nombre: clean, activa: true };
      setState((prev) => ({ ...prev, categorias: [...prev.categorias, nueva] }));
      pushToast('exito', `Categoría "${clean}" agregada.`);
      return { ok: true, data: nueva };
    },
    [currentUser, state.categorias, pushToast]
  );

  const renombrarCategoria = useCallback(
    (id: number, nombre: string): ActionResult => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const clean = nombre.trim();
      if (!clean) return { ok: false, codigo: 'VALIDACION', error: 'El nombre no puede estar vacío.' };
      if (state.categorias.some((c) => c.nombre.toLowerCase() === clean.toLowerCase() && c.id !== id)) {
        return { ok: false, codigo: 'DUPLICADO', error: 'Ya existe otra categoría con ese nombre.' };
      }
      setState((prev) => ({
        ...prev,
        categorias: prev.categorias.map((c) => (c.id === id ? { ...c, nombre: clean } : c)),
      }));
      pushToast('exito', 'Categoría actualizada.');
      return { ok: true };
    },
    [currentUser, state.categorias, pushToast]
  );

  const toggleCategoriaActiva = useCallback(
    (id: number): ActionResult => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Acceso denegado.' };
      }
      const cat = state.categorias.find((c) => c.id === id);
      if (!cat) return { ok: false, error: 'Categoría no encontrada.' };
      setState((prev) => ({
        ...prev,
        categorias: prev.categorias.map((c) => (c.id === id ? { ...c, activa: !c.activa } : c)),
      }));
      pushToast('exito', cat.activa ? 'Categoría desactivada.' : 'Categoría activada.');
      return { ok: true };
    },
    [currentUser, state.categorias, pushToast]
  );

  const crearSolicitud: AppContextValue['crearSolicitud'] = useCallback(
    (input) => {
      if (!currentUser || !currentEmpleado || !puedeCrearSolicitud(currentUser)) {
        return {
          ok: false,
          codigo: 'ACCESO_DENEGADO',
          error: 'Su rol no tiene permiso para crear solicitudes de mantenimiento.',
        };
      }

      // Idempotency token check (RC-02)
      const cached = submissionCacheRef.current.get(input.submissionToken);
      if (cached) {
        return { ok: true, data: cached };
      }

      const recurso = state.recursos.find((r) => r.id === input.recursoId);
      if (!recurso || !recurso.activo) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'recursoId',
          error: 'El recurso seleccionado ya no está disponible.',
        };
      }

      const desc = input.descripcion.trim();
      if (desc.length < 20 || desc.length > 2000) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'descripcion',
          error: 'Debe tener entre 20 y 2 000 caracteres.',
        };
      }

      let solicitanteId = currentEmpleado.id;
      let motivoInicial: string | null = null;
      if (currentUser.perfil === 'ADMINISTRADOR') {
        if (!input.solicitanteId) {
          return {
            ok: false,
            codigo: 'VALIDACION',
            campo: 'solicitanteId',
            error: 'Seleccione el empleado solicitante.',
          };
        }
        const solEmp = state.empleados.find((e) => e.id === input.solicitanteId && e.activo);
        if (!solEmp) {
          return {
            ok: false,
            codigo: 'VALIDACION',
            campo: 'solicitanteId',
            error: 'El empleado solicitante debe estar activo.',
          };
        }
        solicitanteId = solEmp.id;
        if (solEmp.id !== currentEmpleado.id) {
          motivoInicial = `Registrada por ${currentEmpleado.nombres} ${currentEmpleado.apellidos} a nombre de ${solEmp.nombres} ${solEmp.apellidos}`;
        }
      }

      const now = new Date().toISOString();
      const nextSolId = Math.max(0, ...state.solicitudes.map((s) => s.id)) + 1;
      const nuevaSolicitud: Solicitud = {
        id: nextSolId,
        codigo: generarCodigoSolicitud(nextSolId),
        solicitanteId,
        registradaPorUsuarioId: currentUser.id,
        recursoId: recurso.id,
        descripcion: desc,
        estado: 'Pendiente',
        categoriaId: null,
        prioridadId: null,
        motivoCierre: null,
        creadaEn: now,
        actualizadaEn: now,
        cerradaEn: null,
        version: 1,
      };

      const nextEvBase = Math.max(0, ...state.evidencias.map((e) => e.id));
      const nuevasEvidencias: Evidencia[] = input.archivos.map((arc, idx) => ({
        id: nextEvBase + idx + 1,
        solicitudId: nextSolId,
        tipo: arc.tipo,
        nombreOriginal: arc.nombreOriginal,
        nombreAlmacenado: `ev-${nextSolId}-${Date.now()}-${idx}`,
        tipoMime: arc.tipoMime,
        tamanoBytes: arc.tamanoBytes,
        hashSha256: Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
        subidaPorUsuarioId: currentUser.id,
        subidaEn: now,
        dataUrl: arc.dataUrl,
      }));

      const nextHistId = Math.max(0, ...state.historial.map((h) => h.id)) + 1;
      const nuevoHistorial: HistorialEstado = {
        id: nextHistId,
        solicitudId: nextSolId,
        estadoAnterior: null,
        estadoNuevo: 'Pendiente',
        usuarioId: currentUser.id,
        cambiadoEn: now,
        motivo: motivoInicial,
      };

      const nextIaId = Math.max(0, ...state.analisisIa.map((a) => a.id)) + 1;
      const nuevoAnalisis: AnalisisIa | null = state.iaHabilitada
        ? {
            id: nextIaId,
            solicitudId: nextSolId,
            version: 1,
            estadoAnalisis: 'EN_COLA',
            tipoDano: null,
            descripcionObservada: null,
            categoriaSugeridaId: null,
            prioridadSugeridaId: null,
            modelo: null,
            solicitadoPorUsuarioId: currentUser.id,
            creadoEn: now,
            completadoEn: null,
            errorDetalle: null,
            decisionRevision: 'PENDIENTE',
            revisadoPorUsuarioId: null,
            revisadoEn: null,
          }
        : null;

      submissionCacheRef.current.set(input.submissionToken, nuevaSolicitud);

      setState((prev) => ({
        ...prev,
        solicitudes: [nuevaSolicitud, ...prev.solicitudes],
        evidencias: [...prev.evidencias, ...nuevasEvidencias],
        historial: [...prev.historial, nuevoHistorial],
        analisisIa: nuevoAnalisis ? [...prev.analisisIa, nuevoAnalisis] : prev.analisisIa,
      }));

      pushToast('exito', `Solicitud ${nuevaSolicitud.codigo} registrada.`);
      return { ok: true, data: nuevaSolicitud };
    },
    [
      currentUser,
      currentEmpleado,
      state.recursos,
      state.empleados,
      state.solicitudes,
      state.evidencias,
      state.historial,
      state.analisisIa,
      state.iaHabilitada,
      pushToast,
    ]
  );

  const agregarEvidencias: AppContextValue['agregarEvidencias'] = useCallback(
    (solicitudId, archivos) => {
      if (!currentUser || !currentEmpleado) {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Sesión no válida.' };
      }
      const sol = state.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) return { ok: false, error: 'Solicitud no encontrada.' };
      const asigVigente = state.asignaciones.find(
        (a) => a.solicitudId === solicitudId && a.vigente
      );
      if (!puedeAdjuntarEvidencia(currentUser, currentEmpleado, sol, asigVigente)) {
        return {
          ok: false,
          codigo: 'ACCESO_DENEGADO',
          error: 'No tiene permiso para adjuntar evidencias en el estado actual.',
        };
      }

      const existentes = state.evidencias.filter((e) => e.solicitudId === solicitudId);
      const fotosActuales = existentes.filter((e) => e.tipo === 'FOTOGRAFIA').length;
      const pdfsActuales = existentes.filter((e) => e.tipo === 'PDF').length;
      const nuevasFotos = archivos.filter((a) => a.tipo === 'FOTOGRAFIA').length;
      const nuevosPdfs = archivos.filter((a) => a.tipo === 'PDF').length;

      if (fotosActuales + nuevasFotos > 5) {
        return { ok: false, codigo: 'VALIDACION', error: 'Máximo 5 fotografías por solicitud.' };
      }
      if (pdfsActuales + nuevosPdfs > 2) {
        return { ok: false, codigo: 'VALIDACION', error: 'Máximo 2 documentos PDF por solicitud.' };
      }

      const now = new Date().toISOString();
      const baseId = Math.max(0, ...state.evidencias.map((e) => e.id));
      const nuevas: Evidencia[] = archivos.map((arc, idx) => ({
        id: baseId + idx + 1,
        solicitudId,
        tipo: arc.tipo,
        nombreOriginal: arc.nombreOriginal,
        nombreAlmacenado: `ev-${solicitudId}-${Date.now()}-${idx}`,
        tipoMime: arc.tipoMime,
        tamanoBytes: arc.tamanoBytes,
        hashSha256: Math.random().toString(16).slice(2),
        subidaPorUsuarioId: currentUser.id,
        subidaEn: now,
        dataUrl: arc.dataUrl,
      }));

      setState((prev) => ({
        ...prev,
        evidencias: [...prev.evidencias, ...nuevas],
      }));
      pushToast('exito', `${nuevas.length} evidencia(s) adjuntada(s).`);
      return { ok: true };
    },
    [currentUser, currentEmpleado, state.solicitudes, state.asignaciones, state.evidencias, pushToast]
  );

  const registrarTrabajoRealizado = useCallback(
    (solicitudId: number, trabajoRealizado: string, expectedVersion: number): ActionResult => {
      if (!currentUser || !currentEmpleado) {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Sesión no válida.' };
      }
      const sol = state.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) return { ok: false, error: 'Solicitud no encontrada.' };

      if (sol.version !== expectedVersion) {
        return {
          ok: false,
          codigo: 'CONFLICTO_VERSION',
          error: 'La solicitud cambió mientras la editaba.',
        };
      }

      const asigVigente = state.asignaciones.find(
        (a) => a.solicitudId === solicitudId && a.vigente
      );
      if (!puedeRegistrarTrabajo(currentUser, currentEmpleado, sol, asigVigente)) {
        return {
          ok: false,
          codigo: 'ACCESO_DENEGADO',
          error: 'No tiene permiso para registrar trabajo realizado en esta solicitud.',
        };
      }

      const textoClean = trabajoRealizado.trim();
      if (textoClean.length < 10) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'trabajoRealizado',
          error: 'Detalle el trabajo realizado (mínimo 10 caracteres).',
        };
      }
      if (textoClean.length > 1000) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'trabajoRealizado',
          error: 'El registro de trabajo no puede superar los 1 000 caracteres.',
        };
      }

      const now = new Date().toISOString();
      const nextHistId = Math.max(0, ...state.historial.map((h) => h.id)) + 1;
      const hist: HistorialEstado = {
        id: nextHistId,
        solicitudId,
        estadoAnterior: sol.estado,
        estadoNuevo: sol.estado,
        usuarioId: currentUser.id,
        cambiadoEn: now,
        motivo: `Trabajo registrado: ${textoClean}`,
      };

      setState((prev) => ({
        ...prev,
        solicitudes: prev.solicitudes.map((s) =>
          s.id === solicitudId
            ? {
                ...s,
                trabajoRealizado: textoClean,
                trabajoActualizadoEn: now,
                actualizadaEn: now,
                version: s.version + 1,
              }
            : s
        ),
        historial: [...prev.historial, hist],
      }));

      pushToast('exito', 'Trabajo realizado registrado correctamente.');
      return { ok: true };
    },
    [currentUser, currentEmpleado, state.solicitudes, state.asignaciones, state.historial, pushToast]
  );

  const asignarTecnico = useCallback(
    (solicitudId: number, tecnicoId: number, expectedVersion: number): ActionResult => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Solo el Administrador puede asignar técnicos.' };
      }
      const sol = state.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) return { ok: false, error: 'Solicitud no encontrada.' };
      if (sol.version !== expectedVersion) {
        return {
          ok: false,
          codigo: 'CONFLICTO_VERSION',
          error: 'La solicitud cambió mientras la editaba.',
        };
      }
      if (!puedeAsignarTecnico(currentUser, sol)) {
        return {
          ok: false,
          codigo: 'TRANSICION_INVALIDA',
          error: 'No se puede asignar técnico en el estado actual.',
        };
      }

      const tecnico = state.empleados.find((e) => e.id === tecnicoId && e.activo && e.esTecnico);
      if (!tecnico) {
        return { ok: false, codigo: 'VALIDACION', error: 'El técnico seleccionado no es válido o está inactivo.' };
      }

      const now = new Date().toISOString();
      const asignacionPrevia = state.asignaciones.find(
        (a) => a.solicitudId === solicitudId && a.vigente
      );
      const nextAsigId = Math.max(0, ...state.asignaciones.map((a) => a.id)) + 1;
      const nuevaAsig: Asignacion = {
        id: nextAsigId,
        solicitudId,
        tecnicoId: tecnico.id,
        asignadaPorUsuarioId: currentUser.id,
        asignadaEn: now,
        vigente: true,
        finalizadaEn: null,
        motivoFin: null,
      };

      const estadoAnterior = sol.estado;
      const nextHistId = Math.max(0, ...state.historial.map((h) => h.id)) + 1;
      const hist: HistorialEstado = {
        id: nextHistId,
        solicitudId,
        estadoAnterior,
        estadoNuevo: 'Asignada',
        usuarioId: currentUser.id,
        cambiadoEn: now,
        motivo: asignacionPrevia
          ? `Reasignado a ${tecnico.nombres} ${tecnico.apellidos}`
          : `Asignado a ${tecnico.nombres} ${tecnico.apellidos}`,
      };

      setState((prev) => ({
        ...prev,
        solicitudes: prev.solicitudes.map((s) =>
          s.id === solicitudId
            ? { ...s, estado: 'Asignada', actualizadaEn: now, version: s.version + 1 }
            : s
        ),
        asignaciones: [
          ...prev.asignaciones.map((a) =>
            a.solicitudId === solicitudId && a.vigente
              ? { ...a, vigente: false, finalizadaEn: now, motivoFin: 'Reasignación por Administrador' }
              : a
          ),
          nuevaAsig,
        ],
        historial: [...prev.historial, hist],
      }));

      pushToast('exito', `Técnico ${tecnico.nombres} ${tecnico.apellidos} asignado.`);
      return { ok: true };
    },
    [currentUser, state.solicitudes, state.empleados, state.asignaciones, state.historial, pushToast]
  );

  const cambiarEstadoSolicitud = useCallback(
    (
      solicitudId: number,
      destino: EstadoNombre,
      motivo: string,
      expectedVersion: number
    ): ActionResult => {
      if (!currentUser || !currentEmpleado) {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Sesión no válida.' };
      }
      const sol = state.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) return { ok: false, error: 'Solicitud no encontrada.' };

      if (sol.version !== expectedVersion) {
        return {
          ok: false,
          codigo: 'CONFLICTO_VERSION',
          error: 'La solicitud cambió mientras la editaba.',
        };
      }

      const asigVigente = state.asignaciones.find((a) => a.solicitudId === solicitudId && a.vigente);
      const permitidas = obtenerTransicionesPermitidas(currentUser, currentEmpleado, sol, asigVigente);
      const trans = permitidas.find((t) => t.destino === destino);
      if (!trans) {
        return {
          ok: false,
          codigo: 'TRANSICION_INVALIDA',
          error: 'Transición de estado no permitida para su perfil o estado actual.',
        };
      }

      const motivoClean = motivo.trim();
      if (trans.requiereMotivo && motivoClean.length < 10) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'motivo',
          error: 'Indique el motivo (mínimo 10 caracteres).',
        };
      }
      if (motivoClean.length > 500) {
        return {
          ok: false,
          codigo: 'VALIDACION',
          campo: 'motivo',
          error: 'El texto no puede superar los 500 caracteres.',
        };
      }

      const now = new Date().toISOString();
      const cierra = esEstadoFinal(destino);
      const retiraAsignacion = destino === 'Pendiente' || cierra;

      const nextHistId = Math.max(0, ...state.historial.map((h) => h.id)) + 1;
      const hist: HistorialEstado = {
        id: nextHistId,
        solicitudId,
        estadoAnterior: sol.estado,
        estadoNuevo: destino,
        usuarioId: currentUser.id,
        cambiadoEn: now,
        motivo: motivoClean || null,
      };

      setState((prev) => ({
        ...prev,
        solicitudes: prev.solicitudes.map((s) =>
          s.id === solicitudId
            ? {
                ...s,
                estado: destino,
                trabajoRealizado:
                  destino === 'Finalizada' && motivoClean
                    ? motivoClean
                    : s.trabajoRealizado ?? null,
                trabajoActualizadoEn:
                  destino === 'Finalizada' && motivoClean
                    ? now
                    : s.trabajoActualizadoEn ?? null,
                motivoCierre: cierra
                  ? motivoClean || s.trabajoRealizado || s.motivoCierre
                  : s.motivoCierre,
                actualizadaEn: now,
                cerradaEn: cierra ? now : s.cerradaEn,
                version: s.version + 1,
              }
            : s
        ),
        asignaciones: retiraAsignacion
          ? prev.asignaciones.map((a) =>
              a.solicitudId === solicitudId && a.vigente
                ? {
                    ...a,
                    vigente: false,
                    finalizadaEn: now,
                    motivoFin: motivoClean || `Estado cambiado a ${destino}`,
                  }
                : a
            )
          : prev.asignaciones,
        historial: [...prev.historial, hist],
      }));

      pushToast('exito', `Estado actualizado a ${destino}.`);
      return { ok: true };
    },
    [currentUser, currentEmpleado, state.solicitudes, state.asignaciones, state.historial, pushToast]
  );

  const solicitarNuevoAnalisisIa = useCallback(
    (solicitudId: number): ActionResult => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Solo el Administrador puede solicitar análisis de IA.' };
      }
      if (!state.iaHabilitada) {
        return {
          ok: false,
          codigo: 'REGLA_NEGOCIO',
          error: 'El análisis automático de IA se encuentra deshabilitado.',
        };
      }
      const sol = state.solicitudes.find((s) => s.id === solicitudId);
      if (!sol) return { ok: false, error: 'Solicitud no encontrada.' };

      const prevVersiones = state.analisisIa.filter((a) => a.solicitudId === solicitudId);
      const nextVersion = Math.max(0, ...prevVersiones.map((a) => a.version)) + 1;
      const nextId = Math.max(0, ...state.analisisIa.map((a) => a.id)) + 1;
      const nuevo: AnalisisIa = {
        id: nextId,
        solicitudId,
        version: nextVersion,
        estadoAnalisis: 'EN_COLA',
        tipoDano: null,
        descripcionObservada: null,
        categoriaSugeridaId: null,
        prioridadSugeridaId: null,
        modelo: null,
        solicitadoPorUsuarioId: currentUser.id,
        creadoEn: new Date().toISOString(),
        completadoEn: null,
        errorDetalle: null,
        decisionRevision: 'PENDIENTE',
        revisadoPorUsuarioId: null,
        revisadoEn: null,
      };

      setState((prev) => ({
        ...prev,
        analisisIa: [...prev.analisisIa, nuevo],
      }));
      pushToast('exito', `Análisis v${nextVersion} enviado a cola.`);
      return { ok: true };
    },
    [currentUser, state.iaHabilitada, state.solicitudes, state.analisisIa, pushToast]
  );

  const revisarAnalisisIa = useCallback(
    (
      solicitudId: number,
      analisisId: number,
      decision: Exclude<DecisionRevisionIa, 'PENDIENTE'>,
      categoriaId?: number | null,
      prioridadId?: number | null
    ): ActionResult => {
      if (!currentUser || currentUser.perfil !== 'ADMINISTRADOR') {
        return { ok: false, codigo: 'ACCESO_DENEGADO', error: 'Solo el Administrador puede revisar la sugerencia de IA.' };
      }
      const sol = state.solicitudes.find((s) => s.id === solicitudId);
      const analisis = state.analisisIa.find(
        (a) => a.id === analisisId && a.solicitudId === solicitudId
      );
      if (!sol || !analisis) return { ok: false, error: 'Análisis no encontrado.' };

      const latest = state.analisisIa
        .filter((a) => a.solicitudId === solicitudId)
        .sort((a, b) => b.version - a.version)[0];
      if (latest && latest.id !== analisis.id) {
        return {
          ok: false,
          codigo: 'CONFLICTO_VERSION',
          error: 'Existe una versión más reciente del análisis. Se actualizará la vista.',
        };
      }

      let catFinal: number | null = sol.categoriaId;
      let prioFinal: number | null = sol.prioridadId;

      if (decision === 'ACEPTADO') {
        catFinal = analisis.categoriaSugeridaId;
        prioFinal = analisis.prioridadSugeridaId;
      } else if (decision === 'MODIFICADO') {
        if (!categoriaId || !prioridadId) {
          return {
            ok: false,
            codigo: 'VALIDACION',
            error: 'Seleccione tanto la categoría como la prioridad finales.',
          };
        }
        catFinal = categoriaId;
        prioFinal = prioridadId;
      } else if (decision === 'DESCARTADO') {
        catFinal = null;
        prioFinal = null;
      }

      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        solicitudes: prev.solicitudes.map((s) =>
          s.id === solicitudId
            ? {
                ...s,
                categoriaId: catFinal,
                prioridadId: prioFinal,
                actualizadaEn: now,
                version: s.version + 1,
              }
            : s
        ),
        analisisIa: prev.analisisIa.map((a) =>
          a.id === analisisId
            ? {
                ...a,
                decisionRevision: decision,
                revisadoPorUsuarioId: currentUser.id,
                revisadoEn: now,
              }
            : a
        ),
      }));

      pushToast('exito', `Revisión de análisis registrada (${decision}).`);
      return { ok: true };
    },
    [currentUser, state.solicitudes, state.analisisIa, pushToast]
  );

  const setIaHabilitada = useCallback((habilitada: boolean) => {
    setState((prev) => ({ ...prev, iaHabilitada: habilitada }));
  }, []);

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      empleados: SEED_EMPLEADOS,
      usuarios: SEED_USUARIOS,
      tiposRecurso: SEED_TIPOS_RECURSO,
      recursos: SEED_RECURSOS,
      categorias: SEED_CATEGORIAS,
      prioridades: SEED_PRIORIDADES,
      solicitudes: SEED_SOLICITUDES,
      evidencias: SEED_EVIDENCIAS,
      asignaciones: SEED_ASIGNACIONES,
      analisisIa: SEED_ANALISIS_IA,
      historial: SEED_HISTORIAL,
      session: null,
      iaHabilitada: true,
    });
    setLoginNotice('Datos iniciales restablecidos.');
    navigate('/login', { replace: true });
  }, [navigate]);

  const isAdmin = currentUser?.perfil === 'ADMINISTRADOR';
  const isTecnico = currentUser?.perfil === 'EMPLEADO';
  const isCliente = currentUser?.perfil === 'CLIENTE';

  const empleadosVisibles = useMemo(() => {
    if (!currentUser || !currentEmpleado) return [];
    if (isAdmin) return state.empleados;
    // Clientes y Empleados no acceden al directorio administrativo de otros clientes/empleados
    return [currentEmpleado];
  }, [currentUser, currentEmpleado, isAdmin, state.empleados]);

  const usuariosVisibles = useMemo(() => {
    if (!currentUser || !isAdmin) return [];
    return state.usuarios;
  }, [currentUser, isAdmin, state.usuarios]);

  const solicitudesAccesibles = useMemo(() => {
    if (!currentUser || !currentEmpleado) return [];
    return state.solicitudes.filter((sol) => {
      const asig = state.asignaciones.find((a) => a.solicitudId === sol.id && a.vigente);
      return puedeVerSolicitud(currentUser, currentEmpleado, sol, asig);
    });
  }, [currentUser, currentEmpleado, state.solicitudes, state.asignaciones]);

  const value: AppContextValue = {
    pathname,
    navigate,
    currentUser,
    currentEmpleado,
    isAdmin,
    isTecnico,
    isCliente,
    loginNotice,
    clearLoginNotice: () => setLoginNotice(null),
    sessionExpiringSoon,
    extendSession,
    toasts,
    pushToast,
    dismissToast,
    theme,
    setTheme,
    toggleTheme,
    language,
    setLanguage,
    toggleLanguage,
    t,
    empleados: empleadosVisibles,
    usuarios: usuariosVisibles,
    tiposRecurso: state.tiposRecurso,
    recursos: state.recursos,
    categorias: state.categorias,
    prioridades: state.prioridades,
    solicitudes: solicitudesAccesibles,
    evidencias: state.evidencias,
    asignaciones: state.asignaciones,
    analisisIa: isAdmin ? state.analisisIa : [],
    historial: state.historial,
    iaHabilitada: state.iaHabilitada,
    setIaHabilitada,
    filtrosSolicitudes,
    setFiltrosSolicitudes,
    login,
    registrarCuenta,
    logout,
    cambiarPasswordInicial,
    restablecerPasswordPorCorreo,
    guardarEmpleado,
    toggleTecnicoEmpleado,
    crearUsuario,
    editarUsuario,
    toggleUsuarioActivo,
    cambiarPerfilUsuario,
    restablecerPasswordUsuario,
    guardarRecurso,
    toggleRecursoActivo,
    crearCategoria,
    renombrarCategoria,
    toggleCategoriaActiva,
    crearSolicitud,
    agregarEvidencias,
    asignarTecnico,
    registrarTrabajoRealizado,
    cambiarEstadoSolicitud,
    solicitarNuevoAnalisisIa,
    revisarAnalisisIa,
    resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp debe utilizarse dentro de AppProvider');
  }
  return ctx;
}

export function useSolicitudesVisibles() {
  const { solicitudes, currentUser, currentEmpleado, asignaciones } = useApp();
  return useMemo(() => {
    if (!currentUser || !currentEmpleado) return [];
    return solicitudes.filter((sol) => {
      const asig = asignaciones.find((a) => a.solicitudId === sol.id && a.vigente);
      return puedeVerSolicitud(currentUser, currentEmpleado, sol, asig);
    });
  }, [solicitudes, currentUser, currentEmpleado, asignaciones]);
}
