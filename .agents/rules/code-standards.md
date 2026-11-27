# Regla de Calidad: Estándares de Código ECC

## 1. Tipado e Inmutabilidad
- Tipado estricto en TypeScript (`strict: true`).
- Evitar `any` o conversiones ciegas (`as unknown as T`).
- Favorecer inmutabilidad (`readonly`, spread operators, copias defensivas) al mutar estados o entidades.

## 2. Manejo de Errores y Cero Fallos Silenciosos
- Nunca silenciar excepciones en bloques `catch` vacíos.
- Las APIs REST deben responder siempre con un esquema de error estándar:
  ```json
  {
    "error": "DESCRIPCION_CORTA",
    "message": "Detalles legibles del error",
    "status": 400
  }
  ```
- El frontend debe mostrar feedback visual claro mediante notificaciones o banners accesibles.

## 3. Modularidad y Componentes
- Componentes desacoplados con responsabilidades únicas.
- Estados centralizados o contextuales cuando múltiples pantallas requieran sincronización.
- Documentar contratos de interfaces y props en archivos `.types.ts` o en la cabecera del módulo.
