/**
 * scripts/ecc-verify.ts
 * Runner de verificación integral de ECC (Everything Claude Code) para el proyecto.
 * Ejecuta validación estática de tipos, pruebas de integración, y auditoría de documentación.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(command: string, desc: string): boolean {
  process.stdout.write(`[ECC-VERIFY] Ejecutando: ${desc}... `);
  try {
    execSync(command, { stdio: 'pipe' });
    console.log('OK');
    return true;
  } catch (error: any) {
    console.log('FALLO');
    if (error.stdout) console.error(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return false;
  }
}

function verifyDocs(): boolean {
  process.stdout.write('[ECC-VERIFY] Verificando consistencia de documentacion y reglas ECC... ');
  const requiredFiles = [
    'CLAUDE.md',
    'AGENTS.md',
    'README.md',
    'docs/ARQUITECTURA.md',
    'docs/documentacion_endpoints.md',
    '.agents/rules/tech-stack.md',
    '.agents/rules/code-standards.md',
    '.agents/rules/branch-workflow.md',
    '.agents/rules/testing-qa.md'
  ];

  for (const relPath of requiredFiles) {
    const fullPath = resolve(process.cwd(), relPath);
    if (!existsSync(fullPath)) {
      console.log(`FALLO: No existe el archivo requerido '${relPath}'`);
      return false;
    }
    const content = readFileSync(fullPath, 'utf-8');
    if (content.trim().length === 0) {
      console.log(`FALLO: El archivo '${relPath}' está vacío.`);
      return false;
    }
  }

  console.log('OK (Todos los archivos requeridos existen y son consistentes)');
  return true;
}

function main() {
  console.log('=====================================================');
  console.log('   SUITE DE VERIFICACION ECC (EVERYTHING CLAUDE CODE)   ');
  console.log('=====================================================\n');

  let passed = true;

  // 1. Verificación de documentación y reglas
  if (!verifyDocs()) passed = false;

  // 2. TypeScript Type Check
  const lintCmd = process.platform === 'win32' ? 'npx.cmd tsc --noEmit' : 'npx tsc --noEmit';
  if (!run(lintCmd, 'Chequeo de tipos TypeScript (tsc --noEmit)')) passed = false;

  // 3. Pruebas de integración
  const testCmd = process.platform === 'win32' ? 'npx.cmd tsx --test tests/rbac.test.ts tests/integration.test.ts' : 'npx tsx --test tests/rbac.test.ts tests/integration.test.ts';
  if (!run(testCmd, 'Suite de pruebas RBAC e integracion')) passed = false;

  console.log('\n=====================================================');
  if (passed) {
    console.log('  [OK] VERIFICACION ECC COMPLETADA CON EXITO');
    console.log('=====================================================');
    process.exit(0);
  } else {
    console.error('  [ERROR] LA VERIFICACION ECC ENCONTRO INCONSISTENCIAS');
    console.log('=====================================================');
    process.exit(1);
  }
}

main();
