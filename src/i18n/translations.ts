export type Language = 'es' | 'en';
export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'plataforma_mantenimiento_theme';
export const LANG_STORAGE_KEY = 'plataforma_mantenimiento_lang';

/**
 * Diccionario centralizado de traducciones Español <-> Inglés para toda la interfaz.
 */
export const UI_DICTIONARY_ES_TO_EN: Record<string, string> = {
  // Marca y encabezado global
  'Mantenimiento': 'Maintenance',
  'Plataforma de Solicitudes de Mantenimiento': 'Maintenance Request Platform',
  'Inicio': 'Home',
  'Solicitudes': 'Requests',
  'Mis Solicitudes': 'My Requests',
  'Mis solicitudes': 'My requests',
  'Mis Asignaciones': 'My Assignments',
  'Solicitudes asignadas': 'Assigned requests',
  'Usuarios': 'Users',
  'Empleados': 'Employees',
  'Recursos': 'Resources',
  'Categorías': 'Categories',
  'Nueva solicitud': 'New request',
  'Cerrar sesión': 'Sign out',
  'Abrir menú': 'Open menu',
  'Cerrar menú': 'Close menu',
  'Cerrar notificación': 'Close notification',
  'Cerrar diálogo': 'Close dialog',
  'Cargando contenido': 'Loading content',
  'Saltar al contenido principal': 'Skip to main content',

  // Controles de tema e idioma
  'Oscuro': 'Dark',
  'Claro': 'Light',
  'Modo oscuro': 'Dark mode',
  'Modo claro': 'Light mode',
  'Español': 'Spanish',
  'Inglés': 'English',

  // Roles y estados
  'Administrador': 'Administrator',
  'Empleado (Técnico)': 'Employee (Technician)',
  'Empleado Técnico': 'Technical Employee',
  'Cliente': 'Client',
  'Pendiente': 'Pending',
  'Asignada': 'Assigned',
  'En proceso': 'In progress',
  'Finalizada': 'Completed',
  'Cancelada': 'Cancelled',
  'Rechazada': 'Rejected',
  'Baja': 'Low',
  'Media': 'Medium',
  'Alta': 'High',
  'Crítica': 'Critical',
  'Sin definir': 'Undefined',
  'Sin asignar': 'Unassigned',
  'Activo': 'Active',
  'Inactivo': 'Inactive',
  'Activa': 'Active',
  'Inactiva': 'Inactive',

  // Tipos de recurso y categorías semilla
  'Equipo tecnológico': 'Tech equipment',
  'Instalación o edificio': 'Facility or building',
  'Maquinaria': 'Machinery',
  'Herramienta': 'Tool',
  'Eléctrica': 'Electrical',
  'Mecánica': 'Mechanical',
  'Hidráulica': 'Hydraulic',
  'Locativa/Estructural': 'Structural/Facility',
  'Informática/Electrónica': 'IT/Electronics',
  'Otra': 'Other',

  // Login y Registro (P-01)
  'Conocer el servicio': 'Explore the service',
  'Plataforma corporativa · Acceso': 'Corporate platform · Sign in',
  'Plataforma corporativa · Registro de cliente': 'Corporate platform · Client registration',
  'Cada falla reportada, en un solo lugar.': 'Every reported failure, in one single place.',
  'Cree su cuenta para reportar y dar seguimiento.': 'Create your account to report and track requests.',
  'Registre daños en equipos, instalaciones, maquinaria o herramientas, adjunte evidencias y dé seguimiento hasta su cierre.':
    'Report damages in equipment, facilities, machinery or tools, attach evidence and track them until closure.',
  'Complete sus datos para habilitar su acceso como cliente y gestionar solicitudes de mantenimiento en tiempo real.':
    'Complete your details to enable client access and manage maintenance requests in real time.',
  'Iniciar sesión': 'Sign in',
  'Crear cuenta': 'Create account',
  'Creando cuenta…': 'Creating account…',
  'Correo electrónico': 'Email address',
  'Contraseña': 'Password',
  'Ingresar': 'Log in',
  'Ingresando…': 'Logging in…',
  'Registrarse': 'Sign up',
  'Ir a cambio y recuperación de contraseña': 'Go to password change & recovery',
  '¿Olvidó su contraseña?': 'Forgot your password?',
  'Comuníquese con el': 'Contact the',
  'Nombre(s)': 'First name(s)',
  'Apellidos': 'Last name(s)',
  'Documento de identidad': 'ID document',
  'Mínimo 10 caracteres': 'At least 10 characters',
  'Al menos 1 letra': 'At least 1 letter',
  'Al menos 1 número': 'At least 1 number',
  '¿Ya tiene cuenta? Iniciar sesión': 'Already have an account? Sign in',
  'Cuentas disponibles para verificación de flujo': 'Available accounts for workflow verification',
  'Usar': 'Use',
  'Restablecer datos iniciales': 'Reset initial demo data',
  'Ingrese su correo y contraseña.': 'Please enter your email and password.',
  'Correo o contraseña incorrectos': 'Incorrect email or password',
  'Cuenta bloqueada temporalmente. Intente de nuevo en 15 minutos':
    'Account temporarily locked. Please try again in 15 minutes',
  'Sesión cerrada': 'Signed out',
  'Has cerrado sesión correctamente.': 'You have signed out successfully.',
  'Su sesión va a expirar': 'Your session is about to expire',
  'Por inactividad, la sesión se cerrará automáticamente al cumplir 30 minutos. ¿Desea continuar conectado?':
    'Due to inactivity, your session will automatically close after 30 minutes. Do you want to stay signed in?',
  'Seguir conectado': 'Stay signed in',

  // Narrativa 3D en Login
  'Qué es el servicio': 'What the service is',
  'Un ecosistema centralizado para la continuidad operativa.':
    'A centralized ecosystem for operational continuity.',
  'Nuestra plataforma unifica la recepción, priorización y control de solicitudes de mantenimiento correctivo y preventivo en toda su organización. Desde maquinaria pesada hasta instalaciones críticas y herramientas de precisión, cada activo cuenta con una ficha viva y trazable en un solo punto de control.':
    'Our platform unifies the intake, prioritization, and control of corrective and preventive maintenance requests across your organization. From heavy machinery to critical facilities and precision tools, every asset has a live, traceable record in a single control point.',
  'Inventario unificado de activos': 'Unified asset inventory',
  'Clasificación por criticidad': 'Criticality classification',
  'Visibilidad corporativa 24/7': '24/7 corporate visibility',
  'NÚCLEO DE ACTIVOS · RED CONECTADA': 'ASSET CORE · CONNECTED NETWORK',
  '100% Trazabilidad de recursos': '100% Resource traceability',
  'Cómo funciona': 'How it works',
  'Diagnóstico inicial y radicación estructurada en segundos.':
    'Initial diagnosis and structured filing in seconds.',
  'Cuando ocurre una eventualidad, cualquier colaborador autorizado registra el hallazgo seleccionando el recurso afectado, la categoría técnica del daño y adjuntando evidencia directa. El sistema valida las reglas de negocio al instante y genera un expediente único sin correos dispersos ni papeleo manual.':
    'When an incident occurs, any authorized user logs the finding by selecting the affected resource, technical damage category, and direct evidence. The system validates business rules instantly and generates a unique record without scattered emails or manual paperwork.',
  'Captura guiada sin fricción': 'Frictionless guided capture',
  'Validación automática de datos': 'Automatic data validation',
  'Radicación inmediata en cola': 'Immediate queue filing',
  'ESCÁNER DE DIAGNÓSTICO · RADICACIÓN': 'DIAGNOSTIC SCANNER · FILING',
  'Registro estructurado de fallas': 'Structured failure logging',
  'Coordinación técnica': 'Technical coordination',
  'Asignación inteligente y análisis técnico versionado.':
    'Smart assignment and versioned technical analysis.',
  'El equipo de ingeniería y mantenimiento evalúa la solicitud, asigna especialistas según su carga y especialidad, y documenta el diagnóstico de causa raíz junto con los insumos requeridos. Cada iteración del análisis queda registrada con control de versiones para mantener un historial técnico transparente.':
    'The engineering and maintenance team evaluates the request, assigns specialists according to workload and expertise, and documents root-cause diagnosis along with required supplies. Every analysis iteration is version-controlled for a transparent technical history.',
  'Asignación por especialidad': 'Specialty-based assignment',
  'Versionado de análisis técnico': 'Versioned technical analysis',
  'Bitácora de intervención': 'Intervention logbook',
  'SINCRONIZACIÓN · FLUJO TÉCNICO': 'SYNCHRONIZATION · TECHNICAL FLOW',
  'Coordinación de especialistas': 'Specialist coordination',
  'Resolución y control': 'Resolution & control',
  'Cierre verificado e inteligencia preventiva en tiempo real.':
    'Verified closure and real-time preventive intelligence.',
  'Ningún reporte se cierra sin la validación técnica correspondiente y el registro de la solución definitiva. Las métricas consolidadas permiten identificar activos con fallas recurrentes, optimizar los tiempos de respuesta y transformar las reparaciones reactivas en decisiones de mantenimiento preventivo.':
    'No report is closed without technical validation and a record of the definitive solution. Consolidated metrics identify assets with recurring failures, optimize response times, and turn reactive repairs into preventive maintenance decisions.',
  'Auditoría de cierre técnico': 'Technical closure audit',
  'Métricas de disponibilidad': 'Availability metrics',
  'Historial por equipo y sede': 'History by asset and site',
  'VERIFICACIÓN · INTEGRIDAD OPERATIVA': 'VERIFICATION · OPERATIONAL INTEGRITY',
  'Ciclo de vida auditado': 'Audited lifecycle',
  '¿Listo para gestionar sus solicitudes?': 'Ready to manage your requests?',
  'Inicie sesión con su cuenta corporativa en la vista principal.':
    'Sign in with your corporate account in the main view.',
  'Volver al inicio de sesión': 'Back to sign in',

  // Cambio y Recuperación de Contraseña (P-02 — Flujo de 2 pasos por correo)
  'Recuperación de cuenta · Cambio de contraseña': 'Account recovery · Password change',
  'Cambio obligatorio · Primer acceso': 'Mandatory change · First login',
  'Paso 1 de 3 · Verificación de Correo Electrónico': 'Step 1 of 3 · Email Verification',
  'Paso 2 de 3 · Validación de Código de Seguridad': 'Step 2 of 3 · Security Code Validation',
  'Paso 3 de 3 · Establecimiento de Nueva Contraseña': 'Step 3 of 3 · Set New Password',
  'Proceso Completado · Cuenta Recuperada': 'Process Completed · Account Recovered',
  'Correo': 'Email',
  'Verificación': 'Verification',
  'Nueva Clave': 'New Password',
  'Confirmación': 'Confirmation',
  'Restablezca su contraseña.': 'Reset your password.',
  'Ingrese el código de verificación.': 'Enter the verification code.',
  'Cree su nueva contraseña.': 'Create your new password.',
  'Contraseña actualizada.': 'Password updated.',
  'Defina su nueva contraseña.': 'Set your new password.',
  'Introduzca el correo electrónico asociado a su cuenta. Verificaremos su registro y le enviaremos un código de seguridad de 6 dígitos.':
    'Enter the email address associated with your account. We will verify your registration and send you a 6-digit security code.',
  'Su identidad ha sido verificada. Establezca ahora una contraseña segura que cumpla con todos los requisitos de protección.':
    'Your identity has been verified. Set a secure password now that meets all protection requirements.',
  'Su credencial de acceso ha sido actualizada y cifrada correctamente en el sistema.':
    'Your access credential has been updated and encrypted properly in the system.',
  'Correo Electrónico': 'Email Address',
  'Enviar Código': 'Send Code',
  '¿Aún no tiene una cuenta activa en la plataforma?': 'Do not have an active account on the platform yet?',
  'Verifique que el correo esté bien escrito. Si es un nuevo usuario, puede registrarse directamente o contactar a soporte técnico / Administrador.':
    'Check that the email is spelled correctly. If you are a new user, you can sign up directly or contact technical support / the Administrator.',
  'Ir a crear cuenta': 'Go to create account',
  'Cambiar correo': 'Change email',
  'Usar código': 'Use code',
  'Código de Verificación (6 dígitos)': 'Verification Code (6 digits)',
  '¿No recibió el código en su bandeja?': 'Did not receive the code in your inbox?',
  'Reenviar nuevo código': 'Resend new code',
  'Verificar Código': 'Verify Code',
  'Atrás': 'Back',
  'Nueva Contraseña': 'New Password',
  'Confirmar Nueva Contraseña': 'Confirm New Password',
  'Fortaleza de la contraseña:': 'Password strength:',
  'Sin ingresar': 'Not entered',
  'Débil': 'Weak',
  'Regular': 'Fair',
  'Buena (Cumple política)': 'Good (Meets policy)',
  'Fuerte': 'Strong',
  'Confirmación coincidente': 'Matching confirmation',
  'Restablecer Contraseña': 'Reset Password',
  'Tu contraseña ha sido restablecida con éxito.': 'Your password has been reset successfully.',
  'Ir a Iniciar Sesión': 'Go to Sign In',
  'Política de seguridad: verificación en 2 pasos por correo electrónico (OTP 6 dígitos) y contraseña de mínimo 10 caracteres con letras y números.':
    'Security policy: 2-step email verification (6-digit OTP) and password of at least 10 characters with letters and numbers.',
  'Ingrese el correo electrónico asociado a su cuenta corporativa y establezca una nueva contraseña personal de al menos 10 caracteres que incluya letras y números.':
    'Enter the email address associated with your corporate account and set a new personal password of at least 10 characters including letters and numbers.',
  'Correo electrónico de la cuenta': 'Account email address',
  'Nueva contraseña': 'New password',
  'Confirmar contraseña': 'Confirm password',
  'Actualizar contraseña': 'Update password',
  'Guardar y continuar': 'Save and continue',
  'Volver al login': 'Back to sign in',
  'Política de seguridad: mínimo 10 caracteres con al menos una letra y un número.':
    'Security policy: at least 10 characters with at least one letter and one number.',

  // Dashboard (P-03)
  'Panel de Administración': 'Administration Dashboard',
  'Panel de Empleado · Técnico de Mantenimiento': 'Employee Dashboard · Maintenance Technician',
  'Portal de Cliente · Solicitudes de Mantenimiento': 'Client Portal · Maintenance Requests',
  'Gestione usuarios y roles, supervise todas las solicitudes de mantenimiento de la empresa y asigne técnicos responsables.':
    'Manage users and roles, oversee all company maintenance requests, and assign responsible technicians.',
  'Consulte las solicitudes asignadas a su cargo, actualice su estado operativo y registre el trabajo de reparación realizado.':
    'View requests assigned to you, update their operational status, and log repair work performed.',
  'Solicite mantenimiento desde la página web y consulte en tiempo real el estado de sus propias solicitudes.':
    'Request maintenance from the web platform and check the status of your own requests in real time.',
  'Ver mis solicitudes asignadas': 'View my assigned requests',
  'Todas las solicitudes por estado': 'All requests by status',
  'Mis solicitudes asignadas por estado': 'My assigned requests by status',
  'Estado de mis solicitudes': 'Status of my requests',
  'Ver listado completo →': 'View full list →',
  'Asignadas a mí': 'Assigned to me',
  'Ver todas mis asignadas →': 'View all assigned to me →',
  'No tiene solicitudes asignadas': 'You have no assigned requests',
  'Cuando el Administrador le asigne una solicitud activa, aparecerá aquí para iniciar atención.':
    'When the Administrator assigns an active request to you, it will appear here to start service.',
  'Administración de plataforma': 'Platform administration',
  'Servicio de IA (Fase 5) habilitado': 'AI Service (Phase 5) enabled',
  'Altas, edición y marca de personal técnico.': 'Registration, editing, and technical staff designation.',
  'Perfiles, activación y restablecimiento de claves.': 'Profiles, activation, and password resets.',
  'Equipos, instalaciones, maquinaria y herramientas.': 'Equipment, facilities, machinery, and tools.',
  'Catálogo de clasificación de daños.': 'Damage classification catalog.',
  'Solicitudes recientes': 'Recent requests',
  'Mis asignaciones más recientes': 'My most recent assignments',
  'Mis 5 solicitudes más recientes': 'My 5 most recent requests',
  'No tiene solicitudes asignadas actualmente': 'You currently have no assigned requests',
  'Aún no tiene solicitudes. Registre la primera': 'You have no requests yet. Create your first one',
  'Solo verá en su bandeja las solicitudes que el Administrador le asigne para reparación.':
    'You will only see requests assigned to you for repair by the Administrator.',
  'Describa el daño, seleccione el recurso afectado y adjunte fotografías o documentos PDF si dispone de ellos.':
    'Describe the damage, select the affected resource, and attach photos or PDF documents if available.',

  // Listado de Solicitudes (P-05)
  'M3 · M5 Seguimiento Global': 'M3 · M5 Global Tracking',
  'Bandeja Técnica · Reparaciones Asignadas': 'Technical Inbox · Assigned Repairs',
  'Portal de Cliente · Mis Solicitudes': 'Client Portal · My Requests',
  'Consulte, asigne técnicos y filtre todas las solicitudes registradas en la plataforma.':
    'View, assign technicians, and filter all requests registered on the platform.',
  'Consulte únicamente las solicitudes asignadas a su cargo, actualice su estado y registre el trabajo realizado.':
    'View only requests assigned to you, update their status, and log completed work.',
  'Consulte el estado y avance de sus propias solicitudes de mantenimiento.':
    'Check the status and progress of your own maintenance requests.',
  'Solo asignadas a mí': 'Only assigned to me',
  'Todos los solicitantes': 'All requesters',
  'Todos los técnicos': 'All technicians',
  'Quitar filtros': 'Clear filters',
  'Quitar filtro': 'Clear filter',
  'No hay solicitudes': 'No requests found',
  'Pruebe cambiando o quitando los filtros seleccionados.':
    'Try changing or clearing the selected filters.',
  'Cuando el Administrador le asigne una solicitud para reparación, aparecerá en esta bandeja.':
    'When the Administrator assigns a request to you for repair, it will appear in this inbox.',
  'Registre una nueva solicitud de mantenimiento para comenzar.':
    'Create a new maintenance request to get started.',
  'Código': 'Code',
  'Recurso': 'Resource',
  'Estado': 'Status',
  'Solicitante': 'Requester',
  'Técnico': 'Technician',
  'Trabajo realizado': 'Work performed',
  'Fecha': 'Date',
  'Pendiente de registro técnico': 'Pending technical log',
  'Anterior': 'Previous',
  'Siguiente': 'Next',

  // Nueva Solicitud (P-04)
  '← Volver al inicio': '← Back to home',
  'M3 · Registro de solicitud': 'M3 · Request filing',
  'Nueva solicitud de mantenimiento': 'New maintenance request',
  'Registre una solicitud propia o en nombre de un empleado activo adjuntando la evidencia disponible.':
    'File a request for yourself or on behalf of an active employee, attaching available evidence.',
  'Seleccione el recurso afectado, describa el daño y adjunte fotografías o documentos PDF si cuenta con ellos.':
    'Select the affected resource, describe the damage, and attach photos or PDF documents if available.',
  'No hay recursos registrados': 'No resources registered',
  'Debe existir al menos un recurso activo para asociar una solicitud.':
    'There must be at least one active resource to associate with a request.',
  'Pida al Administrador que registre un recurso activo antes de crear una solicitud.':
    'Ask the Administrator to register an active resource before creating a request.',
  'Registrar recurso': 'Register resource',
  'Empleado solicitante': 'Requesting employee',
  'No hay empleados activos con ese criterio.': 'No active employees match that criteria.',
  'Registrar empleado': 'Register employee',
  '— Seleccione un empleado —': '— Select an employee —',
  'Recurso afectado': 'Affected resource',
  'Todos los tipos': 'All types',
  'No hay recursos activos que coincidan con la búsqueda.':
    'No active resources match the search.',
  'Descripción del problema': 'Problem description',
  'Evidencias (opcional)': 'Evidence (optional)',
  'Seleccionar fotografías o documentos PDF': 'Select photos or PDF documents',
  'Puede adjuntar archivos ahora o posteriormente mientras la solicitud esté Pendiente.':
    'You can attach files now or later while the request is Pending.',
  'Enviar solicitud': 'Submit request',
  'Enviando…': 'Submitting…',
  'Cancelar': 'Cancel',
  '¿Descartar la solicitud?': 'Discard request?',
  'Se perderán los datos ingresados y los archivos seleccionados.':
    'Entered data and selected files will be lost.',
  'Descartar': 'Discard',
  'Seguir editando': 'Keep editing',

  // Administración: Empleados, Usuarios, Recursos, Categorías
  'Administración · M1 y M4': 'Administration · M1 & M4',
  'Gestione los trabajadores de la empresa e identifique quiénes desempeñan funciones técnicas.':
    'Manage company workers and identify who performs technical functions.',
  'Nuevo empleado': 'New employee',
  'Administración · M2': 'Administration · M2',
  'Equipos tecnológicos, instalaciones, maquinaria y herramientas disponibles para asociar a solicitudes. Los recursos con historial se desactivan en lugar de eliminarse.':
    'Tech equipment, facilities, machinery, and tools available to link to requests. Resources with history are deactivated rather than deleted.',
  'Nuevo recurso': 'New resource',
  'Nombre': 'Name',
  'Tipo': 'Type',
  'Ubicación': 'Location',
  'Acciones': 'Actions',
  'Editar': 'Edit',
  'Desactivar': 'Deactivate',
  'Activar': 'Activate',
  'Administración · Catálogo SU-06': 'Administration · Catalog SU-06',
  'Administre el catálogo de categorías utilizado tanto en la clasificación manual como en la validación de sugerencias de IA. Las categorías desactivadas se conservan en el histórico.':
    'Manage the category catalog used for both manual classification and AI suggestion validation. Deactivated categories are preserved in history.',
  'Nueva categoría': 'New category',
  'Agregar categoría': 'Add category',
  'No hay categorías registradas': 'No categories registered',
  'Guardar': 'Save',
  'Renombrar': 'Rename',
  'Nuevo usuario': 'New user',
  'Restablecer clave': 'Reset password',

  // Detalle de solicitud (P-06, P-07, P-08, P-09)
  '← Volver al listado': '← Back to list',
  'Registrar otra solicitud': 'Register another request',
  'Asignar técnico': 'Assign technician',
  'Cambiar técnico': 'Change technician',
  'Registrar trabajo realizado': 'Log work performed',
  'Actualizar trabajo realizado': 'Update work performed',
  'Iniciar atención': 'Start service',
  'Finalizar solicitud': 'Complete request',
  'Cancelar solicitud': 'Cancel request',
  'Rechazar solicitud': 'Reject request',
  'Trabajo técnico realizado': 'Technical work performed',
  'Editar registro': 'Edit log',
  '+ Registrar trabajo': '+ Log work',
  'Aún no ha registrado el detalle del trabajo realizado en esta solicitud.':
    'You have not logged the details of the work performed on this request yet.',
  'Pendiente de registro por el área técnica.': 'Pending log by technical department.',
  'Observación de cierre': 'Closure observation',
  'Adjuntar archivos': 'Attach files',
  'No se adjuntaron evidencias': 'No evidence attached',
  'Puede agregar fotografías (JPEG/PNG) o documentos PDF mientras el estado lo permita.':
    'You can add photos (JPEG/PNG) or PDF documents while the status allows it.',
  'Descargar PDF': 'Download PDF',
  'M6 · Apoyo de clasificación (Fase 5)': 'M6 · Classification support (Phase 5)',
  'Análisis de IA': 'AI Analysis',
  'Reintentar análisis': 'Retry analysis',
  'Solicitar nuevo análisis': 'Request new analysis',
  'Analizar con IA': 'Analyze with AI',
  'Revisar sugerencia': 'Review suggestion',
  'El análisis automático no está disponible. El Administrador puede continuar el flujo manualmente sin restricciones.':
    'Automatic analysis is unavailable. The Administrator can continue the workflow manually without restrictions.',
  'Aún no hay análisis registrado para esta solicitud.':
    'There is no analysis recorded for this request yet.',
  'Análisis de IA en proceso…': 'AI Analysis in progress…',
  'El sistema evalúa la descripción y evidencias en segundo plano sin bloquear su trabajo.':
    'The system evaluates the description and evidence in the background without blocking your work.',
  'Pendiente de revisión': 'Pending review',
  'Tipo de daño identificado': 'Identified damage type',
  'Descripción observada': 'Observed description',
  'Categoría sugerida': 'Suggested category',
  'Prioridad sugerida': 'Suggested priority',
  'Información de la solicitud': 'Request information',
  'Registrada por': 'Registered by',
  'Atención técnica': 'Technical service',
  'Técnico asignado': 'Assigned technician',
  'Personal técnico asignado': 'Technical staff assigned',
  'Pendiente de asignación': 'Pending assignment',
  'Categoría final': 'Final category',
  'Prioridad final': 'Final priority',
  'Fecha de cierre': 'Closure date',
  'Historial de estados': 'Status history',
  'Detalle del trabajo realizado (mínimo 10 caracteres)':
    'Details of work performed (at least 10 characters)',

  // Pantallas de error
  'Acceso denegado': 'Access denied',
  'No encontrado': 'Not found',
  'No tiene permiso para ver esta sección.': 'You do not have permission to view this section.',
  'No encontrado.': 'Not found.',
  'Su perfil actual no cuenta con autorización para acceder a este recurso.':
    'Your current profile is not authorized to access this resource.',
  'El elemento solicitado no existe o no se encuentra disponible para su usuario.':
    'The requested item does not exist or is not available for your user.',
  'Ir al inicio': 'Go to home',
};

export const PLACEHOLDER_DICTIONARY_ES_TO_EN: Record<string, string> = {
  'nombre@empresa.com': 'name@company.com',
  'Ej. Laura': 'E.g. Laura',
  'Ej. Méndez Ríos': 'E.g. Smith',
  'Ej. 1032456789': 'E.g. 1032456789',
  'Mínimo 10 caracteres (letras y números)': 'At least 10 characters (letters & numbers)',
  'Mínimo 10 caracteres, letra y número': 'At least 10 characters, letter and number',
  'Repita la nueva contraseña': 'Repeat new password',
  'Buscar por nombre, documento o correo…': 'Search by name, ID or email…',
  'Buscar recurso por código, nombre o ubicación…': 'Search resource by code, name or location…',
  'Describa qué falla presenta el recurso, desde cuándo ocurre y si afecta la operación…':
    'Describe what failure the resource presents, since when it occurs, and if it affects operations…',
  'Ej: Refrigeración': 'E.g. Cooling',
};

const EN_TO_ES_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(UI_DICTIONARY_ES_TO_EN).map(([es, en]) => [en, es])
);

const PLACEHOLDER_EN_TO_ES_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PLACEHOLDER_DICTIONARY_ES_TO_EN).map(([es, en]) => [en, es])
);

/**
 * Traduce una cadena dinámica o estática según el idioma activo.
 */
export function translateText(text: string, lang: Language): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (lang === 'en') {
    if (UI_DICTIONARY_ES_TO_EN[trimmed]) {
      return text.replace(trimmed, UI_DICTIONARY_ES_TO_EN[trimmed]);
    }
    // Patrones dinámicos frecuentes
    if (trimmed.startsWith('Hola, ') && trimmed.endsWith('.')) {
      const name = trimmed.slice(6, -1);
      return `Hello, ${name}.`;
    }
    if (trimmed.startsWith('Rol: ')) {
      const role = trimmed.slice(5);
      const translatedRole = UI_DICTIONARY_ES_TO_EN[role] ?? role;
      return `Role: ${translatedRole}`;
    }
    const totalMatch = trimmed.match(/^Total:\s*(\d+)\s*resultado\(s\)$/);
    if (totalMatch) {
      return `Total: ${totalMatch[1]} result(s)`;
    }
    const pageMatch = trimmed.match(/^Página\s+(\d+)\s+de\s+(\d+)$/);
    if (pageMatch) {
      return `Page ${pageMatch[1]} of ${pageMatch[2]}`;
    }
    const charMatch = trimmed.match(/^(\d+)\s*\/\s*2000\s*caracteres\s*\(mín\.\s*20\)$/);
    if (charMatch) {
      return `${charMatch[1]} / 2000 characters (min. 20)`;
    }
    const todosCount = trimmed.match(/^Todos\s*\((\d+)\)$/);
    if (todosCount) {
      return `All (${todosCount[1]})`;
    }
    const soloTecCount = trimmed.match(/^Solo técnicos\s*\((\d+)\)$/);
    if (soloTecCount) {
      return `Technicians only (${soloTecCount[1]})`;
    }
  } else {
    if (EN_TO_ES_MAP[trimmed]) {
      return text.replace(trimmed, EN_TO_ES_MAP[trimmed]);
    }
    if (trimmed.startsWith('Hello, ') && trimmed.endsWith('.')) {
      const name = trimmed.slice(7, -1);
      return `Hola, ${name}.`;
    }
    if (trimmed.startsWith('Role: ')) {
      const role = trimmed.slice(6);
      const translatedRole = EN_TO_ES_MAP[role] ?? role;
      return `Rol: ${translatedRole}`;
    }
    const totalMatch = trimmed.match(/^Total:\s*(\d+)\s*result\(s\)$/);
    if (totalMatch) {
      return `Total: ${totalMatch[1]} resultado(s)`;
    }
    const pageMatch = trimmed.match(/^Page\s+(\d+)\s+of\s+(\d+)$/);
    if (pageMatch) {
      return `Página ${pageMatch[1]} de ${pageMatch[2]}`;
    }
    const charMatch = trimmed.match(/^(\d+)\s*\/\s*2000\s*characters\s*\(min\.\s*20\)$/);
    if (charMatch) {
      return `${charMatch[1]} / 2000 caracteres (mín. 20)`;
    }
    const allCount = trimmed.match(/^All\s*\((\d+)\)$/);
    if (allCount) {
      return `Todos (${allCount[1]})`;
    }
    const techCount = trimmed.match(/^Technicians only\s*\((\d+)\)$/);
    if (techCount) {
      return `Solo técnicos (${techCount[1]})`;
    }
  }

  return text;
}

const originalTextNodeMap = new WeakMap<Text, string>();

/**
 * Sincroniza los nodos de texto y placeholders del DOM con el idioma seleccionado,
 * asegurando cobertura completa en todas las vistas sin alterar la estructura React.
 */
export function applyLanguageToDOM(root: HTMLElement | Document, lang: Language): void {
  if (typeof document === 'undefined') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;
    const parentTag = textNode.parentElement?.tagName;
    if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE') {
      const currentVal = textNode.nodeValue ?? '';
      const storedOriginal = originalTextNodeMap.get(textNode);

      if (!storedOriginal) {
        originalTextNodeMap.set(textNode, currentVal);
      } else if (
        currentVal !== storedOriginal &&
        currentVal !== translateText(storedOriginal, 'en') &&
        currentVal !== translateText(storedOriginal, 'es')
      ) {
        // React actualizó el nodo con un nuevo valor dinámico
        originalTextNodeMap.set(textNode, currentVal);
      }

      const baseText = originalTextNodeMap.get(textNode) ?? currentVal;
      const targetText = translateText(baseText, lang);
      if (textNode.nodeValue !== targetText) {
        textNode.nodeValue = targetText;
      }
    }
    currentNode = walker.nextNode();
  }

  const container = root instanceof Document ? root.body : root;
  if (!container) return;

  const inputs = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input[placeholder], textarea[placeholder]'
  );
  inputs.forEach((el) => {
    const ph = el.getAttribute('placeholder') ?? '';
    if (lang === 'en' && PLACEHOLDER_DICTIONARY_ES_TO_EN[ph]) {
      el.setAttribute('placeholder', PLACEHOLDER_DICTIONARY_ES_TO_EN[ph]);
    } else if (lang === 'es' && PLACEHOLDER_EN_TO_ES_MAP[ph]) {
      el.setAttribute('placeholder', PLACEHOLDER_EN_TO_ES_MAP[ph]);
    }
  });
}
