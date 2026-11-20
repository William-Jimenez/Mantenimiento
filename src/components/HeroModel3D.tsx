import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface HeroModel3DProps {
  className?: string;
}

const COLORS = {
  iris: 0x8052ff,
  saffron: 0xffb829,
  verdant: 0x15846e,
  bone: 0xffffff,
};

/**
 * Bounding radius of the full 3D assembly (orbital rings + nodes + float margin)
 * used to compute a safe camera distance so the model is never clipped at any aspect ratio.
 */
const MODEL_SAFE_RADIUS = 2.65;
const CAMERA_FOV = 40;

function computeSafeCameraZ(width: number, height: number): number {
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const vFovRad = THREE.MathUtils.degToRad(CAMERA_FOV);
  const vHalf = vFovRad / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const distV = MODEL_SAFE_RADIUS / Math.sin(vHalf);
  const distH = MODEL_SAFE_RADIUS / Math.sin(hHalf);
  return Math.max(distV, distH);
}

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
 * Builds a 3D precision gear ring (ExtrudeGeometry) combining the maintenance tool
 * aesthetic from the original small nodes into a detailed centerpiece sub-assembly.
 */
function createPrecisionGearGeometry(
  teeth: number,
  outerRadius: number,
  innerRadius: number,
  boreRadius: number,
  depth: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const mod = i % 4;
    const r = mod === 0 || mod === 1 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  const hole = new THREE.Path();
  hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 1,
    curveSegments: 16,
  });
  geo.center();
  return geo;
}

/**
 * Lightweight 2D Canvas perspective fallback replicating the central 3D model
 * (octahedron core + precision gear + orbital ring) when WebGL is unavailable.
 */
function renderHero2DFallback(
  canvas: HTMLCanvasElement,
  rotY: number,
  rotX: number,
  dpr: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = Math.max(canvas.offsetWidth, 1);
  const h = Math.max(canvas.offsetHeight, 1);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const scale = Math.min(canvas.width, canvas.height) * 0.21;

  const project = (x: number, y: number, z: number) => {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = z * cosY + x * sinY;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = z1 * cosX + y * sinX;

    const perspective = 3.8 / (3.8 - z2 * 0.38);
    return {
      px: cx + x1 * scale * perspective,
      py: cy + y2 * scale * perspective,
    };
  };

  ctx.lineWidth = 1.4 * dpr;

  // 1. Central octahedron core (Iris)
  const verts: Array<[number, number, number]> = [
    [0, -1.15, 0],
    [0, 1.15, 0],
    [-1.0, 0, 0],
    [1.0, 0, 0],
    [0, 0, -1.0],
    [0, 0, 1.0],
  ];
  const edges = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [4, 3], [3, 5], [5, 2],
  ];
  const projected = verts.map(([x, y, z]) => project(x, y, z));
  ctx.strokeStyle = '#8052ff';
  ctx.globalAlpha = 0.85;
  for (const [a, b] of edges) {
    ctx.beginPath();
    ctx.moveTo(projected[a].px, projected[a].py);
    ctx.lineTo(projected[b].px, projected[b].py);
    ctx.stroke();
  }

  // 2. Precision gear ring (Saffron)
  const gearSteps = 32;
  ctx.strokeStyle = '#ffb829';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (let i = 0; i <= gearSteps; i++) {
    const a = (i / gearSteps) * Math.PI * 2 + rotY * 0.4;
    const r = i % 4 < 2 ? 1.48 : 1.28;
    const p = project(Math.cos(a) * r, Math.sin(a) * r, 0);
    if (i === 0) ctx.moveTo(p.px, p.py);
    else ctx.lineTo(p.px, p.py);
  }
  ctx.stroke();

  // 3. Orbital telemetry ring (Verdant)
  const ringSteps = 48;
  ctx.strokeStyle = '#15846e';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  for (let i = 0; i <= ringSteps; i++) {
    const a = (i / ringSteps) * Math.PI * 2;
    const p = project(Math.cos(a) * 1.72, Math.sin(a) * 0.45, Math.sin(a) * 1.72);
    if (i === 0) ctx.moveTo(p.px, p.py);
    else ctx.lineTo(p.px, p.py);
  }
  ctx.stroke();
}

export function HeroModel3D({ className = '' }: HeroModel3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const interactionRef = useRef({
    pointerActive: false,
    pointerNormX: 0,
    pointerNormY: 0,
    smoothPointerX: 0,
    smoothPointerY: 0,
    hoverStrength: 0,
    dragging: false,
    lastClientX: 0,
    lastClientY: 0,
    userRotX: 0,
    userRotY: 0,
    velRotX: 0,
    velRotY: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let cancelled = false;
    let cleanupScene: (() => void) | null = null;

    // Defer 3D initialization until the browser is idle so it never blocks initial page render
    const initScene = () => {
      if (cancelled || !container || !canvas) return;

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      let prefersReducedMotion = mediaQuery.matches;

      let cssWidth = Math.max(container.clientWidth, 1);
      let cssHeight = Math.max(container.clientHeight, 1);
      const getIsMobile = () => window.innerWidth < 640;
      let isMobile = getIsMobile();
      const getDpr = () => Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

      let renderer: THREE.WebGLRenderer | null = null;
      let scene: THREE.Scene | null = null;
      let camera: THREE.PerspectiveCamera | null = null;
      let cursorLight: THREE.PointLight | null = null;
      const disposables: Array<{ dispose: () => void }> = [];
      const register = <T extends { dispose: () => void }>(item: T): T => {
        disposables.push(item);
        return item;
      };

      // Animated sub-assemblies & materials for hover illumination boost
      let rootGroup: THREE.Group | null = null;
      let coreMesh: THREE.Mesh | null = null;
      let outerCage: THREE.LineSegments | null = null;
      let gearGroup: THREE.Group | null = null;
      let hexHousing: THREE.Group | null = null;
      let orbitPrimary: THREE.Group | null = null;
      let orbitSecondary: THREE.Group | null = null;
      const dynamicLineMats: Array<{ mat: THREE.LineBasicMaterial; baseOpacity: number }> = [];
      const dynamicFillMats: Array<{
        mat: THREE.MeshStandardMaterial;
        baseOpacity: number;
        baseEmissive: number;
      }> = [];

      if (isWebGLAvailable()) {
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'low-power',
          });
          renderer.setPixelRatio(getDpr());
          renderer.setSize(cssWidth, cssHeight, false);
          renderer.setClearColor(0x000000, 0);

          scene = new THREE.Scene();
          camera = new THREE.PerspectiveCamera(
            CAMERA_FOV,
            cssWidth / Math.max(cssHeight, 1),
            0.1,
            100
          );
          camera.position.set(0, 0, computeSafeCameraZ(cssWidth, cssHeight));

          // Same lighting architecture as the original 3D field:
          // soft ambient + dual directional lights + interactive saffron cursor point light
          const ambientLight = new THREE.AmbientLight(COLORS.bone, 0.85);
          scene.add(ambientLight);

          const dirLight1 = new THREE.DirectionalLight(COLORS.bone, 1.35);
          dirLight1.position.set(4.5, 5.5, 7.5);
          scene.add(dirLight1);

          const dirLight2 = new THREE.DirectionalLight(COLORS.iris, 0.95);
          dirLight2.position.set(-5.0, -4.0, 5.5);
          scene.add(dirLight2);

          cursorLight = new THREE.PointLight(COLORS.saffron, 1.6, 16, 1.5);
          cursorLight.position.set(0, 0, 4.2);
          scene.add(cursorLight);

          rootGroup = new THREE.Group();
          scene.add(rootGroup);

          // 1. Central Crystalline Dala Octahedron Core (Iris)
          const coreGeo = register(new THREE.OctahedronGeometry(0.95, 0));
          const coreFillMat = register(
            new THREE.MeshStandardMaterial({
              color: COLORS.iris,
              emissive: COLORS.iris,
              emissiveIntensity: 0.3,
              roughness: 0.3,
              metalness: 0.65,
              transparent: true,
              opacity: 0.55,
              flatShading: true,
              side: THREE.DoubleSide,
            })
          );
          dynamicFillMats.push({
            mat: coreFillMat,
            baseOpacity: 0.55,
            baseEmissive: 0.3,
          });
          coreMesh = new THREE.Mesh(coreGeo, coreFillMat);

          const coreEdgesGeo = register(new THREE.EdgesGeometry(coreGeo));
          const coreLineMat = register(
            new THREE.LineBasicMaterial({
              color: COLORS.bone,
              transparent: true,
              opacity: 0.72,
            })
          );
          dynamicLineMats.push({ mat: coreLineMat, baseOpacity: 0.72 });
          coreMesh.add(new THREE.LineSegments(coreEdgesGeo, coreLineMat));
          rootGroup.add(coreMesh);

          // 2. Outer Geodesic Wireframe Shell (Iris)
          const cageGeo = register(new THREE.IcosahedronGeometry(1.42, isMobile ? 0 : 1));
          const cageEdgesGeo = register(new THREE.EdgesGeometry(cageGeo));
          const cageLineMat = register(
            new THREE.LineBasicMaterial({
              color: COLORS.iris,
              transparent: true,
              opacity: 0.52,
            })
          );
          dynamicLineMats.push({ mat: cageLineMat, baseOpacity: 0.52 });
          outerCage = new THREE.LineSegments(cageEdgesGeo, cageLineMat);
          rootGroup.add(outerCage);

          // 3. Precision 3D Mechanical Gear Ring (Saffron)
          gearGroup = new THREE.Group();
          const gearGeo = register(
            createPrecisionGearGeometry(isMobile ? 10 : 12, 1.72, 1.5, 1.18, 0.18)
          );
          const gearFillMat = register(
            new THREE.MeshStandardMaterial({
              color: COLORS.saffron,
              emissive: COLORS.saffron,
              emissiveIntensity: 0.24,
              roughness: 0.35,
              metalness: 0.65,
              transparent: true,
              opacity: 0.24,
              flatShading: true,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          dynamicFillMats.push({
            mat: gearFillMat,
            baseOpacity: 0.24,
            baseEmissive: 0.24,
          });
          const gearEdgesGeo = register(new THREE.EdgesGeometry(gearGeo, 18));
          const gearLineMat = register(
            new THREE.LineBasicMaterial({
              color: COLORS.saffron,
              transparent: true,
              opacity: 0.82,
            })
          );
          dynamicLineMats.push({ mat: gearLineMat, baseOpacity: 0.82 });

          gearGroup.add(new THREE.Mesh(gearGeo, gearFillMat));
          gearGroup.add(new THREE.LineSegments(gearEdgesGeo, gearLineMat));
          gearGroup.rotation.x = Math.PI / 5;
          rootGroup.add(gearGroup);

          // 4. Hexagonal Precision Nut Housing (Verdant)
          hexHousing = new THREE.Group();
          const hexGeo = register(new THREE.CylinderGeometry(1.22, 1.22, 0.32, 6, 1, true));
          const hexFillMat = register(
            new THREE.MeshStandardMaterial({
              color: COLORS.verdant,
              emissive: COLORS.verdant,
              emissiveIntensity: 0.25,
              roughness: 0.35,
              metalness: 0.6,
              transparent: true,
              opacity: 0.2,
              flatShading: true,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          dynamicFillMats.push({
            mat: hexFillMat,
            baseOpacity: 0.2,
            baseEmissive: 0.25,
          });
          const hexEdgesGeo = register(new THREE.EdgesGeometry(hexGeo));
          const hexLineMat = register(
            new THREE.LineBasicMaterial({
              color: COLORS.verdant,
              transparent: true,
              opacity: 0.76,
            })
          );
          dynamicLineMats.push({ mat: hexLineMat, baseOpacity: 0.76 });

          hexHousing.add(new THREE.Mesh(hexGeo, hexFillMat));
          hexHousing.add(new THREE.LineSegments(hexEdgesGeo, hexLineMat));
          hexHousing.rotation.z = Math.PI / 3;
          rootGroup.add(hexHousing);

          // 5. Dual Tilted Orbital Telemetry Rings with Accent Nodes
          orbitPrimary = new THREE.Group();
          const ring1Geo = register(
            new THREE.TorusGeometry(2.05, 0.016, 8, isMobile ? 48 : 72)
          );
          const ring1Mat = register(
            new THREE.MeshBasicMaterial({
              color: COLORS.verdant,
              transparent: true,
              opacity: 0.65,
            })
          );
          const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
          ring1Mesh.rotation.x = Math.PI / 2.4;
          orbitPrimary.add(ring1Mesh);

          const nodeGeo = register(new THREE.OctahedronGeometry(0.1, 0));
          const nodeSaffronMat = register(new THREE.MeshBasicMaterial({ color: COLORS.saffron }));
          const nodeBoneMat = register(new THREE.MeshBasicMaterial({ color: COLORS.bone }));
          const nodeCount = isMobile ? 4 : 6;
          for (let i = 0; i < nodeCount; i++) {
            const a = (i / nodeCount) * Math.PI * 2;
            const node = new THREE.Mesh(nodeGeo, i % 2 === 0 ? nodeSaffronMat : nodeBoneMat);
            node.position.set(
              Math.cos(a) * 2.05,
              Math.sin(a) * Math.sin(Math.PI / 2.4) * 0.45,
              Math.sin(a) * 2.05
            );
            orbitPrimary.add(node);
          }
          rootGroup.add(orbitPrimary);

          orbitSecondary = new THREE.Group();
          const ring2Geo = register(
            new THREE.TorusGeometry(1.82, 0.012, 8, isMobile ? 40 : 64)
          );
          const ring2Mat = register(
            new THREE.MeshBasicMaterial({
              color: COLORS.iris,
              transparent: true,
              opacity: 0.45,
            })
          );
          const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
          ring2Mesh.rotation.x = -Math.PI / 3;
          ring2Mesh.rotation.y = Math.PI / 4;
          orbitSecondary.add(ring2Mesh);
          rootGroup.add(orbitSecondary);
        } catch {
          renderer = null;
        }
      }

      let rafId = 0;
      let tick = 0;
      let isVisible = true;
      let isSkipped = false;

      const shouldAnimate = () => {
        const s = interactionRef.current;
        const hasInertia =
          Math.abs(s.velRotX) > 0.0005 ||
          Math.abs(s.velRotY) > 0.0005 ||
          s.hoverStrength > 0.01 ||
          s.pointerActive;
        return (!prefersReducedMotion || hasInertia) && isVisible && !isSkipped && !document.hidden;
      };

      const renderFrame = () => {
        rafId = 0;
        const s = interactionRef.current;

        if (!prefersReducedMotion) {
          tick += 0.012;
        }

        // Smooth pointer tracking & hover illumination strength
        s.smoothPointerX += (s.pointerNormX - s.smoothPointerX) * 0.12;
        s.smoothPointerY += (s.pointerNormY - s.smoothPointerY) * 0.12;
        const targetHover = s.pointerActive ? 1 : 0;
        s.hoverStrength += (targetHover - s.hoverStrength) * 0.12;

        // Drag inertia damping
        if (!s.dragging) {
          s.userRotY += s.velRotY;
          s.userRotX += s.velRotX;
          s.velRotY *= 0.92;
          s.velRotX *= 0.92;
        }
        s.userRotX = Math.max(-1.1, Math.min(1.1, s.userRotX));

        // Update cursor-following saffron point light
        if (cursorLight) {
          cursorLight.position.set(
            s.smoothPointerX * 3.8,
            -s.smoothPointerY * 3.2,
            3.6 + s.hoverStrength * 1.1
          );
          cursorLight.intensity = 1.2 + s.hoverStrength * 1.8;
        }

        const baseRotY = tick * 0.42 + s.userRotY + s.smoothPointerX * 0.35 * s.hoverStrength;
        const baseRotX =
          Math.sin(tick * 0.6) * 0.14 + s.userRotX + s.smoothPointerY * 0.28 * s.hoverStrength;

        if (renderer && scene && camera && rootGroup) {
          // Organic floating motion (without scaling/zooming so edges never clip)
          rootGroup.position.y = prefersReducedMotion ? 0 : Math.sin(tick * 1.15) * 0.1;
          rootGroup.position.x = prefersReducedMotion ? 0 : Math.cos(tick * 0.8) * 0.05;
          rootGroup.rotation.set(baseRotX, baseRotY, 0);

          // Independent counter-rotating sub-assemblies
          if (coreMesh) {
            coreMesh.rotation.y = -tick * 0.65;
            coreMesh.rotation.z = tick * 0.3;
            const pulse = 0.96 + Math.sin(tick * 2.2) * 0.04;
            coreMesh.scale.setScalar(pulse);
          }
          if (outerCage) {
            outerCage.rotation.x = tick * 0.22;
            outerCage.rotation.y = tick * 0.18;
          }
          if (gearGroup) {
            gearGroup.rotation.z = -tick * 0.55;
          }
          if (hexHousing) {
            hexHousing.rotation.y = tick * 0.48;
            hexHousing.rotation.x = Math.sin(tick * 0.7) * 0.35;
          }
          if (orbitPrimary) {
            orbitPrimary.rotation.y = tick * 0.36;
          }
          if (orbitSecondary) {
            orbitSecondary.rotation.y = -tick * 0.28;
            orbitSecondary.rotation.z = tick * 0.2;
          }

          // Opacity & emissive boost on cursor hover
          for (const item of dynamicLineMats) {
            item.mat.opacity = Math.min(1, item.baseOpacity + s.hoverStrength * 0.22);
          }
          for (const item of dynamicFillMats) {
            item.mat.opacity = Math.min(0.85, item.baseOpacity + s.hoverStrength * 0.14);
            item.mat.emissiveIntensity = item.baseEmissive + s.hoverStrength * 0.25;
          }

          renderer.render(scene, camera);
        } else {
          renderHero2DFallback(canvas, baseRotY, baseRotX, getDpr());
        }

        if (shouldAnimate()) {
          rafId = window.requestAnimationFrame(renderFrame);
        }
      };

      const syncLoop = () => {
        if (shouldAnimate()) {
          if (rafId === 0) {
            rafId = window.requestAnimationFrame(renderFrame);
          }
        } else if (rafId !== 0) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      };

      renderFrame();

      // Pointer drag & hover handlers
      const handlePointerDown = (e: PointerEvent) => {
        const s = interactionRef.current;
        s.dragging = true;
        s.lastClientX = e.clientX;
        s.lastClientY = e.clientY;
        s.velRotX = 0;
        s.velRotY = 0;
        setIsDragging(true);
        container.setPointerCapture?.(e.pointerId);
        syncLoop();
      };

      const handlePointerMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const s = interactionRef.current;
        s.pointerNormX = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
        s.pointerNormY = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
        s.pointerActive = true;

        if (s.dragging) {
          const dx = e.clientX - s.lastClientX;
          const dy = e.clientY - s.lastClientY;
          s.lastClientX = e.clientX;
          s.lastClientY = e.clientY;
          s.userRotY += dx * 0.0085;
          s.userRotX += dy * 0.0075;
          s.velRotY = dx * 0.004;
          s.velRotX = dy * 0.0035;
        }
        syncLoop();
      };

      const handlePointerUp = (e: PointerEvent) => {
        const s = interactionRef.current;
        if (s.dragging) {
          s.dragging = false;
          setIsDragging(false);
          if (container.hasPointerCapture?.(e.pointerId)) {
            container.releasePointerCapture(e.pointerId);
          }
        }
      };

      const handlePointerLeave = () => {
        const s = interactionRef.current;
        s.pointerActive = false;
        s.dragging = false;
        setIsDragging(false);
        syncLoop();
      };

      const handleResize = () => {
        if (!container) return;
        isMobile = getIsMobile();
        cssWidth = Math.max(container.clientWidth, 1);
        cssHeight = Math.max(container.clientHeight, 1);

        if (renderer && camera) {
          camera.aspect = cssWidth / Math.max(cssHeight, 1);
          camera.position.z = computeSafeCameraZ(cssWidth, cssHeight);
          camera.updateProjectionMatrix();
          renderer.setPixelRatio(getDpr());
          renderer.setSize(cssWidth, cssHeight, false);
        }
        renderFrame();
      };

      const handleMotionChange = (e: MediaQueryListEvent) => {
        prefersReducedMotion = e.matches;
        syncLoop();
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

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
      }

      container.addEventListener('pointerdown', handlePointerDown);
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerup', handlePointerUp);
      container.addEventListener('pointercancel', handlePointerUp);
      container.addEventListener('pointerleave', handlePointerLeave);
      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', syncLoop);
      mediaQuery.addEventListener('change', handleMotionChange);
      container.addEventListener('contentvisibilityautostatechange', handleContentVisibility);

      cleanupScene = () => {
        if (rafId !== 0) window.cancelAnimationFrame(rafId);
        observer?.disconnect();
        resizeObserver?.disconnect();
        container.removeEventListener('pointerdown', handlePointerDown);
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerup', handlePointerUp);
        container.removeEventListener('pointercancel', handlePointerUp);
        container.removeEventListener('pointerleave', handlePointerLeave);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', syncLoop);
        mediaQuery.removeEventListener('change', handleMotionChange);
        container.removeEventListener('contentvisibilityautostatechange', handleContentVisibility);
        disposables.forEach((d) => d.dispose());
        renderer?.dispose();
      };
    };

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;
    if (typeof win.requestIdleCallback === 'function') {
      idleHandle = win.requestIdleCallback(initScene, { timeout: 200 });
    } else {
      timeoutHandle = window.setTimeout(initScene, 16);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
      cleanupScene?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Modelo 3D interactivo del núcleo de mantenimiento"
      className={`relative select-none touch-pan-y overflow-visible ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
    >
      {/* Ambient radial glow matching the original hero lighting */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side at 50% 50%, rgba(128, 82, 255, 0.14) 0%, rgba(21, 132, 110, 0.05) 48%, transparent 86%)',
        }}
      />

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="relative z-10 w-full h-full block pointer-events-none"
      />
    </div>
  );
}

export default HeroModel3D;
