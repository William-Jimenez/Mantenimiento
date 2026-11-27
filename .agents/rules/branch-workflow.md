# Regla de Flujo: Ciclo de 3 Ramas y Sincronización Remota

## 1. Secuencia Mandatoria de Ramas
1. **Rama `dev` (Desarrollo Activo):**
   - Se realizan los cambios, adiciones de código y pruebas iniciales (`npm.cmd test`).
   - Se verifica que no existan errores de compilación TypeScript (`npm.cmd run lint`).
2. **Rama `qa` (Aseguramiento de Calidad):**
   - Se integran los cambios validados en `dev`: `git checkout qa ; git merge dev`.
   - **Obligatorio:** Ejecutar el runner de calidad: `npm.cmd run test:jules`.
   - Validar que el reporte final concluya en `[OK] VEREDICTO FINAL: APROBADO`.
3. **Rama `main` (Producción / Despliegue):**
   - Únicamente tras la aprobación en `qa`: `git checkout main ; git merge qa`.
   - Sincronizar inmediatamente todas las ramas con GitHub:
     ```powershell
     git push origin dev qa main
     ```

## 2. Documentación Continua
- Si el cambio altera endpoints, arquitectura, reglas o funcionalidades, actualizar en la misma tarea los documentos correspondientes (`README.md`, `docs/ARQUITECTURA.md`, `docs/documentacion_endpoints.md`, etc.).
- Mantener consistencia de idioma (español) y terminología técnica del proyecto.
