import React, { useEffect, useRef } from 'react';

export function LogoLockup({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[12px] whitespace-nowrap shrink-0 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-iris rounded-[24px] pr-2"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="dala-brand-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8052ff" />
            <stop offset="100%" stopColor="#15846e" />
          </linearGradient>
        </defs>
        <polygon points="12,2 22,20 2,20" stroke="url(#dala-brand-grad)" strokeWidth="1.75" fill="none" />
        <polygon points="12,8 17,18 7,18" fill="url(#dala-brand-grad)" fillOpacity="0.85" />
      </svg>
      <span className="text-[14px] font-semibold uppercase tracking-[0.35px] text-bone-white group-hover:text-silver-mist transition-colors whitespace-nowrap">
        Mantenimiento
      </span>
    </button>
  );
}

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  angle: number;
  spin: number;
  color: string;
  alpha: number;
  phase: number;
}

const PALETTE = ['#8052ff', '#ffb829', '#15846e', '#ffffff'];

export function ConstellationCanvas({
  mode = 'constellation',
  className = '',
}: {
  mode?: 'constellation' | 'ambient';
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const buildParticles = (): Particle[] => {
      const count = mode === 'constellation' ? 170 : 48;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const radius = Math.min(width, height) * 0.36;
      const list: Particle[] = [];

      for (let i = 0; i < count; i++) {
        let bx: number;
        let by: number;

        if (mode === 'constellation' && i < count * 0.78) {
          // Organic neural / triangular cluster shape
          const t = (i / (count * 0.78)) * Math.PI * 2;
          const r = radius * (0.32 + 0.68 * Math.pow((i * 37 % 100) / 100, 0.55));
          const lobe = 1 + 0.18 * Math.sin(t * 3) + 0.1 * Math.cos(t * 2);
          bx = cx + Math.cos(t * 5.3) * r * lobe * 1.12;
          by = cy + Math.sin(t * 5.3) * r * 0.84;
        } else {
          bx = ((i * 73) % 100) / 100 * width;
          by = ((i * 41 + 19) % 100) / 100 * height;
        }

        list.push({
          x: bx,
          y: by,
          baseX: bx,
          baseY: by,
          size: (mode === 'constellation' ? 4 + (i % 5) * 1.6 : 3 + (i % 4) * 1.5) * window.devicePixelRatio,
          angle: (i * 0.7) % (Math.PI * 2),
          spin: ((i % 2 === 0 ? 1 : -1) * 0.004),
          color: PALETTE[i % PALETTE.length],
          alpha: mode === 'constellation' ? 0.35 + (i % 6) * 0.1 : 0.16 + (i % 4) * 0.05,
          phase: i * 0.4,
        });
      }
      return list;
    };

    let particles = buildParticles();
    let rafId = 0;
    let tick = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 0.012;

      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x = p.baseX + Math.sin(tick + p.phase) * 6 * window.devicePixelRatio;
          p.y = p.baseY + Math.cos(tick * 0.8 + p.phase) * 6 * window.devicePixelRatio;
          p.angle += p.spin;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.lineWidth = 1.2 * window.devicePixelRatio;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.86, p.size * 0.5);
        ctx.lineTo(-p.size * 0.86, p.size * 0.5);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      particles = buildParticles();
      if (prefersReducedMotion) draw();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  );
}
