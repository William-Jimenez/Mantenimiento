# Contrato Técnico y Documentación de Endpoints de la API REST

**Proyecto:** Plataforma de Gestión de Solicitudes de Mantenimiento  
**Formato de Intercambio:** `application/json`  
**Autenticación:** `Authorization: Bearer <TOKEN>`

> [!IMPORTANT]
> Este proyecto cuenta con **dos implementaciones de API REST** independientes:
> 1. **Backend Spring Boot (`backend/`, puerto `8080`):** API de producción con JWT real, BCrypt y PostgreSQL 16 (documentada como contrato principal a continuación y probada en `postman/`).
> 2. **API Express en memoria (`src/server/apiApp.ts`, puerto `3000`):** Middleware de desarrollo/pruebas usado por Vite y `tests/rbac.test.ts`. Sus diferencias de rutas se resumen en la [Sección 6](#6-diferencias-con-el-servidor-express-en-memoria-srcserverapiappts).

---

## Estándar de Respuestas de Error (Spring Boot)

El manejador global `GlobalExceptionHandler.java` devuelve siempre la siguiente estructura JSON:

```json
{
  "timestamp": "2026-11-20T12:00:00.123456",
  "status": 400,
  "error": "Descripción detallada del error o validaciones fallidas"
}
```

| Código HTTP | Significado | Causa habitual |
| :--- | :--- | :--- |
| **`200 OK`** | Operación exitosa | Consulta, actualización o cambio de estado procesado. |
| **`201 Created`** | Recurso creado | Registro de usuario, creación de solicitud, recurso, evidencia o análisis IA. |
| **`400 Bad Request`** | Datos inválidos | Validaciones `@Valid` incumplidas, transición de estado inválida o archivo rechazado. |
| **`401 Unauthorized`** | No autenticado | Token JWT ausente, inválido o credenciales erróneas. |
| **`403 Forbidden`** | Acceso denegado | Rol sin permisos para la ruta o solicitud ajena (`CLIENTE` / `EMPLEADO` no asignado). |
| **`404 Not Found`** | No encontrado | ID de solicitud, recurso, usuario o evidencia inexistente. |
| **`409 Conflict`** | Conflicto | Correo, documento o código de recurso duplicado. |
| **`500 Internal Server Error`** | Error interno | Excepción no controlada en el servidor. |

---

## 1. Autenticación y Perfil (`/api/auth`)

### 1.1 Iniciar Sesión
* **Método y URL:** `POST /api/auth/login`
* **Autenticación:** Pública.
* **Body (`LoginRequest`):**
  * `correo` (`string`, obligatorio, formato email)
  * `password` (`string`, obligatorio)

*Ejemplo de petición:*
```json
{
  "correo": "admin@mantenimiento.com",
  "password": "Admin123!"
}
```

*Respuesta exitosa (`200 OK`, `AuthResponse`):*
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "usuario": {
    "usuarioId": 1,
    "empleadoId": 1,
    "documento": "10000001",
    "nombreCompleto": "Carlos Administrador",
    "correo": "admin@mantenimiento.com",
    "cargo": "Jefe de Mantenimiento",
    "perfil": "ADMINISTRADOR",
    "esTecnico": false,
    "activo": true
  }
}
```

*Errores:* `400 Bad Request` (campos inválidos), `401 Unauthorized` (`"Credenciales inválidas: correo o contraseña incorrectos"`).

---

### 1.2 Autorregistro de Cliente
* **Método y URL:** `POST /api/auth/register`
* **Autenticación:** Pública. Asigna perfil `CLIENTE`.
* **Body (`RegisterRequest`):** `documento` (`5-20` chars), `nombres`, `apellidos`, `correo`, `cargo` (opcional), `password` (mín. 8 chars, política de seguridad).
* **Respuesta exitosa (`201 Created`):** Misma estructura `AuthResponse` que `1.1`.
* **Errores:** `400 Bad Request` (política de contraseña o campos vacíos), `409 Conflict` (correo o documento ya registrado).

---

### 1.3 Recuperación de Contraseña (2 Pasos)
* **Paso 1 — Solicitar código:** `POST /api/auth/password-reset/request` (Público)
  * **Body (`PasswordResetRequest`):** `{ "correo": "usuario@empresa.com" }`
  * **Respuesta (`200 OK`):** JSON con confirmación de envío/código generado en entorno local.
* **Paso 2 — Confirmar cambio:** `POST /api/auth/password-reset/confirm` (Público)
  * **Body (`PasswordResetConfirmRequest`):** `{ "correo": "...", "codigo": "123456", "nuevaPassword": "..." }`
  * **Respuesta (`200 OK`):** Confirmación de actualización.
  * **Errores:** `400 Bad Request` (código inválido/expirado o contraseña débil).

---

### 1.4 Perfil Actual
* **Método y URL:** `GET /api/auth/me`
* **Autenticación:** `Bearer <TOKEN>` (Cualquier rol autenticado).
* **Respuesta (`200 OK`):** Objeto `UserProfileDto` (ver campo `usuario` en `1.1`).
* **Errores:** `401 Unauthorized`.

---

## 2. Solicitudes de Mantenimiento (`/api/solicitudes`)

Los estados canónicos inicializados por `DataInitializer.java` son: `Pendiente`, `Asignada`, `En proceso`, `Finalizada` (final), `Cancelada` (final) y `Rechazada` (final).

### 2.1 Listar Solicitudes
* **Método y URL:** `GET /api/solicitudes`
* **Autenticación:** `Bearer <TOKEN>` (`ADMINISTRADOR`: todas; `EMPLEADO`: solo asignadas; `CLIENTE`: solo propias).
* **Respuesta (`200 OK`):** Arreglo de `SolicitudResponse`.

### 2.2 Consultar Solicitud por ID
* **Método y URL:** `GET /api/solicitudes/{id}`
* **Autenticación:** `Bearer <TOKEN>` (`ADMINISTRADOR`, `EMPLEADO` asignado o `CLIENTE` propietario).
* **Respuesta (`200 OK`, `SolicitudResponse`):**
```json
{
  "id": 1,
  "codigo": "SOL-2026-0001",
  "solicitanteId": 3,
  "solicitanteNombre": "Laura Martínez",
  "solicitanteCorreo": "laura@empresa.com",
  "registradaPorUsuarioId": 3,
  "registradaPorNombre": "Laura Martínez",
  "recursoId": 1,
  "recursoCodigo": "EQ-TI-0014",
  "recursoNombre": "Servidor Rack Principal Dell PowerEdge R750",
  "recursoUbicacion": "Centro de Datos - Piso 3",
  "descripcion": "Alarma acústica intermitente en fuente redundante y aumento de temperatura.",
  "estado": "Pendiente",
  "estadoEsFinal": false,
  "categoria": "Informática/Electrónica",
  "prioridad": "Alta",
  "trabajoRealizado": null,
  "trabajoActualizadoEn": null,
  "motivoCierre": null,
  "asignacionVigente": null,
  "creadaEn": "2026-11-20T09:00:00",
  "actualizadaEn": "2026-11-20T09:00:00",
  "cerradaEn": null,
  "version": 1,
  "historial": []
}
```
* **Errores:** `403 Forbidden`, `404 Not Found`.

---

### 2.3 Crear Solicitud
* **Método y URL:** `POST /api/solicitudes`
* **Autenticación:** `Bearer <TOKEN>` (`ADMINISTRADOR` o `CLIENTE`; bloqueado para `EMPLEADO` técnico).
* **Body (`CreateSolicitudRequest`):**
  * `recursoId` (`number`, obligatorio)
  * `descripcion` (`string`, obligatorio, entre `20` y `2000` caracteres)
  * `solicitanteId` (`number`, opcional; útil cuando el administrador registra a nombre de otro empleado)
  * `categoriaId` (`number`, opcional)
  * `prioridadId` (`number`, opcional)

*Ejemplo de petición:*
```json
{
  "recursoId": 1,
  "descripcion": "El servidor principal presenta ruido en ventilador frontal y alerta de temperatura.",
  "categoriaId": 5,
  "prioridadId": 3
}
```
* **Respuesta (`201 Created`):** `SolicitudResponse` con estado inicial `"Pendiente"`.
* **Errores:** `400 Bad Request` (descripción < 20 caracteres o recurso inexistente), `403 Forbidden`.

---

### 2.4 Actualizar Solicitud
* **Método y URL:** `PUT /api/solicitudes/{id}`
* **Autenticación:** `Bearer <TOKEN>` (`ADMINISTRADOR`, `EMPLEADO` asignado o `CLIENTE` propietario según estado).
* **Body (`UpdateSolicitudRequest`):** `recursoId`, `descripcion` (`20-2000` chars), `categoriaId`, `prioridadId`, `trabajoRealizado` (todos opcionales).
* **Respuesta (`200 OK`):** `SolicitudResponse` actualizada.
* **Errores:** `400 Bad Request`, `403 Forbidden`, `404 Not Found`.

---

### 2.5 Asignar Técnico
* **Método y URL:** `PATCH /api/solicitudes/{id}/asignar`
* **Autenticación:** `Bearer <TOKEN>` (Exclusivo `ADMINISTRADOR`).
* **Body (`AsignarTecnicoRequest`):**
  * `tecnicoId` (`number`, obligatorio)
  * `categoriaId` (`number`, opcional)
  * `prioridadId` (`number`, opcional)
  * `motivoReasignacion` (`string`, opcional)
* **Respuesta (`200 OK`):** `SolicitudResponse` con estado `"Asignada"` y `asignacionVigente` poblada.
* **Errores:** `403 Forbidden`, `404 Not Found`.

---

### 2.6 Cambiar Estado
* **Método y URL:** `PATCH /api/solicitudes/{id}/estado`
* **Autenticación:** `Bearer <TOKEN>` (`ADMINISTRADOR` o `EMPLEADO` asignado; `CLIENTE` solo puede cancelar si aplica regla de negocio).
* **Body (`CambiarEstadoRequest`):**
  * `nuevoEstado` (`string`, obligatorio: `"Pendiente"`, `"Asignada"`, `"En proceso"`, `"Finalizada"`, `"Cancelada"`, `"Rechazada"`)
  * `motivo` (`string`, opcional/requerido en cierre o rechazo)
  * `trabajoRealizado` (`string`, opcional)
* **Respuesta (`200 OK`):** `SolicitudResponse` actualizada.
* **Errores:** `400 Bad Request` (transición inválida), `403 Forbidden`.

---

### 2.7 Eliminar Solicitud y Consultar Historial
* `DELETE /api/solicitudes/{id}` — **Respuesta (`200 OK`):** `{ "mensaje": "Solicitud eliminada correctamente" }`.
* `GET /api/solicitudes/{id}/historial` — **Respuesta (`200 OK`):** Arreglo de `HistorialEstadoDto`.

---

### 2.8 Evidencias y Análisis de IA
* **Adjuntar evidencia:** `POST /api/solicitudes/{id}/evidencias`
  * **Body (`UploadEvidenciaRequest`):** `nombreOriginal` (`string`), `dataUrl` (`string`, Base64 con cabecera Data URI), `tamanoBytes` (`number`).
  * **Respuesta (`201 Created`):** `EvidenciaDto`.
* **Descargar evidencia:** `GET /api/solicitudes/{id}/evidencias/{evidenciaId}/descargar`
  * **Respuesta (`200 OK`):** JSON con metadatos y `dataUrl`.
* **Listar análisis IA:** `GET /api/solicitudes/{id}/analisis-ia` (`200 OK`, arreglo `AnalisisIADto`).
* **Disparar análisis IA:** `POST /api/solicitudes/{id}/analisis-ia` (Exclusivo `ADMINISTRADOR`; body opcional `TriggerAnalisisIARequest`; devuelve `201 Created`).
* **Revisar análisis IA:** `POST /api/solicitudes/{id}/analisis-ia/{analisisId}/revisar` (Exclusivo `ADMINISTRADOR`; body `RevisarAnalisisIARequest` con `decision`: `"ACEPTADO"`, `"MODIFICADO"` o `"DESCARTADO"`, `categoriaId`, `prioridadId`).

---

## 3. Recursos / Activos (`/api/recursos`)

* `GET /api/recursos` — Lista todos los recursos (`200 OK`, arreglo `RecursoResponse`).
* `GET /api/recursos/{id}` — Detalle de un recurso (`200 OK` / `404 Not Found`).
* `POST /api/recursos` — Crea un recurso (Exclusivo `ADMINISTRADOR`; body `CreateRecursoRequest`: `codigo`, `nombre`, `tipoRecursoId`, `ubicacion`, `descripcion`). Devuelve `201 Created` o `409 Conflict` si el código ya existe.
* `PUT /api/recursos/{id}` — Actualiza un recurso (Exclusivo `ADMINISTRADOR`; body `UpdateRecursoRequest`: `nombre`, `tipoRecursoId`, `ubicacion`, `descripcion`, `activo`).
* `DELETE /api/recursos/{id}` — Elimina o desactiva un recurso (Exclusivo `ADMINISTRADOR`).

---

## 4. Usuarios y Empleados (`/api/usuarios`, `/api/empleados`)

Ambos controladores requieren rol **`ADMINISTRADOR`** (`@PreAuthorize("hasRole('ADMINISTRADOR')")`).

* `GET /api/usuarios` — Lista todos los usuarios (`UserProfileDto[]`).
* `POST /api/usuarios` — Crea usuario administrativo/técnico (`CreateUsuarioRequest`: `documento`, `nombres`, `apellidos`, `correo`, `cargo`, `perfil`, `esTecnico`, `password`). El usuario nace con `debeCambiarPassword = true`. Devuelve `201 Created` o `409 Conflict`.
* `PATCH /api/usuarios/{id}/rol` — Cambia perfil/bandera técnica (`CambiarRolRequest`: `perfil`, `esTecnico`).
* `PATCH /api/usuarios/{id}/estado` — Activa o desactiva la cuenta.
* `GET /api/empleados` / `POST /api/empleados` — Consulta y registro de empleados.

---

## 5. Salud y Catálogos (`/api`)

* `GET /api/health` — Público. Devuelve `{ "status": "UP", "service": "solicitudes-mantenimiento-api", "timestamp": "..." }`.
* `GET /api/estados`, `GET /api/categorias`, `GET /api/prioridades`, `GET /api/tipos-recurso`, `GET /api/tecnicos` — Requieren `Bearer <TOKEN>`; devuelven los catálogos paramétricos activos.

---

## 6. Diferencias con el Servidor Express en Memoria (`src/server/apiApp.ts`)

El servidor Express usado en desarrollo (puerto `3000`) y en `tests/rbac.test.ts` implementa las mismas reglas RBAC pero utiliza convenciones de rutas propias:

| Capacidad | Spring Boot (`backend/`) | Express in-memory (`src/server/apiApp.ts`) |
| :--- | :--- | :--- |
| Perfil actual | `GET /api/auth/me` | `GET /api/me` |
| Recuperación de clave | `POST /api/auth/password-reset/request` y `/confirm` | `POST /api/auth/recovery/send-code`, `/verify-code` y `/api/auth/reset-password` |
| Gestión de usuarios | `/api/usuarios/**` | `/api/admin/usuarios/**` |
| Gestión de empleados | `/api/empleados/**` | `/api/admin/empleados/**` |
| Crear/editar recursos | `POST/PUT /api/recursos/**` | `POST/PUT /api/admin/recursos/**` |
| Asignar técnico | `PATCH /api/solicitudes/{id}/asignar` | `POST /api/admin/solicitudes/:id/asignar` |
| Bandeja y trabajo técnico | `GET /api/solicitudes`, `PATCH /api/solicitudes/{id}/estado` | `GET /api/tecnico/solicitudes`, `POST /api/tecnico/solicitudes/:id/trabajo`, `PATCH /api/tecnico/solicitudes/:id/estado` |
| Análisis IA (admin) | `POST /api/solicitudes/{id}/analisis-ia` | `POST /api/admin/solicitudes/:id/analisis-ia` |
