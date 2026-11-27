# Regla Técnica: Pila Tecnológica del Proyecto (ECC Tech Stack)

## 1. Frontend
- **React 19 & TypeScript 5+:** Componentes funcionales con tipado explícito.
- **Vite 8:** Bundler rápido con configuración en `vite.config.ts`.
- **Tailwind CSS v4 y Design System (`src/index.css`, `src/components/CommonUI.tsx`):** Tokens semánticos centralizados en variables CSS para Modo Oscuro y Modo Claro (armonía complementaria dividida WCAG 2.2 AA), fuentes `Plus Jakarta Sans` / `Inter` / `JetBrains Mono` y componentes reutilizables accesibles.
- **Three.js (`HeroModel3D`):**
  - Un único modelo 3D central destacado en `src/screens/LoginScreen.tsx`.
  - Prohibido agregar controles de zoom (ni botones ni eventos de rueda/pinch).
  - Escena ajustada para evitar cortes visuales en pantallas móviles y de escritorio.
  - Gestión rigurosa del ciclo de vida (animación pausada y `renderer.dispose()` al desmontar).

## 2. Servidor Intermedio y Producción Node
- **Express 4 (`apiApp.ts`):** Enrutador para APIs REST locales, autenticación JWT/RBAC simulada, inventario y órdenes.
- **`src/server/productionServer.ts`:** Servidor estático + API REST unificado para despliegues locales, contenedores o IIS.
- **Empaquetado:** `npm.cmd run build:server` genera `server.cjs` y `server.mjs` con `esbuild`.

## 3. Despliegue en IIS
- **HttpPlatformHandler v1.2:** Enrutamiento hacia `node.exe server.cjs`.
- **Configuraciones:** `web.config` principal, `iis/web.native-no-modules.config` para entornos estándar sin módulos opcionales.

## 4. Backend Empresarial
- **Spring Boot 3.4 (Java 21):** Arquitectura en capas (`controller`, `service`, `repository`, `entity`, `dto`).
- **PostgreSQL 16:** Base de datos relacional para entornos de producción y contenedores (`docker-compose.yml`).
