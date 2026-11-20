import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env si existe
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

interface TestRunResult {
  passed: boolean;
  code: number;
  stdout: string;
  stderr: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  branch: string;
}

function getGitBranch(): string {
  try {
    const headFile = resolve(process.cwd(), '.git/HEAD');
    if (existsSync(headFile)) {
      const content = readFileSync(headFile, 'utf8').trim();
      if (content.startsWith('ref: refs/heads/')) {
        return content.replace('ref: refs/heads/', '');
      }
    }
  } catch {
    // Si falla la lectura manual, fallback a variable de entorno o desconocido
  }
  return process.env.GIT_BRANCH || process.env.BRANCH_NAME || 'qa';
}

async function runLocalTestSuite(): Promise<TestRunResult> {
  const branch = getGitBranch();
  console.log(`\n=============================================================`);
  console.log(`🤖 [Jules QA Service] Iniciando ejecución de pruebas locales`);
  console.log(`🌿 Rama activa: ${branch}`);
  console.log(`=============================================================\n`);

  return new Promise((resolveResult) => {
    const isWindows = process.platform === 'win32';
    const child = isWindows
      ? spawn('cmd.exe', ['/c', 'npx', 'tsx', '--test', 'tests/rbac.test.ts', 'tests/integration.test.ts'], {
          cwd: process.cwd(),
          env: { ...process.env },
          stdio: ['inherit', 'pipe', 'pipe'],
        })
      : spawn('npx', ['tsx', '--test', 'tests/rbac.test.ts', 'tests/integration.test.ts'], {
          cwd: process.cwd(),
          env: { ...process.env },
          stdio: ['inherit', 'pipe', 'pipe'],
        });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      process.stdout.write(str);
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      process.stderr.write(str);
    });

    child.on('close', (code) => {
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;
      let durationMs = 0;

      const totalMatch = stdout.match(/ℹ tests (\d+)/);
      if (totalMatch) totalTests = parseInt(totalMatch[1], 10);

      const passMatch = stdout.match(/ℹ pass (\d+)/);
      if (passMatch) passedTests = parseInt(passMatch[1], 10);

      const failMatch = stdout.match(/ℹ fail (\d+)/);
      if (failMatch) failedTests = parseInt(failMatch[1], 10);

      const durationMatch = stdout.match(/ℹ duration_ms ([\d.]+)/);
      if (durationMatch) durationMs = parseFloat(durationMatch[1]);

      resolveResult({
        passed: code === 0,
        code: code ?? 1,
        stdout,
        stderr,
        totalTests,
        passedTests,
        failedTests,
        durationMs,
        branch,
      });
    });
  });
}

async function reportToJules(testResult: TestRunResult): Promise<void> {
  const apiKey = process.env.JULES_API_KEY;

  console.log(`\n-------------------------------------------------------------`);
  console.log(`📊 [Jules QA Summary] Resumen de Resultados`);
  console.log(`-------------------------------------------------------------`);
  console.log(`• Rama evaluada: ${testResult.branch}`);
  console.log(`• Total de pruebas: ${testResult.totalTests}`);
  console.log(`• Pruebas exitosas: ${testResult.passedTests}`);
  console.log(`• Pruebas fallidas: ${testResult.failedTests}`);
  console.log(`• Tiempo de ejecución: ${testResult.durationMs.toFixed(2)} ms`);
  console.log(`• Veredicto: ${testResult.passed ? '✅ APROBADO' : '❌ FALLÓ'}`);
  console.log(`-------------------------------------------------------------\n`);

  if (!apiKey || apiKey === 'MY_JULES_API_KEY') {
    console.log(
      `ℹ️  [Jules SDK]: JULES_API_KEY no está configurada en .env.`
    );
    console.log(
      `   Las pruebas se completaron localmente de forma satisfactoria.`
    );
    console.log(
      `   Para habilitar la sesión remota/triage autónomo con Jules Cloud, añade en tu .env:`
    );
    console.log(`   JULES_API_KEY="tu_clave_de_jules"\n`);
    return;
  }

  try {
    console.log(`📡 [Jules SDK]: Conectando con el servicio de Jules...`);
    const { jules } = await import('@google/jules-sdk');

    const prompt = `Reporte de Pruebas QA para la rama '${testResult.branch}':
- Total de Pruebas: ${testResult.totalTests}
- Exitosas: ${testResult.passedTests}
- Fallidas: ${testResult.failedTests}
- Duración: ${testResult.durationMs}ms
- Estado general: ${testResult.passed ? 'EXITOSO' : 'FALLO DETECTADO'}

Salida de ejecución:
${testResult.stdout.slice(-1500)}

${
  testResult.passed
    ? 'Todas las pruebas de control de acceso RBAC y reglas de dominio pasaron correctamente. Genera un dictamen QA formal de aprobación.'
    : 'Se detectaron fallos en las pruebas. Realiza un triage detallado de las causas raíz y sugiere o genera el plan de corrección.'
}`;

    const session = await jules.session({
      prompt,
      autoPr: false,
    });

    console.log(`✅ [Jules SDK]: Sesión de triage registrada exitosamente.`);
    console.log(`   ID de Sesión: ${session.id || 'activa'}`);
  } catch (error: any) {
    console.warn(
      `⚠️  [Jules SDK]: No se pudo contactar la API de Jules Cloud (${error?.message || error}).`
    );
    console.warn(
      `   La ejecución de pruebas local se completó correctamente sin depender del servicio remoto.`
    );
  }
}

async function main() {
  const result = await runLocalTestSuite();
  await reportToJules(result);

  if (!result.passed) {
    process.exit(result.code);
  }
}

main().catch((err) => {
  console.error('Error fatal ejecutando Jules QA Runner:', err);
  process.exit(1);
});
