# Guía de Puesta en Marcha y Visualización en Navegador

Este documento detalla paso a paso el proceso para instalar, configurar y levantar el servidor de desarrollo en un entorno local (Windows) para acceder a la aplicación desde el navegador.

---

## 1. Tecnologías del Proyecto

* **Frontend:** TypeScript / JavaScript (ES Modules), React 19, Vite 8, Tailwind CSS v4
* **Backend Spring Boot (`/backend`):** Java 21, Spring Boot 3.4, Spring Data JPA (Hibernate), Spring Security + JWT (Bearer Token) + BCrypt
* **Base de Datos Relacional:** PostgreSQL 16 (`docker-compose.yml` y `backend/sql/schema-postgresql.sql`)
* **Pruebas de API y Contrato Técnico:** Contrato formal de Endpoints REST ([docs/documentacion_endpoints.md](docs/documentacion_endpoints.md)), Colección y entorno Postman (`postman/`) y Suite QA con Jules (`tests/rbac.test.ts`)
* **Librerías adicionales:** Motion (animaciones), Lucide React (iconos), Google GenAI SDK

---

## 2. Requisitos Previos

Para ejecutar este proyecto en Windows es necesario contar con:

1. **Node.js** (versión recomendada: v18 LTS, v20 LTS o superior; validado con v26.13.1).
2. **npm** (gestor de paquetes de Node, validado con v11.20.0).

### Cómo instalar Node.js en Windows
* **Opción A (Instalador oficial):** Descarga e instala la versión LTS desde [https://nodejs.org](https://nodejs.org).
* **Opción B (Línea de comandos con winget):**
  Abre PowerShell como administrador y ejecuta:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
* **Verificación:**
  Abre una terminal (PowerShell o CMD) y comprueba las versiones:
  ```powershell
  node -v
  npm.cmd -v
  ```

---

## 3. Configuración del Entorno y Variables

El proyecto utiliza variables de entorno para su integración con servicios externos.

1. Crea el archivo `.env` a partir de la plantilla `.env.example`:
   * En PowerShell:
     ```powershell
     Copy-Item .env.example .env
     ```
   * En CMD:
     ```cmd
     copy .env.example .env
     ```

2. Variables disponibles en `.env`:
   ```env
   # GEMINI_API_KEY: Requerida para funciones basadas en Inteligencia Artificial (Google Gemini).
   # Si no dispones de una clave, solicítala en Google AI Studio (https://aistudio.google.com/).
   # El resto de la interfaz y componentes funcionarán sin esta clave, pero las llamadas al modelo fallarán si no se define.
   GEMINI_API_KEY="TU_API_KEY_AQUI"

   # APP_URL: URL base donde se expone la aplicación.
   APP_URL="http://localhost:3000"
   ```

> [!NOTE]
> Las credenciales reales o API keys no deben subirse al repositorio. El archivo `.env` se encuentra ignorado por `.gitignore`.

---

## 4. Instalación de Dependencias

Debido a que `vite` v8 y `esbuild` tienen restricciones de pares estrictas en las versiones actuales del árbol de dependencias, es indispensable realizar la instalación con el parámetro `--legacy-peer-deps`.

Ejecuta en la raíz del proyecto:

```powershell
npm.cmd install --legacy-peer-deps
```
*(o `npm install --legacy-peer-deps` si tu PowerShell tiene habilitada la ejecución de scripts).*

---

## 5. Comandos de Arranque y Verificación

### Arranque en Modo Desarrollo
Ejecuta el siguiente comando:

```powershell
npm.cmd run dev
```
*(o `npm run dev`)*

El servidor se iniciará y escuchará en todas las interfaces de red (`0.0.0.0`) en el puerto **3000**.

### Verificación de Compilación, Tipado y Pruebas
* Comprobar tipos TypeScript:
  ```powershell
  npm.cmd run lint
  ```
* Ejecución de pruebas unitarias y de integración (RBAC):
  ```powershell
  npm.cmd test
  ```
* Ejecución de pruebas con el servicio local Jules (recomendado y estándar en rama `qa`):
  ```powershell
  npm.cmd run test:jules
  ```
  *(o `npm.cmd run test:qa`)*
* Construir para producción:
  ```powershell
  npm.cmd run build
  ```

---

## 6. URL y Acceso en el Navegador

Una vez que el comando `dev` indique que el servidor está listo:

* **URL principal:** [http://localhost:3000](http://localhost:3000)
* **URL de red local:** `http://<IP_LOCAL>:3000`
* **Puerto:** `3000`

Abre tu navegador web preferido (Chrome, Edge, Firefox, etc.) e ingresa a `http://localhost:3000`.

---

## 7. Preguntas Frecuentes y Solución de Problemas

### 1. Error de ejecución de scripts en PowerShell (`PSSecurityException` / `UnauthorizedAccess`)
* **Síntoma:** Al ejecutar `npm` aparece el mensaje: `No se puede cargar el archivo ... npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema`.
* **Causa:** La directiva de ejecución de scripts de PowerShell restringe la ejecución de archivos `.ps1`.
* **Solución:**
  * **Opción rápida:** Usa siempre `npm.cmd` en lugar de `npm` (por ejemplo, `npm.cmd install`, `npm.cmd run dev`).
  * **Opción permanente:** Habilita la ejecución para tu usuario ejecutando:
    ```powershell
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
    ```

### 2. Error `ERESOLVE could not resolve` al instalar
* **Síntoma:** `npm error code ERESOLVE` indicando conflicto de `esbuild` vs `vite`.
* **Solución:** Añadir la bandera `--legacy-peer-deps`:
  ```powershell
  npm.cmd install --legacy-peer-deps
  ```

### 3. El puerto 3000 ya está en uso
* **Síntoma:** Error `Error: listen EADDRINUSE: address already in use :::3000` o Vite asigna automáticamente el puerto `3001`.
* **Solución:**
  * Identificar el proceso ocupando el puerto:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
    ```
  * O detenerlo:
    ```powershell
    Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
    ```
  * O arrancar en un puerto alternativo:
    ```powershell
    npx.cmd vite --port 3001
    ```

### 4. Advertencia sobre `__dirname` al compilar
* **Síntoma:** `(!) Your Vite config uses features that are unsupported by configLoader: 'native'`.
* **Explicación:** Se debe al uso de `__dirname` en `vite.config.ts`. Es meramente un aviso informativo de compatibilidad futura en Vite y no impide el funcionamiento ni el empaquetado del proyecto.

---

## 8. Ejecución del Backend Spring Boot + PostgreSQL y Pruebas en Postman

### 1. Levantar PostgreSQL y Spring Boot con Docker Compose
En la raíz del proyecto se incluye `docker-compose.yml`, el cual levanta PostgreSQL 16 (puerto `5432`) e inicializa el esquema `backend/sql/schema-postgresql.sql`, junto con el contenedor de la API Spring Boot (puerto `8080`):

```powershell
# Levantar únicamente la base de datos PostgreSQL 16
docker compose up -d postgres

# O levantar PostgreSQL + API Spring Boot completa en contenedores
docker compose up -d --build
```

### 2. Ejecutar Spring Boot localmente con Maven (si tienes JDK 21 instalado)
```powershell
cd backend
# Conectado a PostgreSQL (perfil por defecto configurado en application.yml)
mvn spring-boot:run

# O usando el perfil local/test en memoria (sin requerir motor externo activo)
mvn spring-boot:run "-Dspring-boot.run.profiles=test"
```

### 3. Probar los Endpoints en Postman
1. Abre **Postman** y haz clic en **Import**.
2. Importa los dos archivos ubicados en la carpeta `postman/`:
   * `postman/Solicitudes_Mantenimiento_SpringBoot.postman_collection.json`
   * `postman/Solicitudes_Mantenimiento_Local.postman_environment.json`
3. Selecciona el entorno **Solicitudes Mantenimiento - Local (Spring Boot 8080)**.
4. Ejecuta primero **2. Autenticación y Roles (JWT) -> Login Administrador (Guarda Token)**. El script de Postman guardará automáticamente el token JWT en `{{jwt_token}}` y `{{admin_token}}` para probar todo el CRUD de solicitudes (`/api/solicitudes`), recursos (`/api/recursos`) y usuarios (`/api/usuarios`).
