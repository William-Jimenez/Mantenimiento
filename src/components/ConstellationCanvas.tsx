import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function LogoLockup({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-primary-text)] focus-visible:outline-offset-2 rounded-[10px] py-1 pr-2"
    >
      <span className="w-8 h-8 rounded-[9px] bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-border)] flex items-center justify-center shrink-0 transition-[background-color,border-color,transform] duration-150 group-hover:scale-[1.03]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <defs>
            <linearGradient
              id="precision-brand-grad"
              x1="2"
              y1="2"
              x2="22"
              y2="22"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <polygon
            points="12,2.5 21.5,19.5 2.5,19.5"
            stroke="url(#precision-brand-grad)"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
          <polygon
            points="12,8.5 16.8,17.2 7.2,17.2"
            fill="url(#precision-brand-grad)"
            fillOpacity="0.88"
          />
          <circle cx="12" cy="14.5" r="1.5" fill="#f59e0b" />
        </svg>
      </span>
      <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-[var(--text-primary)] group-hover:text-[var(--brand-primary-text)] transition-colors duration-150 whitespace-nowrap">
        Mantenimiento
      </span>
    </button>
  );
}

/**
 * Node kinds in the 3D field:
 * - 'triangle': Original signature Dala triangle (majority of the field)
 * - 'tool-*': Maintenance tools (wrench, screwdriver, gear, hex-nut)
 * - 'geo-*': Distinct 3D geometric shapes (octahedron, cube, hex-prism, orbital-ring)
 */
export type ConstellationNodeKind =
  | 'triangle'
  | 'tool-wrench'
  | 'tool-screwdriver'
  | 'tool-gear'
  | 'tool-nut'
  | 'geo-octahedron'
  | 'geo-cube'
  | 'geo-hex-prism'
  | 'geo-orbital-ring';

interface Particle {
  index: number;
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  angle: number;
  spin: number;
  tiltX: number;
  tiltY: number;
  spinX: number;
  spinY: number;
  freqX: number;
  freqY: number;
  ampX: number;
  ampY: number;
  phaseX: number;
  phaseY: number;
  color: string;
  alpha: number;
  kind: ConstellationNodeKind;
  // Smooth localized zoom state
  currentScale: number;
  currentPushX: number;
  currentPushY: number;
  currentAlpha: number;
  zoomInfluence: number;
  // Three.js scene object references
  object3D?: THREE.Group;
  lineMat?: THREE.LineBasicMaterial;
  fillMat?: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
}

const PALETTE = ['#8052ff', '#ffb829', '#15846e', '#ffffff'];

/** Radius in CSS pixels for the localized cursor zoom effect */
const LOCAL_ZOOM_RADIUS_PX = 110;
/** Maximum scale amplification at the center of the cursor zoom zone */
const MAX_LOCAL_ZOOM_SCALE = 2.35;

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Deterministic pseudo-random generator in [0, 1) seeded by integer index & salt
 * so every element gets an unaligned position, scale, and motion vector.
 */
function seededRandom(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Deterministic selection of node kind:
 * ~62% original triangles, ~20% maintenance tools, ~18% 3D geometric shapes.
 */
function pickNodeKind(
  index: number,
  mode: 'constellation' | 'ambient'
): ConstellationNodeKind {
  if (mode === 'ambient') {
    return index % 7 === 0 ? 'geo-octahedron' : 'triangle';
  }
  const h = (index * 37 + 13) % 100;
  if (h < 62) {
    return 'triangle';
  }
  if (h < 82) {
    const toolKinds: ConstellationNodeKind[] = [
      'tool-wrench',
      'tool-screwdriver',
      'tool-gear',
      'tool-nut',
    ];
    return toolKinds[index % toolKinds.length];
  }
  const geoKinds: ConstellationNodeKind[] = [
    'geo-octahedron',
    'geo-cube',
    'geo-hex-prism',
    'geo-orbital-ring',
  ];
  return geoKinds[index % geoKinds.length];
}

/**
 * Builds normalized (unit radius = 1) line segment vertices [x1,y1,z1, x2,y2,z2, ...]
 * with clean, refined geometry for each node kind.
 */
function buildUnitSegmentsForKind(kind: ConstellationNodeKind): number[] {
  const segs: number[] = [];
  const addLine = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number
  ) => {
    segs.push(x1, y1, z1, x2, y2, z2);
  };
  const addLoop = (pts: Array<[number, number, number]>) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      addLine(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  };

  if (kind === 'triangle') {
    addLoop([
      [0, 1.0, 0],
      [0.866, -0.5, 0],
      [-0.866, -0.5, 0],
    ]);
    return segs;
  }

  if (kind === 'tool-wrench') {
    // Sleek double-ended open wrench with 3D thickness
    const zFront = 0.08;
    const wrenchOutline: Array<[number, number, number]> = [
      [-0.18, 0.52, zFront],
      [-0.5, 0.78, zFront],
      [-0.54, 1.2, zFront],
      [-0.24, 1.42, zFront],
      [-0.24, 0.98, zFront],
      [0.24, 0.98, zFront],
      [0.24, 1.42, zFront],
      [0.54, 1.2, zFront],
      [0.5, 0.78, zFront],
      [0.18, 0.52, zFront],
      [0.18, -0.52, zFront],
      [0.46, -0.78, zFront],
      [0.5, -1.16, zFront],
      [0.22, -1.36, zFront],
      [0.22, -0.94, zFront],
      [-0.22, -0.94, zFront],
      [-0.22, -1.36, zFront],
      [-0.5, -1.16, zFront],
      [-0.46, -0.78, zFront],
      [-0.18, -0.52, zFront],
    ];
    addLoop(wrenchOutline);
    // Subtle center grip slot
    addLoop([
      [-0.06, 0.36, zFront],
      [0.06, 0.36, zFront],
      [0.06, -0.36, zFront],
      [-0.06, -0.36, zFront],
    ]);
    return segs;
  }

  if (kind === 'tool-screwdriver') {
    // Precision technical screwdriver
    addLoop([
      [-0.32, -1.35, 0],
      [0.32, -1.35, 0],
      [0.38, -0.48, 0],
      [-0.38, -0.48, 0],
    ]);
    addLine(-0.14, -1.2, 0.03, -0.14, -0.6, 0.03);
    addLine(0.14, -1.2, 0.03, 0.14, -0.6, 0.03);
    // Bolster collar
    addLoop([
      [-0.44, -0.48, 0],
      [0.44, -0.48, 0],
      [0.44, -0.32, 0],
      [-0.44, -0.32, 0],
    ]);
    // Shaft & flathead tip
    addLine(-0.09, -0.32, 0, -0.09, 0.92, 0);
    addLine(0.09, -0.32, 0, 0.09, 0.92, 0);
    addLoop([
      [-0.09, 0.92, 0],
      [0.09, 0.92, 0],
      [0.22, 1.38, 0],
      [-0.22, 1.38, 0],
    ]);
    return segs;
  }

  if (kind === 'tool-gear') {
    // Clean 8-tooth precision gear with smooth circular bore (no messy X cross)
    const teeth = 8;
    const steps = teeth * 4;
    const outerPts: Array<[number, number, number]> = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const mod = i % 4;
      const r = mod === 0 || mod === 1 ? 1.22 : 0.92;
      outerPts.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
    }
    addLoop(outerPts);

    const hubPts: Array<[number, number, number]> = [];
    const hubSides = 16;
    for (let i = 0; i < hubSides; i++) {
      const a = (i / hubSides) * Math.PI * 2;
      hubPts.push([Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.04]);
    }
    addLoop(hubPts);
    return segs;
  }

  if (kind === 'tool-nut') {
    // Clean 3D hexagonal nut with circular inner thread
    const hexOuter: Array<[number, number, number]> = [];
    const hexBack: Array<[number, number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      hexOuter.push([Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.15]);
      hexBack.push([Math.cos(a) * 1.15, Math.sin(a) * 1.15, -0.15]);
      addLine(
        hexOuter[i][0],
        hexOuter[i][1],
        hexOuter[i][2],
        hexBack[i][0],
        hexBack[i][1],
        hexBack[i][2]
      );
    }
    addLoop(hexOuter);
    addLoop(hexBack);

    const borePts: Array<[number, number, number]> = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      borePts.push([Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.15]);
    }
    addLoop(borePts);
    return segs;
  }

  if (kind === 'geo-octahedron') {
    const v: Array<[number, number, number]> = [
      [0, 1.22, 0],
      [0, -1.22, 0],
      [-1.02, 0, 0],
      [1.02, 0, 0],
      [0, 0, -1.02],
      [0, 0, 1.02],
    ];
    const edges = [
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 4],
      [4, 3],
      [3, 5],
      [5, 2],
    ];
    for (const [i1, i2] of edges) {
      addLine(v[i1][0], v[i1][1], v[i1][2], v[i2][0], v[i2][1], v[i2][2]);
    }
    return segs;
  }

  if (kind === 'geo-cube') {
    const s = 0.82;
    const v: Array<[number, number, number]> = [
      [-s, -s, -s],
      [s, -s, -s],
      [s, s, -s],
      [-s, s, -s],
      [-s, -s, s],
      [s, -s, s],
      [s, s, s],
      [-s, s, s],
    ];
    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    for (const [i1, i2] of edges) {
      addLine(v[i1][0], v[i1][1], v[i1][2], v[i2][0], v[i2][1], v[i2][2]);
    }
    return segs;
  }

  if (kind === 'geo-hex-prism') {
    const outer: Array<[number, number, number]> = [];
    const inner: Array<[number, number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      outer.push([Math.cos(a) * 1.14, Math.sin(a) * 1.14, -0.12]);
      inner.push([Math.cos(a) * 0.58, Math.sin(a) * 0.58, 0.18]);
      addLine(
        outer[i][0],
        outer[i][1],
        outer[i][2],
        inner[i][0],
        inner[i][1],
        inner[i][2]
      );
    }
    addLoop(outer);
    addLoop(inner);
    return segs;
  }

  // 'geo-orbital-ring': Clean dual gyroscopic rings
  const ring1: Array<[number, number, number]> = [];
  const ring2: Array<[number, number, number]> = [];
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring1.push([Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0]);
    ring2.push([Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82]);
  }
  addLoop(ring1);
  addLoop(ring2);
  return segs;
}

/**
 * Helper to draw any node kind in the 2D Canvas fallback when WebGL is unavailable.
 */
function drawNode2DFallback(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  dpr: number
) {
  const s = p.size * dpr * p.currentScale;
  ctx.save();
  ctx.translate(
    (p.x + p.currentPushX) * dpr,
    (p.y + p.currentPushY) * dpr
  );
  ctx.rotate(p.angle);
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;
  ctx.globalAlpha = Math.min(1, p.currentAlpha);
  ctx.lineWidth = (1.15 + p.zoomInfluence * 0.45) * dpr;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const segs = buildUnitSegmentsForKind(p.kind);
  const cosX = Math.cos(p.tiltX);
  const sinX = Math.sin(p.tiltX);
  const cosY = Math.cos(p.tiltY);
  const sinY = Math.sin(p.tiltY);

  const proj = (vx: number, vy: number, vz: number) => {
    const x1 = vx * cosY - vz * sinY;
    const z1 = vz * cosY + vx * sinY;
    const y2 = vy * cosX - z1 * sinX;
    return [x1 * s, -y2 * s] as const;
  };

  ctx.beginPath();
  for (let i = 0; i < segs.length; i += 6) {
    const [x1, y1] = proj(segs[i], segs[i + 1], segs[i + 2]);
    const [x2, y2] = proj(segs[i + 3], segs[i + 4], segs[i + 5]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.restore();
}

export function ConstellationCanvas({
  mode = 'constellation',
  className = '',
}: {
  mode?: 'constellation' | 'ambient';
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let cssWidth = Math.max(container.clientWidth, 1);
    let cssHeight = Math.max(container.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Pointer tracking state in CSS pixels relative to container (no visual ring around cursor)
    const pointer = {
      active: false,
      targetX: cssWidth * 0.5,
      targetY: cssHeight * 0.5,
      x: cssWidth * 0.5,
      y: cssHeight * 0.5,
      lensStrength: 0,
    };

    /**
     * Generates a dispersed, non-aligned random distribution across the entire area
     * using relaxed minimum-distance sampling so elements float organically without
     * forming any recognizable ring/shape and without overlapping or clipping at the edges.
     */
    const buildParticles = (w: number, h: number): Particle[] => {
      const count = mode === 'constellation' ? 112 : 44;
      const list: Particle[] = [];

      // Safe padding from container edges so no shape or zoomed shape is ever cut off
      const padX = Math.max(38, w * 0.08);
      const padY = Math.max(38, h * 0.08);
      const usableW = Math.max(w - padX * 2, 100);
      const usableH = Math.max(h - padY * 2, 100);

      // Minimum separation distance to keep tools and geometric shapes visually clean
      const minSeparation = Math.max(
        24,
        Math.min(usableW, usableH) / Math.sqrt(count * 1.45)
      );

      const placedPositions: Array<{ x: number; y: number }> = [];

      for (let i = 0; i < count; i++) {
        let bestX = padX + seededRandom(i, 1) * usableW;
        let bestY = padY + seededRandom(i, 2) * usableH;
        let bestMinDist = -1;

        // Candidate sampling to avoid overlaps while keeping distribution completely random & form-free
        const candidates = 12;
        for (let c = 0; c < candidates; c++) {
          const candX = padX + seededRandom(i * 19 + c, 3 + c) * usableW;
          const candY = padY + seededRandom(i * 19 + c, 17 + c) * usableH;

          let nearest = Infinity;
          for (const prev of placedPositions) {
            const d = Math.hypot(candX - prev.x, candY - prev.y);
            if (d < nearest) nearest = d;
          }

          if (nearest >= minSeparation) {
            bestX = candX;
            bestY = candY;
            break;
          }
          if (nearest > bestMinDist) {
            bestMinDist = nearest;
            bestX = candX;
            bestY = candY;
          }
        }

        placedPositions.push({ x: bestX, y: bestY });

        const kind = pickNodeKind(i, mode);
        const isTool = kind.startsWith('tool-');
        const isGeo = kind.startsWith('geo-');

        // Unaligned individual scale per element
        const randomScale = 0.72 + seededRandom(i, 5) * 0.68;
        const baseUnit = mode === 'constellation' ? 6.2 : 4.6;
        const kindMultiplier = isTool ? 1.38 : isGeo ? 1.22 : 0.95;
        const size = baseUnit * randomScale * kindMultiplier;

        // Unaligned 3D depth, orientation, and subtle motion parameters
        const baseZ = (seededRandom(i, 6) - 0.5) * 120;
        const angle = seededRandom(i, 7) * Math.PI * 2;
        const spinDir = seededRandom(i, 8) > 0.5 ? 1 : -1;
        const spin = spinDir * (0.0018 + seededRandom(i, 9) * 0.0042);

        const tiltX =
          isTool || isGeo
            ? (seededRandom(i, 10) - 0.5) * 0.85
            : (seededRandom(i, 10) - 0.5) * 0.35;
        const tiltY =
          isTool || isGeo
            ? (seededRandom(i, 11) - 0.5) * 0.85
            : (seededRandom(i, 11) - 0.5) * 0.35;

        const spinX =
          (seededRandom(i, 12) > 0.5 ? 1 : -1) *
          (0.002 + seededRandom(i, 13) * 0.005);
        const spinY =
          (seededRandom(i, 14) > 0.5 ? 1 : -1) *
          (0.002 + seededRandom(i, 15) * 0.005);

        const freqX = 0.55 + seededRandom(i, 16) * 0.9;
        const freqY = 0.45 + seededRandom(i, 17) * 0.85;
        const ampX = 3.5 + seededRandom(i, 18) * 6.5;
        const ampY = 3.5 + seededRandom(i, 19) * 6.5;
        const phaseX = seededRandom(i, 20) * Math.PI * 2;
        const phaseY = seededRandom(i, 21) * Math.PI * 2;

        const baseAlpha =
          mode === 'constellation'
            ? 0.38 + seededRandom(i, 22) * 0.48
            : 0.18 + seededRandom(i, 22) * 0.22;

        list.push({
          index: i,
          x: bestX,
          y: bestY,
          z: baseZ,
          baseX: bestX,
          baseY: bestY,
          baseZ,
          size,
          angle,
          spin,
          tiltX,
          tiltY,
          spinX,
          spinY,
          freqX,
          freqY,
          ampX,
          ampY,
          phaseX,
          phaseY,
          color: PALETTE[i % PALETTE.length],
          alpha: baseAlpha,
          kind,
          currentScale: 1,
          currentPushX: 0,
          currentPushY: 0,
          currentAlpha: baseAlpha,
          zoomInfluence: 0,
        });
      }
      return list;
    };

    let particles = buildParticles(cssWidth, cssHeight);

    // Three.js WebGL setup (or 2D fallback if WebGL is unavailable)
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    let rootGroup: THREE.Group | null = null;
    let cursorLight: THREE.PointLight | null = null;
    let fallbackCtx: CanvasRenderingContext2D | null = null;
    const disposables: Array<{ dispose: () => void }> = [];

    if (isWebGLAvailable()) {
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        });
        renderer.setPixelRatio(dpr);
        renderer.setSize(cssWidth, cssHeight, false);
        renderer.setClearColor(0x000000, 0);

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(
          -cssWidth / 2,
          cssWidth / 2,
          cssHeight / 2,
          -cssHeight / 2,
          -600,
          600
        );
        camera.position.set(0, 0, 240);

        // Continuous, soft 3D lighting without any hard clipping plane
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.35);
        dirLight1.position.set(180, 220, 300);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x8052ff, 0.9);
        dirLight2.position.set(-200, -160, 220);
        scene.add(dirLight2);

        cursorLight = new THREE.PointLight(0xffb829, 2.2, 260, 1.6);
        cursorLight.position.set(0, 0, 120);
        scene.add(cursorLight);

        rootGroup = new THREE.Group();
        scene.add(rootGroup);
      } catch {
        renderer = null;
      }
    }

    if (!renderer) {
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      fallbackCtx = canvas.getContext('2d');
    }

    // Shared wireframe and solid-core geometries per kind
    const lineGeoCache = new Map<ConstellationNodeKind, THREE.BufferGeometry>();
    const fillGeoCache = new Map<ConstellationNodeKind, THREE.BufferGeometry>();

    const getLineGeometry = (
      kind: ConstellationNodeKind
    ): THREE.BufferGeometry => {
      const existing = lineGeoCache.get(kind);
      if (existing) return existing;
      const segs = buildUnitSegmentsForKind(kind);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
      disposables.push(geo);
      lineGeoCache.set(kind, geo);
      return geo;
    };

    const getFillGeometry = (
      kind: ConstellationNodeKind
    ): THREE.BufferGeometry => {
      const existing = fillGeoCache.get(kind);
      if (existing) return existing;

      let geo: THREE.BufferGeometry;
      if (kind === 'triangle') {
        geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
          0, 1.0, 0,
          -0.866, -0.5, 0,
          0.866, -0.5, 0,
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();
      } else if (kind === 'geo-octahedron') {
        geo = new THREE.OctahedronGeometry(1.0, 0);
      } else if (kind === 'geo-cube') {
        geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      } else if (kind === 'geo-hex-prism' || kind === 'tool-nut') {
        geo = new THREE.CylinderGeometry(0.95, 0.95, 0.26, 6);
        geo.rotateX(Math.PI / 2);
      } else if (kind === 'tool-gear' || kind === 'geo-orbital-ring') {
        geo = new THREE.RingGeometry(0.45, 0.92, 16);
      } else {
        // Subtle handle/body bar for wrench and screwdriver
        geo = new THREE.PlaneGeometry(0.32, 1.05);
      }

      disposables.push(geo);
      fillGeoCache.set(kind, geo);
      return geo;
    };

    const populateThreeScene = () => {
      if (!renderer || !scene || !rootGroup) return;
      while (rootGroup.children.length > 0) {
        rootGroup.remove(rootGroup.children[0]);
      }

      for (const p of particles) {
        const group = new THREE.Group();

        // Crisp wireframe outline
        const lineMat = new THREE.LineBasicMaterial({
          color: p.color,
          transparent: true,
          opacity: p.alpha,
        });
        disposables.push(lineMat);

        const lineSegments = new THREE.LineSegments(
          getLineGeometry(p.kind),
          lineMat
        );
        group.add(lineSegments);

        // Cohesive translucent inner shading matching each shape's true geometry
        const fillMat = new THREE.MeshStandardMaterial({
          color: p.color,
          emissive: p.color,
          emissiveIntensity: 0.25,
          roughness: 0.35,
          metalness: 0.6,
          transparent: true,
          opacity: p.alpha * 0.16,
          side: THREE.DoubleSide,
          flatShading: true,
          depthWrite: false,
        });
        disposables.push(fillMat);

        const fillMesh = new THREE.Mesh(getFillGeometry(p.kind), fillMat);
        group.add(fillMesh);

        p.object3D = group;
        p.lineMat = lineMat;
        p.fillMat = fillMat;
        rootGroup.add(group);
      }
    };

    populateThreeScene();

    let rafId = 0;
    let tick = 0;
    let isVisible = true;
    let isSkipped = false;

    const shouldAnimate = () =>
      (!prefersReducedMotion || pointer.active || pointer.lensStrength > 0.01) &&
      isVisible &&
      !isSkipped &&
      !document.hidden;

    const draw = () => {
      rafId = 0;
      tick += 0.014;

      // Smoothly interpolate pointer coordinates & localized zoom strength
      pointer.x += (pointer.targetX - pointer.x) * 0.16;
      pointer.y += (pointer.targetY - pointer.y) * 0.16;
      const targetLens = pointer.active && mode === 'constellation' ? 1 : 0;
      pointer.lensStrength += (targetLens - pointer.lensStrength) * 0.14;

      if (cursorLight) {
        cursorLight.position.set(
          pointer.x - cssWidth * 0.5,
          cssHeight * 0.5 - pointer.y,
          90 + pointer.lensStrength * 40
        );
        cursorLight.intensity = 1.2 + pointer.lensStrength * 1.6;
      }

      for (const p of particles) {
        if (!prefersReducedMotion) {
          // Independent, unaligned subtle floating motion per element
          p.x = p.baseX + Math.sin(tick * p.freqX + p.phaseX) * p.ampX;
          p.y = p.baseY + Math.cos(tick * p.freqY + p.phaseY) * p.ampY;
          p.angle += p.spin;
          p.tiltX += p.spinX;
          p.tiltY += p.spinY;
        }

        // Localized zoom strictly within LOCAL_ZOOM_RADIUS_PX around the cursor
        let targetScale = 1.0;
        let targetPushX = 0;
        let targetPushY = 0;
        let targetAlpha = p.alpha;
        let targetInfluence = 0;

        if (pointer.lensStrength > 0.005 && mode === 'constellation') {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy);

          if (dist < LOCAL_ZOOM_RADIUS_PX) {
            const t = 1 - dist / LOCAL_ZOOM_RADIUS_PX;
            const smooth = t * t * (3 - 2 * t) * pointer.lensStrength;
            targetInfluence = smooth;
            targetScale = 1 + smooth * (MAX_LOCAL_ZOOM_SCALE - 1);
            targetAlpha = Math.min(1, p.alpha + smooth * 0.42);

            if (dist > 0.5) {
              const pushMag = Math.sin(t * Math.PI) * 9 * pointer.lensStrength;
              targetPushX = (dx / dist) * pushMag;
              targetPushY = (dy / dist) * pushMag;
            }
          }
        }

        p.currentScale += (targetScale - p.currentScale) * 0.15;
        p.currentPushX += (targetPushX - p.currentPushX) * 0.15;
        p.currentPushY += (targetPushY - p.currentPushY) * 0.15;
        p.currentAlpha += (targetAlpha - p.currentAlpha) * 0.15;
        p.zoomInfluence += (targetInfluence - p.zoomInfluence) * 0.15;

        if (p.object3D) {
          const worldX = p.x + p.currentPushX - cssWidth * 0.5;
          const worldY = cssHeight * 0.5 - (p.y + p.currentPushY);
          const worldZ = p.baseZ + p.zoomInfluence * 45;

          p.object3D.position.set(worldX, worldY, worldZ);
          p.object3D.rotation.set(
            p.tiltX,
            p.tiltY,
            -p.angle - p.zoomInfluence * 0.25
          );
          const s = p.size * p.currentScale;
          p.object3D.scale.set(s, s, s);

          if (p.lineMat) {
            p.lineMat.opacity = p.currentAlpha;
          }
          if (p.fillMat) {
            p.fillMat.opacity =
              p.currentAlpha * (0.16 + p.zoomInfluence * 0.18);
          }
        }
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      } else if (fallbackCtx) {
        fallbackCtx.clearRect(0, 0, cssWidth * dpr, cssHeight * dpr);
        for (const p of particles) {
          drawNode2DFallback(fallbackCtx, p, dpr);
        }
      }

      if (shouldAnimate()) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    const syncLoop = () => {
      if (shouldAnimate()) {
        if (rafId === 0) {
          rafId = window.requestAnimationFrame(draw);
        }
      } else if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    draw();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.targetX = e.clientX - rect.left;
      pointer.targetY = e.clientY - rect.top;
      if (!pointer.active) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }
      pointer.active = true;
      syncLoop();
    };

    const handlePointerLeave = () => {
      pointer.active = false;
      syncLoop();
    };

    const handleResize = () => {
      cssWidth = Math.max(container.clientWidth, 1);
      cssHeight = Math.max(container.clientHeight, 1);

      particles = buildParticles(cssWidth, cssHeight);

      if (renderer && camera) {
        camera.left = -cssWidth / 2;
        camera.right = cssWidth / 2;
        camera.top = cssHeight / 2;
        camera.bottom = -cssHeight / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(cssWidth, cssHeight, false);
        populateThreeScene();
      } else if (fallbackCtx) {
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
      }
      draw();
    };

    const handleContentVisibility = (event: Event) => {
      const cvEvent = event as Event & { skipped?: boolean };
      if (typeof cvEvent.skipped === 'boolean') {
        isSkipped = cvEvent.skipped;
        syncLoop();
      }
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isVisible = entry.isIntersecting;
          }
          syncLoop();
        },
        { rootMargin: '200px' }
      );
      observer.observe(container);
    }

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerenter', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', syncLoop);
    container.addEventListener(
      'contentvisibilityautostatechange',
      handleContentVisibility
    );

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      observer?.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerenter', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', syncLoop);
      container.removeEventListener(
        'contentvisibilityautostatechange',
        handleContentVisibility
      );
      disposables.forEach((d) => d.dispose());
      renderer?.dispose();
    };
  }, [mode]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`relative select-none overflow-visible ${
        mode === 'constellation' ? '' : 'pointer-events-none'
      } ${className}`}
      style={
        mode === 'constellation'
          ? {
              // Seamless edge attenuation so illumination and shapes never produce a hard cutoff line
              WebkitMaskImage:
                'radial-gradient(ellipse 94% 92% at 50% 50%, #000 74%, transparent 100%)',
              maskImage:
                'radial-gradient(ellipse 94% 92% at 50% 50%, #000 74%, transparent 100%)',
            }
          : undefined
      }
    >
      {/* Continuous, self-contained ambient illumination that fades out completely before any edge */}
      {mode === 'constellation' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(closest-side at 50% 50%, rgba(128, 82, 255, 0.08) 0%, rgba(21, 132, 110, 0.03) 45%, transparent 85%)',
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        className="relative z-10 w-full h-full block pointer-events-none"
      />
    </div>
  );
}
