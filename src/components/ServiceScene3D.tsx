import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type SceneVariant =
  | 'core-network'
  | 'diagnostic-scanner'
  | 'precision-gears'
  | 'shield-metrics';

interface ServiceScene3DProps {
  variant: SceneVariant;
  scrollProgress: number;
  isActive: boolean;
  isPaused?: boolean;
  accentColor: string;
  className?: string;
}

const COLORS = {
  iris: 0x8052ff,
  saffron: 0xffb829,
  verdant: 0x15846e,
  bone: 0xffffff,
  silver: 0xbdbdbd,
};

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
 * Lightweight 2D Canvas isometric/perspective fallback when WebGL is unavailable.
 * Ensures graceful degradation on devices or environments without WebGL support.
 */
function renderCanvas2DFallback(
  canvas: HTMLCanvasElement,
  variant: SceneVariant,
  rotationY: number,
  rotationX: number,
  scrollProgress: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = (canvas.width = canvas.offsetWidth * dpr);
  const h = (canvas.height = canvas.offsetHeight * dpr);
  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.5;
  const scale = Math.min(w, h) * 0.28;

  const project = (x: number, y: number, z: number) => {
    // Rotate Y
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const x1 = x * cosY - z * sinY;
    const z1 = z * cosY + x * sinY;
    // Rotate X
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = z1 * cosX + y * sinX;

    const perspective = 3.2 / (3.2 - z2 * 0.45);
    return {
      px: cx + x1 * scale * perspective,
      py: cy + y2 * scale * perspective,
      depth: z2,
    };
  };

  ctx.lineWidth = 1.5 * dpr;

  if (variant === 'core-network') {
    // Octahedron + orbital nodes
    const verts: [number, number, number][] = [
      [0, -1.25, 0],
      [0, 1.25, 0],
      [-1.1, 0, 0],
      [1.1, 0, 0],
      [0, 0, -1.1],
      [0, 0, 1.1],
    ];
    const edges = [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [4, 3], [3, 5], [5, 2],
    ];
    const projected = verts.map(([x, y, z]) => project(x, y, z));

    ctx.strokeStyle = '#8052ff';
    ctx.globalAlpha = 0.8;
    for (const [a, b] of edges) {
      ctx.beginPath();
      ctx.moveTo(projected[a].px, projected[a].py);
      ctx.lineTo(projected[b].px, projected[b].py);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rotationY * 0.6;
      const p = project(Math.cos(a) * 1.45, Math.sin(a * 2) * 0.35, Math.sin(a) * 1.45);
      ctx.fillStyle = i % 2 === 0 ? '#ffb829' : '#15846e';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 3.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (variant === 'diagnostic-scanner') {
    // Technical cube + scanning plane
    const s = 0.85;
    const cubeVerts: [number, number, number][] = [
      [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
      [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
    ];
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    const proj = cubeVerts.map(([x, y, z]) => project(x, y, z));
    ctx.strokeStyle = '#ffb829';
    ctx.globalAlpha = 0.75;
    for (const [a, b] of cubeEdges) {
      ctx.beginPath();
      ctx.moveTo(proj[a].px, proj[a].py);
      ctx.lineTo(proj[b].px, proj[b].py);
      ctx.stroke();
    }
    // Scan line
    const scanY = -s + ((scrollProgress * 2) % 1) * (2 * s);
    const scanCorners = [
      project(-1.05, scanY, -1.05),
      project(1.05, scanY, -1.05),
      project(1.05, scanY, 1.05),
      project(-1.05, scanY, 1.05),
    ];
    ctx.strokeStyle = '#8052ff';
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(scanCorners[0].px, scanCorners[0].py);
    for (let i = 1; i < scanCorners.length; i++) {
      ctx.lineTo(scanCorners[i].px, scanCorners[i].py);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (variant === 'precision-gears') {
    // Dual synchronized rings in 3D
    const segments = 24;
    ctx.strokeStyle = '#15846e';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const r = i % 2 === 0 ? 1.2 : 1.02;
      const p = project(Math.cos(a) * r, Math.sin(a) * r, 0);
      if (i === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();

    ctx.strokeStyle = '#8052ff';
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const r = i % 2 === 0 ? 0.78 : 0.65;
      const p = project(Math.cos(a) * r, 0, Math.sin(a) * r);
      if (i === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();
  } else {
    // Shield pyramid + telemetry columns
    const pyramid: [number, number, number][] = [
      [0, -1.25, 0],
      [-1.0, 0.75, -1.0],
      [1.0, 0.75, -1.0],
      [1.0, 0.75, 1.0],
      [-1.0, 0.75, 1.0],
      [0, 1.35, 0],
    ];
    const pEdges = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 2], [2, 3], [3, 4], [4, 1],
      [5, 1], [5, 2], [5, 3], [5, 4],
    ];
    const proj = pyramid.map(([x, y, z]) => project(x, y, z));
    ctx.strokeStyle = '#15846e';
    ctx.globalAlpha = 0.85;
    for (const [a, b] of pEdges) {
      ctx.beginPath();
      ctx.moveTo(proj[a].px, proj[a].py);
      ctx.lineTo(proj[b].px, proj[b].py);
      ctx.stroke();
    }
  }
}

export function ServiceScene3D({
  variant,
  scrollProgress,
  isActive,
  isPaused = false,
  accentColor,
  className = '',
}: ServiceScene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(scrollProgress);
  const activeRef = useRef(isActive);
  const pausedRef = useRef(isPaused);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    progressRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    const canUseWebGL = isWebGLAvailable();
    if (!canUseWebGL) {
      setWebglSupported(false);
      renderCanvas2DFallback(
        canvas,
        variant,
        0.6 + progressRef.current * Math.PI,
        0.35,
        progressRef.current
      );
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
    } catch {
      setWebglSupported(false);
      renderCanvas2DFallback(
        canvas,
        variant,
        0.6 + progressRef.current * Math.PI,
        0.35,
        progressRef.current
      );
      return;
    }

    const isMobile = window.innerWidth < 640;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, 0.2, isMobile ? 6.2 : 5.4);

    // Ambient and directional accent lighting
    const ambientLight = new THREE.AmbientLight(COLORS.bone, 0.7);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(COLORS.iris, 3.5, 14);
    pointLight1.position.set(3, 3, 4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(COLORS.saffron, 2.8, 14);
    pointLight2.position.set(-3, -2, 3);
    scene.add(pointLight2);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const disposables: Array<{ dispose: () => void }> = [];
    const register = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    // Dynamic sub-elements to animate per variant
    let primaryMesh: THREE.Object3D | null = null;
    let secondaryMesh: THREE.Object3D | null = null;
    let tertiaryMesh: THREE.Object3D | null = null;

    if (variant === 'core-network') {
      // 01: Geodesic core + orbital asset nodes + connection ring
      const icoGeo = register(new THREE.IcosahedronGeometry(1.35, 1));
      const wireMat = register(
        new THREE.MeshBasicMaterial({
          color: COLORS.iris,
          wireframe: true,
          transparent: true,
          opacity: 0.75,
        })
      );
      const innerGeo = register(new THREE.OctahedronGeometry(0.78, 0));
      const innerMat = register(
        new THREE.MeshStandardMaterial({
          color: COLORS.iris,
          emissive: COLORS.iris,
          emissiveIntensity: 0.35,
          roughness: 0.25,
          metalness: 0.8,
          flatShading: true,
        })
      );

      primaryMesh = new THREE.Mesh(icoGeo, wireMat);
      secondaryMesh = new THREE.Mesh(innerGeo, innerMat);
      rootGroup.add(primaryMesh);
      rootGroup.add(secondaryMesh);

      // Orbital ring with asset nodes
      const orbitGroup = new THREE.Group();
      const ringGeo = register(new THREE.TorusGeometry(1.9, 0.015, 12, 64));
      const ringMat = register(
        new THREE.MeshBasicMaterial({
          color: COLORS.verdant,
          transparent: true,
          opacity: 0.5,
        })
      );
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.6;
      orbitGroup.add(ringMesh);

      const nodeGeo = register(new THREE.OctahedronGeometry(0.11, 0));
      const nodeMatSaffron = register(
        new THREE.MeshBasicMaterial({ color: COLORS.saffron })
      );
      const nodeMatVerdant = register(
        new THREE.MeshBasicMaterial({ color: COLORS.verdant })
      );

      const nodeCount = isMobile ? 6 : 8;
      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2;
        const node = new THREE.Mesh(
          nodeGeo,
          i % 2 === 0 ? nodeMatSaffron : nodeMatVerdant
        );
        node.position.set(
          Math.cos(angle) * 1.9,
          Math.sin(angle * 2) * 0.28,
          Math.sin(angle) * 1.9
        );
        orbitGroup.add(node);
      }
      tertiaryMesh = orbitGroup;
      rootGroup.add(orbitGroup);
    } else if (variant === 'diagnostic-scanner') {
      // 02: Technical structural frame + vertical laser scan ring + diagnostic nodes
      const boxGeo = register(new THREE.BoxGeometry(1.75, 1.75, 1.75));
      const edgesGeo = register(new THREE.EdgesGeometry(boxGeo));
      const edgesMat = register(
        new THREE.LineBasicMaterial({
          color: COLORS.silver,
          transparent: true,
          opacity: 0.55,
        })
      );
      primaryMesh = new THREE.LineSegments(edgesGeo, edgesMat);
      rootGroup.add(primaryMesh);

      // Inner broken/monitored machinery core
      const coreGeo = register(new THREE.CylinderGeometry(0.55, 0.55, 1.25, 6));
      const coreMat = register(
        new THREE.MeshStandardMaterial({
          color: COLORS.saffron,
          emissive: COLORS.saffron,
          emissiveIntensity: 0.25,
          wireframe: true,
        })
      );
      secondaryMesh = new THREE.Mesh(coreGeo, coreMat);
      rootGroup.add(secondaryMesh);

      // Horizontal laser scanning plane
      const scanGroup = new THREE.Group();
      const scanRingGeo = register(new THREE.RingGeometry(0.85, 1.38, 4));
      const scanRingMat = register(
        new THREE.MeshBasicMaterial({
          color: COLORS.saffron,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
      );
      const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat);
      scanRing.rotation.x = Math.PI / 2;
      scanRing.rotation.z = Math.PI / 4;
      scanGroup.add(scanRing);

      const planeGeo = register(new THREE.PlaneGeometry(1.72, 1.72));
      const planeMat = register(
        new THREE.MeshBasicMaterial({
          color: COLORS.iris,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.16,
        })
      );
      const scanPlane = new THREE.Mesh(planeGeo, planeMat);
      scanPlane.rotation.x = Math.PI / 2;
      scanGroup.add(scanPlane);

      tertiaryMesh = scanGroup;
      rootGroup.add(scanGroup);
    } else if (variant === 'precision-gears') {
      // 03: Interlocking precision toroidal rotors representing technical assignment & workflow
      const outerTorusGeo = register(new THREE.TorusGeometry(1.5, 0.09, 12, 36));
      const outerTorusMat = register(
        new THREE.MeshStandardMaterial({
          color: COLORS.iris,
          emissive: COLORS.iris,
          emissiveIntensity: 0.3,
          wireframe: true,
        })
      );
      primaryMesh = new THREE.Mesh(outerTorusGeo, outerTorusMat);
      rootGroup.add(primaryMesh);

      const midTorusGeo = register(new THREE.TorusGeometry(1.08, 0.08, 10, 28));
      const midTorusMat = register(
        new THREE.MeshStandardMaterial({
          color: COLORS.verdant,
          emissive: COLORS.verdant,
          emissiveIntensity: 0.4,
          wireframe: true,
        })
      );
      secondaryMesh = new THREE.Mesh(midTorusGeo, midTorusMat);
      secondaryMesh.rotation.y = Math.PI / 3;
      rootGroup.add(secondaryMesh);

      const innerCoreGeo = register(new THREE.DodecahedronGeometry(0.55, 0));
      const innerCoreMat = register(
        new THREE.MeshStandardMaterial({
          color: COLORS.saffron,
          emissive: COLORS.saffron,
          emissiveIntensity: 0.35,
          roughness: 0.3,
          metalness: 0.7,
          flatShading: true,
        })
      );
      tertiaryMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
      rootGroup.add(tertiaryMesh);
    } else {
      // 04: Shield-metrics — Crystalline Dala diamond/pyramid + ascending verification halo
      const coneGeo = register(new THREE.ConeGeometry(1.3, 2.0, 4));
      const coneMat = register(
        new THREE.MeshStandardMaterial({
          color: COLORS.verdant,
          emissive: COLORS.verdant,
          emissiveIntensity: 0.35,
          roughness: 0.2,
          metalness: 0.85,
          wireframe: true,
        })
      );
      primaryMesh = new THREE.Mesh(coneGeo, coneMat);
      rootGroup.add(primaryMesh);

      const innerPyramidGeo = register(new THREE.ConeGeometry(0.78, 1.35, 4));
      const innerPyramidMat = register(
        new THREE.MeshStandardMaterial({
          color: COLORS.iris,
          emissive: COLORS.iris,
          emissiveIntensity: 0.4,
          flatShading: true,
          transparent: true,
          opacity: 0.85,
        })
      );
      secondaryMesh = new THREE.Mesh(innerPyramidGeo, innerPyramidMat);
      rootGroup.add(secondaryMesh);

      const haloGroup = new THREE.Group();
      const haloGeo = register(new THREE.TorusGeometry(1.65, 0.025, 12, 64));
      const haloMat = register(
        new THREE.MeshBasicMaterial({
          color: COLORS.saffron,
          transparent: true,
          opacity: 0.8,
        })
      );
      const haloRing = new THREE.Mesh(haloGeo, haloMat);
      haloRing.rotation.x = Math.PI / 2;
      haloGroup.add(haloRing);

      tertiaryMesh = haloGroup;
      rootGroup.add(haloGroup);
    }

    // Subtle ambient floating vertices around the 3D object
    const particleCount = isMobile ? 24 : 42;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2;
      const r = 1.9 + ((i * 17) % 10) * 0.12;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = (((i * 29) % 20) / 10 - 1) * 1.6;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const particlesGeo = register(new THREE.BufferGeometry());
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = register(
      new THREE.PointsMaterial({
        color: COLORS.bone,
        size: 0.045,
        transparent: true,
        opacity: 0.45,
      })
    );
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    rootGroup.add(particleSystem);

    let rafId = 0;
    let clock = 0;
    let smoothedProgress = progressRef.current;

    const renderScene = () => {
      const targetProgress = progressRef.current;
      smoothedProgress += (targetProgress - smoothedProgress) * 0.12;

      const shouldAnimateContinuously = !prefersReducedMotion && !pausedRef.current;
      if (shouldAnimateContinuously) {
        clock += 0.012;
      }

      // Base scroll-driven orientation + gentle idle rotation
      const scrollAngle = smoothedProgress * Math.PI * 1.35;
      rootGroup.rotation.y = scrollAngle + clock * 0.45;
      rootGroup.rotation.x = Math.sin(smoothedProgress * Math.PI - 0.5) * 0.28;

      if (variant === 'core-network') {
        if (primaryMesh) primaryMesh.rotation.z = clock * 0.25;
        if (secondaryMesh) {
          secondaryMesh.rotation.y = -clock * 0.6 - scrollAngle * 0.5;
          const pulse = 0.92 + Math.sin(clock * 2 + smoothedProgress * 4) * 0.08;
          secondaryMesh.scale.setScalar(pulse);
        }
        if (tertiaryMesh) {
          tertiaryMesh.rotation.y = clock * 0.35 + scrollAngle * 0.4;
        }
      } else if (variant === 'diagnostic-scanner') {
        if (secondaryMesh) {
          secondaryMesh.rotation.y = -clock * 0.5 + scrollAngle;
        }
        if (tertiaryMesh) {
          // Vertical scan sweep driven by scroll + idle wave
          const sweep = shouldAnimateContinuously
            ? Math.sin(clock * 1.8 + smoothedProgress * Math.PI * 2) * 0.72
            : (smoothedProgress - 0.5) * 1.3;
          tertiaryMesh.position.y = sweep;
        }
      } else if (variant === 'precision-gears') {
        if (primaryMesh) {
          primaryMesh.rotation.x = clock * 0.5 + scrollAngle * 0.8;
        }
        if (secondaryMesh) {
          secondaryMesh.rotation.y = -clock * 0.65 - scrollAngle;
          secondaryMesh.rotation.z = clock * 0.3;
        }
        if (tertiaryMesh) {
          tertiaryMesh.rotation.x = -clock * 0.4;
          tertiaryMesh.rotation.y = clock * 0.8;
        }
      } else if (variant === 'shield-metrics') {
        if (primaryMesh) {
          primaryMesh.rotation.y = clock * 0.3 + scrollAngle * 0.5;
        }
        if (secondaryMesh) {
          secondaryMesh.rotation.y = -clock * 0.45;
          secondaryMesh.position.y = Math.sin(clock * 1.5) * 0.08;
        }
        if (tertiaryMesh) {
          tertiaryMesh.position.y = -0.65 + smoothedProgress * 1.3;
          tertiaryMesh.rotation.z = clock * 0.5;
        }
      }

      renderer.render(scene, camera);

      if (activeRef.current && shouldAnimateContinuously) {
        rafId = window.requestAnimationFrame(renderScene);
      }
    };

    renderScene();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      window.cancelAnimationFrame(rafId);
      renderScene();
    };

    window.addEventListener('resize', handleResize);
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleMotionChange);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [variant]);

  // Trigger a single frame update when scrollProgress or isActive/isPaused changes
  // (especially important when reduced-motion or pause is active)
  useEffect(() => {
    if (!webglSupported && canvasRef.current) {
      renderCanvas2DFallback(
        canvasRef.current,
        variant,
        0.6 + scrollProgress * Math.PI,
        0.35,
        scrollProgress
      );
    }
  }, [scrollProgress, variant, webglSupported]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
    >
      {/* Subtle radial glow backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-25 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accentColor}33 0%, transparent 68%)`,
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="w-full h-full block pointer-events-none"
      />
    </div>
  );
}
