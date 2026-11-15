import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { SceneVariant, ServiceScene3D } from './ServiceScene3D';

export interface NarrativeStep {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  paragraph: string;
  highlights: string[];
  variant: SceneVariant;
  accentHex: string;
  accentTextClass: string;
  hudLabel: string;
  hudMetric: string;
}

export const SERVICE_NARRATIVE_STEPS: NarrativeStep[] = [
  {
    id: 'que-es-el-servicio',
    number: '01',
    eyebrow: 'Qué es el servicio',
    title: 'Un ecosistema centralizado para la continuidad operativa.',
    paragraph:
      'Nuestra plataforma unifica la recepción, priorización y control de solicitudes de mantenimiento correctivo y preventivo en toda su organización. Desde maquinaria pesada hasta instalaciones críticas y herramientas de precisión, cada activo cuenta con una ficha viva y trazable en un solo punto de control.',
    highlights: [
      'Inventario unificado de activos',
      'Clasificación por criticidad',
      'Visibilidad corporativa 24/7',
    ],
    variant: 'core-network',
    accentHex: '#8052ff',
    accentTextClass: 'text-electric-iris',
    hudLabel: 'NÚCLEO DE ACTIVOS · RED CONECTADA',
    hudMetric: '100% Trazabilidad de recursos',
  },
  {
    id: 'como-funciona-el-reporte',
    number: '02',
    eyebrow: 'Cómo funciona',
    title: 'Diagnóstico inicial y radicación estructurada en segundos.',
    paragraph:
      'Cuando ocurre una eventualidad, cualquier colaborador autorizado registra el hallazgo seleccionando el recurso afectado, la categoría técnica del daño y adjuntando evidencia directa. El sistema valida las reglas de negocio al instante y genera un expediente único sin correos dispersos ni papeleo manual.',
    highlights: [
      'Captura guiada sin fricción',
      'Validación automática de datos',
      'Radicación inmediata en cola',
    ],
    variant: 'diagnostic-scanner',
    accentHex: '#ffb829',
    accentTextClass: 'text-saffron-spark',
    hudLabel: 'ESCÁNER DE DIAGNÓSTICO · RADICACIÓN',
    hudMetric: 'Registro estructurado de fallas',
  },
  {
    id: 'coordinacion-y-ejecucion',
    number: '03',
    eyebrow: 'Coordinación técnica',
    title: 'Asignación inteligente y análisis técnico versionado.',
    paragraph:
      'El equipo de ingeniería y mantenimiento evalúa la solicitud, asigna especialistas según su carga y especialidad, y documenta el diagnóstico de causa raíz junto con los insumos requeridos. Cada iteración del análisis queda registrada con control de versiones para mantener un historial técnico transparente.',
    highlights: [
      'Asignación por especialidad',
      'Versionado de análisis técnico',
      'Bitácora de intervención',
    ],
    variant: 'precision-gears',
    accentHex: '#15846e',
    accentTextClass: 'text-deep-verdant',
    hudLabel: 'SINCRONIZACIÓN · FLUJO TÉCNICO',
    hudMetric: 'Coordinación de especialistas',
  },
  {
    id: 'cierre-y-auditoria',
    number: '04',
    eyebrow: 'Resolución y control',
    title: 'Cierre verificado e inteligencia preventiva en tiempo real.',
    paragraph:
      'Ningún reporte se cierra sin la validación técnica correspondiente y el registro de la solución definitiva. Las métricas consolidadas permiten identificar activos con fallas recurrentes, optimizar los tiempos de respuesta y transformar las reparaciones reactivas en decisiones de mantenimiento preventivo.',
    highlights: [
      'Auditoría de cierre técnico',
      'Métricas de disponibilidad',
      'Historial por equipo y sede',
    ],
    variant: 'shield-metrics',
    accentHex: '#8052ff',
    accentTextClass: 'text-electric-iris',
    hudLabel: 'VERIFICACIÓN · INTEGRIDAD OPERATIVA',
    hudMetric: 'Ciclo de vida auditado',
  },
];

interface ServiceScrollNarrativeProps {
  onBackToLogin: () => void;
}

export function ServiceScrollNarrative({ onBackToLogin }: ServiceScrollNarrativeProps) {
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [intersectingMap, setIntersectingMap] = useState<boolean[]>(() =>
    SERVICE_NARRATIVE_STEPS.map((_, idx) => idx <= 1)
  );
  const [progressMap, setProgressMap] = useState<number[]>(() =>
    SERVICE_NARRATIVE_STEPS.map((_, idx) => (idx === 0 ? 0.35 : 0))
  );
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const supportsNativeViewTimeline =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('(animation-timeline: view()) and (animation-range: entry)');

    const prefersNoMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const thresholds = Array.from({ length: 41 }, (_, i) => i / 40);

    const observer = new IntersectionObserver(
      (entries) => {
        setIntersectingMap((prev) => {
          const next = [...prev];
          entries.forEach((entry) => {
            const indexAttr = entry.target.getAttribute('data-step-index');
            const idx = indexAttr ? Number(indexAttr) : -1;
            if (idx >= 0 && idx < next.length) {
              next[idx] = entry.isIntersecting;
            }
          });
          return next;
        });

        setProgressMap((prev) => {
          const next = [...prev];
          entries.forEach((entry) => {
            const indexAttr = entry.target.getAttribute('data-step-index');
            const idx = indexAttr ? Number(indexAttr) : -1;
            if (idx >= 0 && idx < next.length) {
              const rect = entry.boundingClientRect;
              const vh = window.innerHeight || 1;
              // Calculate normalized scroll progression through viewport (0 -> 1)
              const rawProgress = (vh - rect.top) / (vh + rect.height);
              const clamped = Math.max(0, Math.min(1, rawProgress));
              next[idx] = clamped;

                if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
                  setActiveIndex(idx);
                }

                // Fallback animation when native CSS Scroll-Driven Animations are unavailable
                if (!supportsNativeViewTimeline && !prefersNoMotion) {
                  const contentEl = entry.target.querySelector<HTMLElement>(
                    '.narrative-screen-content'
                  );
                  const stageEl = entry.target.querySelector<HTMLElement>(
                    '.narrative-stage-3d'
                  );
                  const visibility = Math.min(1, entry.intersectionRatio * 1.65);
                  if (contentEl) {
                    contentEl.style.opacity = `${0.18 + visibility * 0.82}`;
                    contentEl.style.transform = `translate3d(0, ${(1 - visibility) * 28}px, 0)`;
                  }
                  if (stageEl) {
                    stageEl.style.opacity = `${0.2 + visibility * 0.8}`;
                    stageEl.style.transform = `scale(${0.92 + visibility * 0.08})`;
                  }
                }
              }
            });
          return next;
        });
      },
      {
        threshold: thresholds,
      }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="servicio-narrativa"
      aria-label="Explicación interactiva del servicio de mantenimiento"
      className="relative bg-void text-bone-white border-t border-white/12"
    >
      {/* Consecutive full-viewport narrative screens with identical visual distribution */}
      <div className="divide-y divide-white/8">
        {SERVICE_NARRATIVE_STEPS.map((step, index) => {
          const stepProgress = progressMap[index] ?? 0;
          const isStepActive =
            Boolean(intersectingMap[index]) || Math.abs(activeIndex - index) <= 1;

          return (
            <article
              key={step.id}
              id={`pantalla-${step.id}`}
              data-step-index={index}
              ref={(el) => {
                sectionRefs.current[index] = el;
              }}
              className="narrative-screen min-h-screen flex items-center px-[18px] sm:px-[30px] py-[60px] lg:py-[96px]"
            >
              <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-[36px] lg:gap-[48px] items-center">
                {/* Left side: Uniform typography & narrative explanation */}
                <div className="narrative-screen-content lg:col-span-6 space-y-[24px]">
                  <div className="flex items-center gap-[12px]">
                    <span className={`nav-label ${step.accentTextClass}`}>
                      {step.eyebrow}
                    </span>
                  </div>

                  <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.08] tracking-[-1.68px] text-bone-white">
                    {step.title}
                  </h2>

                  <p className="body-ultralight text-silver-mist max-w-[520px]">
                    {step.paragraph}
                  </p>

                  <ul
                    aria-label={`Puntos clave de ${step.eyebrow}`}
                    className="pt-[6px] flex flex-wrap gap-[10px]"
                  >
                    {step.highlights.map((item) => (
                      <li
                        key={item}
                        className="px-[14px] py-[6px] rounded-full border border-white/12 bg-white/[0.03] text-[13px] text-ash-gray"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right side: Uniform 3D interactive canvas stage */}
                <div className="narrative-stage-3d lg:col-span-6">
                  <div className="relative h-[300px] sm:h-[360px] lg:h-[440px] w-full rounded-[24px] border border-white/12 bg-white/[0.02] overflow-hidden flex flex-col justify-between p-[18px] sm:p-[24px]">
                    {/* Top HUD metadata */}
                    <div className="relative z-10 flex items-center justify-between gap-2 text-[11px] tracking-[0.35px] uppercase text-ash-gray">
                      <span>{step.hudLabel}</span>
                    </div>

                    {/* 3D WebGL / Canvas Stage */}
                    <div className="absolute inset-0">
                      <ServiceScene3D
                        variant={step.variant}
                        scrollProgress={stepProgress}
                        isActive={isStepActive}
                        isPaused={isPaused}
                        accentColor={step.accentHex}
                      />
                    </div>

                    {/* Bottom HUD status bar */}
                    <div className="relative z-10 flex items-center justify-between gap-2 pt-[12px] border-t border-white/10 text-[12px] text-silver-mist">
                      <span className="flex items-center gap-[8px]">
                        <span
                          className="w-[8px] h-[8px] rounded-full inline-block"
                          style={{ backgroundColor: step.accentHex }}
                        />
                        {step.hudMetric}
                      </span>
                      <span className="text-ash-gray tabular-nums">
                        {Math.round(stepProgress * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom footer CTA to return smoothly to the login form */}
      <div className="border-t border-white/12 px-[18px] sm:px-[30px] py-[48px] bg-white/[0.01]">
        <div className="max-w-[1280px] w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[24px]">
          <div className="space-y-[6px]">
            <p className="nav-label text-saffron-spark">
              ¿Listo para gestionar sus solicitudes?
            </p>
            <p className="text-[24px] tracking-[-0.48px] text-bone-white">
              Inicie sesión con su cuenta corporativa en la vista principal.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-[10px] px-[24px] py-[12px] rounded-full bg-bone-white text-void font-medium text-[14px] hover:bg-silver-mist transition-colors cursor-pointer shrink-0"
          >
            <ArrowUp className="w-[16px] h-[16px]" aria-hidden="true" />
            <span>Volver al inicio de sesión</span>
          </button>
        </div>
      </div>
    </section>
  );
}
