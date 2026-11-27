# Plataforma de Solicitudes de Mantenimiento

Aplicación web para registrar, asignar, dar seguimiento y analizar solicitudes de mantenimiento de equipos, instalaciones, maquinaria y herramientas con control de acceso basado en roles (`ADMINISTRADOR`, `EMPLEADO` y `CLIENTE`).

---

## 1. Visión General de la Arquitectura

El repositorio contiene **tres piezas diferenciadas** que conviene entender antes de modificar cualquier archivo:

1. **Frontend SPA (`src/`):** React 19 + TypeScript + Vite 8 + Tailwind CSS v4. Utiliza `AppContext` (`src/context/AppContext.tsx`) con estado optimista en `localStorage` (`plataforma_mantenimiento_v2`) sincronizado con la API REST mediante el cliente HTTP tipado `src/services/apiClient.ts` (`fetch()` + `Authorization: Bearer <token>`, configurable con `VITE_API_BASE_URL` y degradación local si la API no está disponible).
2. **API REST en Memoria con Express (`src/server/apiApp.ts`):** Implementa las reglas RBAC, autenticación y ciclo de vida de solicitudes sobre un `BackendStore` en memoria. Se monta como middleware en Vite (`vite.config.ts`) en desarrollo, se empaqueta en `src/server/productionServer.ts` para producción/IIS, y es la base que valida la suite `tests/rbac.test.ts`.
3. **Backend Spring Boot + PostgreSQL (`backend/`):** API REST Java 21 / Spring Boot 3.4 con JWT stateless, BCrypt, 12 entidades JPA y PostgreSQL 16 (o H2 en el perfil `test`).

> Para detalles técnicos internos de módulos críticos, decisiones de diseño y flujos de datos, consulta [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

---

## 2. Estructura del Repositorio

```text
├── .agents/                  # Reglas del proyecto e instintos ECC (tech-stack, workflow, QA)
├── backend/                  # API Java 21 / Spring Boot 3.4 + PostgreSQL 16
│   ├── sql/                  # DDL de creación e índices (schema-postgresql.sql)
│   ├── src/main/java/.../    # Controladores, entidades JPA, seguridad JWT, servicios
│   └── src/main/resources/   # application.yml (PostgreSQL) y application-test.yml (H2)
├── docs/                     # Documentación técnica, SRS, UML, ER, endpoints e IIS
├── iis/                      # Plantillas web.config para despliegue en IIS
├── postman/                  # Colección y entorno Postman para Spring Boot (puerto 8080)
├── public/assets/aistudio/   # Artefactos de diseño previos (no referenciados en runtime)
├── scripts/                  # Scripts de QA (jules-qa-runner.ts, ecc-verify.ts) y despliegue IIS (.ps1)
├── src/                      # Frontend React + servidor Express en memoria
│   ├── components/           # Layout, componentes UI comunes y escenas 3D/Canvas
│   ├── context/              # Estado global y persistencia (AppContext.tsx)
│   ├── data/                 # Datos semilla (seed.ts)
│   ├── i18n/                 # Diccionario bilingüe ES/EN (translations.ts)
│   ├── screens/              # Pantallas de la aplicación (P-01 a P-16)
│   ├── server/               # apiApp.ts (Express) y productionServer.ts (IIS/Node)
│   ├── services/             # Reglas de negocio (domainRules.ts) y PBKDF2 (passwordSecurity.ts)
│   └── types/                # Contratos TypeScript del dominio (domain.ts)
├── tests/                    # Suite automatizada RBAC y reglas de dominio (rbac.test.ts)
├── AGENTS.md                 # Reglas mandatorias para agentes autónomos
└── CLAUDE.md                 # Directrices de proyecto, comandos y estándares ECC
```

---

## 3. Puesta en Marcha en Local

### Requisitos Previos
* **Frontend y pruebas Node:** Node.js v18+ (validado con v26.13.1) y `npm` (en Windows PowerShell usar `npm.cmd` si la política de ejecución bloquea scripts `.ps1`).
* **Backend Java (opcional):** Docker Desktop, o bien JDK 21 + Maven + PostgreSQL 16.

### Variables de Entorno
Copia la plantilla base antes de iniciar:

```powershell
Copy-Item .env.example .env
```

Variables definidas en `.env.example`:
* `APP_URL`: URL base de la aplicación (`http://localhost:3000`).
* `JULES_API_KEY`: Opcional; habilita el reporte remoto a `@google/jules-sdk` al ejecutar `npm.cmd run test:jules`.
* `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `BACKEND_PORT`, `JWT_SECRET`, `JWT_EXPIRATION_MS`: Configuración para `docker-compose.yml` y el backend Spring Boot.
* `GEMINI_API_KEY`: Opcional; habilita inferencia multimodal real con `@google/genai` (`gemini-2.5-flash`) en `src/services/geminiAiService.ts`. Sin clave configurada, el servidor degrada automáticamente al clasificador determinista local.

### Instalación, Ejecución y Pruebas

```powershell
# 1. Instalar dependencias (requiere --legacy-peer-deps por compatibilidad vite 8 / esbuild)
npm.cmd install --legacy-peer-deps

# 2. Levantar servidor de desarrollo (Frontend + middleware /api en puerto 3000)
npm.cmd run dev

# 3. Verificación de tipos TypeScript
npm.cmd run lint

# 4. Ejecutar suite de pruebas RBAC e integración end-to-end (18 pruebas)
npm.cmd test

# 5. Ejecutar validación QA con Jules (obligatoria en rama qa)
npm.cmd run test:jules

# 6. Ejecutar verificación integral de ECC (tipos, tests y consistencia documental)
npm.cmd run ecc:verify

# 7. Compilar frontend (dist/) y servidor de producción (server.cjs / server.mjs)
npm.cmd run build
npm.cmd run build:server
```

Para levantar el backend Java con PostgreSQL en contenedores:

```powershell
docker compose up -d --build
```

Para pasos detallados de navegador, Postman e IIS, consulta [COMO_VER_EL_PROYECTO.md](COMO_VER_EL_PROYECTO.md) y [docs/DESPLIEGUE_IIS.md](docs/DESPLIEGUE_IIS.md).

---

## 4. Flujo de Trabajo y Ramas (`AGENTS.md`)

El repositorio sigue un ciclo estricto de 3 ramas:
1. **`dev`**: Desarrollo y ejecución de `npm test`.
2. **`qa`**: Integración desde `dev` y validación obligatoria con `npm run test:jules` hasta obtener `✅ APROBADO`.
3. **`main`**: Producción estable; recibe cambios únicamente tras la aprobación en `qa`, seguida de `git push` de las tres ramas.

---

## 5. Incoherencias y Artefactos sin Uso Detectados

Al revisar el proyecto completo se detectaron los siguientes puntos que conviene tener presentes para no asumir comportamientos erróneos:

1. **Sincronización híbrida Frontend–API:** `AppContext.tsx` sincroniza login, registro, creación/actualización de solicitudes, asignaciones, trabajo técnico y análisis IA con `src/server/apiApp.ts` vía `src/services/apiClient.ts`, manteniendo respaldo en `localStorage` para operación sin conexión o despliegue estático puro.
2. **Diferencia de contratos entre `apiApp.ts` y Spring Boot (`backend/`):** Ambos implementan el dominio pero con rutas y payloads distintos (por ejemplo, `apiApp.ts` expone `/api/admin/usuarios` y `/api/auth/recovery/send-code`, mientras Spring Boot expone `/api/usuarios` y `/api/auth/password-reset/request`).
3. **Análisis IA en backend Java (`backend/`):** El servicio Node (`src/services/geminiAiService.ts`) ya integra `@google/genai` (`gemini-2.5-flash`) con fallback local, mientras que `SolicitudService.java` en Spring Boot mantiene inferencia determinista por palabras clave.
4. **Motor de base de datos en `docs/SRS.md`:** La sección 3.1.3 de `docs/SRS.md` menciona `MySQL versión 8.4 LTS`, pero toda la implementación (`docker-compose.yml`, `backend/pom.xml`, `backend/sql/schema-postgresql.sql` y `application.yml`) utiliza **PostgreSQL 16** (y H2 en el perfil `test`).
5. **Archivos sin uso aparente:**
   * `public/assets/aistudio/` (`DESIGN_108d1fc9.md`, `PLAN_3f23d407.md`, `PRD_646e0193.md`, `TRD_14ce0cc8.md`, `User-Flow_6171f652.md`, `theme_95eb8a8d.css`) no está referenciado en `src/` ni en `index.html`.
   * El script `"clean"` en `package.json` intenta borrar `server.js`, mientras `"build:server"` genera `server.cjs` y `server.mjs`.

---

## 6. Índice de Documentación

| Documento | Propósito |
| :--- | :--- |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Diseño interno de módulos complejos, reglas de dominio, seguridad y pruebas |
| [docs/documentacion_endpoints.md](docs/documentacion_endpoints.md) | Contrato técnico de endpoints REST (Spring Boot y `apiApp.ts`) |
| [docs/DESPLIEGUE_IIS.md](docs/DESPLIEGUE_IIS.md) | Despliegue en Windows Server / IIS (`ReverseProxy`, `iisnode`, `StaticSpa`, `NativeNoModules`) |
| [COMO_VER_EL_PROYECTO.md](COMO_VER_EL_PROYECTO.md) | Guía práctica de ejecución en Windows, Postman y Docker |
| [docs/SRS.md](docs/SRS.md) | Especificación de requerimientos e Historias de Usuario (`HU-01` a `HU-20`) |
| [docs/modelo_entidad_relacion.md](docs/modelo_entidad_relacion.md) | Modelo entidad-relación de la base de datos |
| [docs/diagrama_uml.md](docs/diagrama_uml.md) | Diagramas UML de casos de uso y secuencia |
| [AGENTS.md](AGENTS.md) | Reglas de flujo de 3 ramas, QA con Jules y mantenimiento documental |
| [CLAUDE.md](CLAUDE.md) | Guía de proyecto, comandos y estándares de desarrollo ECC |
| [.agents/rules/](.agents/rules/) | Reglas modulares de arquitectura, pruebas y calidad para agentes |
