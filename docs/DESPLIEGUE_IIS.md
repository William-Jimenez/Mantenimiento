# Guía de Despliegue en IIS (Internet Information Services) y Windows Server

**Proyecto:** Plataforma de Gestión Integral de Solicitudes de Mantenimiento  
**Rol:** DevOps / Administrador de Infraestructura Windows Server  
**Objetivo:** Servir y operar la plataforma de manera profesional y de alto rendimiento utilizando Internet Information Services (IIS).

---

## 1. Análisis del Stack Tecnológico del Proyecto

| Capa | Tecnología Detectada | Rol en Producción |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4 | SPA optimizada compilada en `dist/`. |
| **Backend API (Integrado)** | Node.js (v18+ / v20+ / v26+), Express 4 | API RESTful montada en `/api` con autenticación, RBAC y datos semilla. |
| **Backend Java (Opcional)** | Java 21, Spring Boot 3.4, PostgreSQL 16 | API Java independiente en puerto 8080. |
| **Servidor Web y Hosting** | Microsoft IIS (Internet Information Services) 10+ | Servidor HTTP frontal, Reverse Proxy, terminación SSL, balanceo y seguridad. |

---

## 2. Requisitos Previos en Windows Server / IIS

Para preparar el servidor Windows Server o Windows 10/11 con IIS:

### 2.1 Habilitar IIS y Módulos de Windows
Abre PowerShell como **Administrador** y ejecuta:
```powershell
# Instalar IIS con herramientas de administración y extensiones web
Install-WindowsFeature -Name Web-Server, Web-WebServer, Web-Common-Http, Web-Static-Content, Web-Default-Doc, Web-Dir-Browsing, Web-Http-Errors, Web-Http-Logging, Web-Stat-Compression, Web-Filtering, Web-Mgmt-Console -IncludeManagementTools
```
*(En Windows 10/11 Pro, habilitar mediante `Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServerManagementTools`).*

### 2.2 Componentes Adicionales de IIS Recomendados

Dependiendo de la arquitectura de despliegue que elijas (ver Sección 3):

1. **IIS URL Rewrite Module 2.1:** (Obligatorio para rutas SPA y Reverse Proxy)  
   Descargar desde: [Microsoft URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
2. **Application Request Routing (ARR) 3.0:** (Requerido para Reverse Proxy)  
   Descargar desde: [Microsoft ARR](https://www.iis.net/downloads/microsoft/application-request-routing)  
   *Nota:* En el Administrador de IIS, entrar en **Application Request Routing > Server Proxy Settings > Enable proxy**.
3. **iisnode (x64):** (Opcional si se ejecuta Node.js nativamente dentro del proceso de IIS)  
   Descargar desde: [iisnode releases en GitHub](https://github.com/Azure/iisnode/releases)

---

## 3. Arquitecturas de Despliegue en IIS Disponibles

El proyecto incluye soporte listo y probado para **3 modalidades**:

### Opción A (Recomendada en Producción): Reverse Proxy con IIS + URL Rewrite & ARR
* **Cómo opera:** Node.js ejecuta el servidor de producción optimizado (`server.cjs` o `server.mjs`) escuchando localmente en un puerto interno (ej. `3000`). IIS actúa como proxy frontal inverso en el puerto `80` (HTTP) o `443` (HTTPS).
* **Ventajas:** Máximo aislamiento, estabilidad, fácil renovación de certificados SSL en IIS y compresión nativa.
* **Archivo de configuración:** `iis/web.reverse-proxy.config` (copiado a la raíz como `web.config`).

### Opción B: Hosting Integrado con iisnode
* **Cómo opera:** IIS gestiona el ciclo de vida de los procesos Node.js a través del Application Pool mediante Named Pipes y el handler `iisnode`.
* **Ventajas:** No requiere mantener un proceso de Node.js independiente como servicio de Windows.
* **Archivo de configuración:** `iis/web.iisnode.config` o el `web.config` raíz.

### Opción C: Static SPA Hosting en `dist/`
* **Cómo opera:** Si el backend Java Spring Boot corre de forma independiente en el puerto `8080`, IIS sirve directamente la carpeta compilada `dist/` con reescritura hacia `index.html` y proxy inverso en `/api` hacia `http://localhost:8080/api`.
* **Archivo de configuración:** `dist/web.config`.

---

## 4. Script Reproducible de Compilación y Despliegue (`deploy-iis.ps1`)

En lugar de procesos manuales propensos a errores, se incluye el script automatizado:
📁 **[scripts/deploy-iis.ps1](file:///c:/Users/Willy/Desktop/Repositorios/Mantenimiento/scripts/deploy-iis.ps1)**

### 4.1 Comandos de Ejecución

Abre una terminal de PowerShell como **Administrador** en la raíz del proyecto y ejecuta:

```powershell
# Despliegue estándar como Reverse Proxy en puerto 8081 (o el puerto deseado)
.\scripts\deploy-iis.ps1 -Port 8081 -DeploymentMode ReverseProxy

# O despliegue nativo con iisnode
.\scripts\deploy-iis.ps1 -Port 8081 -DeploymentMode iisnode

# O mediante el comando npm configurado:
npm.cmd run deploy:iis
```

### 4.2 Lo que realiza el script automáticamente:
1. Comprueba privilegios administrativos.
2. Ejecuta `npm.cmd run build` (compila Vite a `dist/`).
3. Ejecuta `npm.cmd run build:server` (empaqueta el servidor con `esbuild` en `server.cjs` y `server.mjs`).
4. Asigna permisos NTFS recursivos al grupo `IIS_IUSRS` y al usuario `IUSR`.
5. Crea o actualiza el **Application Pool** (`MantenimientoPool`) configurado sin código administrado (`No Managed Code`).
6. Crea o reasigna el **Sitio Web en IIS** (`MantenimientoApp`) con el enlace y puerto asignados.
7. Comprueba la disponibilidad del servicio.

---

## 5. Configuración Manual Paso a Paso en el Administrador de IIS

Si prefieres realizar el procedimiento mediante la interfaz gráfica del **Administrador de Internet Information Services (inetmgr)**:

### Paso 1: Compilar la Aplicación
```powershell
npm.cmd run build
npm.cmd run build:server
```

### Paso 2: Crear el Application Pool
1. Abre `inetmgr` (Tecla Windows + R > escribe `inetmgr` > Enter).
2. En el panel izquierdo, haz clic en **Grupos de aplicaciones (Application Pools)**.
3. Clic en **Agregar grupo de aplicaciones**:
   * **Nombre:** `MantenimientoPool`
   * **Versión de .NET CLR:** `Sin código administrado` (No Managed Code)
   * **Modo de canalización administrada:** `Integrada` (Integrated)
4. En **Configuración avanzada** del pool:
   * **Identidad:** `ApplicationPoolIdentity` (o un usuario de servicio con permisos).

### Paso 3: Crear el Sitio Web en IIS
1. En el panel izquierdo, clic derecho en **Sitios** > **Agregar sitio web...**.
2. **Nombre del sitio:** `MantenimientoApp`.
3. **Grupo de aplicaciones:** Selecciona `MantenimientoPool`.
4. **Ruta de acceso física:** Selecciona la carpeta raíz del repositorio:  
   `C:\Users\Willy\Desktop\Repositorios\Mantenimiento` (o `C:\inetpub\wwwroot\Mantenimiento` en un servidor dedicado).
5. **Enlace:**
   * **Tipo:** `http`
   * **Dirección IP:** `Todas las no asignadas`
   * **Puerto:** `80` (o `8081` si el 80 ya está asignado al *Default Web Site*).
6. Clic en **Aceptar**.

### Paso 4: Permisos de Carpeta (Seguridad NTFS)
1. Clic derecho en la carpeta del proyecto en el Explorador de Windows > **Propiedades** > pestaña **Seguridad**.
2. Clic en **Editar...** > **Agregar...**.
3. Escribe `IIS_IUSRS` y clic en **Comprobar nombres** > Aceptar.
4. Otorga permisos de **Lectura y ejecución**, **Mostrar el contenido de la carpeta** y **Lectura**.
5. Repite el paso para `IUSR`.

---

## 6. Variables de Entorno y Configuración de Producción

En producción bajo IIS, las variables de entorno se leen desde el archivo local `.env`:

* **`PORT`:** Puerto de escucha interno para el proceso Node (por defecto `3000`). En modo `iisnode`, IIS inyecta automáticamente una Named Pipe.
* **`GEMINI_API_KEY`:** Clave para las funciones de IA multimodal y análisis asistido.
* **`APP_URL`:** URL pública externa del sitio en IIS (ej: `http://servidor-mantenimiento.empresa.local` o `http://localhost:8081`).

---

## 7. Verificación del Despliegue y Pruebas de Humo

Una vez aprovisionado el sitio en IIS, verifica el funcionamiento correcto:

1. **Frontend SPA:** Abre en el navegador `http://localhost:8081/`.
   * Comprueba que cargue la interfaz, la navegación por pestañas y el cambio de idioma.
2. **API Health Check:**
   ```powershell
   curl http://localhost:8081/api/health
   ```
   * *Respuesta esperada:* `{"status":"UP","service":"solicitudes-mantenimiento-api",...}` (HTTP 200).
3. **Rutas Protegidas y RBAC:**
   ```powershell
   curl http://localhost:8081/api/estados
   ```
   * *Respuesta esperada:* Listado JSON con los 6 estados del ciclo de vida.
4. **Recarga de rutas directas (Deep Linking en SPA):**
   * Accede directamente a `http://localhost:8081/solicitudes` y recarga con F5.
   * La regla de reescritura de IIS debe entregar `index.html` sin arrojar un error HTTP 404 de IIS.

---

## 8. Procedimiento de Actualización Futura (Pipeline de Release)

Para desplegar una nueva versión del software en el servidor IIS:

```powershell
# 1. Obtener los últimos cambios de Git
git pull origin main

# 2. Instalar dependencias si hubo cambios en package.json
npm.cmd install --legacy-peer-deps

# 3. Recompilar artefactos de frontend y backend
npm.cmd run build
npm.cmd run build:server

# 4. Reiniciar el Application Pool de IIS para purgar la caché y recargar módulos
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" recycle apppool /apppool.name:"MantenimientoPool"
```

El reinicio del Application Pool no interrumpe el servicio por más de 1 a 2 segundos gracias a la rotación de procesos de trabajo (*Worker Processes*) de IIS.

---

## 9. Preguntas Frecuentes y Solución de Errores Comunes en IIS

### Error HTTP 500.19 (Código de Error: `0x8007000d` / Módulo: `IIS Web Core`)
* **Síntoma:** Al abrir `http://localhost:8081` en el navegador aparece la pantalla roja:  
  `Error HTTP 500.19 - Internal Server Error`  
  `No se puede obtener acceso a la página solicitada porque los datos de configuración relacionados de la página no son válidos.`  
  `Código de error: 0x8007000d`  
  `Archivo de configuración: \\?\...\web.config`
* **Causa:** IIS Web Core no reconoce la etiqueta `<rewrite>` porque el módulo oficial **IIS URL Rewrite Module** aún no está instalado en el servidor Windows.
* **Solución Rápida (1 minuto):**
  1. Ejecuta el script asistente para instalar el módulo oficial con elevación:
     ```powershell
     npm.cmd run install:rewrite
     ```
  2. O instala manualmente el paquete oficial ya descargado en tu sistema:  
     Doble clic en `C:\Users\Willy\AppData\Local\Temp\rewrite_amd64_es-ES.msi` (o descárgalo desde [Microsoft IIS URL Rewrite](https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_es-ES.msi)).
  3. Abre una terminal como Administrador y reinicia IIS:
     ```powershell
     iisreset
     ```
  4. Recarga `http://localhost:8081/` en tu navegador.
* **Solución Alternativa (Sin instalar ningún módulo externo):**
  Si estás en un entorno restringido donde no puedes instalar extensiones en IIS, utiliza la plantilla nativa [iis/web.native-no-modules.config](file:///c:/Users/Willy/Desktop/Repositorios/Mantenimiento/iis/web.native-no-modules.config):
  ```powershell
  Copy-Item iis\web.native-no-modules.config web.config -Force
  iisreset
  ```
