# Directrices para Agentes de Desarrollo y QA

## Reglas de Ejecución de Pruebas en Rama `qa`

1. **Servicio de Pruebas en `qa`:**
   - Al situarse en la rama `qa` para ejecutar o validar pruebas, se debe utilizar **Jules** como servicio de pruebas en lugar de **Composio**.
   - Comando de ejecución: `npm run test:jules` (o `npm run test:qa`).
   - El script `scripts/jules-qa-runner.ts` orquesta la suite de pruebas local (`tests/rbac.test.ts`), analiza la rama activa, valida las reglas RBAC y genera el reporte formal de QA compatible con Jules.
   - Si la variable de entorno `JULES_API_KEY` está configurada en `.env`, el runner conecta automáticamente con la sesión de triage de `@google/jules-sdk`. Si no está configurada, las pruebas se ejecutan y validan localmente sin bloquear el flujo.
   - **Sincronización con GitHub:** Si las pruebas ejecutadas con Jules salen bien (`✅ APROBADO`), se deben sincronizar todos los cambios y ramas correspondientes con el repositorio remoto en GitHub (`git push`).

2. **Otras ramas:**
   - En ramas distintas a `qa` (por ejemplo `main` o `dev`), se mantiene la ejecución estándar (`npm test`).
