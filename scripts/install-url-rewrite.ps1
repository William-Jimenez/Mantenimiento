<#
.SYNOPSIS
    Instala de forma automatizada y oficial el modulo Microsoft IIS URL Rewrite 2.1 (x64).
.DESCRIPTION
    Soluciona el error HTTP 500.19 (0x8007000d) que ocurre cuando IIS lee la etiqueta <rewrite> en web.config.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$MsiPath = "$env:TEMP\rewrite_amd64_es-ES.msi"

if (-not (Test-Path $MsiPath)) {
    Write-Host "[1/3] Descargando Microsoft IIS URL Rewrite Module 2.1..." -ForegroundColor Cyan
    $Url = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_es-ES.msi"
    (New-Object System.Net.WebClient).DownloadFile($Url, $MsiPath)
} else {
    Write-Host "[1/3] Instalador encontrado en: $MsiPath" -ForegroundColor Gray
}

Write-Host "[2/3] Ejecutando instalacion con elevacion de Administrador..." -ForegroundColor Yellow
$proc = Start-Process msiexec.exe -ArgumentList "/i `"$MsiPath`" /qn /norestart" -Wait -PassThru -Verb RunAs

Write-Host "[3/3] Reiniciando servicio de IIS (iisreset)..." -ForegroundColor Cyan
try {
    Start-Process iisreset.exe -Wait -Verb RunAs
} catch {
    Write-Warning "Si iisreset no se ejecuto automaticamente, reinicia IIS desde el Administrador de IIS."
}

Write-Host "`n[OK] Instalacion de URL Rewrite finalizada. Ya puedes acceder a http://localhost:8081" -ForegroundColor Green
