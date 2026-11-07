import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import {
  ActiveEnemyInstance,
  DivisionCategoryId,
  PlanetConfig,
  SpaceshipConfig,
} from '../types/game';
import {
  ALIEN_TYPES,
  DIVISION_CATEGORIES,
  PLANETS,
  PLAYER_SPACESHIPS,
  UFO_TYPES,
} from '../data/gameData';
import {
  buildPlanetGroup,
  buildPlayerSpaceship,
  buildUfoWithAlien,
} from '../three/proceduralModels';
import { soundEngine } from '../utils/soundEngine';

interface SpaceCanvas3DProps {
  selectedShipId: string;
  currentPlanetIndex: number;
  activeCategoryId: DivisionCategoryId;
  activeEnemies: ActiveEnemyInstance[];
  targetEnemyId: string | null;
  laserFireTrigger: {
    id: number;
    targetEnemyId: string;
    weaponLevel: number;
    isDestroy: boolean;
  } | null;
  enemyAttackTrigger: {
    id: number;
    attackerId: string;
  } | null;
  warpTrigger: number;
  boostTrigger: number;
  playerLives: number;
  shieldActive: boolean;
  isPaused: boolean;
  isPlaying?: boolean;
  graphicsQuality?: 'high' | 'medium' | 'low';
  onSelectEnemy?: (enemyId: string) => void;
}

interface LaserBolt3D {
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  progress: number;
  speed: number;
  color: string;
  isPlayerLaser: boolean;
  isHeavyLaser: boolean;
  isDestroyShot?: boolean;
  targetEnemyId?: string;
}

interface ExplosionParticle3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
  drag: number;
  active: boolean;
}

interface ShockwaveRing3D {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
  isFlashSphere: boolean;
  active: boolean;
}

interface EnemyHitReaction {
  recoilZ: number;
  tiltX: number;
  tiltZ: number;
  spawnTime: number;
}

interface EnemyLastSnapshot {
  pos: THREE.Vector3;
  hullColor: string;
  glowColor: string;
  isBoss: boolean;
}

const MAX_POOL_PARTICLES = 48;
const MAX_POOL_SHOCKWAVES = 10;

// Shared lightweight geometries so firing/explosions never allocate new GPU buffers
const SHARED_AUTO_LASER_GEO = new THREE.CylinderGeometry(0.045, 0.045, 1.85, 6);
SHARED_AUTO_LASER_GEO.rotateX(Math.PI / 2);

const SHARED_HEAVY_LASER_GEO = new THREE.CylinderGeometry(0.24, 0.24, 5.2, 8);
SHARED_HEAVY_LASER_GEO.rotateX(Math.PI / 2);

const SHARED_ENEMY_LASER_GEO = new THREE.CylinderGeometry(0.11, 0.11, 2.8, 6);
SHARED_ENEMY_LASER_GEO.rotateX(Math.PI / 2);

const SHARED_PARTICLE_GEO = new THREE.OctahedronGeometry(0.18, 0);
const SHARED_DEBRIS_GEO = new THREE.BoxGeometry(0.26, 0.05, 0.2);
const SHARED_FLASH_GEO = new THREE.SphereGeometry(0.55, 10, 10);
const SHARED_SHOCKWAVE_GEO = new THREE.RingGeometry(0.45, 0.82, 24);

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (
      mesh.geometry &&
      mesh.geometry !== SHARED_AUTO_LASER_GEO &&
      mesh.geometry !== SHARED_HEAVY_LASER_GEO &&
      mesh.geometry !== SHARED_ENEMY_LASER_GEO &&
      mesh.geometry !== SHARED_PARTICLE_GEO &&
      mesh.geometry !== SHARED_DEBRIS_GEO &&
      mesh.geometry !== SHARED_FLASH_GEO &&
      mesh.geometry !== SHARED_SHOCKWAVE_GEO
    ) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  });
}

export const SpaceCanvas3D: React.FC<SpaceCanvas3DProps> = ({
  selectedShipId,
  currentPlanetIndex,
  activeCategoryId,
  activeEnemies,
  targetEnemyId,
  laserFireTrigger,
  enemyAttackTrigger,
  warpTrigger,
  boostTrigger,
  playerLives,
  shieldActive,
  isPaused,
  isPlaying = true,
  graphicsQuality = 'medium',
  onSelectEnemy,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const playerShipGroupRef = useRef<THREE.Group | null>(null);
  const planetGroupRef = useRef<THREE.Group | null>(null);
  const enemiesGroupRef = useRef<THREE.Group | null>(null);
  const effectsGroupRef = useRef<THREE.Group | null>(null);

  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);

  const enemyMeshesMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const enemyReactionsMapRef = useRef<Map<string, EnemyHitReaction>>(new Map());
  const enemySnapshotsMapRef = useRef<Map<string, EnemyLastSnapshot>>(new Map());
  const lasersRef = useRef<LaserBolt3D[]>([]);
  const particlesRef = useRef<ExplosionParticle3D[]>([]);
  const shockwavesRef = useRef<ShockwaveRing3D[]>([]);
  const poolCursorRef = useRef<number>(0);
  const shockwaveCursorRef = useRef<number>(0);

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const shieldActiveRef = useRef<boolean>(shieldActive);
  shieldActiveRef.current = shieldActive;

  const playerLivesRef = useRef<number>(playerLives);
  playerLivesRef.current = playerLives;

  const targetEnemyIdRef = useRef<string | null>(targetEnemyId);
  targetEnemyIdRef.current = targetEnemyId;

  const activeEnemiesRef = useRef<ActiveEnemyInstance[]>(activeEnemies);
  activeEnemiesRef.current = activeEnemies;

  const onSelectEnemyRef = useRef(onSelectEnemy);
  onSelectEnemyRef.current = onSelectEnemy;

  // Player manual omnidirectional steering state (Left/Right X, Up/Down Altitude Y, Forward/Backward Z)
  const steeringInputRef = useRef<{
    moveX: number; // -1 (left) to +1 (right)
    moveY: number; // -1 (down/turun) to +1 (up/naik)
    moveZ: number; // -1 (forward/depan) to +1 (backward/belakang)
    manualOffsetX: number;
    manualOffsetY: number;
    manualOffsetZ: number;
    hasManualOverride: boolean;
  }>({
    moveX: 0,
    moveY: 0,
    moveZ: 0,
    manualOffsetX: 0,
    manualOffsetY: 0,
    manualOffsetZ: 0,
    hasManualOverride: false,
  });

  // Visual knob offset & active state for on-screen 360° virtual flight cursor pad
  const [cursorKnob, setCursorKnob] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeDirLabel, setActiveDirLabel] = useState<string>('SIAP');
  const joystickPadRef = useRef<HTMLDivElement>(null);
  const isDraggingCursorRef = useRef<boolean>(false);

  const shipActionRef = useRef<{
    bankAngle: number;
    targetX: number;
    shakeIntensity: number;
    warpActive: number;
    boostRemaining: number;
    recoilRemaining: number;
    muzzleFlashRemaining: number;
    damageSparkCooldown: number;
    autoFireCooldown: number;
    autoFireWingToggle: number;
  }>({
    bankAngle: 0,
    targetX: 0,
    shakeIntensity: 0,
    warpActive: 0,
    boostRemaining: 0,
    recoilRemaining: 0,
    muzzleFlashRemaining: 0,
    damageSparkCooldown: 0,
    autoFireCooldown: 0.25,
    autoFireWingToggle: 1,
  });

  const spawnExplosion = (
    position: THREE.Vector3,
    primaryColor: string,
    secondaryColor: string,
    count = 12,
    scaleMultiplier = 1.0,
    dragFactor = 2.4
  ) => {
    const pool = particlesRef.current;
    if (pool.length === 0) return;

    const isMobileScreen =
      containerRef.current && containerRef.current.clientWidth < 768;
    const qualityCap =
      graphicsQuality === 'low'
        ? Math.min(7, count)
        : isMobileScreen || graphicsQuality === 'medium'
          ? Math.min(14, Math.ceil(count * 0.7))
          : count;

    for (let i = 0; i < qualityCap; i++) {
      const idx = poolCursorRef.current % pool.length;
      poolCursorRef.current = (poolCursorRef.current + 1) % pool.length;
      const p = pool[idx];

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      const chosenColor =
        i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? primaryColor : secondaryColor;
      mat.color.set(chosenColor);
      mat.opacity = 0.92;

      p.mesh.position.copy(position);
      const initScale = (0.55 + Math.random() * 0.45) * scaleMultiplier;
      p.mesh.scale.setScalar(initScale);
      p.mesh.visible = true;

      const speed = (3.2 + Math.random() * 7.5) * Math.sqrt(scaleMultiplier);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      p.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      p.rotSpeed.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      p.life = 0;
      p.maxLife =
        (0.32 + Math.random() * 0.28) * Math.min(1.25, scaleMultiplier);
      p.initialScale = initScale;
      p.drag = dragFactor;
      p.active = true;
    }
  };

  const spawnShockwaveRing = (
    position: THREE.Vector3,
    colorHex: string,
    maxScale = 3.2,
    asFlashSphere = false
  ) => {
    const pool = shockwavesRef.current;
    if (pool.length === 0) return;

    // Pick a matching slot (flash sphere vs ring)
    let chosen: ShockwaveRing3D | null = null;
    for (let i = 0; i < pool.length; i++) {
      const idx = (shockwaveCursorRef.current + i) % pool.length;
      if (pool[idx].isFlashSphere === asFlashSphere) {
        chosen = pool[idx];
        shockwaveCursorRef.current = (idx + 1) % pool.length;
        break;
      }
    }
    if (!chosen) return;

    const mat = chosen.mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(colorHex);
    mat.opacity = asFlashSphere ? 0.75 : 0.85;

    chosen.mesh.position.copy(position);
    chosen.mesh.scale.setScalar(0.35);
    if (!asFlashSphere && cameraRef.current) {
      chosen.mesh.lookAt(cameraRef.current.position);
    }
    chosen.mesh.visible = true;
    chosen.life = 0;
    chosen.maxLife = asFlashSphere ? 0.24 : 0.42;
    chosen.maxScale = maxScale;
    chosen.active = true;
  };

  /**
   * Subtle, mobile-friendly UFO Destruction Particle Burst:
   * Combines gentle decelerating plasma embers, spinning hull shards, a soft core flash, and a thin halo ring.
   */
  const spawnUfoDestructionBurst = (
    position: THREE.Vector3,
    hullColor: string,
    glowColor: string,
    isBoss: boolean
  ) => {
    const scale = isBoss ? 1.55 : 1.15;
    const count = isBoss ? 22 : 16;
    spawnExplosion(position, glowColor, hullColor, count, scale, 3.1);
    spawnShockwaveRing(position, glowColor, isBoss ? 4.2 : 2.9, false);
    spawnShockwaveRing(position, '#ffffff', isBoss ? 2.1 : 1.45, true);
  };

  // Keyboard Arrow Keys + PageUp/PageDown (or Q/E) for Omnidirectional Spaceship Steering
  useEffect(() => {
    const pressed = new Set<string>();

    const updateAxes = () => {
      let mx = 0;
      let my = 0;
      let mz = 0;
      if (pressed.has('ArrowLeft')) mx -= 1;
      if (pressed.has('ArrowRight')) mx += 1;
      if (pressed.has('ArrowUp')) {
        mz -= 1; // Forward toward UFOs
        my += 0.45; // Subtle climb while surging forward
      }
      if (pressed.has('ArrowDown')) {
        mz += 1; // Backward
        my -= 0.45; // Subtle dive while pulling back
      }
      if (pressed.has('PageUp') || pressed.has('KeyE')) my += 1;
      if (pressed.has('PageDown') || pressed.has('KeyQ')) my -= 1;

      // Normalize diagonal vector so diagonal movement is smooth and consistent
      const len = Math.hypot(mx, mz);
      if (len > 1) {
        mx /= len;
        mz /= len;
      }

      steeringInputRef.current.moveX = mx;
      steeringInputRef.current.moveY = THREE.MathUtils.clamp(my, -1, 1);
      steeringInputRef.current.moveZ = mz;
      if (mx !== 0 || my !== 0 || mz !== 0) {
        steeringInputRef.current.hasManualOverride = true;
      }
      if (!isDraggingCursorRef.current) {
        setCursorKnob({ x: mx * 26, y: mz * 26 });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'PageUp' ||
        e.key === 'PageDown' ||
        e.code === 'KeyQ' ||
        e.code === 'KeyE'
      ) {
        e.preventDefault();
        pressed.add(e.code === 'KeyQ' || e.code === 'KeyE' ? e.code : e.key);
        updateAxes();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.code === 'KeyQ' || e.code === 'KeyE' ? e.code : e.key;
      if (pressed.has(k)) {
        pressed.delete(k);
        updateAxes();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060916');
    scene.fog = new THREE.FogExp2('#060916', 0.011);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      220
    );
    camera.position.set(0, 4.8, 14.2);
    camera.lookAt(0, 0.5, -10);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: graphicsQuality === 'high',
        powerPreference: 'high-performance',
        stencil: false,
      });
    } catch {
      return;
    }

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererInfo = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : '';
    const isSoftware = /SwiftShader|Software|llvmpipe| Basic Render/i.test(
      rendererInfo
    );

    const maxDpr =
      isSoftware || graphicsQuality === 'low'
        ? 1.0
        : graphicsQuality === 'medium'
          ? 1.2
          : Math.min(window.devicePixelRatio || 1, 1.5);

    renderer.setPixelRatio(maxDpr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lightweight 3-Point Space Lighting
    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#0f172a', 1.15);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.4);
    keyLight.position.set(18, 28, 16);
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.3);
    rimLight.position.set(-18, -10, -15);
    scene.add(rimLight);

    // Instanced Starfield
    const starCount =
      isSoftware || graphicsQuality === 'low'
        ? 75
        : graphicsQuality === 'medium'
          ? 120
          : 180;
    const starGeo = new THREE.BoxGeometry(0.12, 0.12, 0.75);
    const starMat = new THREE.MeshBasicMaterial({ color: '#e0f2fe' });
    const starInstanced = new THREE.InstancedMesh(starGeo, starMat, starCount);

    const starMatrices: {
      pos: THREE.Vector3;
      speed: number;
      scale: number;
    }[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 90,
        (Math.random() - 0.5) * 50,
        -Math.random() * 115 + 10
      );
      const speed = 12 + Math.random() * 20;
      const scale = 0.6 + Math.random() * 1.3;
      starMatrices.push({ pos, speed, scale });
      dummy.position.copy(pos);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      starInstanced.setMatrixAt(i, dummy.matrix);
    }
    scene.add(starInstanced);

    // Instanced Asteroid Belt
    const asteroidCount =
      isSoftware || graphicsQuality === 'low'
        ? 8
        : graphicsQuality === 'medium'
          ? 14
          : 20;
    const astGeo = new THREE.DodecahedronGeometry(0.65, 0);
    const astMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.85,
      metalness: 0.15,
    });
    const astInstanced = new THREE.InstancedMesh(
      astGeo,
      astMat,
      asteroidCount
    );
    const astData: {
      pos: THREE.Vector3;
      rot: THREE.Euler;
      speed: number;
      scale: number;
    }[] = [];
    for (let i = 0; i < asteroidCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const pos = new THREE.Vector3(
        side * (12 + Math.random() * 22),
        (Math.random() - 0.5) * 18,
        -Math.random() * 95
      );
      const rot = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0
      );
      const speed = 4 + Math.random() * 7;
      const scale = 0.45 + Math.random() * 1.1;
      astData.push({ pos, rot, speed, scale });
      dummy.position.copy(pos);
      dummy.rotation.copy(rot);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      astInstanced.setMatrixAt(i, dummy.matrix);
    }
    scene.add(astInstanced);

    // Scene Groups
    const planetGroup = new THREE.Group();
    planetGroup.position.set(14, 5, -42);
    scene.add(planetGroup);
    planetGroupRef.current = planetGroup;

    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0.65, 5.2);
    scene.add(playerGroup);
    playerShipGroupRef.current = playerGroup;

    const enemiesGroup = new THREE.Group();
    scene.add(enemiesGroup);
    enemiesGroupRef.current = enemiesGroup;

    const effectsGroup = new THREE.Group();
    scene.add(effectsGroup);
    effectsGroupRef.current = effectsGroup;

    // Pre-allocate Zero-GC Particle & Debris Object Pool for smooth mobile performance
    const particlePool: ExplosionParticle3D[] = [];
    for (let i = 0; i < MAX_POOL_PARTICLES; i++) {
      const isDebrisShard = i % 3 === 0;
      const mat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0,
        blending: isDebrisShard ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(
        isDebrisShard ? SHARED_DEBRIS_GEO : SHARED_PARTICLE_GEO,
        mat
      );
      mesh.visible = false;
      effectsGroup.add(mesh);
      particlePool.push({
        mesh,
        velocity: new THREE.Vector3(),
        rotSpeed: new THREE.Vector3(),
        life: 0,
        maxLife: 0.4,
        initialScale: 1,
        drag: 2.5,
        active: false,
      });
    }
    particlesRef.current = particlePool;

    // Pre-allocate Zero-GC Shockwave Ring & Core Flash Pool
    const swPool: ShockwaveRing3D[] = [];
    for (let i = 0; i < MAX_POOL_SHOCKWAVES; i++) {
      const isFlashSphere = i % 2 === 1;
      const mat = new THREE.MeshBasicMaterial({
        color: '#facc15',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(
        isFlashSphere ? SHARED_FLASH_GEO : SHARED_SHOCKWAVE_GEO,
        mat
      );
      mesh.visible = false;
      effectsGroup.add(mesh);
      swPool.push({
        mesh,
        life: 0,
        maxLife: 0.4,
        maxScale: 3.0,
        isFlashSphere,
        active: false,
      });
    }
    shockwavesRef.current = swPool;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let isCanvasDragging = false;
    let lastCanvasPointerX = 0;
    let lastCanvasPointerY = 0;

    const handlePointerDown = (event: PointerEvent) => {
      if (isPausedRef.current || !cameraRef.current || !enemiesGroupRef.current)
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, cameraRef.current);
      const intersects = raycaster.intersectObjects(
        enemiesGroupRef.current.children,
        true
      );
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && obj.parent !== enemiesGroupRef.current) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.instanceId && onSelectEnemyRef.current) {
          onSelectEnemyRef.current(obj.userData.instanceId);
          return;
        }
      }

      // If not clicking a UFO directly, allow dragging anywhere on the 3D space arena to steer the ship!
      isCanvasDragging = true;
      lastCanvasPointerX = event.clientX;
      lastCanvasPointerY = event.clientY;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isCanvasDragging || isPausedRef.current) return;
      const dx = event.clientX - lastCanvasPointerX;
      const dy = event.clientY - lastCanvasPointerY;
      lastCanvasPointerX = event.clientX;
      lastCanvasPointerY = event.clientY;

      const steer = steeringInputRef.current;
      steer.hasManualOverride = true;
      steer.manualOffsetX = THREE.MathUtils.clamp(
        steer.manualOffsetX + dx * 0.028,
        -7.5,
        7.5
      );
      steer.manualOffsetZ = THREE.MathUtils.clamp(
        steer.manualOffsetZ + dy * 0.024,
        -5.8,
        2.8
      );
      steer.manualOffsetY = THREE.MathUtils.clamp(
        steer.manualOffsetY - dy * 0.014,
        -1.5,
        3.6
      );
    };

    const handlePointerUp = () => {
      isCanvasDragging = false;
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && cameraRef.current && rendererRef.current) {
          const isPortrait = width < height;
          cameraRef.current.aspect = width / height;
          cameraRef.current.fov = isPortrait ? 64 : 52;
          cameraRef.current.position.set(
            0,
            isPortrait ? 5.6 : 4.8,
            isPortrait ? 16.8 : 14.2
          );
          cameraRef.current.lookAt(0, 0.5, -10);
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    let lastTime = performance.now();
    let animationFrameId = 0;

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.1);
      const elapsed = now * 0.001;

      if (!isPausedRef.current) {
        const action = shipActionRef.current;
        const steer = steeringInputRef.current;

        if (action.warpActive > 0) {
          action.warpActive = Math.max(0, action.warpActive - dt * 1.6);
        }
        if (action.boostRemaining > 0) {
          action.boostRemaining = Math.max(0, action.boostRemaining - dt);
        }
        if (action.recoilRemaining > 0) {
          action.recoilRemaining = Math.max(
            0,
            action.recoilRemaining - dt * 4.5
          );
        }
        if (action.muzzleFlashRemaining > 0) {
          action.muzzleFlashRemaining = Math.max(
            0,
            action.muzzleFlashRemaining - dt * 7
          );
        }

        const isMovingForward = steer.moveZ < -0.1;
        const isBoosting = action.boostRemaining > 0 || isMovingForward;
        const speedMultiplier =
          1 +
          action.warpActive * 5.5 +
          (action.boostRemaining > 0 ? 2.8 : 0) +
          (isMovingForward ? 1.2 : 0);

        // 1. Update Instanced Starfield
        for (let i = 0; i < starCount; i++) {
          const st = starMatrices[i];
          st.pos.z += st.speed * speedMultiplier * dt;
          if (st.pos.z > 16) {
            st.pos.z = -105;
            st.pos.x = (Math.random() - 0.5) * 90;
            st.pos.y = (Math.random() - 0.5) * 50;
          }
          dummy.position.copy(st.pos);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(
            st.scale,
            st.scale,
            st.scale * (1 + action.warpActive * 8 + (isBoosting ? 3.5 : 0))
          );
          dummy.updateMatrix();
          starInstanced.setMatrixAt(i, dummy.matrix);
        }
        starInstanced.instanceMatrix.needsUpdate = true;

        // 2. Update Instanced Asteroids
        for (let i = 0; i < asteroidCount; i++) {
          const ast = astData[i];
          ast.pos.z += ast.speed * (isBoosting ? 2.1 : 1) * dt;
          ast.rot.x += dt * 0.6;
          ast.rot.y += dt * 0.8;
          if (ast.pos.z > 16) {
            ast.pos.z = -95;
          }
          dummy.position.copy(ast.pos);
          dummy.rotation.copy(ast.rot);
          dummy.scale.setScalar(ast.scale);
          dummy.updateMatrix();
          astInstanced.setMatrixAt(i, dummy.matrix);
        }
        astInstanced.instanceMatrix.needsUpdate = true;

        // 3. Rotate Background Planet & Station/Portal
        if (planetGroupRef.current && planetGroupRef.current.children[0]) {
          const pGroup = planetGroupRef.current.children[0];
          const pCore = pGroup.getObjectByName('planetCore');
          if (pCore) pCore.rotation.y += dt * 0.09;
          const station = pGroup.getObjectByName('orbitalStation');
          if (station) station.rotation.y += dt * 0.35;
        }

        // 4. Animate Player Spaceship with Omnidirectional 360° Steering (X, Y, Z + Banking, Yaw & Pitch)
        if (playerShipGroupRef.current) {
          const shipRoot = playerShipGroupRef.current;

          // Update manual steering offsets from analog stick / buttons / keyboard with high responsiveness
          if (Math.abs(steer.moveX) > 0.01) {
            steer.manualOffsetX = THREE.MathUtils.clamp(
              steer.manualOffsetX + steer.moveX * dt * 13.5,
              -7.5,
              7.5
            );
            steer.hasManualOverride = true;
          }
          if (Math.abs(steer.moveY) > 0.01) {
            steer.manualOffsetY = THREE.MathUtils.clamp(
              steer.manualOffsetY + steer.moveY * dt * 8.5,
              -1.5,
              3.6
            );
            steer.hasManualOverride = true;
          }
          if (Math.abs(steer.moveZ) > 0.01) {
            steer.manualOffsetZ = THREE.MathUtils.clamp(
              steer.manualOffsetZ + steer.moveZ * dt * 11.2,
              -5.8, // Surge deep forward toward enemy UFOs
              2.8 // Pull back toward camera
            );
            steer.hasManualOverride = true;
          }

          const desiredX = steer.hasManualOverride
            ? steer.manualOffsetX
            : THREE.MathUtils.clamp(action.targetX * 0.42, -5.2, 5.2);

          const prevX = shipRoot.position.x;
          shipRoot.position.x = THREE.MathUtils.lerp(
            prevX,
            desiredX,
            dt * 12.5
          );
          const velocityX = (shipRoot.position.x - prevX) / Math.max(dt, 0.001);

          const wingVibration = Math.sin(elapsed * 28) * 0.014;
          const desiredY =
            0.65 +
            steer.manualOffsetY +
            Math.sin(elapsed * 2.6) * 0.18 +
            wingVibration;
          const prevY = shipRoot.position.y;
          shipRoot.position.y = THREE.MathUtils.lerp(
            prevY,
            desiredY,
            dt * 11.5
          );
          const velocityY = (shipRoot.position.y - prevY) / Math.max(dt, 0.001);

          const baseZ = 5.2 + steer.manualOffsetZ;
          const targetZ =
            baseZ -
            (action.boostRemaining > 0 ? 1.45 : 0) -
            action.warpActive * 1.8 +
            action.recoilRemaining * 0.55;
          const prevZ = shipRoot.position.z;
          shipRoot.position.z = THREE.MathUtils.lerp(
            prevZ,
            targetZ,
            dt * 11.5
          );
          const velocityZ = (shipRoot.position.z - prevZ) / Math.max(dt, 0.001);

          // Roll (miring kiri/kanan), Yaw (belok hidung pesawat), and Pitch (mendongak/menukik)
          const targetRoll = THREE.MathUtils.clamp(
            -velocityX * 0.12 - steer.moveX * 0.48 + action.bankAngle,
            -0.82,
            0.82
          );
          shipRoot.rotation.z = THREE.MathUtils.lerp(
            shipRoot.rotation.z,
            targetRoll + Math.cos(elapsed * 1.9) * 0.035,
            dt * 10
          );

          const targetYaw = THREE.MathUtils.clamp(
            -velocityX * 0.045 - steer.moveX * 0.22,
            -0.38,
            0.38
          );
          shipRoot.rotation.y = THREE.MathUtils.lerp(
            shipRoot.rotation.y,
            targetYaw,
            dt * 9
          );

          const pitchFromMove = THREE.MathUtils.clamp(
            velocityY * 0.09 +
              steer.moveY * 0.22 +
              velocityZ * 0.06 +
              steer.moveZ * 0.12,
            -0.38,
            0.38
          );
          shipRoot.rotation.x = THREE.MathUtils.lerp(
            shipRoot.rotation.x,
            (isBoosting ? -0.08 : 0.02) +
              pitchFromMove -
              action.recoilRemaining * 0.14,
            dt * 10
          );
          action.bankAngle = THREE.MathUtils.lerp(
            action.bankAngle,
            0,
            dt * 4.0
          );

          const shipMesh = shipRoot.children[0];
          if (shipMesh) {
            const boostScale = isBoosting ? 2.1 : 1.0;
            const pulse =
              (0.85 + Math.sin(elapsed * 26) * 0.25) * boostScale;

            shipMesh.traverse((child) => {
              if (child.name === 'thrusterPlume') {
                child.scale.set(
                  isBoosting ? 1.3 : 1,
                  pulse,
                  isBoosting ? 1.3 : 1
                );
              } else if (child.name === 'playerArmorShield') {
                const mat = (child as THREE.Mesh)
                  .material as THREE.MeshBasicMaterial;
                const targetOpacity = shieldActiveRef.current
                  ? 0.28 + Math.sin(elapsed * 6) * 0.08
                  : 0;
                mat.opacity = THREE.MathUtils.lerp(
                  mat.opacity,
                  targetOpacity,
                  dt * 8
                );
                child.rotation.y += dt * 0.9;
              } else if (child.name === 'muzzleFlashGlow') {
                const mat = (child as THREE.Mesh)
                  .material as THREE.MeshBasicMaterial;
                mat.opacity = action.muzzleFlashRemaining;
                child.scale.setScalar(0.8 + action.muzzleFlashRemaining * 1.5);
              } else if (child.name === 'quantumCore') {
                child.rotation.y += dt * 3.2;
                child.rotation.x += dt * 2.1;
              } else if (child.name === 'quantumRing') {
                child.rotation.z += dt * 2.5;
              }
            });
          }

          if (playerLivesRef.current === 1) {
            action.damageSparkCooldown -= dt;
            if (action.damageSparkCooldown <= 0) {
              action.damageSparkCooldown = 0.55 + Math.random() * 0.45;
              spawnExplosion(
                shipRoot.position
                  .clone()
                  .add(
                    new THREE.Vector3(
                      (Math.random() - 0.5) * 1.2,
                      0.2,
                      (Math.random() - 0.5) * 0.8
                    )
                  ),
                '#f97316',
                '#facc15',
                4,
                0.7
              );
            }
          }
        }

        // 5. Sync & Animate Active UFO Enemies with Enhanced Dynamic Swaying & Approach
        const currentEnemies = activeEnemiesRef.current;
        const activeIds = new Set(currentEnemies.map((e) => e.instanceId));

        for (const [id, mesh] of enemyMeshesMapRef.current.entries()) {
          if (!activeIds.has(id)) {
            const snap = enemySnapshotsMapRef.current.get(id);
            if (snap && isPlayingRef.current) {
              // Trigger subtle particle burst at the exact 3D UFO position when destroyed
              spawnUfoDestructionBurst(
                snap.pos,
                snap.hullColor,
                snap.glowColor,
                snap.isBoss
              );
            }
            enemiesGroup.remove(mesh);
            disposeObject3D(mesh);
            enemyMeshesMapRef.current.delete(id);
            enemyReactionsMapRef.current.delete(id);
          }
        }

        const playerPos = playerShipGroupRef.current
          ? playerShipGroupRef.current.position
          : new THREE.Vector3(0, 0.65, 5.2);

        currentEnemies.forEach((enemy, idx) => {
          let ufoGroup = enemyMeshesMapRef.current.get(enemy.instanceId);
          let reaction = enemyReactionsMapRef.current.get(enemy.instanceId);

          if (!ufoGroup) {
            const ufoCfg =
              UFO_TYPES.find((u) => u.id === enemy.ufoId) || UFO_TYPES[0];
            const alienCfg =
              ALIEN_TYPES.find((a) => a.id === enemy.alienId) || ALIEN_TYPES[0];
            ufoGroup = buildUfoWithAlien(ufoCfg, alienCfg, false);
            ufoGroup.userData.instanceId = enemy.instanceId;

            // Add Target Lock Ring under the UFO
            const targetRing = new THREE.Mesh(
              new THREE.RingGeometry(1.75, 2.0, 20),
              new THREE.MeshBasicMaterial({
                color: 0xfacc15,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0,
              })
            );
            targetRing.rotation.x = Math.PI / 2;
            targetRing.position.y = -0.5;
            targetRing.name = 'ufoTargetRing';
            ufoGroup.add(targetRing);

            ufoGroup.position.set(enemy.x, enemy.y, enemy.z);
            enemiesGroup.add(ufoGroup);
            enemyMeshesMapRef.current.set(enemy.instanceId, ufoGroup);

            reaction = {
              recoilZ: 0,
              tiltX: 0,
              tiltZ: 0,
              spawnTime: elapsed,
            };
            enemyReactionsMapRef.current.set(enemy.instanceId, reaction);
          }

          if (!reaction) {
            reaction = {
              recoilZ: 0,
              tiltX: 0,
              tiltZ: 0,
              spawnTime: elapsed,
            };
            enemyReactionsMapRef.current.set(enemy.instanceId, reaction);
          }

          // Decay hit reaction recoil & tilt smoothly
          reaction.recoilZ = THREE.MathUtils.lerp(reaction.recoilZ, 0, dt * 5.5);
          reaction.tiltX = THREE.MathUtils.lerp(reaction.tiltX, 0, dt * 6.0);
          reaction.tiltZ = THREE.MathUtils.lerp(reaction.tiltZ, 0, dt * 6.0);

          // Dynamic approach progression: UFO creeps closer and weaves forward/back
          const timeAlive = Math.max(0, elapsed - reaction.spawnTime);
          const enemySpeedFactor = Math.max(0.7, (enemy.speed || 1.2) * 0.55);
          const approachCreep = Math.min(
            3.6,
            (timeAlive * 0.22 * enemySpeedFactor) % 3.8
          );
          const surgeZ =
            Math.sin(elapsed * (1.35 + idx * 0.22) + idx) * 0.95 +
            approachCreep -
            reaction.recoilZ;
          const targetZ = THREE.MathUtils.clamp(
            enemy.z + surgeZ,
            -15.5,
            -3.6
          );

          // Proximity factor increases swaying intensity as UFO gets closer to the player spaceship
          const distZ = Math.max(2.5, Math.abs(playerPos.z - ufoGroup.position.z));
          const proximityBoost = THREE.MathUtils.clamp(
            14.0 / distZ,
            0.95,
            2.15
          );

          // Multi-harmonic Figure-8 Swaying (bergoyang dinamis ke kiri-kanan & atas-bawah)
          const phase = idx * 1.45;
          const primarySwayFreq = (1.85 + (idx % 3) * 0.35) * enemySpeedFactor;
          const swayX =
            (Math.sin(elapsed * primarySwayFreq + phase) * 1.15 +
              Math.cos(elapsed * primarySwayFreq * 0.55 - phase) * 0.48) *
            proximityBoost;

          const bobY =
            (Math.sin(elapsed * (primarySwayFreq * 1.35) + phase) * 0.45 +
              Math.cos(elapsed * 2.9 + idx) * 0.2) *
            proximityBoost;

          const prevUfoX = ufoGroup.position.x;
          ufoGroup.position.x = THREE.MathUtils.lerp(
            prevUfoX,
            enemy.x + swayX,
            dt * 5.2
          );
          ufoGroup.position.y = THREE.MathUtils.lerp(
            ufoGroup.position.y,
            enemy.y + bobY,
            dt * 5.2
          );
          ufoGroup.position.z = THREE.MathUtils.lerp(
            ufoGroup.position.z,
            targetZ,
            dt * 4.5
          );

          // Dynamic banking/tilting of the UFO hull matching its swaying velocity + hit tilt
          const ufoVelX =
            (ufoGroup.position.x - prevUfoX) / Math.max(dt, 0.001);
          const desiredUfoRoll = THREE.MathUtils.clamp(
            -ufoVelX * 0.085 +
              Math.sin(elapsed * primarySwayFreq + phase) * 0.22 +
              reaction.tiltZ,
            -0.65,
            0.65
          );
          const desiredUfoPitch = THREE.MathUtils.clamp(
            Math.cos(elapsed * 2.1 + idx) * 0.14 +
              0.08 * proximityBoost +
              reaction.tiltX,
            -0.55,
            0.55
          );

          ufoGroup.rotation.z = THREE.MathUtils.lerp(
            ufoGroup.rotation.z,
            desiredUfoRoll,
            dt * 6.5
          );
          ufoGroup.rotation.x = THREE.MathUtils.lerp(
            ufoGroup.rotation.x,
            desiredUfoPitch,
            dt * 6.5
          );

          const saucer = ufoGroup.getObjectByName('ufoSaucer');
          if (saucer) {
            saucer.rotation.y += dt * (2.4 + proximityBoost * 0.8);
          }

          const isTargeted = enemy.instanceId === targetEnemyIdRef.current;
          const targetRing = ufoGroup.getObjectByName('ufoTargetRing') as
            | THREE.Mesh
            | undefined;
          if (targetRing) {
            const mat = targetRing.material as THREE.MeshBasicMaterial;
            mat.opacity = isTargeted
              ? 0.65 + Math.sin(elapsed * 8) * 0.25
              : 0;
            targetRing.scale.setScalar(
              isTargeted ? 1 + Math.sin(elapsed * 6) * 0.08 : 1
            );
          }

          if (isTargeted && !steer.hasManualOverride) {
            action.targetX = ufoGroup.position.x;
          }

          // Update last known 3D snapshot so lasers and destruction bursts know the exact position & colors
          const ufoCfgRef =
            UFO_TYPES.find((u) => u.id === enemy.ufoId) || UFO_TYPES[0];
          const existingSnap = enemySnapshotsMapRef.current.get(
            enemy.instanceId
          );
          if (existingSnap) {
            existingSnap.pos.copy(ufoGroup.position);
          } else {
            enemySnapshotsMapRef.current.set(enemy.instanceId, {
              pos: ufoGroup.position.clone(),
              hullColor: ufoCfgRef.color || '#38bdf8',
              glowColor: ufoCfgRef.accentColor || '#facc15',
              isBoss: Boolean(enemy.isBoss),
            });
          }
        });

        // 5B. Continuous Auto-Fire Small Suppressive Lasers from Player Ship
        if (
          isPlayingRef.current &&
          currentEnemies.length > 0 &&
          playerShipGroupRef.current &&
          effectsGroupRef.current
        ) {
          action.autoFireCooldown -= dt;
          if (action.autoFireCooldown <= 0) {
            action.autoFireCooldown = 0.26; // Rapid continuous fire cadence
            action.autoFireWingToggle *= -1;

            const targetEnemy =
              currentEnemies.find(
                (e) => e.instanceId === targetEnemyIdRef.current
              ) || currentEnemies[0];

            const targetMesh = targetEnemy
              ? enemyMeshesMapRef.current.get(targetEnemy.instanceId)
              : undefined;

            const wingOffset = action.autoFireWingToggle * 0.58;
            const startPos = playerShipGroupRef.current.position
              .clone()
              .add(new THREE.Vector3(wingOffset, 0.15, -1.35));

            const jitter = new THREE.Vector3(
              (Math.random() - 0.5) * 0.55,
              (Math.random() - 0.5) * 0.35,
              0
            );
            const endPos = targetMesh
              ? targetMesh.position.clone().add(jitter)
              : startPos.clone().add(new THREE.Vector3(0, 0.2, -16));

            const autoColor =
              action.autoFireWingToggle > 0 ? '#38bdf8' : '#22d3ee';
            const mat = new THREE.MeshBasicMaterial({
              color: autoColor,
              transparent: true,
              opacity: 0.88,
            });
            const boltMesh = new THREE.Mesh(SHARED_AUTO_LASER_GEO, mat);
            boltMesh.position.copy(startPos);
            boltMesh.lookAt(endPos);

            effectsGroupRef.current.add(boltMesh);
            lasersRef.current.push({
              mesh: boltMesh,
              startPos,
              endPos,
              progress: 0,
              speed: 5.8,
              color: autoColor,
              isPlayerLaser: true,
              isHeavyLaser: false,
              targetEnemyId: targetEnemy?.instanceId,
            });

            action.muzzleFlashRemaining = Math.max(
              action.muzzleFlashRemaining,
              0.38
            );
            action.recoilRemaining = Math.max(action.recoilRemaining, 0.12);
            soundEngine.playAutoLaser();
          }
        }

        // 6. Animate Laser Bolts (Both Small Auto-Fire & Massive Answer-Triggered Heavy Lasers)
        for (let i = lasersRef.current.length - 1; i >= 0; i--) {
          const laser = lasersRef.current[i];
          laser.progress += dt * laser.speed;

          // Dynamically track moving UFO target so lasers hit the swaying UFO accurately
          if (laser.isPlayerLaser && laser.targetEnemyId) {
            const liveTarget = enemyMeshesMapRef.current.get(
              laser.targetEnemyId
            );
            if (liveTarget) {
              laser.endPos.lerp(liveTarget.position, dt * 12);
            }
          }

          if (laser.progress >= 1) {
            if (laser.isHeavyLaser) {
              // Subtle & Responsive Impact Explosion + Shockwave Ring on Correct Answer Shot
              const snap = laser.targetEnemyId
                ? enemySnapshotsMapRef.current.get(laser.targetEnemyId)
                : undefined;
              if (laser.isDestroyShot) {
                spawnUfoDestructionBurst(
                  laser.endPos,
                  snap?.hullColor || laser.color,
                  snap?.glowColor || '#facc15',
                  Boolean(snap?.isBoss)
                );
              } else {
                spawnExplosion(
                  laser.endPos,
                  laser.color,
                  '#facc15',
                  14,
                  1.15,
                  2.8
                );
                spawnShockwaveRing(laser.endPos, laser.color, 2.6, false);
              }
              if (laser.targetEnemyId) {
                const react = enemyReactionsMapRef.current.get(
                  laser.targetEnemyId
                );
                if (react) {
                  react.recoilZ = Math.min(2.4, react.recoilZ + 1.45);
                  react.tiltX = -0.55;
                  react.tiltZ = (Math.random() - 0.5) * 0.75;
                }
              }
            } else if (laser.isPlayerLaser) {
              // Small Auto-Fire Impact Spark + Micro-Shudder on UFO
              spawnExplosion(
                laser.endPos,
                laser.color,
                '#bae6fd',
                3,
                0.45,
                3.4
              );
              soundEngine.playImpactSpark();
              if (laser.targetEnemyId) {
                const react = enemyReactionsMapRef.current.get(
                  laser.targetEnemyId
                );
                if (react) {
                  react.recoilZ = Math.min(0.6, react.recoilZ + 0.14);
                  react.tiltZ += (Math.random() - 0.5) * 0.14;
                }
              }
            } else {
              // Enemy Counter-Attack Laser Hit
              spawnExplosion(laser.endPos, '#ef4444', '#f97316', 10, 0.95, 2.6);
            }

            effectsGroup.remove(laser.mesh);
            (laser.mesh.material as THREE.Material).dispose();
            lasersRef.current.splice(i, 1);
          } else {
            laser.mesh.position.lerpVectors(
              laser.startPos,
              laser.endPos,
              laser.progress
            );
            laser.mesh.lookAt(laser.endPos);
          }
        }

        // 7. Animate Pooled Explosion Particles (with Smooth Drag) & Expanding Shockwave Rings
        for (let i = 0; i < particlesRef.current.length; i++) {
          const p = particlesRef.current[i];
          if (!p.active) continue;
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            p.mesh.visible = false;
          } else {
            // Apply smooth exponential air/space drag so particles burst and gently decelerate
            const damping = Math.exp(-p.drag * dt);
            p.velocity.multiplyScalar(damping);
            p.mesh.position.addScaledVector(p.velocity, dt);
            p.mesh.rotation.x += p.rotSpeed.x * dt;
            p.mesh.rotation.y += p.rotSpeed.y * dt;
            p.mesh.rotation.z += p.rotSpeed.z * dt;

            const progress = p.life / p.maxLife;
            const easeOut = 1 - progress * progress;
            p.mesh.scale.setScalar(Math.max(0.01, easeOut * p.initialScale));
            (p.mesh.material as THREE.MeshBasicMaterial).opacity =
              easeOut * 0.9;
          }
        }

        for (let i = 0; i < shockwavesRef.current.length; i++) {
          const sw = shockwavesRef.current[i];
          if (!sw.active) continue;
          sw.life += dt;
          if (sw.life >= sw.maxLife) {
            sw.active = false;
            sw.mesh.visible = false;
          } else {
            const t = sw.life / sw.maxLife;
            const easeOut = 1 - (1 - t) * (1 - t);
            const currentScale = 0.35 + easeOut * sw.maxScale;
            sw.mesh.scale.setScalar(currentScale);
            (sw.mesh.material as THREE.MeshBasicMaterial).opacity =
              (1 - t) * (sw.isFlashSphere ? 0.7 : 0.85);
          }
        }

        // 8. Camera Shake + Dynamic Boost Pullback
        if (cameraRef.current) {
          const isPortrait =
            container.clientWidth < Math.max(1, container.clientHeight);
          const baseY = isPortrait ? 6.4 : 5.2;
          const baseZ =
            (isPortrait ? 17.5 : 14.5) + (action.boostRemaining > 0 ? 1.3 : 0);

          if (shipActionRef.current.shakeIntensity > 0.01) {
            const s = shipActionRef.current.shakeIntensity;
            cameraRef.current.position.x = (Math.random() - 0.5) * s;
            cameraRef.current.position.y = baseY + (Math.random() - 0.5) * s;
            cameraRef.current.position.z = THREE.MathUtils.lerp(
              cameraRef.current.position.z,
              baseZ,
              dt * 5
            );
            shipActionRef.current.shakeIntensity *= 0.88;
          } else {
            cameraRef.current.position.x = THREE.MathUtils.lerp(
              cameraRef.current.position.x,
              playerShipGroupRef.current
                ? playerShipGroupRef.current.position.x * 0.15
                : 0,
              dt * 5
            );
            cameraRef.current.position.y = THREE.MathUtils.lerp(
              cameraRef.current.position.y,
              baseY,
              dt * 5
            );
            cameraRef.current.position.z = THREE.MathUtils.lerp(
              cameraRef.current.position.z,
              baseZ,
              dt * 5
            );
          }
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, [graphicsQuality]);

  // Rebuild Player Spaceship when selectedShipId changes
  useEffect(() => {
    const playerGroup = playerShipGroupRef.current;
    if (!playerGroup) return;

    while (playerGroup.children.length > 0) {
      const child = playerGroup.children[0];
      playerGroup.remove(child);
      disposeObject3D(child);
    }

    const shipConfig: SpaceshipConfig =
      PLAYER_SPACESHIPS.find((s) => s.id === selectedShipId) ||
      PLAYER_SPACESHIPS[0];
    const mesh = buildPlayerSpaceship(shipConfig, 2, 1, false);
    playerGroup.add(mesh);
  }, [selectedShipId]);

  // Update 3D Space Battle Environment Theme & Planet when Category or Planet changes
  useEffect(() => {
    const scene = sceneRef.current;
    const planetGroup = planetGroupRef.current;
    if (!scene || !planetGroup) return;

    const categoryCfg =
      DIVISION_CATEGORIES.find((c) => c.id === activeCategoryId) ||
      DIVISION_CATEGORIES[0];
    const envTheme = categoryCfg.environment;

    scene.background = new THREE.Color(envTheme.skyColor);
    scene.fog = new THREE.FogExp2(envTheme.fogColor, 0.011);

    if (hemiLightRef.current) {
      hemiLightRef.current.color.set(envTheme.hemiSkyColor);
      hemiLightRef.current.groundColor.set(envTheme.hemiGroundColor);
    }
    if (keyLightRef.current) {
      keyLightRef.current.color.set(envTheme.keyLightColor);
    }

    while (planetGroup.children.length > 0) {
      const child = planetGroup.children[0];
      planetGroup.remove(child);
      disposeObject3D(child);
    }

    const basePlanet: PlanetConfig =
      PLANETS[currentPlanetIndex % PLANETS.length] || PLANETS[0];

    const planetMesh = buildPlanetGroup(basePlanet, 2, false, envTheme);
    planetGroup.add(planetMesh);
  }, [activeCategoryId, currentPlanetIndex]);

  // Handle Player HEAVY MEGA-LASER Fire Trigger (When Player Answers Math Question Correctly!)
  useEffect(() => {
    if (
      !laserFireTrigger ||
      !effectsGroupRef.current ||
      !playerShipGroupRef.current
    )
      return;

    const targetMesh = enemyMeshesMapRef.current.get(
      laserFireTrigger.targetEnemyId
    );
    const cachedSnap = enemySnapshotsMapRef.current.get(
      laserFireTrigger.targetEnemyId
    );
    const startPos = playerShipGroupRef.current.position
      .clone()
      .add(new THREE.Vector3(0, 0.3, -1.8));
    const endPos = targetMesh
      ? targetMesh.position.clone()
      : cachedSnap
        ? cachedSnap.pos.clone()
        : new THREE.Vector3(0, 1.5, -10);

    const colors = ['#facc15', '#22d3ee', '#a855f7', '#f97316', '#f43f5e'];
    const color =
      colors[Math.min(laserFireTrigger.weaponLevel - 1, colors.length - 1)] ||
      '#facc15';

    // Muzzle blast shockwave at spaceship nose
    spawnShockwaveRing(startPos, color, 2.2);

    const boltCount = Math.min(Math.max(2, laserFireTrigger.weaponLevel + 1), 4);
    for (let i = 0; i < boltCount; i++) {
      const offset = (i - (boltCount - 1) / 2) * 0.72;
      const boltStart = startPos.clone().add(new THREE.Vector3(offset, 0, 0));

      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? color : '#ffffff',
      });
      const boltMesh = new THREE.Mesh(SHARED_HEAVY_LASER_GEO, mat);
      const scaleBoost = laserFireTrigger.isDestroy ? 1.45 : 1.15;
      boltMesh.scale.set(scaleBoost, scaleBoost, scaleBoost);
      boltMesh.position.copy(boltStart);
      boltMesh.lookAt(endPos);

      effectsGroupRef.current.add(boltMesh);
      lasersRef.current.push({
        mesh: boltMesh,
        startPos: boltStart,
        endPos: endPos.clone(),
        progress: 0,
        speed: 4.5,
        color,
        isPlayerLaser: true,
        isHeavyLaser: true,
        isDestroyShot: laserFireTrigger.isDestroy,
        targetEnemyId: laserFireTrigger.targetEnemyId,
      });
    }

    shipActionRef.current.bankAngle = (Math.random() - 0.5) * 0.55;
    shipActionRef.current.recoilRemaining = 1.35;
    shipActionRef.current.muzzleFlashRemaining = 1.25;
    shipActionRef.current.shakeIntensity = laserFireTrigger.isDestroy
      ? 0.58
      : 0.32;
  }, [laserFireTrigger]);

  // Handle Enemy Counter-Attack Laser Trigger
  useEffect(() => {
    if (
      !enemyAttackTrigger ||
      !effectsGroupRef.current ||
      !playerShipGroupRef.current
    )
      return;

    const attackerMesh = enemyMeshesMapRef.current.get(
      enemyAttackTrigger.attackerId
    );
    const startPos = attackerMesh
      ? attackerMesh.position.clone()
      : new THREE.Vector3(0, 2, -16);
    const endPos = playerShipGroupRef.current.position.clone();

    const mat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
    const boltMesh = new THREE.Mesh(SHARED_ENEMY_LASER_GEO, mat);
    boltMesh.position.copy(startPos);
    boltMesh.lookAt(endPos);

    effectsGroupRef.current.add(boltMesh);
    lasersRef.current.push({
      mesh: boltMesh,
      startPos,
      endPos,
      progress: 0,
      speed: 3.6,
      color: '#ef4444',
      isPlayerLaser: false,
      isHeavyLaser: false,
    });

    shipActionRef.current.shakeIntensity = 0.5;
  }, [enemyAttackTrigger]);

  // Handle Hyperspace Warp Trigger
  useEffect(() => {
    if (warpTrigger > 0) {
      shipActionRef.current.warpActive = 1.0;
    }
  }, [warpTrigger]);

  // Handle Acceleration Boost Trigger
  useEffect(() => {
    if (boostTrigger > 0) {
      shipActionRef.current.boostRemaining = 2.2;
      shipActionRef.current.shakeIntensity = 0.22;
    }
  }, [boostTrigger]);

  // Helpers for Ultra-Responsive 360° Virtual Flight Joystick & 8-Direction / Altitude Controls
  const handleStepOrHoldMove = (
    dx: number,
    dz: number,
    dy: number = 0,
    label: string = 'GERAK'
  ) => {
    const steer = steeringInputRef.current;
    steer.moveX = dx;
    steer.moveZ = dz;
    steer.moveY = dy;
    steer.hasManualOverride = true;

    // Immediate impulse step so even a quick tap moves the spaceship noticeably
    steer.manualOffsetX = THREE.MathUtils.clamp(
      steer.manualOffsetX + dx * 0.65,
      -7.5,
      7.5
    );
    steer.manualOffsetZ = THREE.MathUtils.clamp(
      steer.manualOffsetZ + dz * 0.55,
      -5.8,
      2.8
    );
    steer.manualOffsetY = THREE.MathUtils.clamp(
      steer.manualOffsetY + dy * 0.45,
      -1.5,
      3.6
    );

    setCursorKnob({ x: dx * 26, y: (dz !== 0 ? dz : -dy) * 26 });
    setActiveDirLabel(label);
  };

  const handleStopMove = () => {
    isDraggingCursorRef.current = false;
    steeringInputRef.current.moveX = 0;
    steeringInputRef.current.moveY = 0;
    steeringInputRef.current.moveZ = 0;
    setCursorKnob({ x: 0, y: 0 });
    setActiveDirLabel('SIAP');
  };

  const handleResetShipPosition = () => {
    const steer = steeringInputRef.current;
    steer.moveX = 0;
    steer.moveY = 0;
    steer.moveZ = 0;
    steer.manualOffsetX = 0;
    steer.manualOffsetY = 0;
    steer.manualOffsetZ = 0;
    steer.hasManualOverride = false;
    setCursorKnob({ x: 0, y: 0 });
    setActiveDirLabel('TENGAH');
  };

  const updateAnalogFromClientPoint = (clientX: number, clientY: number) => {
    if (!joystickPadRef.current) return;
    const rect = joystickPadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width * 0.4;

    const rawDx = clientX - centerX;
    const rawDy = clientY - centerY;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(rawDy, rawDx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setCursorKnob({ x: knobX, y: knobY });

    const normX = THREE.MathUtils.clamp(knobX / Math.max(1, maxRadius), -1, 1);
    const normY = THREE.MathUtils.clamp(knobY / Math.max(1, maxRadius), -1, 1);

    const steer = steeringInputRef.current;
    steer.moveX = normX;
    steer.moveZ = normY; // Up on stick (-normY) surges forward (-Z), down pulls back (+Z)
    steer.moveY = -normY * 0.55; // Also smoothly climbs/dives in 3D space!
    steer.hasManualOverride = true;

    if (dist > 6) {
      const deg = ((angle * 180) / Math.PI + 360) % 360;
      if (deg >= 337.5 || deg < 22.5) setActiveDirLabel('KANAN ▶');
      else if (deg < 67.5) setActiveDirLabel('MUNDUR-KANAN ↘');
      else if (deg < 112.5) setActiveDirLabel('MUNDUR ▼');
      else if (deg < 157.5) setActiveDirLabel('MUNDUR-KIRI ↙');
      else if (deg < 202.5) setActiveDirLabel('◀ KIRI');
      else if (deg < 247.5) setActiveDirLabel('MAJU-KIRI ↖');
      else if (deg < 292.5) setActiveDirLabel('MAJU ▲');
      else setActiveDirLabel('MAJU-KANAN ↗');
    }
  };

  return (
    <>
      {/* WebGL 3D Canvas Mount (Supports clicking UFOs or dragging in space to fly) */}
      <div
        ref={containerRef}
        className="fixed inset-0 z-0 w-full h-full overflow-hidden pointer-events-auto select-none"
        aria-label="Galactic Division Wars 3D Space Arena"
      />

      {/* ULTRA-RESPONSIVE 360° OMNIDIRECTIONAL FLIGHT CONTROL PAD (Z-30 ABOVE HUD) */}
      {isPlaying && !isPaused && (
        <div
          className="fixed left-2 sm:left-4 bottom-36 sm:bottom-28 z-30 flex items-end gap-1.5 pointer-events-auto select-none"
          aria-label="Kemudi Pesawat 360 Derajat"
        >
          {/* Main 360° Analog Thumbstick + 8-Way Responsive Ring */}
          <div className="flex flex-col items-center gap-1">
            <div className="px-2 py-0.5 rounded-md bg-slate-950/90 border border-cyan-400/50 text-[9px] sm:text-[10px] font-mono font-bold text-cyan-300 tracking-wider uppercase shadow flex items-center gap-1.5">
              <span>KEMUDI: {activeDirLabel}</span>
            </div>

            <div
              ref={joystickPadRef}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                isDraggingCursorRef.current = true;
                updateAnalogFromClientPoint(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!isDraggingCursorRef.current) return;
                e.stopPropagation();
                updateAnalogFromClientPoint(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                handleStopMove();
              }}
              onPointerCancel={handleStopMove}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950/85 border-2 border-cyan-400/70 shadow-[0_0_24px_rgba(34,211,238,0.3)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
              title="Sentuh & geser ke segala arah (360°) untuk menggerakkan pesawat secara fleksibel"
            >
              {/* Outer Radar Ring & Crosshair */}
              <div className="absolute inset-2.5 rounded-full border border-cyan-500/25 pointer-events-none" />
              <div className="absolute inset-x-3 h-px bg-cyan-500/25 pointer-events-none" />
              <div className="absolute inset-y-3 w-px bg-cyan-500/25 pointer-events-none" />

              {/* UP / FORWARD (MAJU + NAIK) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleStepOrHoldMove(0, -1, 0.45, 'MAJU ▲');
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  handleStopMove();
                }}
                onPointerCancel={handleStopMove}
                className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900/95 hover:bg-cyan-400 hover:text-slate-950 active:bg-cyan-400 active:text-slate-950 active:scale-95 border border-cyan-400/60 text-cyan-300 flex items-center justify-center transition-all shadow"
                title="Maju ke Depan (Arrow Up)"
                aria-label="Gerak Pesawat Maju"
              >
                <ChevronUp className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* DOWN / BACKWARD (MUNDUR + TURUN) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleStepOrHoldMove(0, 1, -0.45, 'MUNDUR ▼');
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  handleStopMove();
                }}
                onPointerCancel={handleStopMove}
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900/95 hover:bg-cyan-400 hover:text-slate-950 active:bg-cyan-400 active:text-slate-950 active:scale-95 border border-cyan-400/60 text-cyan-300 flex items-center justify-center transition-all shadow"
                title="Mundur ke Belakang (Arrow Down)"
                aria-label="Gerak Pesawat Mundur"
              >
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* LEFT (GESER KIRI) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleStepOrHoldMove(-1, 0, 0, '◀ KIRI');
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  handleStopMove();
                }}
                onPointerCancel={handleStopMove}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/95 hover:bg-cyan-400 hover:text-slate-950 active:bg-cyan-400 active:text-slate-950 active:scale-95 border border-cyan-400/60 text-cyan-300 flex items-center justify-center transition-all shadow"
                title="Geser ke Kiri (Arrow Left)"
                aria-label="Gerak Pesawat ke Kiri"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* RIGHT (GESER KANAN) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleStepOrHoldMove(1, 0, 0, 'KANAN ▶');
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  handleStopMove();
                }}
                onPointerCancel={handleStopMove}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/95 hover:bg-cyan-400 hover:text-slate-950 active:bg-cyan-400 active:text-slate-950 active:scale-95 border border-cyan-400/60 text-cyan-300 flex items-center justify-center transition-all shadow"
                title="Geser ke Kanan (Arrow Right)"
                aria-label="Gerak Pesawat ke Kanan"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Draggable 360° Analog Stick Knob */}
              <div
                style={{
                  transform: `translate(${cursorKnob.x}px, ${cursorKnob.y}px)`,
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 text-slate-950 border-2 border-white shadow-[0_0_14px_rgba(34,211,238,0.8)] flex items-center justify-center pointer-events-none"
              >
                <Crosshair className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Dedicated Vertical Altitude Rocker (NAIK / TENGAH / TURUN) for Full 3D Freedom */}
          <div className="flex flex-col gap-1 bg-slate-950/85 p-1 rounded-xl border border-cyan-500/40 shadow-lg">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                handleStepOrHoldMove(0, 0, 1, 'NAIK ⬆');
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                handleStopMove();
              }}
              onPointerCancel={handleStopMove}
              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-400 hover:text-slate-950 active:bg-amber-400 active:text-slate-950 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300 transition-colors"
              title="Terbang Naik ke Atas (E / PageUp)"
            >
              ▲ NAIK
            </button>

            <button
              type="button"
              onClick={handleResetShipPosition}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 active:scale-95 border border-slate-700 text-[9px] font-mono font-bold text-slate-300 transition-colors"
              title="Reset Posisi Pesawat ke Tengah"
            >
              • RESET
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                handleStepOrHoldMove(0, 0, -1, 'TURUN ⬇');
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                handleStopMove();
              }}
              onPointerCancel={handleStopMove}
              className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-400 hover:text-slate-950 active:bg-amber-400 active:text-slate-950 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300 transition-colors"
              title="Terbang Menukik ke Bawah (Q / PageDown)"
            >
              ▼ TURUN
            </button>
          </div>
        </div>
      )}
    </>
  );
};
