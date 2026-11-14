# Guía de Puesta en Marcha y Visualización en Navegador

Este documento detalla paso a paso el proceso para instalar, configurar y levantar el servidor de desarrollo en un entorno local (Windows) para acceder a la aplicación desde el navegador.

---

## 1. Tecnologías del Proyecto

* **Lenguaje:** TypeScript / JavaScript (ES Modules)
* **Librería UI:** React 19
* **Empaquetador y Servidor de Desarrollo:** Vite 8
* **Estilos:** Tailwind CSS v4
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

### Verificación de Compilación y Tipado (Opcional)
* Comprobar tipos TypeScript:
  ```powershell
  npm.cmd run lint
  ```
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
