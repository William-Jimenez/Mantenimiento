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

## Reglas de Mantenimiento Autónomo de Documentación

3. **Actualización Automática y Acotada de Documentación:**
   - En todas las peticiones, si los cambios realizados hacen estrictamente necesario actualizar la documentación del proyecto (`README`, `COMO_VER_EL_PROYECTO.md`, `docs/SRS.md`, `docs/diagrama_uml.md`, `docs/modelo_entidad_relacion.md`, `.env.example` o comentarios de API), debe hacerse como parte de la misma tarea sin pedir confirmación previa.
   - Actualizar únicamente las secciones que queden desfasadas, incorrectas o incompletas a causa de la petición, manteniendo el estilo, idioma, formato y terminología existentes, sin reescribir secciones válidas no relacionadas.
   - Al finalizar, indicar brevemente qué archivos de documentación se modificaron y por qué cada cambio era necesario.
