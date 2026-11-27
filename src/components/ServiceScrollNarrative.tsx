import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check } from 'lucide-react';
import { SceneVariant, ServiceScene3D } from './ServiceScene3D';
import { PrimaryButton } from './CommonUI';

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
  accentBadgeClass: string;
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
    accentHex: '#3b82f6',
    accentTextClass: 'text-[var(--brand-primary-text)]',
    accentBadgeClass:
      'bg-[var(--brand-primary-soft)] border-[var(--brand-primary-border)] text-[var(--brand-primary-text)]',
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
    accentHex: '#f59e0b',
    accentTextClass: 'text-[var(--status-warning-text)]',
    accentBadgeClass:
      'bg-[var(--status-warning-soft)] border-[var(--status-warning-border)] text-[var(--status-warning-text)]',
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
    accentHex: '#10b981',
    accentTextClass: 'text-[var(--status-success-text)]',
    accentBadgeClass:
      'bg-[var(--status-success-soft)] border-[var(--status-success-border)] text-[var(--status-success-text)]',
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
    accentHex: '#6366f1',
    accentTextClass: 'text-[var(--ai-accent-text)]',
    accentBadgeClass:
      'bg-[var(--ai-accent-soft)] border-[var(--ai-accent-border)] text-[var(--ai-accent-text)]',
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
  const [isPaused] = useState(false);

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
              const rawProgress = (vh - rect.top) / (vh + rect.height);
              const clamped = Math.max(0, Math.min(1, rawProgress));
              next[idx] = clamped;

              if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
                setActiveIndex(idx);
              }

              if (!supportsNativeViewTimeline && !prefersNoMotion) {
                const contentEl = entry.target.querySelector<HTMLElement>(
                  '.narrative-screen-content'
                );
                const stageEl = entry.target.querySelector<HTMLElement>(
                  '.narrative-stage-3d'
                );
                const visibility = Math.min(1, entry.intersectionRatio * 1.65);
                if (contentEl) {
                  contentEl.style.opacity = `${0.22 + visibility * 0.78}`;
                  contentEl.style.transform = `translate3d(0, ${(1 - visibility) * 22}px, 0)`;
                }
                if (stageEl) {
                  stageEl.style.opacity = `${0.25 + visibility * 0.75}`;
                  stageEl.style.transform = `scale(${0.94 + visibility * 0.06})`;
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
      className="relative bg-[var(--bg-canvas)] text-[var(--text-primary)] border-t border-[var(--border-subtle)]"
    >
      <div className="divide-y divide-[var(--border-subtle)]">
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
              className="narrative-screen min-h-[82vh] flex items-center px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
            >
              <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                {/* Left side: Structured editorial explanation */}
                <div className="narrative-screen-content lg:col-span-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono-code text-[12px] font-semibold px-2.5 py-1 rounded-[8px] border ${step.accentBadgeClass}`}
                    >
                      {step.number}
                    </span>
                    <span className={`nav-label ${step.accentTextClass}`}>
                      {step.eyebrow}
                    </span>
                  </div>

                  <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] leading-[1.12] tracking-[-0.025em] font-bold text-[var(--text-primary)]">
                    {step.title}
                  </h2>

                  <p className="body-readable text-[var(--text-secondary)] max-w-[540px] text-[16px]">
                    {step.paragraph}
                  </p>

                  <ul
                    aria-label={`Puntos clave de ${step.eyebrow}`}
                    className="pt-2 flex flex-wrap gap-2.5 list-none p-0"
                  >
                    {step.highlights.map((item) => (
                      <li
                        key={item}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[9px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[13px] font-medium text-[var(--text-secondary)]"
                      >
                        <Check
                          className={`w-3.5 h-3.5 shrink-0 ${step.accentTextClass}`}
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right side: Precision 3D interactive telemetry stage */}
                <div className="narrative-stage-3d lg:col-span-6">
                  <div className="surface-card technical-grid-bg relative h-[300px] sm:h-[360px] lg:h-[430px] w-full overflow-hidden flex flex-col justify-between p-4 sm:p-5">
                    {/* Top HUD metadata */}
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-[10px] bg-[var(--bg-header)] backdrop-blur-sm border border-[var(--border-subtle)] text-[11px] font-mono-code tracking-[0.04em] uppercase text-[var(--text-muted)]">
                      <span>{step.hudLabel}</span>
                      <span className="flex items-center gap-2 text-[12px] font-sans normal-case tracking-normal font-medium text-[var(--text-primary)]">
                        <span
                          className="w-2 h-2 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: step.accentHex }}
                        />
                        {step.hudMetric}
                      </span>
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
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom footer CTA to return smoothly to the login form */}
      <div className="border-t border-[var(--border-subtle)] px-4 sm:px-6 lg:px-8 py-12 bg-[var(--bg-surface)]">
        <div className="max-w-[1280px] w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <p className="nav-label text-[var(--brand-primary-text)]">
              ¿Listo para gestionar sus solicitudes?
            </p>
            <p className="font-display text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
              Inicie sesión con su cuenta corporativa en la vista principal.
            </p>
          </div>
          <PrimaryButton onClick={onBackToLogin} className="shrink-0">
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
            <span>Volver al inicio de sesión</span>
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}
