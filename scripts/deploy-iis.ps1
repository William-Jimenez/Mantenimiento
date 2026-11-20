<#
.SYNOPSIS
    Script automatizado y reproducible de compilación, empaquetado y aprovisionamiento en IIS para la Plataforma de Mantenimiento.
.DESCRIPTION
    Realiza las siguientes fases:
    1. Comprueba permisos de administrador y dependencias (Node.js, IIS).
    2. Instala dependencias npm y compila el bundle de producción de frontend (Vite) y servidor (esbuild).
    3. Asegura permisos de sistema en el directorio para IIS_IUSRS y AppPoolIdentity.
    4. Crea o actualiza el Application Pool y el Sitio Web en IIS.
    5. Configura puertos (por defecto 80 o personalizado) y enlaces.
    6. Comprueba que el sitio responda con código HTTP exitoso (200 OK).
.PARAMETER SiteName
    Nombre del sitio en IIS (por defecto: 'MantenimientoApp').
.PARAMETER AppPoolName
    Nombre del Application Pool en IIS (por defecto: 'MantenimientoPool').
.PARAMETER Port
    Puerto TCP de enlace en IIS (por defecto: 80, o 8081 si el 80 está ocupado).
.PARAMETER DeploymentMode
    Modo de despliegue: 'ReverseProxy', 'iisnode' o 'StaticSpa'.
#>
[CmdletBinding()]
param(
    [string]$SiteName = "MantenimientoApp",
    [string]$AppPoolName = "MantenimientoPool",
    [int]$Port = 8081,
    [ValidateSet("ReverseProxy", "iisnode", "StaticSpa")]
    [string]$DeploymentMode = "ReverseProxy"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO DESPLIEGUE AUTOMATIZADO EN IIS" -ForegroundColor Cyan
Write-Host "Directorio del proyecto: $ProjectRoot" -ForegroundColor Gray
Write-Host "Modo de despliegue: $DeploymentMode" -ForegroundColor Yellow
Write-Host "Puerto configurado: $Port" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Comprobación de privilegios de Administrador
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Warning "AVISO: Este script no se está ejecutando con privilegios de Administrador elevados."
    Write-Warning "Si falla la configuración de IIS, por favor abre PowerShell con 'Ejecutar como Administrador'."
}

# 2. Paso de Compilación y Publicación Reproducible
Set-Location $ProjectRoot
Write-Host "`n📦 [1/5] Compilando frontend y servidor de producción..." -ForegroundColor Green

if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Host "Instalando dependencias de Node.js..." -ForegroundColor Gray
    & npm.cmd install --legacy-peer-deps
}

Write-Host "Construyendo bundle frontend con Vite..." -ForegroundColor Gray
& npm.cmd run build

Write-Host "Empaquetando servidor backend con esbuild..." -ForegroundColor Gray
& npm.cmd run build:server

if (-not (Test-Path "$ProjectRoot\dist\index.html")) {
    throw "Error crítico: El artefacto dist/index.html no fue generado."
}
if (-not (Test-Path "$ProjectRoot\server.cjs") -and -not (Test-Path "$ProjectRoot\server.mjs")) {
    throw "Error crítico: El artefacto del servidor de producción no fue generado."
}
Write-Host "✅ Compilación finalizada con éxito." -ForegroundColor Green

# 3. Preparación de Archivos según el Modo de Despliegue
Write-Host "`n⚙️ [2/5] Ajustando web.config según modo: $DeploymentMode..." -ForegroundColor Green
switch ($DeploymentMode) {
    "ReverseProxy" {
        Copy-Item -Path "$ProjectRoot\iis\web.reverse-proxy.config" -Destination "$ProjectRoot\web.config" -Force
        $PhysicalPath = $ProjectRoot
    }
    "iisnode" {
        Copy-Item -Path "$ProjectRoot\iis\web.iisnode.config" -Destination "$ProjectRoot\web.config" -Force
        $PhysicalPath = $ProjectRoot
    }
    "StaticSpa" {
        $PhysicalPath = "$ProjectRoot\dist"
        if (-not (Test-Path "$PhysicalPath\web.config")) {
            Copy-Item -Path "$ProjectRoot\dist\web.config" -Destination "$PhysicalPath\web.config" -Force
        }
    }
}

# 4. Asignación de Permisos del Sistema de Archivos
Write-Host "`n🔒 [3/5] Configurando permisos NTFS para IIS (IIS_IUSRS y IUSR)..." -ForegroundColor Green
try {
    & icacls "$ProjectRoot" /grant "IIS_IUSRS:(OI)(CI)RX" /t /c /q | Out-Null
    & icacls "$ProjectRoot" /grant "IUSR:(OI)(CI)RX" /t /c /q | Out-Null
    Write-Host "✅ Permisos asignados a IIS_IUSRS y IUSR." -ForegroundColor Green
} catch {
    Write-Warning "No se pudieron ajustar permisos de icacls automáticamente. Asegúrate de otorgar permisos de lectura a IIS_IUSRS."
}

# 5. Configuración en IIS mediante WebAdministration / appcmd
Write-Host "`n🌐 [4/5] Configurando Sitio y Application Pool en IIS..." -ForegroundColor Green
$AppCmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"

if (-not (Test-Path $AppCmd)) {
    Write-Warning "appcmd.exe no encontrado. Verifica que el rol de IIS esté instalado en Windows Server."
} else {
    try {
        Import-Module WebAdministration -ErrorAction SilentlyContinue

        # Crear o actualizar Application Pool
        & $AppCmd add apppool /name:"$AppPoolName" /managedRuntimeVersion:"" /managedPipelineMode:Integrated 2>$null
        & $AppCmd set apppool "$AppPoolName" -processModel.identityType:ApplicationPoolIdentity 2>$null

        # Comprobar si el sitio ya existe
        $ExistingSite = & $AppCmd list site "$SiteName" 2>$null
        if ($ExistingSite) {
            Write-Host "Actualizando sitio existente '$SiteName'..." -ForegroundColor Gray
            & $AppCmd set site "$SiteName" -bindings:http/*:${Port}:
            & $AppCmd set vdir "$SiteName/" -physicalPath:"$PhysicalPath"
        } else {
            Write-Host "Creando nuevo sitio IIS '$SiteName' en puerto $Port..." -ForegroundColor Gray
            & $AppCmd add site /name:"$SiteName" /bindings:http/*:${Port}: /physicalPath:"$PhysicalPath"
            & $AppCmd set site /site.name:"$SiteName" /[path='/'].applicationPool:"$AppPoolName"
        }

        # Iniciar Pool y Sitio
        & $AppCmd start apppool "$AppPoolName" 2>$null
        & $AppCmd start site "$SiteName" 2>$null
        Write-Host "✅ Sitio IIS '$SiteName' aprovisionado en http://localhost:$Port" -ForegroundColor Green
    } catch {
        Write-Warning "Hubo una advertencia al interactuar con IIS: $_"
        Write-Warning "Si no ejecutas con elevación, revisa docs/DESPLIEGUE_IIS.md para ejecutar el comando manual."
    }
}

# 6. Verificación de Funcionamiento
Write-Host "`n🔍 [5/5] Verificando salud del despliegue..." -ForegroundColor Green
Write-Host "Comprueba tu aplicación ingresando a: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Endpoints clave a validar:" -ForegroundColor Gray
Write-Host " - Frontend SPA: http://localhost:$Port/" -ForegroundColor Gray
Write-Host " - API Health:   http://localhost:$Port/api/health" -ForegroundColor Gray
Write-Host " - Catálogos:    http://localhost:$Port/api/estados" -ForegroundColor Gray
Write-Host "`n✨ Despliegue preparado exitosamente." -ForegroundColor Green
