# Regla de Pruebas: Aseguramiento de Calidad y Jules QA

## 1. Estrategia de Pruebas
- **Pruebas de Integración y RBAC:** Implementadas con el runner nativo de Node.js (`tsx --test`) en `tests/rbac.test.ts` e `tests/integration.test.ts`.
- **Cobertura de Casos Críticos:**
  - Control de acceso por roles (`SUPERVISOR`, `TECNICO`, `OPERADOR`, `AUDITOR`).
  - Ciclo de vida de órdenes de trabajo (creación, asignación, cierre).
  - Gestión de inventario (ingreso de repuestos, consumo y alertas de stock bajo).
  - Manejo de contingencias (401 no autenticado, 403 no autorizado, 404 recursos inexistentes).

## 2. Runner Jules QA
- Archivo: `scripts/jules-qa-runner.ts`.
- Ejecución: `npm.cmd run test:jules`.
- Conexión opcional con `@google/jules-sdk` mediante `JULES_API_KEY` en `.env`.
- Si la clave no está presente, ejecuta la verificación local completa garantizando que el flujo no se interrumpa.
