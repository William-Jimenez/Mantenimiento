# Contrato Técnico y Documentación de Endpoints de la API REST

**Proyecto:** Plataforma de Gestión de Solicitudes de Mantenimiento  
**Versión de la API:** 1.0  
**Protocolo:** HTTP/1.1 - RESTful  
**Formato de Intercambio:** `application/json`  
**Convención de Autenticación:** `Authorization: Bearer <JWT_TOKEN>`  
**Base URL Local (Spring Boot):** `http://localhost:8080/api`  
**Base URL Local (Frontend/Mock):** `http://localhost:3000/api`

---

## Estándar de Respuestas y Formato de Errores

### Estructura Canónica de Error
Todos los errores de la API devuelven una estructura estandarizada con código de estado HTTP correspondiente:

```json
{
  "timestamp": "2026-11-20T12:00:00",
  "status": 400,
  "error": "Bad Request",
  "mensaje": "Descripción detallada del motivo del fallo o validación no cumplida",
  "path": "/api/solicitudes"
}
```

### Tabla de Códigos de Estado HTTP
| Código | Estado | Significado y Causa |
| :--- | :--- | :--- |
| **`200 OK`** | Operación exitosa | La solicitud fue procesada correctamente y se devuelve la carga útil. |
| **`201 Created`** | Recurso creado | Registro, creación de solicitud, recurso o evidencia completado. |
| **`400 Bad Request`** | Parámetros inválidos | Validación de campos obligatorios, contraseñas débiles o sintaxis JSON errónea. |
| **`401 Unauthorized`** | No autenticado | Token ausente, inválido o expirado. |
| **`403 Forbidden`** | Acceso denegado | Usuario autenticado pero sin rol suficiente (ej. Cliente intentando acceder a ruta de Administrador). |
| **`404 Not Found`** | No encontrado | El recurso solicitado (ID de solicitud, usuario o equipo) no existe. |
| **`409 Conflict`** | Conflicto de estado | Duplicidad de clave única (correo, documento, código de activo) o estado incompatible. |
| **`500 Internal Server Error`** | Error de servidor | Excepción no controlada en el backend. |

---

## 1. Módulo de Autenticación y Cuentas (`/api/auth`)

---

### 1.1 Iniciar Sesión (Login)
* **Propósito:** Autentica a un usuario y genera su token JWT de sesión.
* **Método HTTP:** `POST`
* **URL:** `/api/auth/login`
* **Requisitos de Autenticación:** Ninguno (Público).
* **Cabeceras:** `Content-Type: application/json`

#### Parámetros de Entrada (Body JSON)
| Campo | Tipo | Obligatorio | Descripción / Regla |
| :--- | :--- | :---: | :--- |
| `correo` | `string` | Sí | Correo corporativo del usuario (`admin@mantenimiento.com`). |
| `password` | `string` | Sí | Contraseña en texto claro para cotejo con hash BCrypt. |

*Ejemplo de Petición:*
```json
{
  "correo": "admin@mantenimiento.com",
  "password": "Password123!"
}
```

#### Respuestas Exitosas (`200 OK`)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBtYW50ZW5pbWllbnRvLmNvbSIsImlkIjoxLCJyb2wiOiJBRE1JTklTVFJBRE9SIiwiZXhwIjoxNzk1MTg4ODAwfQ...",
  "tipo": "Bearer",
  "usuario": {
    "id": 1,
    "documento": "10000001",
    "nombres": "Carlos",
    "apellidos": "Administrador",
    "correo": "admin@mantenimiento.com",
    "cargo": "Jefe de Mantenimiento",
    "perfil": "ADMINISTRADOR",
    "activo": true,
    "debeCambiarPassword": false
  }
}
```

#### Códigos de Error
* **`400 Bad Request`**: Parámetros faltantes o mal formados.
* **`401 Unauthorized`**: Credenciales inválidas (usuario o contraseña incorrectos).
```json
{
  "timestamp": "2026-11-20T12:00:05",
  "status": 401,
  "error": "Unauthorized",
  "mensaje": "Credenciales inválidas",
  "path": "/api/auth/login"
}
```

---

### 1.2 Registro de Clientes (Autorregistro)
* **Propósito:** Permite el registro de nuevos usuarios clientes con rol `CLIENTE`.
* **Método HTTP:** `POST`
* **URL:** `/api/auth/register`
* **Requisitos de Autenticación:** Ninguno (Público).
* **Cabeceras:** `Content-Type: application/json`

#### Parámetros de Entrada (Body JSON)
| Campo | Tipo | Obligatorio | Descripción / Regla |
| :--- | :--- | :---: | :--- |
| `documento` | `string` | Sí | Documento de identidad único. |
| `nombres` | `string` | Sí | Nombres del usuario solicitante. |
| `apellidos` | `string` | Sí | Apellidos del usuario solicitante. |
| `correo` | `string` | Sí | Correo electrónico con formato válido. |
| `password` | `string` | Sí | Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número. |
| `cargo` | `string` | No | Cargo o dependencia institucional (por defecto "Cliente / Solicitante"). |

*Ejemplo de Petición:*
```json
{
  "documento": "1098765432",
  "nombres": "Ana",
  "apellidos": "López",
  "correo": "ana.lopez@empresa.com",
  "password": "Password2026!",
  "cargo": "Supervisora de Operaciones"
}
```

#### Respuestas Exitosas (`201 Created`)
Devuelve el token JWT generado automáticamente para iniciar sesión directa:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tipo": "Bearer",
  "usuario": {
    "id": 14,
    "documento": "1098765432",
    "nombres": "Ana",
    "apellidos": "López",
    "correo": "ana.lopez@empresa.com",
    "cargo": "Supervisora de Operaciones",
    "perfil": "CLIENTE",
    "activo": true,
    "debeCambiarPassword": false
  }
}
```

#### Códigos de Error
* **`400 Bad Request`**: Contraseña insegura o campos obligatorios vacíos.
* **`409 Conflict`**: Correo o documento ya registrado previamente.
```json
{
  "timestamp": "2026-11-20T12:01:00",
  "status": 409,
  "error": "Conflict",
  "mensaje": "El correo electrónico ya está registrado",
  "path": "/api/auth/register"
}
```

---

### 1.3 Consultar Perfil Actual
* **Propósito:** Retorna la información del usuario autenticado a partir de su Bearer Token.
* **Método HTTP:** `GET`
* **URL:** `/api/auth/me`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Roles: `ADMINISTRADOR`, `EMPLEADO`, `CLIENTE`).

#### Respuestas Exitosas (`200 OK`)
```json
{
  "id": 1,
  "documento": "10000001",
  "nombres": "Carlos",
  "apellidos": "Administrador",
  "correo": "admin@mantenimiento.com",
  "cargo": "Jefe de Mantenimiento",
  "perfil": "ADMINISTRADOR",
  "activo": true,
  "debeCambiarPassword": false
}
```

#### Códigos de Error
* **`401 Unauthorized`**: Token ausente o caducado.

---

## 2. Módulo de Solicitudes de Mantenimiento (`/api/solicitudes`)

---

### 2.1 Listar Solicitudes
* **Propósito:** Recupera el listado de solicitudes según el rol del usuario autenticado:
  * `ADMINISTRADOR`: Retorna todas las solicitudes del sistema con información completa.
  * `EMPLEADO`: Retorna únicamente las solicitudes asignadas al técnico.
  * `CLIENTE`: Retorna únicamente las solicitudes creadas por el cliente sin datos de empleados ni terceros.
* **Método HTTP:** `GET`
* **URL:** `/api/solicitudes`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Roles: `ADMINISTRADOR`, `EMPLEADO`, `CLIENTE`).

#### Respuestas Exitosas (`200 OK`)
```json
[
  {
    "id": 1,
    "codigo": "SOL-2026-001",
    "titulo": "Fuga de refrigerante en Chiller Principal",
    "descripcion": "Se detectó goteo continuo de refrigerante R-410A en la unidad exterior del edificio B.",
    "estadoId": 1,
    "estadoCodigo": "REGISTRADA",
    "estadoNombre": "Registrada",
    "categoriaId": 1,
    "categoriaNombre": "Climatización y HVAC",
    "prioridadId": 4,
    "prioridadNombre": "Urgente",
    "recursoId": 1,
    "recursoCodigo": "HVAC-01",
    "recursoNombre": "Chiller Central Edificio B",
    "ubicacion": "Azotea Edificio B",
    "solicitanteId": 10,
    "solicitanteNombre": "Laura Martínez",
    "solicitanteCorreo": "laura.martinez@empresa.com",
    "tecnicoAsignadoId": 2,
    "tecnicoAsignadoNombre": "Pedro Gómez",
    "fechaCreacion": "2026-11-18T09:30:00",
    "fechaActualizacion": "2026-11-18T10:15:00",
    "totalEvidencias": 2
  }
]
```

#### Códigos de Error
* **`401 Unauthorized`**: Falta cabecera de autenticación.

---

### 2.2 Consultar Solicitud por ID
* **Propósito:** Retorna el detalle completo de una solicitud específica.
* **Método HTTP:** `GET`
* **URL:** `/api/solicitudes/{id}`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Roles: `ADMINISTRADOR`, `EMPLEADO` [si está asignada], `CLIENTE` [si es propia]).
* **Parámetros de Ruta:** `id` (entero, identificador numérico de la solicitud).

#### Respuestas Exitosas (`200 OK`)
Retorna el objeto JSON detallado de la solicitud (similar a `2.1`).

#### Códigos de Error
* **`403 Forbidden`**: Si un `CLIENTE` intenta consultar una solicitud ajena o un `EMPLEADO` una no asignada.
* **`404 Not Found`**: Solicitud inexistente.
```json
{
  "timestamp": "2026-11-20T12:02:15",
  "status": 404,
  "error": "Not Found",
  "mensaje": "Solicitud con ID 999 no encontrada",
  "path": "/api/solicitudes/999"
}
```

---

### 2.3 Crear Solicitud de Mantenimiento
* **Propósito:** Registra una nueva solicitud de mantenimiento preventivo o correctivo.
* **Método HTTP:** `POST`
* **URL:** `/api/solicitudes`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Roles: `ADMINISTRADOR`, `CLIENTE`).
* **Cabeceras:** `Content-Type: application/json`

#### Parámetros de Entrada (Body JSON)
| Campo | Tipo | Obligatorio | Descripción / Regla |
| :--- | :--- | :---: | :--- |
| `titulo` | `string` | Sí | Título conciso del incidente (mínimo 5 caracteres). |
| `descripcion` | `string` | Sí | Detalle técnico del daño observado. |
| `categoriaId` | `number` | Sí | ID de la categoría técnica (`1` a `5`). |
| `prioridadId` | `number` | Sí | ID de prioridad (`1`=Baja, `2`=Media, `3`=Alta, `4`=Urgente). |
| `recursoId` | `number` | Sí | ID del activo físico reportado. |
| `ubicacion` | `string` | Sí | Ubicación física exacta de la falla. |

*Ejemplo de Petición:*
```json
{
  "titulo": "Fallo en motor de elevador de carga 02",
  "descripcion": "El motor presenta vibración anómala y sobrecalentamiento durante el ascenso.",
  "categoriaId": 2,
  "prioridadId": 3,
  "recursoId": 4,
  "ubicacion": "Nivel 1 - Cuarto de Máquinas Oriente"
}
```

#### Respuestas Exitosas (`201 Created`)
Devuelve la solicitud creada con estado inicial `REGISTRADA` y código correlativo asignado:
```json
{
  "id": 15,
  "codigo": "SOL-2026-015",
  "titulo": "Fallo en motor de elevador de carga 02",
  "descripcion": "El motor presenta vibración anómala y sobrecalentamiento durante el ascenso.",
  "estadoCodigo": "REGISTRADA",
  "estadoNombre": "Registrada",
  "fechaCreacion": "2026-11-20T12:03:00"
}
```

#### Códigos de Error
* **`400 Bad Request`**: Datos incompletos o IDs de categoría/recurso inexistentes.
* **`403 Forbidden`**: Si un usuario con rol `EMPLEADO` intenta crear solicitudes.

---

### 2.4 Asignar Técnico a Solicitud
* **Propósito:** Asigna un técnico responsable a una solicitud y realiza la transición de estado a `ASIGNADA`.
* **Método HTTP:** `PATCH`
* **URL:** `/api/solicitudes/{id}/asignar`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Exclusivo rol: `ADMINISTRADOR`).
* **Parámetros de Entrada (Body JSON):**
  * `empleadoId` (number, obligatorio): Identificador del empleado técnico asignado.
  * `notas` (string, opcional): Instrucciones técnicas de asignación.

*Ejemplo de Petición:*
```json
{
  "empleadoId": 2,
  "notas": "Priorizar revisión del sensor térmico y verificar lubricación de rodamientos."
}
```

#### Respuestas Exitosas (`200 OK`)
Retorna la solicitud con el nuevo técnico y estado `ASIGNADA`.

#### Códigos de Error
* **`403 Forbidden`**: Si lo intenta un usuario no administrador.
* **`404 Not Found`**: Si la solicitud o el empleado técnico no existen.

---

### 2.5 Actualizar Estado de Solicitud
* **Propósito:** Hace avanzar la solicitud por la máquina de estados (`EN_PROCESO`, `ATENDIDA`, `FINALIZADA`, `CANCELADA`).
* **Método HTTP:** `PATCH`
* **URL:** `/api/solicitudes/{id}/estado`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Roles: `ADMINISTRADOR` o `EMPLEADO` asignado a la solicitud).

#### Parámetros de Entrada (Body JSON)
| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :---: | :--- |
| `nuevoEstadoCodigo` | `string` | Sí | Código de estado objetivo (`EN_PROCESO`, `FINALIZADA`, etc.). |
| `motivo` | `string` | Sí | Justificación del cambio de estado o bitácora de trabajo realizado. |

*Ejemplo de Petición:*
```json
{
  "nuevoEstadoCodigo": "EN_PROCESO",
  "motivo": "Se inicia diagnóstico en sitio con multímetro y cámara termográfica."
}
```

#### Respuestas Exitosas (`200 OK`)
Retorna la solicitud con su nuevo estado y la entrada registrada en el historial.

#### Códigos de Error
* **`400 Bad Request`**: Transición de estado inválida según la máquina de estados.
* **`403 Forbidden`**: Si un empleado no asignado o un cliente intenta cambiar el estado.

---

### 2.6 Adjuntar Evidencia Fotográfica o Documental
* **Propósito:** Sube una evidencia (JPEG, PNG, WebP o PDF) vinculada a la solicitud.
* **Método HTTP:** `POST`
* **URL:** `/api/solicitudes/{id}/evidencias`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Roles: `ADMINISTRADOR`, `EMPLEADO` asignado, o `CLIENTE` propietario).

#### Parámetros de Entrada (Body JSON / Multipart)
| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :---: | :--- |
| `nombreArchivo` | `string` | Sí | Nombre del archivo con extensión válida. |
| `tipo` | `string` | Sí | Tipo MIME (`image/jpeg`, `image/png`, `application/pdf`). |
| `tamanoBytes` | `number` | Sí | Tamaño en bytes (límite máximo: 10 MB). |
| `contenidoBase64`| `string` | Sí | Contenido codificado en Base64 con encabezado data URI. |

#### Respuestas Exitosas (`201 Created`)
```json
{
  "id": 8,
  "solicitudId": 1,
  "nombreArchivo": "termografia_motor.jpg",
  "tipo": "IMAGEN",
  "tamanoBytes": 245100,
  "fechaCarga": "2026-11-20T12:05:00"
}
```

#### Códigos de Error
* **`400 Bad Request`**: Extensión no permitida, archivo supera 10 MB o firma binaria inválida.

---

## 3. Módulo de Recursos y Activos (`/api/recursos`)

---

### 3.1 Listar Recursos
* **Propósito:** Consulta el inventario de activos físicos registrados.
* **Método HTTP:** `GET`
* **URL:** `/api/recursos`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Roles: `ADMINISTRADOR`, `EMPLEADO`, `CLIENTE`).

#### Respuestas Exitosas (`200 OK`)
```json
[
  {
    "id": 1,
    "codigo": "HVAC-01",
    "nombre": "Chiller Central Edificio B",
    "tipoRecursoId": 1,
    "tipoRecursoNombre": "Equipo de Climatización",
    "ubicacion": "Azotea Edificio B",
    "descripcion": "Unidad enfriadora de agua de 150 TR",
    "activo": true
  }
]
```

---

### 3.2 Crear Recurso (Activo)
* **Propósito:** Da de alta un nuevo equipo o activo en el inventario.
* **Método HTTP:** `POST`
* **URL:** `/api/recursos`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Exclusivo rol: `ADMINISTRADOR`).

#### Parámetros de Entrada (Body JSON)
| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :---: | :--- |
| `codigo` | `string` | Sí | Código de placa único (ej: `"UPS-03"`). |
| `nombre` | `string` | Sí | Nombre descriptivo del activo. |
| `tipoRecursoId` | `number` | Sí | Identificador del tipo de recurso. |
| `ubicacion` | `string` | Sí | Ubicación física permanente. |
| `descripcion` | `string` | No | Especificaciones técnicas del activo. |

*Ejemplo de Petición:*
```json
{
  "codigo": "UPS-03",
  "nombre": "Sistema de Energía Ininterrumpida Data Center",
  "tipoRecursoId": 2,
  "ubicacion": "Sótano 1 - Sala Eléctrica",
  "descripcion": "UPS trifásico 40kVA con banco de baterías de litio"
}
```

#### Respuestas Exitosas (`201 Created`)
Retorna el recurso creado con su ID asignado.

#### Códigos de Error
* **`409 Conflict`**: Ya existe un recurso con ese código de placa.
* **`403 Forbidden`**: Si la acción es ejecutada por `EMPLEADO` o `CLIENTE`.

---

## 4. Módulo de Administración de Usuarios (`/api/usuarios`)

---

### 4.1 Listar Usuarios
* **Propósito:** Lista todos los usuarios registrados con su perfil y estado.
* **Método HTTP:** `GET`
* **URL:** `/api/usuarios`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Exclusivo rol: `ADMINISTRADOR`).

#### Respuestas Exitosas (`200 OK`)
```json
[
  {
    "id": 1,
    "documento": "10000001",
    "nombres": "Carlos",
    "apellidos": "Administrador",
    "correo": "admin@mantenimiento.com",
    "cargo": "Jefe de Mantenimiento",
    "perfil": "ADMINISTRADOR",
    "activo": true,
    "debeCambiarPassword": false
  }
]
```

#### Códigos de Error
* **`403 Forbidden`**: Si un usuario con rol `EMPLEADO` o `CLIENTE` intenta acceder.

---

### 4.2 Crear Usuario Administrativo
* **Propósito:** Registra un nuevo empleado o administrador en el sistema.
* **Método HTTP:** `POST`
* **URL:** `/api/usuarios`
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Exclusivo rol: `ADMINISTRADOR`).

#### Parámetros de Entrada (Body JSON)
| Campo | Tipo | Obligatorio | Descripción |
| :--- | :--- | :---: | :--- |
| `documento` | `string` | Sí | Documento de identidad único. |
| `nombres` | `string` | Sí | Nombres del empleado. |
| `apellidos` | `string` | Sí | Apellidos del empleado. |
| `correo` | `string` | Sí | Correo corporativo único. |
| `password` | `string` | Sí | Contraseña temporal que cumple política de seguridad. |
| `cargo` | `string` | Sí | Cargo funcional (ej. "Técnico Electricista"). |
| `perfil` | `string` | Sí | `"ADMINISTRADOR"`, `"EMPLEADO"` o `"CLIENTE"`. |
| `esTecnico` | `boolean`| No | Indica si puede recibir órdenes de trabajo (`true`/`false`). |

#### Respuestas Exitosas (`201 Created`)
Retorna el perfil del usuario creado con `debeCambiarPassword = true` para forzar cambio en su primer inicio.

#### Códigos de Error
* **`400 Bad Request`**: Perfil inválido o contraseña no cumple requisitos de robustez.
* **`409 Conflict`**: Correo o documento de identidad duplicado.

---

## 5. Módulo de Salud y Catálogos (`/api/health`, `/api/estados`, etc.)

---

### 5.1 Comprobación de Estado (Health Check)
* **Propósito:** Monitoreo y diagnóstico de disponibilidad del servicio API.
* **Método HTTP:** `GET`
* **URL:** `/api/health`
* **Requisitos de Autenticación:** Ninguno (Público).

#### Respuestas Exitosas (`200 OK`)
```json
{
  "status": "UP",
  "service": "solicitudes-mantenimiento-api",
  "timestamp": "2026-11-20T12:00:00"
}
```

---

### 5.2 Catálogos Paramétricos
* **URLs disponibles:**
  * `GET /api/estados`: Listado de estados de la máquina de ciclo de vida (`REGISTRADA`, `ASIGNADA`, `EN_PROCESO`, `ATENDIDA`, `FINALIZADA`, `CANCELADA`).
  * `GET /api/categorias`: Listado de categorías de activos y fallas.
  * `GET /api/prioridades`: Niveles de criticidad (`BAJA`, `MEDIA`, `ALTA`, `URGENTE`).
  * `GET /api/tipos-recurso`: Tipología de inventario.
* **Requisitos de Autenticación:** `Bearer <TOKEN>` (Roles: `ADMINISTRADOR`, `EMPLEADO`, `CLIENTE`).
* **Respuesta Exitosa:** `200 OK` con un array JSON de los objetos paramétricos correspondientes.
