# Arquitectura Técnica y Guía de Mantenimiento

Este documento describe únicamente los módulos críticos, complejos o con decisiones técnicas no evidentes del proyecto. Las pantallas CRUD sencillas (`CategoriesScreen.tsx`, `ErrorScreen.tsx`, `CommonUI.tsx`, etc.) y las entidades JPA estándar siguen patrones convencionales y no requieren documentación adicional.

---

## 1. Frontend SPA (`src/`)

### 1.1 Enrutamiento Manual y Guarda RBAC (`src/App.tsx`, `src/services/domainRules.ts`)
* **Decisión técnica:** La aplicación **no usa `react-router`**. El enrutamiento se controla mediante el estado `pathname` y `navigate()` dentro de `AppContext.tsx` (sincronizado con `window.history.pushState` y el evento `popstate`).
* **Flujo de entrada en `RouterView()` (`src/App.tsx`):**
  1. Si `!currentUser`, únicamente permite `/recuperar-contrasena` o `/cuenta/contrasena`; cualquier otra ruta renderiza `LoginScreen`.
  2. Si `currentUser.debeCambiarPassword` es `true`, fuerza `ChangePasswordScreen` hasta completar el cambio de clave temporal.
  3. Evalúa `tienePermisoRuta(currentUser, pathname)` (`src/services/domainRules.ts`) antes de renderizar cualquier pantalla dentro de `AppLayout`. Si falla, muestra `ErrorScreen` (`tipo="sin-permiso"`).

### 1.2 Estado Global y Persistencia (`src/context/AppContext.tsx`)
* **Propósito:** Centraliza todo el estado de negocio (`empleados`, `usuarios`, `tiposRecurso`, `recursos`, `categorias`, `prioridades`, `solicitudes`, `evidencias`, `asignaciones`, `analisisIa`, `historial`, `session`, `iaHabilitada`), navegación, toasts, tema (`dark`/`light`) e idioma (`es`/`en`).
* **Persistencia:** Serializa el estado en `localStorage` bajo la clave `STORAGE_KEY = 'plataforma_mantenimiento_v2'`.
* **Decisiones no obvias que debes conocer antes de modificar `loadInitialState()`:**
  * Al cargar desde `localStorage`, `loadInitialState()` **restablece siempre** los campos `password`, `debeCambiarPassword: false`, `intentosFallidos: 0` y `bloqueadoHasta: null` del usuario administrador semilla (`id === 1 && perfil === 'ADMINISTRADOR'`) con los valores de `SEED_USUARIOS` (`src/data/seed.ts`) para evitar bloqueos irreversibles en demos locales.
  * Maneja expiración de sesión por inactividad mediante `INACTIVITY_WARNING_MS` (28 min) e `INACTIVITY_EXPIRE_MS` (30 min).
* **Dependencias:** Consume `src/data/seed.ts`, `src/services/domainRules.ts`, `src/services/apiClient.ts`, `src/i18n/translations.ts` y `src/types/domain.ts`. Las operaciones críticas (`login`, `logout`, `registrarCuenta`, `crearSolicitud`, `asignarTecnico`, `cambiarEstadoSolicitud`, `registrarTrabajoRealizado`, `solicitarNuevoAnalisisIa`, `revisarAnalisisIa`) se sincronizan vía `fetch()` contra `/api/*` usando `MaintenanceApiClient` (con `Authorization: Bearer <token>` en `sessionStorage` y fallback local transparente si la API no responde).

### 1.3 Reglas de Dominio y Seguridad (`src/services/domainRules.ts`, `src/services/passwordSecurity.ts`)
* **Máquina de estados (`ESTADOS_ORDEN`, `ESTADOS_FINALES`, `obtenerTransicionesPermitidas`):**
  * Estados válidos: `'Pendiente'`, `'Asignada'`, `'En proceso'`, `'Finalizada'`, `'Cancelada'`, `'Rechazada'`.
  * Los tres últimos son finales (`esEstadoFinal()`) y bloquean modificaciones posteriores.
  * Concurrencia optimista: las mutaciones sobre `Solicitud` validan e incrementan el campo numérico `version`.
* **Validación de evidencias (`verificarFirmaBinariaEvidencia`):**
  * No confía únicamente en la extensión o el MIME enviado por el navegador; inspecciona los *magic bytes* en la cabecera binaria (JPEG, PNG, WebP, PDF).
  * Límites definidos como constantes: `MAX_FOTOS = 5` (`MAX_FOTO_BYTES` = 5 MB) y `MAX_PDFS = 2` (`MAX_PDF_BYTES` = 10 MB).
* **Hashing de contraseñas (`passwordSecurity.ts`):**
  * Implementa `PBKDF2-HMAC-SHA256` en TypeScript puro (`sha256Bytes`, `hmacSha256`) para funcionar de forma síncrona e idéntica tanto en el navegador como en Node.js sin depender de APIs nativas distintas entre entornos.
  * Formato almacenado: `$pbkdf2-sha256$10000$<saltHex>$<hashHex>` (`PBKDF2_ITERATIONS = 10000`, `SALT_BYTES = 16`).
  * `verifyPassword()` acepta además contraseñas heredadas de prueba en texto plano únicamente si la cadena almacenada no empieza con `$pbkdf2-sha256$`.
* **Análisis de IA (`src/services/geminiAiService.ts` y `generarInferenciaAnalisisIa`):**
  * `analizarSolicitudConGemini()` conecta el endpoint `POST /api/admin/solicitudes/:id/analisis-ia` con `@google/genai` (`gemini-2.5-flash`) cuando `GEMINI_API_KEY` está configurada en `.env`, enviando descripción, recurso y hasta 2 fotografías adjuntas en Base64.
  * Si no hay clave configurada o ocurre un error de red/cuota, degrada automáticamente a `generarInferenciaAnalisisIa()` (clasificación determinista por palabras clave) validando siempre la salida contra el catálogo activo con `validarSugerenciaIaContraCatalogo()`.

### 1.4 Internacionalización (`src/i18n/translations.ts`)
* Exporta `translateText(text, language)` y persiste la preferencia en `localStorage` (`LANG_STORAGE_KEY`, `THEME_STORAGE_KEY`). Es un diccionario bidireccional ES/EN usado por pantallas y componentes.

---

## 2. Servidor Node.js / Express (`src/server/`)

### 2.1 API REST en Memoria (`src/server/apiApp.ts`)
* **Propósito:** Provee una API REST Express completa sobre un `BackendStore` en memoria (`createInitialBackendStore()`), compartiendo las mismas reglas de `src/services/domainRules.ts` y `SEED_*` de `src/data/seed.ts`.
* **Montaje:**
  * Desarrollo: inyectada como middleware en `vite.config.ts` mediante `configureServer(server)`.
  * Producción / IIS: montada en `src/server/productionServer.ts`.
  * Pruebas: instanciada directamente en `tests/rbac.test.ts` mediante `createApiApp()`.
* **Autenticación:**
  * Emite y valida tokens `base64url` (`encodeSessionToken` / `decodeSessionToken`) con `{ usuarioId, perfil }` en `Authorization: Bearer <token>`, o alternativamente acepta la cabecera `x-user-id` (útil en pruebas).
  * Para el rol `CLIENTE`, `sanitizarSolicitudParaRol()` elimina `solicitanteId`, `registradaPorUsuarioId` y datos internos de empleados antes de devolver la respuesta.

### 2.2 Servidor de Producción (`src/server/productionServer.ts`)
* **Propósito:** Sirve los estáticos compilados de `dist/`, monta `createApiApp()` en `/api/*` y redirige el resto de rutas GET hacia `dist/index.html` (fallback SPA).
* **Decisión crítica para IIS (`iisnode`):**
  * Utiliza `process.cwd()` en lugar de `import.meta.url` / `__dirname` para localizar `dist/`, de modo que el mismo código fuente pueda empaquetarse con `esbuild` tanto a CommonJS (`server.cjs`, requerido por `iisnode`) como a ESM (`server.mjs`).
  * Si `process.env.IISNODE_VERSION` está definido, escucha en `process.env.PORT` (que en `iisnode` es una *Named Pipe*, no un número de puerto).

---

## 3. Backend Java Spring Boot (`backend/`)

### 3.1 Estructura y Responsabilidades
* **Seguridad (`SecurityConfig.java`, `JwtAuthenticationFilter.java`, `JwtService.java`, `CustomUserDetailsService.java`):**
  * Sesión `STATELESS`, CSRF deshabilitado, CORS abierto con `allowedOriginPatterns("*")`.
  * Endpoints públicos: `/api/auth/**`, `/api/health`, `/h2-console/**`.
  * Rutas exclusivas de `ADMINISTRADOR`: `/api/usuarios/**`, `/api/empleados/**` (`@PreAuthorize` en `EmpleadoController`), `POST/PUT/DELETE /api/recursos/**`, `/api/solicitudes/*/asignar` y endpoints de disparo/revisión de IA.
  * Contraseñas cifradas con `BCryptPasswordEncoder(10)`.
* **Lógica de negocio (`SolicitudService.java`, `AuthService.java`):**
  * Replica en Java las transiciones de estado, auditoría en `HistorialEstado`, carga/descarga protegida de `Evidencia` y análisis IA (`AnalisisIA`).
  * Manejo de excepciones centralizado en `GlobalExceptionHandler.java`, que responde `{ timestamp, status, error }`.
* **Carga inicial (`config/DataInitializer.java`):**
  * Implementa `CommandLineRunner`; si `estadoRepository.count() == 0`, siembra los 6 estados (`Pendiente`, `Asignada`, `En proceso`, `Finalizada`, `Cancelada`, `Rechazada`), categorías, prioridades, tipos de recurso, recursos, empleados, usuarios y solicitudes de ejemplo.
* **Perfiles (`application.yml`, `application-test.yml`):**
  * Por defecto conecta a PostgreSQL (`jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:mantenimiento_db}`) con `hibernate.ddl-auto: update`.
  * Con `-Dspring-boot.run.profiles=test` usa H2 en memoria (utilizado también por `SolicitudApiIntegrationTest.java`).

---

## 4. Pruebas y Automatización (`tests/`, `scripts/`)

### 4.1 Suites de Pruebas (`tests/rbac.test.ts`, `tests/integration.test.ts`)
* Ejecutadas con el test runner nativo de Node (`tsx --test tests/rbac.test.ts tests/integration.test.ts`, sin Jest ni Vitest).
* `tests/rbac.test.ts` (15 casos): valida guardas de rutas UI (`tienePermisoRuta`), bloqueo HTTP `403` en `apiApp.ts`, sanitización de respuestas para `CLIENTE`, registro y duplicados (`409`), política de contraseñas (`400`), recuperación en dos pasos, diccionario i18n, estructura del backend Spring Boot y criterios `HU-01` a `HU-20`.
* `tests/integration.test.ts` (3 casos): valida integración extremo a extremo de `MaintenanceApiClient` (`fetch()`) contra `apiApp.ts` y `geminiAiService.ts` (ciclo completo registro → creación → IA → revisión → asignación → trabajo técnico → cierre, CRUD de recursos con `403`/`409`, y resiliencia ante errores de red).

### 4.2 Runner QA Jules (`scripts/jules-qa-runner.ts`)
* Lee la rama activa directamente desde `.git/HEAD` (con fallback a `GIT_BRANCH` / `BRANCH_NAME`).
* Ejecuta `npx tsx --test tests/rbac.test.ts`, parsea el resumen de salida (`ℹ tests`, `ℹ pass`, `ℹ fail`, `ℹ duration_ms`) y emite el veredicto (`✅ APROBADO` o `❌ FALLÓ`).
* Si `JULES_API_KEY` está configurada en `.env` (y no es el placeholder `MY_JULES_API_KEY`), envía el reporte a `@google/jules-sdk`; si no, finaliza localmente con el código de salida de las pruebas.

### 4.3 Scripts de Despliegue IIS (`scripts/deploy-iis.ps1`, `scripts/install-url-rewrite.ps1`)
* `deploy-iis.ps1` automatiza `npm.cmd run build`, `npm.cmd run build:server`, copia del `web.config` según `-DeploymentMode` (`ReverseProxy`, `iisnode`, `StaticSpa`, `NativeNoModules`), asignación de permisos NTFS a `IIS_IUSRS`/`IUSR` y creación del Application Pool (`MantenimientoPool`) y sitio (`MantenimientoApp`) vía `appcmd.exe`.
* Ambos scripts evitan caracteres Unicode/emoji en literales de cadena para prevenir errores de tokenización (`TerminatorExpectedAtEndOfString`) en Windows PowerShell 5.1.
