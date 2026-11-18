# Directrices para Agentes de Desarrollo y QA

## Flujo de Trabajo de 3 Ramas (`dev` -> `qa` -> `main`)

1. **Ciclo de Desarrollo Escalonado:**
   - **Rama `dev` (Desarrollo):** Todo nuevo cambio, componente o funcionalidad se desarrolla y prueba inicialmente en la rama `dev`. En esta rama se mantiene la ejecución estándar de pruebas (`npm test`).
   - **Rama `qa` (Aseguramiento de Calidad):** Tras finalizar el desarrollo en `dev`, los cambios se incorporan a `qa`. En `qa`, es mandatorio validar con **Jules** (`npm run test:jules` o `npm run test:qa`) en lugar de Composio.
   - **Rama `main` (Producción / Estable):** Únicamente tras obtener el veredicto `✅ APROBADO` en `qa`, los cambios se integran en la rama `main`.
   - **Sincronización con GitHub:** Cuando las pruebas en `qa` resulten exitosas y se actualicen las ramas, se sincronizan todas las ramas correspondientes (`dev`, `qa` y `main`) con el repositorio remoto (`git push`).

2. **Servicio de Pruebas en `qa` (Jules):**
   - El script `scripts/jules-qa-runner.ts` orquesta la suite de pruebas local (`tests/rbac.test.ts`), analiza la rama activa, valida las reglas RBAC y genera el reporte formal de QA compatible con Jules.
   - Si la variable de entorno `JULES_API_KEY` está configurada en `.env`, el runner conecta automáticamente con la sesión de triage de `@google/jules-sdk`. Si no está configurada, las pruebas se ejecutan y validan localmente sin bloquear el flujo.

## Reglas de Mantenimiento Autónomo de Documentación

3. **Actualización Automática y Acotada de Documentación:**
   - En todas las peticiones, si los cambios realizados hacen estrictamente necesario actualizar la documentación del proyecto (`README`, `COMO_VER_EL_PROYECTO.md`, `docs/SRS.md`, `docs/diagrama_uml.md`, `docs/modelo_entidad_relacion.md`, `.env.example` o comentarios de API), debe hacerse como parte de la misma tarea sin pedir confirmación previa.
   - Actualizar únicamente las secciones que queden desfasadas, incorrectas o incompletas a causa de la petición, manteniendo el estilo, idioma, formato y terminología existentes, sin reescribir secciones válidas no relacionadas.
   - Al finalizar, indicar brevemente qué archivos de documentación se modificaron y por qué cada cambio era necesario.
