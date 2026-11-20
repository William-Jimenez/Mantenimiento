import { Categoria, Evidencia, Prioridad } from '../types/domain';
import {
  generarInferenciaAnalisisIa,
  validarSugerenciaIaContraCatalogo,
} from './domainRules';

export interface GeminiAnalysisParams {
  descripcion: string;
  recursoNombre: string;
  recursoCodigo: string;
  evidencias: Evidencia[];
  categorias: Categoria[];
  prioridades: Prioridad[];
  sugerenciaExterna?: {
    categoriaNombre?: string;
    prioridadNombre?: string;
  };
}

export interface GeminiAnalysisResult {
  tipoDano: string;
  descripcionObservada: string;
  categoriaSugeridaId: number | null;
  prioridadSugeridaId: number | null;
  modelo: string;
  origen: 'gemini-api' | 'fallback-reglas';
}

const PLACEHOLDER_KEYS = new Set(['', 'MY_GEMINI_API_KEY', 'TU_API_KEY_AQUI']);

export function isGeminiApiKeyConfigured(apiKey = process.env.GEMINI_API_KEY): boolean {
  const trimmed = (apiKey ?? '').trim();
  return trimmed.length > 0 && !PLACEHOLDER_KEYS.has(trimmed);
}

/**
 * Ejecuta el análisis de una solicitud de mantenimiento utilizando Google Gemini (@google/genai)
 * cuando GEMINI_API_KEY está configurada en el servidor. Si no existe clave válida, si se envía
 * `sugerenciaExterna` de pruebas, o si ocurre un fallo de red/cuota, degrada de forma segura
 * a `generarInferenciaAnalisisIa` (reglas deterministas).
 */
export async function analizarSolicitudConGemini(
  params: GeminiAnalysisParams
): Promise<GeminiAnalysisResult> {
  const fallback = (): GeminiAnalysisResult => {
    const inf = generarInferenciaAnalisisIa(
      params.descripcion,
      params.recursoNombre,
      params.recursoCodigo,
      params.evidencias.length,
      params.categorias,
      params.prioridades,
      params.sugerenciaExterna
    );
    return {
      ...inf,
      origen: 'fallback-reglas',
    };
  };

  if (params.sugerenciaExterna || !isGeminiApiKeyConfigured()) {
    return fallback();
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });

    const categoriasActivas = params.categorias
      .filter((c) => c.activa)
      .map((c) => c.nombre);
    const prioridadesDisponibles = params.prioridades.map((p) => p.nombre);

    const promptText = [
      'Eres un asistente técnico de mantenimiento industrial y corporativo.',
      'Analiza el siguiente reporte de falla y devuelve ÚNICAMENTE un objeto JSON válido con las claves:',
      '{ "tipoDano": string, "descripcionObservada": string, "categoriaNombre": string, "prioridadNombre": string }',
      `Categorías válidas: ${categoriasActivas.join(', ')}.`,
      `Prioridades válidas: ${prioridadesDisponibles.join(', ')}.`,
      `Recurso afectado: ${params.recursoNombre} (${params.recursoCodigo || 'Sin código'}).`,
      `Descripción del solicitante: ${params.descripcion}`,
      `Total de evidencias adjuntas: ${params.evidencias.length}.`,
    ].join('\n');

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [{ text: promptText }];

    // Adjuntar hasta 2 fotografías en base64 si están presentes en la solicitud
    const fotos = params.evidencias
      .filter((e) => e.tipo === 'FOTOGRAFIA' && e.dataUrl.includes(';base64,'))
      .slice(0, 2);

    for (const foto of fotos) {
      const base64Data = foto.dataUrl.split(';base64,')[1];
      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: foto.tipoMime || 'image/jpeg',
            data: base64Data,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return fallback();
    }

    const parsed = JSON.parse(rawText) as {
      tipoDano?: string;
      descripcionObservada?: string;
      categoriaNombre?: string;
      prioridadNombre?: string;
    };

    const validacion = validarSugerenciaIaContraCatalogo(
      parsed.categoriaNombre ?? null,
      parsed.prioridadNombre ?? null,
      params.categorias,
      params.prioridades
    );

    const baseFallback = fallback();
    return {
      tipoDano: parsed.tipoDano?.trim() || baseFallback.tipoDano,
      descripcionObservada:
        parsed.descripcionObservada?.trim() || baseFallback.descripcionObservada,
      categoriaSugeridaId: validacion.categoriaSugeridaId ?? baseFallback.categoriaSugeridaId,
      prioridadSugeridaId: validacion.prioridadSugeridaId ?? baseFallback.prioridadSugeridaId,
      modelo: 'gemini-2.5-flash',
      origen: 'gemini-api',
    };
  } catch (err) {
    console.warn('[Gemini AI Service] Fallback determinista activado por error externo:', err);
    return fallback();
  }
}
