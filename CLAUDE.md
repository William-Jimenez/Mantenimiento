# CLAUDE.md - Guía de Proyecto y Normas ECC (Everything Claude Code)

Este repositorio utiliza el estándar de desarrollo asistido por agentes **ECC (Everything Claude Code / Antigravity Harness)** junto con la suite de validación **Jules QA**.

---

## 1. Visión General del Proyecto

Sistema empresarial para la gestión integral de mantenimiento industrial, órdenes de trabajo, inventarios de repuestos, gestión de activos, personal técnico y auditorías.

- **Frontend:** React 19, TypeScript (modo estricto), Vite 8, Tailwind CSS v4, Motion, Lucide Icons, Three.js (Canvas 3D destacado con iluminación ambiental, rotación suave y sin controles de zoom).
- **Servidor Intermedio / Prototipo:** Express 4 (`src/server/productionServer.ts`, `apiApp.ts`), servidor CJS/ESM empaquetado con `esbuild`, compatible con Node 20+ y despliegue nativo en IIS (vía HttpPlatformHandler).
- **Backend Empresarial:** Spring Boot 3.4 (Java 21 LTS), Spring Data JPA, PostgreSQL 16 (ver `docker-compose.yml` y `backend/`).
- **Seguridad & RBAC:** Control de acceso basado en roles (`SUPERVISOR`, `TECNICO`, `OPERADOR`, `AUDITOR`) en endpoints y pantallas.

---

## 2. Comandos Esenciales de Desarrollo

> **Nota para Windows/PowerShell:** Utilizar siempre `npm.cmd` o `powershell -ExecutionPolicy Bypass`.

| Comando | Acción |
| :--- | :--- |
| `npm.cmd run dev` | Inicia el servidor de desarrollo Vite en puerto `3000`. |
| `npm.cmd run build` | Compila los assets de frontend en `dist/`. |
| `npm.cmd run build:server` | Genera los bundles del servidor de producción (`server.cjs` y `server.mjs`). |
| `npm.cmd start` | Ejecuta el servidor de producción Express en puerto `3000` (o `PORT`). |
| `npm.cmd run lint` | Ejecuta validación estática de tipos TypeScript (`tsc --noEmit`). |
| `npm.cmd test` | Ejecuta la suite de pruebas RBAC e integración con el runner nativo de Node. |
| `npm.cmd run test:jules` | Ejecuta el runner formal de aseguramiento de calidad con reporte para Jules. |
| `npm.cmd run ecc:verify` | Verificación integral ECC (tipos, tests, build y consistencia de docs). |
| `npm.cmd run deploy:iis` | Despliega y configura el sitio en Internet Information Services (IIS). |

---

## 3. Flujo de Ramas Obligatorio (`dev` -> `qa` -> `main`)

Todo agente o desarrollador que opere en este repositorio debe respetar estrictamente el ciclo de 3 ramas:

1. **Rama `dev` (Desarrollo):**
   - Todos los cambios, componentes o correcciones inician aquí.
   - Ejecutar y mantener pasando `npm.cmd run lint` y `npm.cmd test`.
2. **Rama `qa` (Aseguramiento de Calidad):**
   - Se integran los cambios terminados de `dev`.
   - **Mandatorio:** Ejecutar `npm.cmd run test:jules`.
   - Solo avanzar si el veredicto reporta `[OK] VEREDICTO FINAL: APROBADO`.
3. **Rama `main` (Producción / Estable):**
   - Se integran los cambios validados de `qa`.
   - Sincronizar inmediatamente todas las ramas con el remoto: `git push origin dev qa main`.

---

## 4. Estándares de Código y Directrices ECC

1. **Tipado Estricto:** Prohibido el uso de `any` sin justificación explícita. Modelar contratos con interfaces TypeScript o DTOs.
2. **Sin Fallos Silenciosos:** Todo bloque `try/catch` debe propagar el error o devolver un código de estado representativo (`400`, `401`, `403`, `404`, `500`) con mensaje descriptivo en JSON.
3. **Modelado 3D Hero (`HeroModel3D`):**
   - Un único canvas central destacado.
   - No añadir botones ni gestos de zoom (el diseño prohíbe scroll/pinch zoom y recortes en el viewport).
   - Renderizado responsivo, suave (`requestAnimationFrame`) y con limpieza de recursos en `componentWillUnmount` / `useEffect return`.
4. **Mantenimiento Autónomo de Documentación:**
   - Si una tarea modifica endpoints, arquitectura o flujos, actualizar la documentación (`README.md`, `docs/ARQUITECTURA.md`, `docs/SRS.md`, `docs/documentacion_endpoints.md`) en la misma tarea sin pedir confirmación previa.
   - Mantener el idioma, formato y terminología existentes.

---

## 5. Estructura de Reglas `.agents/`

El repositorio expone reglas especializadas en `.agents/rules/`:
- `tech-stack.md`: Pautas de React 19, Tailwind v4, Express, Spring Boot y Three.js.
- `code-standards.md`: Convenciones de nomenclatura, inmutabilidad y calidad.
- `testing-qa.md`: Pruebas de integración, RBAC y protocolo Jules SDK.
- `branch-workflow.md`: Procedimiento detallado de git y sincronización.
