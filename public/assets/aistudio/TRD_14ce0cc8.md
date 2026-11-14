# TRD: Plataforma de Solicitudes de Mantenimiento

Responsable: WILLIAM · Desarrollo individual · Java y MySQL · Versión 1.0 (borrador) · 14 de noviembre de 2026

## Convenciones y nombres canónicos

Este documento forma parte de un conjunto de cuatro ([PRD](PRD.md), [TRD](TRD.md), [PLAN](PLAN.md) y [User Flow](User-Flow.md)) que comparten los mismos nombres de actores, módulos, estados y requisitos. Cada afirmación lleva una de tres etiquetas:

- **Confirmado:** viene del mini SRS (decisiones confirmadas, RF/RNF confirmados).
- **Supuesto SU-xx:** decisión provisional que se propone para poder completar el documento porque la decisión pendiente (DP-xx) del SRS aún no está resuelta. Cada supuesto indica qué DP sustituye y debe validarse o reemplazarse.
- **Pendiente DP-xx:** decisión que el SRS deja expresamente abierta.

**Nombres canónicos usados en los cuatro documentos.**

- Actores: Administrador, Empleado (solicitante), Empleado Técnico (un Empleado con función técnica; no es un tercer perfil), Servicio de IA (actor de sistema).
- Estados: Pendiente, Asignada, En proceso, Finalizada, Cancelada, Rechazada.
- Módulos: M1 Gestión de usuarios, M2 Gestión de recursos, M3 Gestión de solicitudes, M4 Gestión de técnicos y asignaciones, M5 Seguimiento, M6 Análisis con IA.
- Entidades: Usuario, Empleado, Recurso, Tipo de recurso, Solicitud, Estado, Evidencia, Asignación, Análisis IA.

## 2.1 Propósito y relación con el [PRD](PRD.md)

Este documento define cómo se construye lo que el [PRD](PRD.md) especifica. Cada decisión técnica apunta a los requisitos (RF/RNF), historias (HU) y módulos (M1 a M6) del [PRD](PRD.md). Lo confirmado por el SRS es solo: **aplicación web, Java, MySQL, desarrollo individual, una empresa**. El resto de elecciones de este documento son **supuestos técnicos** (SU-13 a SU-18) que el responsable puede cambiar sin alterar el [PRD](PRD.md), salvo donde se indique.

| Supuesto técnico | Decisión propuesta | Motivo |
| --- | --- | --- |
| **SU-13** | Framework **Spring Boot 3.x** sobre **Java 21 LTS** | Estándar de facto en Java para aplicaciones web con seguridad, acceso a datos y pruebas integradas; un solo desarrollador es productivo con él. |
| **SU-14** | Interfaz generada en servidor con **Thymeleaf** (HTML + CSS + JavaScript mínimo), sin framework SPA | RNF-01 pide que la aplicación sea en Java; evita mantener un segundo lenguaje y un segundo despliegue siendo un único desarrollador. |
| **SU-15** | Arquitectura de **monolito modular en capas** | Una empresa, desarrollo individual y volumen moderado; los módulos M1 a M6 quedan separados por paquete para poder evolucionar. |
| **SU-16** | Archivos en el **sistema de archivos del servidor** (volumen dedicado), metadatos en MySQL | RNF-02 exige MySQL para la información; guardar binarios en la base agranda las copias y consultas. Se puede migrar a almacenamiento de objetos después. |
| **SU-17** | Integración con IA mediante una **interfaz propia** (`AnalizadorIa`) y un proveedor externo con API de texto e imágenes, a elegir | El SRS no define proveedor; la interfaz aisla ese cambio. |
| **SU-18** | Autenticación con **Spring Security**, sesión con cookie, contraseñas con BCrypt | Cumple SU-08 sin dependencias externas. |

## 2.2 Restricciones y principios

- Todo el código de aplicación en Java (RNF-01); toda la persistencia en MySQL (RNF-02).
- Un solo desarrollador: se prefieren componentes estándar, pocas piezas desplegables y automatización de pruebas y migraciones.
- Las reglas de negocio (permisos, transiciones, límites de archivos) viven en la capa de servicio y **nunca** solo en la interfaz.
- La IA es un apoyo opcional: si falla, el flujo de solicitudes sigue funcionando.
- Una sola empresa: no hay multiempresa ni aislamiento por inquilino.

## 2.3 Arquitectura propuesta

**Estilo:** monolito modular desplegable como un solo artefacto (JAR ejecutable), con tres procesos o servicios en total: aplicación, MySQL y un proxy inverso con HTTPS.

**Capas (de afuera hacia adentro):**

| Capa | Responsabilidad | Componentes |
| --- | --- | --- |
| Presentación | Vistas, formularios y endpoints JSON | Controladores MVC (`@Controller`), plantillas Thymeleaf, controladores REST (`@RestController`) para operaciones asíncronas y contrato de integración |
| Seguridad | Autenticación, sesión, autorización por perfil y por propiedad del recurso | Spring Security, `PoliticaAcceso` (reglas de la matriz 1.7) |
| Aplicación / Servicio | Casos de uso transaccionales y reglas de negocio | Servicios por módulo; `MaquinaEstados` (tabla 1.8) |
| Dominio | Entidades y objetos de valor | Entidades JPA, enumeraciones |
| Infraestructura | Acceso a datos, archivos, IA, reloj | Repositorios Spring Data JPA, `AlmacenArchivos`, `AnalizadorIa`, tareas asíncronas |

**Flujo de una solicitud nueva (resumen):**

1. El Empleado o Administrador envía el formulario con descripción, recurso y archivos.
2. El controlador valida el formato; el servicio valida permisos, recurso activo y límites de archivos.
3. En **una transacción** se crea la Solicitud en estado Pendiente, el registro en `historial_estado` y los metadatos de las Evidencias; los archivos se escriben en el almacenamiento antes de confirmar y se eliminan si la transacción falla.
4. Tras confirmar, se encola el análisis de IA (estado EN\_COLA) y se responde al usuario sin esperar al proveedor.
5. Un proceso asíncrono llama al `AnalizadorIa`, valida la respuesta contra los catálogos y guarda el Análisis IA como COMPLETADO o FALLIDO.
6. El Administrador revisa el resultado (HU-17) y define categoría y prioridad finales.

**Mapa módulo a paquete:**

| Módulo | Paquete Java | Contenido principal |
| --- | --- | --- |
| M1 Gestión de usuarios | `co.empresa.mantenimiento.usuarios` | Empleado, Usuario, autenticación |
| M2 Gestión de recursos | `...recursos` | Recurso, Tipo de recurso |
| M3 Gestión de solicitudes | `...solicitudes` | Solicitud, Evidencia, catálogos de Categoría y Prioridad |
| M4 Técnicos y asignaciones | `...asignaciones` | Asignación, consulta de técnicos |
| M5 Seguimiento | `...seguimiento` | Máquina de estados, historial |
| M6 Análisis con IA | `...ia` | Análisis IA, `AnalizadorIa`, tareas asíncronas |
| Transversal | `...comun`, `...seguridad` | Errores, auditoría, configuración |

El nombre base del paquete es provisional.

## 2.4 Stack tecnológico y justificación

| Componente | Elección | Justificación |
| --- | --- | --- |
| Lenguaje | Java 21 LTS | Confirmado (Java); 21 es versión LTS con soporte vigente. |
| Framework | Spring Boot 3.x | SU-13. Provee MVC, seguridad, validación, transacciones y pruebas. |
| Vistas | Thymeleaf + HTML/CSS; JavaScript puro para interacción mínima (previsualización de imágenes, consulta del estado del análisis) | SU-14. Mantiene un solo lenguaje de aplicación. |
| Estilos | Bootstrap 5 (archivos servidos localmente) | Diseño responsivo (RNF-03) sin construir un sistema de diseño propio. |
| Acceso a datos | Spring Data JPA + Hibernate | Reduce código repetitivo; consultas complejas con JPQL. |
| Base de datos | MySQL 8.4 LTS, motor InnoDB, `utf8mb4` | Confirmado (MySQL); InnoDB da claves foráneas y transacciones (RNF-05). |
| Migraciones | Flyway | Esquema versionado y reproducible (RNF-06). |
| Validación | Jakarta Bean Validation | Validación declarativa en el servidor de formularios y JSON. |
| Seguridad | Spring Security, BCrypt (costo 10 o mayor), protección CSRF activada | SU-18, RNF-04. |
| Detección de tipo de archivo | Apache Tika | Valida tipo real por contenido (HU-07, RNF-07). |
| Texto de PDF | Apache PDFBox | Extrae texto para el análisis de IA (HU-15). |
| Cliente HTTP a IA | `RestClient` de Spring con tiempos límite | Sin dependencia propietaria; contrato aislado en `AnalizadorIa`. |
| Tareas asíncronas | `@Async` con ejecutor acotado, más tabla `analisis_ia` como cola persistente con reintento al arrancar | No exige broker de mensajes para este volumen. |
| Documentación de API | springdoc-openapi | Contrato generado (RNF-06). |
| Pruebas | JUnit 5, Mockito, Spring Boot Test, Testcontainers (MySQL real), Selenium o Playwright para extremo a extremo | Ver 2.12. |
| Construcción | Maven | Estándar y simple. |
| Contenedores | Docker y Docker Compose | SU-11. |
| Proxy y HTTPS | Nginx o Caddy | Terminación TLS y límite de tamaño de petición. |
| Control de versiones | Git con repositorio remoto | Trazabilidad del trabajo individual. |

**Alternativas descartadas (para decisión informada):** una SPA (React, Angular) con API separada habría introducido un segundo lenguaje y despliegue contra RNF-01 y el desarrollo individual; microservicios habría multiplicado la operación sin necesidad con una sola empresa; guardar archivos como BLOB en MySQL simplifica la copia de seguridad pero degrada rendimiento y tamaño de la base.

## 2.5 Modelo de datos (MySQL)

El SRS propone nueve entidades "como base". Se conservan todas con los mismos nombres y se agregan tres tablas de apoyo derivadas de requisitos del [PRD](PRD.md): **Categoría** y **Prioridad** (catálogos de SU-05 y SU-06) e **Historial de estado** (trazabilidad de la sección 1.8). Convenciones: nombres de tabla y columna en español, minúsculas y con guion bajo; `id` es `BIGINT UNSIGNED AUTO_INCREMENT`; fechas son `DATETIME(0)` en UTC; todas las claves foráneas son `ON DELETE RESTRICT`.

**Relaciones principales:**

- Empleado 1 : 0..1 Usuario.
- Tipo de recurso 1 : N Recurso.
- Empleado (solicitante) 1 : N Solicitud; Usuario (quien registra) 1 : N Solicitud; Recurso 1 : N Solicitud; Estado 1 : N Solicitud; Categoría 0..1 : N Solicitud; Prioridad 0..1 : N Solicitud.
- Solicitud 1 : N Evidencia; Solicitud 1 : N Asignación (solo una vigente); Empleado (técnico) 1 : N Asignación.
- Solicitud 1 : N Análisis IA; Solicitud 1 : N Historial de estado.

**Tablas y columnas:**

| Tabla | Columnas (tipo, restricciones) |
| --- | --- |
| `empleado` | `id`; `documento` VARCHAR(20) **UNIQUE** NOT NULL; `nombres` VARCHAR(100) NOT NULL; `apellidos` VARCHAR(100) NOT NULL; `correo` VARCHAR(150) **UNIQUE** NOT NULL; `cargo` VARCHAR(100); `es_tecnico` BOOLEAN NOT NULL DEFAULT 0; `activo` BOOLEAN NOT NULL DEFAULT 1; `creado_en`; `actualizado_en` |
| `usuario` | `id`; `empleado_id` FK **UNIQUE** NOT NULL; `perfil` ENUM('ADMINISTRADOR','EMPLEADO') NOT NULL; `password_hash` VARCHAR(100) NOT NULL; `debe_cambiar_password` BOOLEAN DEFAULT 1; `intentos_fallidos` TINYINT DEFAULT 0; `bloqueado_hasta` DATETIME NULL; `ultimo_acceso` DATETIME NULL; `activo` BOOLEAN DEFAULT 1; `creado_en` |
| `tipo_recurso` | `id`; `nombre` VARCHAR(50) **UNIQUE**. Semilla: Equipo tecnológico, Instalación o edificio, Maquinaria, Herramienta |
| `recurso` | `id`; `codigo` VARCHAR(30) **UNIQUE**; `nombre` VARCHAR(150); `tipo_recurso_id` FK; `ubicacion` VARCHAR(200); `descripcion` VARCHAR(500) NULL; `activo` BOOLEAN DEFAULT 1; `creado_en`; `actualizado_en` |
| `categoria` | `id`; `nombre` VARCHAR(80) **UNIQUE**; `activa` BOOLEAN DEFAULT 1. Semilla: SU-06 |
| `prioridad` | `id`; `nombre` VARCHAR(20) **UNIQUE**; `nivel` TINYINT UNIQUE (1 a 4); `descripcion` VARCHAR(200). Semilla: Baja, Media, Alta, Crítica |
| `estado` | `id`; `nombre` VARCHAR(30) **UNIQUE**; `es_final` BOOLEAN. Semilla: Pendiente, Asignada, En proceso, Finalizada (final), Cancelada (final), Rechazada (final) |
| `solicitud` | `id`; `codigo` VARCHAR(20) **UNIQUE** (formato `SM-AAAA-NNNNNN`); `solicitante_id` FK empleado NOT NULL; `registrada_por_usuario_id` FK usuario NOT NULL; `recurso_id` FK NOT NULL; `descripcion` VARCHAR(2000) NOT NULL; `estado_id` FK NOT NULL; `categoria_id` FK NULL; `prioridad_id` FK NULL; `motivo_cierre` VARCHAR(500) NULL (cancelación, rechazo u observación de cierre); `creada_en`; `actualizada_en`; `cerrada_en` NULL; `version` INT (bloqueo optimista) |
| `evidencia` | `id`; `solicitud_id` FK NOT NULL; `tipo` ENUM('FOTOGRAFIA','PDF'); `nombre_original` VARCHAR(255); `nombre_almacenado` CHAR(40) **UNIQUE** (identificador generado); `tipo_mime` VARCHAR(100); `tamano_bytes` INT UNSIGNED; `hash_sha256` CHAR(64); `subida_por_usuario_id` FK; `subida_en` |
| `asignacion` | `id`; `solicitud_id` FK; `tecnico_id` FK empleado; `asignada_por_usuario_id` FK; `asignada_en`; `vigente` BOOLEAN DEFAULT 1; `finalizada_en` NULL; `motivo_fin` VARCHAR(300) NULL; `vigente_clave` BIGINT **columna generada** = `IF(vigente, solicitud_id, NULL)` con **UNIQUE** (garantiza una sola asignación vigente por solicitud, ya que MySQL no tiene índices únicos parciales) |
| `analisis_ia` | `id`; `solicitud_id` FK; `version` INT (UNIQUE con `solicitud_id`); `estado_analisis` ENUM('EN\_COLA','COMPLETADO','FALLIDO'); `tipo_dano` VARCHAR(200) NULL; `descripcion_observada` TEXT NULL; `categoria_sugerida_id` FK NULL; `prioridad_sugerida_id` FK NULL; `modelo` VARCHAR(100) NULL; `solicitado_por_usuario_id` FK NULL; `creado_en`; `completado_en` NULL; `error_detalle` VARCHAR(500) NULL; `decision_revision` ENUM('PENDIENTE','ACEPTADO','MODIFICADO','DESCARTADO') DEFAULT 'PENDIENTE'; `revisado_por_usuario_id` FK NULL; `revisado_en` NULL |
| `historial_estado` | `id`; `solicitud_id` FK; `estado_anterior_id` FK NULL; `estado_nuevo_id` FK; `usuario_id` FK; `cambiado_en`; `motivo` VARCHAR(500) NULL |

**Índices adicionales:** `solicitud(estado_id, creada_en)` para HU-09; `solicitud(solicitante_id, creada_en)` para el listado del Empleado; `asignacion(tecnico_id, vigente)` para HU-19; `evidencia(solicitud_id)`; `historial_estado(solicitud_id, cambiado_en)`; `analisis_ia(solicitud_id, version)`.

**Reglas de integridad que no expresa un tipo de dato (se verifican en servicio y con pruebas):**

- Un técnico asignado debe ser un empleado activo con `es_tecnico = 1`.
- El último Administrador activo no se puede desactivar ni degradar.
- Una solicitud en estado final no admite nuevas evidencias, asignaciones ni cambios.
- Una solicitud no puede estar en estado Asignada o En proceso sin asignación vigente, ni en Pendiente con asignación vigente.
- `categoria_id` y `prioridad_id` finales de la solicitud solo cambian por acción del Administrador (HU-17), nunca directamente desde el resultado de IA.

**Migraciones:** `V1` esquema y catálogos semilla; `V2` datos iniciales (primer Administrador con contraseña temporal que debe cambiarse); migraciones posteriores se versionan en Flyway y nunca se editan una vez aplicadas.

## 2.6 API y contratos de integración

La aplicación expone dos tipos de entrada que comparten los mismos servicios: páginas web (Thymeleaf) y una **API REST JSON** versionada bajo `/api/v1`, usada por el JavaScript de la interfaz y disponible para futuras integraciones (hoy fuera de alcance). Ambas exigen sesión autenticada y aplican la matriz de permisos 1.7 en el servidor.

**Convenciones:** JSON en UTF-8; fechas ISO 8601 en UTC; identificadores numéricos; paginación con `page` (desde 0) y `size` (máximo 100, por defecto 20); errores con formato `application/problem+json` (RFC 9457) más un campo `codigo` estable.

| Grupo | Método y ruta | Quién | Descripción | Historia |
| --- | --- | --- | --- | --- |
| Sesión | `POST /login`, `POST /logout` | Todos | Inicio y cierre de sesión (formulario con CSRF) | HU-18 |
| Empleados | `GET/POST /api/v1/empleados`; `GET/PUT /api/v1/empleados/{id}` | Administrador | Listar, crear, ver y editar empleados | HU-01 |
| Empleados | `PATCH /api/v1/empleados/{id}/tecnico` `{esTecnico}`; `PATCH .../activo` | Administrador | Marcar técnico; activar o desactivar | HU-03 |
| Técnicos | `GET /api/v1/tecnicos` | Administrador | Empleados activos con `es_tecnico` | HU-03, HU-11 |
| Usuarios | `POST /api/v1/usuarios`; `PATCH /api/v1/usuarios/{id}/activo`; `POST .../restablecer-password` | Administrador | Crear usuario con perfil; activar o desactivar; contraseña temporal | HU-02 |
| Recursos | `GET/POST /api/v1/recursos`; `GET/PUT /api/v1/recursos/{id}`; `PATCH .../activo`; `GET /api/v1/tipos-recurso` | Admin (escritura); todos (lectura de activos) | Gestión de recursos y consulta de tipos | HU-04 |
| Catálogos | `GET /api/v1/categorias`, `/prioridades`, `/estados`; `POST/PUT /api/v1/categorias` | Todos (lectura); Admin (escritura de categorías) | Catálogos | SU-05, SU-06 |
| Solicitudes | `POST /api/v1/solicitudes` (multipart) | Admin, Empleado | Crear con descripción, recurso, solicitante opcional (solo Administrador) y archivos | HU-05, HU-06, HU-07 |
| Solicitudes | `GET /api/v1/solicitudes?estado=&page=&size=&solicitanteId=&tecnicoId=&recursoId=&desde=&hasta=` | Según matriz | Listado paginado y filtrado | HU-08, HU-09, HU-19 |
| Solicitudes | `GET /api/v1/solicitudes/{id}` | Según matriz | Detalle con estado, técnico vigente, evidencias, análisis e historial | HU-08 |
| Evidencias | `POST /api/v1/solicitudes/{id}/evidencias` (multipart); `GET /api/v1/solicitudes/{id}/evidencias/{eid}/archivo` | Según matriz | Adjuntar y descargar | HU-07, HU-10 |
| Asignación | `POST /api/v1/solicitudes/{id}/asignaciones` `{tecnicoId}`; `DELETE .../asignaciones/vigente` `{motivo}` | Administrador | Asignar, reasignar o retirar | HU-11 |
| Estado | `POST /api/v1/solicitudes/{id}/transiciones` `{estadoDestino, motivo}`; `GET .../historial` | Según tabla 1.8 | Cambiar estado y ver historial | HU-12, HU-13 |
| IA | `GET /api/v1/solicitudes/{id}/analisis`; `POST .../analisis` (nuevo análisis); `POST .../analisis/{aid}/revision` `{decision, categoriaId, prioridadId}` | Administrador (POST); según matriz (GET) | Consultar, reintentar y revisar | HU-14 a HU-17 |

**Ejemplo de creación de solicitud (partes del multipart):** parte `datos` (JSON) y partes `archivos`.

```json
{
  "recursoId": 42,
  "descripcion": "El aire acondicionado de la sala 3 gotea agua sobre el piso desde ayer.",
  "solicitanteId": 17
}
```

`solicitanteId` solo se acepta si quien llama es Administrador; para un Empleado se ignora y se usa su propio identificador (HU-05).

**Respuesta 201:** `id`, `codigo`, `estado: "Pendiente"`, `analisis: { estadoAnalisis: "EN_COLA" }`, enlaces a evidencias.

**Ejemplo de error de validación (422):**

```json
{
  "type": "https://plataforma.local/errores/validacion",
  "title": "Datos inválidos",
  "status": 422,
  "codigo": "VALIDACION",
  "errores": [{"campo": "descripcion", "mensaje": "Debe tener entre 20 y 2000 caracteres"}]
}
```

**Códigos de respuesta y de error:**

| HTTP | `codigo` | Cuándo |
| --- | --- | --- |
| 400 | `PETICION_INVALIDA` | JSON mal formado o parámetros ilegibles |
| 401 | `NO_AUTENTICADO` | Sin sesión o sesión expirada |
| 403 | `ACCESO_DENEGADO` | El perfil o la propiedad de la solicitud no lo permite |
| 404 | `NO_ENCONTRADO` | No existe, o existe pero el usuario no debe saber que existe (se usa 404 para solicitudes ajenas) |
| 409 | `TRANSICION_INVALIDA`, `CONFLICTO_VERSION`, `DUPLICADO` | Transición no permitida, edición concurrente, correo o documento repetido |
| 413 | `ARCHIVO_DEMASIADO_GRANDE` | Supera el límite de SU-10 |
| 415 | `TIPO_ARCHIVO_NO_PERMITIDO` | Contenido distinto de JPEG, PNG o PDF |
| 422 | `VALIDACION` | Campos inválidos o motivo ausente |
| 429 | `DEMASIADOS_INTENTOS` | Cuenta bloqueada o límite de peticiones |
| 502 | `SERVICIO_IA_NO_DISPONIBLE` | Solo en el reintento manual de un análisis cuando el proveedor no responde |

## 2.7 Integración con el Servicio de IA

**Interfaz interna (`AnalizadorIa`):** recibe una `SolicitudParaAnalisis` (descripción, tipo y nombre del recurso, lista de imágenes, texto extraído de PDF, catálogos vigentes de categorías y prioridades) y devuelve un `ResultadoAnalisis`. Cambiar de proveedor implica escribir otra implementación, no tocar el dominio.

**Contrato de salida exigido al proveedor (JSON estricto):**

```json
{
  "tipo_dano": "Fuga de agua en equipo de climatización",
  "descripcion_observada": "La fotografía muestra goteo sobre el piso bajo la unidad interior.",
  "categoria_sugerida": "Hidráulica",
  "prioridad_sugerida": "Media"
}
```

**Validación del resultado (obligatoria antes de guardar):**

- Los cuatro campos existen; `tipo_dano` tiene hasta 200 caracteres y `descripcion_observada` hasta 2 000.
- `categoria_sugerida` coincide con el nombre de una categoría activa; `prioridad_sugerida` con una de las cuatro prioridades. Si no coincide, el análisis se marca FALLIDO con `error_detalle`.
- Texto del usuario y texto de PDF se envían como **datos delimitados**, nunca como instrucciones; las instrucciones del sistema indican ignorar cualquier orden contenida en esos datos (defensa contra inyección de instrucciones).

**Preparación de entradas:** las fotografías se redimensionan a un lado mayor de 1 600 px antes de enviarse; del PDF se extrae el texto con un máximo de 20 000 caracteres; los PDF sin texto extraíble (escaneados) se indican como tales en el análisis, sin OCR en el MVP.

**Resiliencia:** tiempo límite de 60 s por llamada; hasta 2 reintentos con espera creciente ante errores temporales; al reiniciar la aplicación, los análisis EN\_COLA se retoman; límite de análisis por día configurable para controlar costo (SU-12).

**Privacidad:** el contenido de la solicitud y sus archivos sale de la infraestructura de la empresa hacia el proveedor de IA. La empresa debe aprobar esto expresamente y el proveedor debe garantizar que no usa esos datos para entrenamiento. Existe un parámetro de configuración `ia.habilitada` que permite apagar la IA sin afectar el resto del sistema.

## 2.8 Seguridad

| Área | Requisito técnico | Cubre |
| --- | --- | --- |
| Autenticación | Contraseñas con BCrypt; política mínima de 10 caracteres con letra y número; contraseña temporal obliga a cambio en el primer inicio; bloqueo tras 5 intentos por 15 minutos; mensaje genérico en fallo | RNF-04, HU-18 |
| Sesión | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; expiración por inactividad a 30 minutos; renovación del identificador de sesión al iniciar sesión | RNF-04 |
| Autorización | Verificación en servidor por perfil **y** por propiedad de la solicitud (protección contra acceso a objetos ajenos por cambio de identificador); prueba automatizada que recorre toda la matriz 1.7 | RNF-04 |
| Peticiones | CSRF activo en páginas; validación de todos los parámetros; consultas parametrizadas (JPA); escape de salida en plantillas contra XSS; cabeceras `Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy` | RNF-04 |
| Archivos | Tipo por contenido (Tika) y límites de SU-10; nombre generado por el sistema (el nombre original solo se muestra, escapado); directorio fuera de la raíz web; descarga solo por endpoint autorizado con `Content-Disposition` y `nosniff`; hash SHA-256 almacenado; sin ejecución de contenido | RNF-07 |
| Secretos | Clave del proveedor de IA, credenciales de MySQL y otros secretos en variables de entorno o secretos de Docker; nunca en el repositorio ni en logs | RNF-04 |
| Transporte | Solo HTTPS (TLS 1.2 o superior); MySQL no expuesta fuera de la red interna de Docker | RNF-04 |
| Datos personales | Se almacenan nombre, documento y correo de empleados: tratarlos conforme a la normativa colombiana de protección de datos personales (Ley 1581 de 2012); la empresa debe validar con su responsable legal la política de tratamiento y el aviso de privacidad | RNF-04 |
| Auditoría | Se registran inicio de sesión, intentos fallidos, cambios de estado, asignaciones, revisiones de IA y descargas de evidencia, con usuario, fecha y hora | RNF-04, RNF-07 |
| Dependencias | Análisis de vulnerabilidades de dependencias en cada construcción; actualización de parches mensual | RNF-06 |

## 2.9 Rendimiento y escalabilidad

**Dimensionamiento de referencia (SU-12, validar con el cliente):** hasta 300 empleados, 30 usuarios simultáneos, 50 solicitudes nuevas por día, 3 archivos de 3 MB por solicitud en promedio, 10 000 solicitudes acumuladas. Eso implica unos 450 MB de archivos por día (unos 165 GB al año); se reservan 250 GB iniciales con alerta al 80 % de uso.

| Objetivo | Valor | Medición |
| --- | --- | --- |
| Listado y detalle de solicitudes | Percentil 95 menor a 2 s con 10 000 solicitudes | Prueba de carga con 30 usuarios |
| Subida de una solicitud con 3 archivos de 3 MB | Menor a 10 s en 10 Mbps | Prueba funcional cronometrada |
| Registro de solicitud | No espera al proveedor de IA | Prueba con proveedor simulado lento (30 s) |
| Arranque | Menor a 90 s | Registro de arranque |

**Escalabilidad:** el volumen supuesto se atiende con una instancia. Si crece, la ruta es: (1) subir recursos del servidor; (2) mover las sesiones a Spring Session con JDBC y ejecutar varias instancias; (3) mover los archivos a almacenamiento de objetos compatible con S3; (4) agregar réplica de lectura de MySQL. Los puntos 2 y 3 requieren cambios acotados gracias a `AlmacenArchivos` y a la configuración de sesión.

## 2.10 Observabilidad

- **Logs estructurados** en JSON con identificador de correlación por petición, nivel, usuario (identificador, no datos personales) y módulo; rotación diaria y retención de 30 días.
- **Salud:** Spring Boot Actuator expone `/actuator/health` (aplicación, MySQL, espacio de disco, almacenamiento de archivos) solo en la red interna.
- **Métricas** (Micrometer): peticiones por segundo y latencia por ruta; errores 5xx; análisis de IA por estado y latencia del proveedor; ocupación de disco; conexiones de base de datos.
- **Alertas operativas** al responsable (correo o mensajería del equipo; no son las notificaciones a usuarios, que siguen fuera de alcance): aplicación caída por más de 2 minutos; disco por encima de 80 %; más de 20 % de análisis de IA fallidos en una hora; copia de seguridad que no se completó.
- Un verificador externo de disponibilidad consulta la página de inicio de sesión cada minuto.

## 2.11 Despliegue e infraestructura (Pendiente DP-11; propuesta SU-11)

**Ambientes:** *desarrollo* (equipo del responsable, MySQL en Docker), *pruebas* (copia reducida de producción con datos ficticios, para demostraciones y pruebas de aceptación) y *producción*.

**Topología de producción propuesta (Docker Compose):** servicio `proxy` (Nginx o Caddy, TLS, límite de cuerpo de petición de 30 MB), servicio `app` (JAR en imagen con JRE 21), servicio `mysql` (volumen persistente), volumen `archivos` montado en `app`. Servidor de referencia: 2 vCPU, 4 GB de RAM y 250 GB de disco (SU-12).

**Entrega continua:** al integrar en la rama principal, una canalización de CI compila, ejecuta pruebas, analiza dependencias y construye la imagen; el despliegue a producción se hace con aprobación manual.

**Copias de seguridad y recuperación (SU-12):** volcado completo de MySQL cada noche más registros binarios; copia diaria del volumen de archivos; retención de 30 días, almacenada fuera del servidor; prueba de restauración mensual. Objetivos: pérdida máxima de datos de 24 h y recuperación en menos de 4 h.

**Configuración:** perfiles de Spring por ambiente; todos los límites de SU-10 y SU-12 (tamaños, bloqueo, sesión, límite diario de IA) son propiedades configurables sin recompilar.

## 2.12 Estrategia de pruebas

| Nivel | Qué verifica | Herramienta | Criterio de aprobación |
| --- | --- | --- | --- |
| Unitarias | `MaquinaEstados` (todas las transiciones válidas e inválidas de 1.8), `PoliticaAcceso`, validadores de archivos, generador de códigos | JUnit 5, Mockito | Cobertura de servicios ≥ 70 %; 100 % de transiciones cubiertas |
| Integración de datos | Migraciones Flyway, restricciones únicas y foráneas, regla de una asignación vigente, consultas e índices | Testcontainers con MySQL 8.4 | Esquema se crea desde cero sin errores; violaciones de integridad rechazadas |
| API y seguridad | Cada endpoint por cada perfil: autorizado, denegado y no autenticado; acceso a solicitud ajena; CSRF | Spring Boot Test, MockMvc | 100 % de la matriz 1.7 con resultado esperado |
| Archivos | Archivo renombrado (.exe como .pdf), tamaño excedido, cantidad excedida, descarga sin permiso | Spring Boot Test | Todos rechazados con el código de error previsto |
| IA | Respuesta válida; JSON malformado; categoría fuera de catálogo; tiempo agotado; proveedor caído; reintentos; reanudación tras reinicio | Doble simulado del proveedor (WireMock) | La solicitud nunca se pierde; el análisis termina COMPLETADO o FALLIDO |
| Extremo a extremo | Los recorridos de [User Flow](User-Flow.md): RC-01 a RC-08 | Playwright o Selenium | Todos pasan en el ambiente de pruebas |
| Carga | Listados y detalle con 10 000 solicitudes y 30 usuarios | k6 o JMeter | Objetivos de 2.9 |
| Seguridad | Dependencias vulnerables; escaneo básico de la aplicación en pruebas | OWASP Dependency-Check; OWASP ZAP | Sin vulnerabilidades altas o críticas abiertas |
| Aceptación | Cada criterio de aceptación de HU-01 a HU-19 | Lista de verificación ejecutada por el cliente | Todos los criterios marcados |

## 2.13 Consideraciones de mantenimiento y evolución

- **Puntos de extensión previstos:** `EstrategiaAsignacion` (hoy manual; podrá ser automática o asistida por IA según DP-01); eventos de dominio al crear o cambiar de estado (base para futuras notificaciones, DP-08); vistas de solo lectura sobre `solicitud` e `historial_estado` (base para reportes, DP-10); `AlmacenArchivos` (migración a almacenamiento de objetos).
- **Código:** convenciones de formato y análisis estático (Checkstyle, SpotBugs); revisión propia mediante solicitudes de cambio, incluso trabajando solo.
- **Documentación:** README de instalación, manual de operación (arranque, copia y restauración, rotación de claves), registro de decisiones de arquitectura con una página por decisión (SU-13 a SU-18).
- **Dependencias:** revisión mensual; actualización de la versión de Java LTS planificada al menos 6 meses antes del fin de soporte.
- **Continuidad:** como el desarrollo es individual, el repositorio, las claves y el manual de operación deben ser accesibles a otra persona designada por la empresa.

## 2.14 Riesgos técnicos

| Riesgo | Mitigación |
| --- | --- |
| El análisis de imágenes del proveedor de IA es insuficiente para daños de maquinaria especializada | La IA es sugerencia con revisión humana; se mide el porcentaje de sugerencias aceptadas ([PRD 1.13](PRD.md)) y se ajustan instrucciones o proveedor |
| Crecimiento de archivos más rápido que lo previsto | Alerta al 80 % de disco; límites configurables; ruta de migración a almacenamiento de objetos |
| Pérdida del servidor único | Copias fuera del servidor, restauración probada, infraestructura descrita como código en Compose |
| Cambio de reglas de estados o permisos | Reglas concentradas en `MaquinaEstados` y `PoliticaAcceso` con pruebas exhaustivas |
| Condición de carrera al asignar o cambiar estado simultáneamente | Bloqueo optimista con `version`; índice único de asignación vigente |
| Dependencia de un solo desarrollador | Documentación de operación, automatización de despliegue, repositorio compartido con la empresa |
