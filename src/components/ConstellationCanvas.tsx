import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

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
          <linearGradient
            id="dala-brand-grad"
            x1="0"
            y1="0"
            x2="24"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#8052ff" />
            <stop offset="100%" stopColor="#15846e" />
          </linearGradient>
        </defs>
        <polygon
          points="12,2 22,20 2,20"
          stroke="url(#dala-brand-grad)"
          strokeWidth="1.75"
          fill="none"
        />
        <polygon
          points="12,8 17,18 7,18"
          fill="url(#dala-brand-grad)"
          fillOpacity="0.85"
        />
      </svg>
      <span className="text-[14px] font-semibold uppercase tracking-[0.35px] text-bone-white group-hover:text-silver-mist transition-colors whitespace-nowrap">
        Mantenimiento
      </span>
    </button>
  );
}

/**
 * Node kinds in the constellation mesh:
 * - 'triangle': Original signature Dala triangle (majority of the mesh, ~62%)
 * - 'tool-*': Maintenance tools (~20% of the mesh: wrench, screwdriver, gear, spanner-nut)
 * - 'geo-*': Distinct 3D geometric shapes (~18% of the mesh: octahedron, cube, hex-prism, orbital-ring)
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
  baseX: number;
  baseY: number;
  size: number;
  angle: number;
  spin: number;
  tiltX: number;
  tiltY: number;
  spinX: number;
  spinY: number;
  color: string;
  alpha: number;
  phase: number;
  kind: ConstellationNodeKind;
  hasSupportRing: boolean;
  // Smooth localized zoom state
  currentScale: number;
  currentPushX: number;
  currentPushY: number;
  currentAlpha: number;
  zoomInfluence: number;
  // Three.js scene object reference (when WebGL is active)
  object3D?: THREE.Group;
  materials?: THREE.Material[];
}

interface SupportLink {
  fromIndex: number;
  toIndex: number;
  line3D?: THREE.Line;
  lineMat?: THREE.LineBasicMaterial;
}

const PALETTE = ['#8052ff', '#ffb829', '#15846e', '#ffffff'];

/** Radius in CSS pixels for the localized cursor zoom effect */
const LOCAL_ZOOM_RADIUS_PX = 115;
/** Maximum scale amplification at the exact center of the cursor lens */
const MAX_LOCAL_ZOOM_SCALE = 2.6;

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
 * Deterministic selection of node kind so the constellation preserves ~62% original triangles,
 * ~20% recognizable maintenance tools, and ~18% distinct 3D geometric shapes.
 */
function pickNodeKind(
  index: number,
  mode: 'constellation' | 'ambient'
): ConstellationNodeKind {
  if (mode === 'ambient') {
    return index % 7 === 0 ? 'geo-octahedron' : 'triangle';
  }
  // Deterministic hash in [0..99]
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
 * for each node kind so Three.js LineSegments can render crisp wireframe tools,
 * 3D polyhedra, and triangles.
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
      [0.86, -0.5, 0],
      [-0.86, -0.5, 0],
    ]);
    return segs;
  }

  if (kind === 'tool-wrench') {
    // Recognizable double-ended open wrench silhouette + inner grip slot
    const wrenchOutline: Array<[number, number, number]> = [
      [-0.22, 0.55, 0],
      [-0.58, 0.82, 0],
      [-0.62, 1.28, 0],
      [-0.28, 1.52, 0],
      [-0.28, 1.05, 0],
      [0.28, 1.05, 0],
      [0.28, 1.52, 0],
      [0.62, 1.28, 0],
      [0.58, 0.82, 0],
      [0.22, 0.55, 0],
      [0.22, -0.55, 0],
      [0.54, -0.82, 0],
      [0.58, -1.24, 0],
      [0.24, -1.46, 0],
      [0.24, -1.02, 0],
      [-0.24, -1.02, 0],
      [-0.24, -1.46, 0],
      [-0.58, -1.24, 0],
      [-0.54, -0.82, 0],
      [-0.22, -0.55, 0],
    ];
    addLoop(wrenchOutline);
    // Calibration slot inside the handle
    addLine(0, 0.38, 0.05, 0, -0.38, 0.05);
    return segs;
  }

  if (kind === 'tool-screwdriver') {
    // Ergonomic handle + bolster collar + shaft + flathead tip
    addLoop([
      [-0.38, -1.45, 0],
      [0.38, -1.45, 0],
      [0.46, -0.52, 0],
      [-0.46, -0.52, 0],
    ]);
    // Handle grip ribs
    addLine(-0.2, -1.32, 0.04, -0.2, -0.62, 0.04);
    addLine(0.2, -1.32, 0.04, 0.2, -0.62, 0.04);
    // Bolster collar
    addLoop([
      [-0.54, -0.52, 0],
      [0.54, -0.52, 0],
      [0.54, -0.34, 0],
      [-0.54, -0.34, 0],
    ]);
    // Steel shaft
    addLine(-0.12, -0.34, 0, -0.12, 0.95, 0);
    addLine(0.12, -0.34, 0, 0.12, 0.95, 0);
    // Precision flathead wedge tip
    addLoop([
      [-0.12, 0.95, 0],
      [0.12, 0.95, 0],
      [0.28, 1.48, 0],
      [-0.28, 1.48, 0],
    ]);
    return segs;
  }

  if (kind === 'tool-gear') {
    // 8-tooth mechanical maintenance gear + inner hub + cross spokes
    const teeth = 8;
    const steps = teeth * 4;
    const outerPts: Array<[number, number, number]> = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const mod = i % 4;
      const r = mod === 0 || mod === 1 ? 1.32 : 0.94;
      outerPts.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
    }
    addLoop(outerPts);

    const hubPts: Array<[number, number, number]> = [];
    const hubSides = 12;
    for (let i = 0; i < hubSides; i++) {
      const a = (i / hubSides) * Math.PI * 2;
      hubPts.push([Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0.06]);
    }
    addLoop(hubPts);
    addLine(-0.44, 0, 0.06, 0.44, 0, 0.06);
    addLine(0, -0.44, 0.06, 0, 0.44, 0.06);
    return segs;
  }

  if (kind === 'tool-nut') {
    // Precision hex nut + threaded inner bore + 3D depth ring
    const hexOuter: Array<[number, number, number]> = [];
    const hexBack: Array<[number, number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      hexOuter.push([Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.18]);
      hexBack.push([Math.cos(a) * 1.25, Math.sin(a) * 1.25, -0.18]);
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
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      borePts.push([Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0.18]);
    }
    addLoop(borePts);
    return segs;
  }

  if (kind === 'geo-octahedron') {
    // True 3D octahedron diamond
    const v: Array<[number, number, number]> = [
      [0, 1.32, 0],
      [0, -1.32, 0],
      [-1.12, 0, 0],
      [1.12, 0, 0],
      [0, 0, -1.12],
      [0, 0, 1.12],
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
    // True 3D isometric wireframe cube
    const s = 0.88;
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
    // Nested hexagonal prism with radial struts
    const outer: Array<[number, number, number]> = [];
    const inner: Array<[number, number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      outer.push([Math.cos(a) * 1.24, Math.sin(a) * 1.24, 0]);
      inner.push([Math.cos(a) * 0.58, Math.sin(a) * 0.58, 0.25]);
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

  // 'geo-orbital-ring': Orthogonal 3D gyroscopic rings + center diamond
  const ring1: Array<[number, number, number]> = [];
  const ring2: Array<[number, number, number]> = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring1.push([Math.cos(a) * 1.22, Math.sin(a) * 1.22, 0]);
    ring2.push([Math.cos(a) * 0.92, 0, Math.sin(a) * 0.92]);
  }
  addLoop(ring1);
  addLoop(ring2);
  addLoop([
    [0, 0.42, 0],
    [0.42, 0, 0],
    [0, -0.42, 0],
    [-0.42, 0, 0],
  ]);
  return segs;
}

/**
 * Helper to draw any node kind in the 2D Canvas fallback (or overlay).
 */
function drawNode2D(
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
  ctx.lineWidth = (1.2 + p.zoomInfluence * 0.55) * dpr;

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

  if (p.hasSupportRing || p.zoomInfluence > 0.15) {
    ctx.globalAlpha = Math.min(0.65, p.currentAlpha * (0.35 + p.zoomInfluence * 0.5));
    ctx.lineWidth = 0.85 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.48, 0, Math.PI * 0.65);
    ctx.moveTo(-s * 1.48, 0);
    ctx.arc(0, 0, s * 1.48, Math.PI, Math.PI * 1.65);
    ctx.stroke();
  }

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
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const webglCanvas = webglCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!container || !webglCanvas || !overlayCanvas) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let cssWidth = Math.max(container.clientWidth, 1);
    let cssHeight = Math.max(container.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    overlayCanvas.width = cssWidth * dpr;
    overlayCanvas.height = cssHeight * dpr;
    const overlayCtx = overlayCanvas.getContext('2d');

    // Pointer tracking state in CSS pixels relative to container
    const pointer = {
      active: false,
      targetX: cssWidth * 0.5,
      targetY: cssHeight * 0.5,
      x: cssWidth * 0.5,
      y: cssHeight * 0.5,
      lensStrength: 0,
    };

    const buildParticles = (w: number, h: number): Particle[] => {
      const count = mode === 'constellation' ? 170 : 48;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const radius = Math.min(w, h) * 0.36;
      const list: Particle[] = [];

      for (let i = 0; i < count; i++) {
        let bx: number;
        let by: number;

        if (mode === 'constellation' && i < count * 0.78) {
          // Exact original organic neural / triangular cluster shape
          const t = (i / (count * 0.78)) * Math.PI * 2;
          const r =
            radius * (0.32 + 0.68 * Math.pow(((i * 37) % 100) / 100, 0.55));
          const lobe = 1 + 0.18 * Math.sin(t * 3) + 0.1 * Math.cos(t * 2);
          bx = cx + Math.cos(t * 5.3) * r * lobe * 1.12;
          by = cy + Math.sin(t * 5.3) * r * 0.84;
        } else {
          bx = (((i * 73) % 100) / 100) * w;
          by = (((i * 41 + 19) % 100) / 100) * h;
        }

        const kind = pickNodeKind(i, mode);
        const isSpecial = kind !== 'triangle';
        // Tools and 3D geometric nodes are slightly larger so their silhouette is recognizable at a glance
        const baseSize =
          mode === 'constellation'
            ? 4 + (i % 5) * 1.6
            : 3 + (i % 4) * 1.5;
        const sizeMultiplier =
          kind.startsWith('tool-') ? 1.55 : isSpecial ? 1.32 : 1.0;

        const baseAlpha =
          mode === 'constellation'
            ? 0.35 + (i % 6) * 0.1
            : 0.16 + (i % 4) * 0.05;

        list.push({
          index: i,
          x: bx,
          y: by,
          baseX: bx,
          baseY: by,
          size: baseSize * sizeMultiplier,
          angle: (i * 0.7) % (Math.PI * 2),
          spin: (i % 2 === 0 ? 1 : -1) * 0.004,
          tiltX: isSpecial ? (i * 0.45) % Math.PI : 0,
          tiltY: isSpecial ? (i * 0.65) % Math.PI : 0,
          spinX: isSpecial ? (i % 2 === 0 ? 1 : -1) * 0.007 : 0,
          spinY: isSpecial ? (i % 3 === 0 ? 1 : -1) * 0.009 : 0,
          color: PALETTE[i % PALETTE.length],
          alpha: isSpecial ? Math.min(0.95, baseAlpha + 0.14) : baseAlpha,
          phase: i * 0.4,
          kind,
          hasSupportRing: isSpecial && i % 3 === 0,
          currentScale: 1,
          currentPushX: 0,
          currentPushY: 0,
          currentAlpha: baseAlpha,
          zoomInfluence: 0,
        });
      }
      return list;
    };

    // Build cohesive supporting filament links between transformed nodes and their nearest neighbor
    const buildSupportLinks = (pts: Particle[]): SupportLink[] => {
      if (mode !== 'constellation') return [];
      const links: SupportLink[] = [];
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].kind === 'triangle' || i % 2 !== 0) continue;
        let bestIdx = -1;
        let bestDist = 78;
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          const d = Math.hypot(
            pts[i].baseX - pts[j].baseX,
            pts[i].baseY - pts[j].baseY
          );
          if (d > 18 && d < bestDist) {
            bestDist = d;
            bestIdx = j;
          }
        }
        if (bestIdx !== -1) {
          links.push({ fromIndex: i, toIndex: bestIdx });
        }
      }
      return links;
    };

    let particles = buildParticles(cssWidth, cssHeight);
    let supportLinks = buildSupportLinks(particles);

    // Optional Three.js WebGL setup
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    let rootGroup: THREE.Group | null = null;
    const disposables: Array<{ dispose: () => void }> = [];

    if (isWebGLAvailable()) {
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: webglCanvas,
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        });
        renderer.setPixelRatio(dpr);
        renderer.setSize(cssWidth, cssHeight, false);

        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(
          -cssWidth / 2,
          cssWidth / 2,
          cssHeight / 2,
          -cssHeight / 2,
          -600,
          600
        );
        camera.position.set(0, 0, 200);
        rootGroup = new THREE.Group();
        scene.add(rootGroup);
      } catch {
        renderer = null;
      }
    }

    // Shared unit geometries per kind in Three.js
    const geometryCache = new Map<ConstellationNodeKind, THREE.BufferGeometry>();
    let supportArcGeo: THREE.BufferGeometry | null = null;

    const getGeometryForKind = (
      kind: ConstellationNodeKind
    ): THREE.BufferGeometry => {
      const existing = geometryCache.get(kind);
      if (existing) return existing;
      const segs = buildUnitSegmentsForKind(kind);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(segs, 3)
      );
      disposables.push(geo);
      geometryCache.set(kind, geo);
      return geo;
    };

    const getSupportArcGeometry = (): THREE.BufferGeometry => {
      if (supportArcGeo) return supportArcGeo;
      const pts: number[] = [];
      const arcSteps = 10;
      for (const offsetAngle of [0, Math.PI]) {
        for (let s = 0; s < arcSteps; s++) {
          const a1 = offsetAngle + (s / arcSteps) * Math.PI * 0.62;
          const a2 = offsetAngle + ((s + 1) / arcSteps) * Math.PI * 0.62;
          pts.push(
            Math.cos(a1) * 1.48,
            Math.sin(a1) * 1.48,
            0,
            Math.cos(a2) * 1.48,
            Math.sin(a2) * 1.48,
            0
          );
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      disposables.push(geo);
      supportArcGeo = geo;
      return geo;
    };

    const populateThreeScene = () => {
      if (!renderer || !scene || !rootGroup) return;
      while (rootGroup.children.length > 0) {
        rootGroup.remove(rootGroup.children[0]);
      }

      // Create 3D support filaments
      for (const link of supportLinks) {
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute([0, 0, -4, 0, 0, -4], 3)
        );
        const lineMat = new THREE.LineBasicMaterial({
          color: particles[link.fromIndex].color,
          transparent: true,
          opacity: 0.14,
        });
        disposables.push(lineGeo, lineMat);
        const line = new THREE.Line(lineGeo, lineMat);
        link.line3D = line;
        link.lineMat = lineMat;
        rootGroup.add(line);
      }

      // Create 3D node groups for every particle (triangles, maintenance tools, and 3D shapes)
      for (const p of particles) {
        const group = new THREE.Group();
        const mats: THREE.Material[] = [];

        const mainMat = new THREE.LineBasicMaterial({
          color: p.color,
          transparent: true,
          opacity: p.alpha,
        });
        disposables.push(mainMat);
        mats.push(mainMat);

        const mainLines = new THREE.LineSegments(
          getGeometryForKind(p.kind),
          mainMat
        );
        group.add(mainLines);

        // Add subtle inner core fill for maintenance tools & 3D shapes so they stand out cleanly
        if (p.kind !== 'triangle') {
          const coreGeo = new THREE.OctahedronGeometry(0.32, 0);
          const coreMat = new THREE.MeshBasicMaterial({
            color: p.color,
            transparent: true,
            opacity: p.alpha * 0.28,
          });
          disposables.push(coreGeo, coreMat);
          mats.push(coreMat);
          group.add(new THREE.Mesh(coreGeo, coreMat));
        }

        // Optional precision bracket ring around select transformed tools/shapes
        if (p.hasSupportRing) {
          const ringMat = new THREE.LineBasicMaterial({
            color: p.color,
            transparent: true,
            opacity: p.alpha * 0.45,
          });
          disposables.push(ringMat);
          mats.push(ringMat);
          const ringLines = new THREE.LineSegments(
            getSupportArcGeometry(),
            ringMat
          );
          group.add(ringLines);
        }

        p.object3D = group;
        p.materials = mats;
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
      tick += 0.012;

      // Smoothly interpolate pointer coordinates & lens strength
      pointer.x += (pointer.targetX - pointer.x) * 0.18;
      pointer.y += (pointer.targetY - pointer.y) * 0.18;
      const targetLens = pointer.active && mode === 'constellation' ? 1 : 0;
      pointer.lensStrength += (targetLens - pointer.lensStrength) * 0.14;

      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x = p.baseX + Math.sin(tick + p.phase) * 6;
          p.y = p.baseY + Math.cos(tick * 0.8 + p.phase) * 6;
          p.angle += p.spin;
          p.tiltX += p.spinX;
          p.tiltY += p.spinY;
        }

        // Compute localized zoom influence strictly inside LOCAL_ZOOM_RADIUS_PX
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
            // Smoothstep falloff so the boundary of the localized zoom is seamless
            const smooth = t * t * (3 - 2 * t) * pointer.lensStrength;
            targetInfluence = smooth;
            targetScale = 1 + smooth * (MAX_LOCAL_ZOOM_SCALE - 1);
            targetAlpha = Math.min(1, p.alpha + smooth * 0.45);

            // Optical magnifying lens radial push within the localized radius
            if (dist > 0.5) {
              const pushMag = Math.sin(t * Math.PI) * 11 * pointer.lensStrength;
              targetPushX = (dx / dist) * pushMag;
              targetPushY = (dy / dist) * pushMag;
            }
          }
        }

        p.currentScale += (targetScale - p.currentScale) * 0.16;
        p.currentPushX += (targetPushX - p.currentPushX) * 0.16;
        p.currentPushY += (targetPushY - p.currentPushY) * 0.16;
        p.currentAlpha += (targetAlpha - p.currentAlpha) * 0.16;
        p.zoomInfluence += (targetInfluence - p.zoomInfluence) * 0.16;

        if (p.object3D) {
          const worldX = p.x + p.currentPushX - cssWidth * 0.5;
          const worldY = cssHeight * 0.5 - (p.y + p.currentPushY);
          const worldZ = p.zoomInfluence * 35;

          p.object3D.position.set(worldX, worldY, worldZ);
          p.object3D.rotation.set(
            p.tiltX,
            p.tiltY,
            -p.angle - p.zoomInfluence * 0.35
          );
          const s = p.size * p.currentScale;
          p.object3D.scale.set(s, s, s);

          if (p.materials) {
            const mainMat = p.materials[0] as THREE.LineBasicMaterial;
            mainMat.opacity = p.currentAlpha;
            if (p.materials[1]) {
              (p.materials[1] as THREE.MeshBasicMaterial).opacity =
                p.currentAlpha * (0.28 + p.zoomInfluence * 0.25);
            }
          }
        }
      }

      // Update 3D supporting filaments
      if (renderer && scene && camera) {
        for (const link of supportLinks) {
          if (!link.line3D || !link.lineMat) continue;
          const a = particles[link.fromIndex];
          const b = particles[link.toIndex];
          const posAttr = link.line3D.geometry.getAttribute(
            'position'
          ) as THREE.BufferAttribute;
          posAttr.setXYZ(
            0,
            a.x + a.currentPushX - cssWidth * 0.5,
            cssHeight * 0.5 - (a.y + a.currentPushY),
            -4
          );
          posAttr.setXYZ(
            1,
            b.x + b.currentPushX - cssWidth * 0.5,
            cssHeight * 0.5 - (b.y + b.currentPushY),
            -4
          );
          posAttr.needsUpdate = true;
          const boost = Math.max(a.zoomInfluence, b.zoomInfluence);
          link.lineMat.opacity = 0.12 + boost * 0.32;
        }
        renderer.render(scene, camera);
      }

      // Render 2D overlay (subtle localized optical lens reticle on hover, or full 2D fallback if WebGL is unavailable)
      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, cssWidth * dpr, cssHeight * dpr);

        if (!renderer) {
          // 2D fallback if WebGL is disabled
          for (const link of supportLinks) {
            const a = particles[link.fromIndex];
            const b = particles[link.toIndex];
            const boost = Math.max(a.zoomInfluence, b.zoomInfluence);
            overlayCtx.save();
            overlayCtx.strokeStyle = a.color;
            overlayCtx.globalAlpha = 0.12 + boost * 0.32;
            overlayCtx.lineWidth = 0.8 * dpr;
            overlayCtx.beginPath();
            overlayCtx.moveTo(
              (a.x + a.currentPushX) * dpr,
              (a.y + a.currentPushY) * dpr
            );
            overlayCtx.lineTo(
              (b.x + b.currentPushX) * dpr,
              (b.y + b.currentPushY) * dpr
            );
            overlayCtx.stroke();
            overlayCtx.restore();
          }
          for (const p of particles) {
            drawNode2D(overlayCtx, p, dpr);
          }
        }

        // Subtle localized zoom lens ring under the cursor
        if (pointer.lensStrength > 0.01 && mode === 'constellation') {
          const lx = pointer.x * dpr;
          const ly = pointer.y * dpr;
          const lr = LOCAL_ZOOM_RADIUS_PX * dpr * (0.92 + pointer.lensStrength * 0.08);

          overlayCtx.save();
          const grad = overlayCtx.createRadialGradient(lx, ly, lr * 0.1, lx, ly, lr);
          grad.addColorStop(0, `rgba(128, 82, 255, ${0.09 * pointer.lensStrength})`);
          grad.addColorStop(0.65, `rgba(21, 132, 110, ${0.04 * pointer.lensStrength})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          overlayCtx.fillStyle = grad;
          overlayCtx.beginPath();
          overlayCtx.arc(lx, ly, lr, 0, Math.PI * 2);
          overlayCtx.fill();

          // Dashed calibration ring at the localized zoom boundary
          overlayCtx.strokeStyle = `rgba(255, 184, 41, ${0.28 * pointer.lensStrength})`;
          overlayCtx.lineWidth = 1 * dpr;
          overlayCtx.setLineDash([5 * dpr, 7 * dpr]);
          overlayCtx.beginPath();
          overlayCtx.arc(lx, ly, lr, 0, Math.PI * 2);
          overlayCtx.stroke();
          overlayCtx.restore();
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
      overlayCanvas.width = cssWidth * dpr;
      overlayCanvas.height = cssHeight * dpr;

      particles = buildParticles(cssWidth, cssHeight);
      supportLinks = buildSupportLinks(particles);

      if (renderer && camera) {
        camera.left = -cssWidth / 2;
        camera.right = cssWidth / 2;
        camera.top = cssHeight / 2;
        camera.bottom = -cssHeight / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(cssWidth, cssHeight, false);
        populateThreeScene();
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
      className={`relative select-none ${
        mode === 'constellation' ? 'cursor-crosshair' : 'pointer-events-none'
      } ${className}`}
    >
      <canvas
        ref={webglCanvasRef}
        className="w-full h-full block pointer-events-none"
      />
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />
    </div>
  );
}
