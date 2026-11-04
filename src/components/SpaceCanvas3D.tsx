import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
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
}

interface ExplosionParticle3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

// Shared lightweight geometries so firing/explosions never allocate new GPU buffers
const SHARED_PLAYER_LASER_GEO = new THREE.CylinderGeometry(0.12, 0.12, 3.6, 6);
SHARED_PLAYER_LASER_GEO.rotateX(Math.PI / 2);

const SHARED_ENEMY_LASER_GEO = new THREE.CylinderGeometry(0.11, 0.11, 2.8, 6);
SHARED_ENEMY_LASER_GEO.rotateX(Math.PI / 2);

const SHARED_PARTICLE_GEO = new THREE.DodecahedronGeometry(0.24, 0);

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry && mesh.geometry !== SHARED_PLAYER_LASER_GEO && mesh.geometry !== SHARED_ENEMY_LASER_GEO && mesh.geometry !== SHARED_PARTICLE_GEO) {
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
  const lasersRef = useRef<LaserBolt3D[]>([]);
  const particlesRef = useRef<ExplosionParticle3D[]>([]);

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

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

  const shipActionRef = useRef<{
    bankAngle: number;
    targetX: number;
    shakeIntensity: number;
    warpActive: number;
    boostRemaining: number;
    recoilRemaining: number;
    muzzleFlashRemaining: number;
    damageSparkCooldown: number;
  }>({
    bankAngle: 0,
    targetX: 0,
    shakeIntensity: 0,
    warpActive: 0,
    boostRemaining: 0,
    recoilRemaining: 0,
    muzzleFlashRemaining: 0,
    damageSparkCooldown: 0,
  });

  const spawnExplosion = (
    position: THREE.Vector3,
    primaryColor: string,
    secondaryColor: string,
    count = 14
  ) => {
    const effectsGroup = effectsGroupRef.current;
    if (!effectsGroup) return;

    const maxParticles = graphicsQuality === 'low' ? Math.min(8, count) : count;

    for (let i = 0; i < maxParticles; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? primaryColor : secondaryColor,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(SHARED_PARTICLE_GEO, mat);
      mesh.position.copy(position);

      const speed = 4 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      effectsGroup.add(mesh);
      particlesRef.current.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.35,
      });
    }
  };

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

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

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
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

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

        const isBoosting = action.boostRemaining > 0;
        const speedMultiplier =
          1 + action.warpActive * 5.5 + (isBoosting ? 2.8 : 0);

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
            st.scale * (1 + action.warpActive * 8 + (isBoosting ? 4.5 : 0))
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

        // 4. Animate Player Spaceship
        if (playerShipGroupRef.current) {
          const shipRoot = playerShipGroupRef.current;

          const desiredX = THREE.MathUtils.clamp(
            action.targetX * 0.35,
            -4.5,
            4.5
          );
          const prevX = shipRoot.position.x;
          shipRoot.position.x = THREE.MathUtils.lerp(prevX, desiredX, dt * 4.5);
          const velocityX = (shipRoot.position.x - prevX) / Math.max(dt, 0.001);

          const wingVibration = Math.sin(elapsed * 28) * 0.015;
          shipRoot.position.y =
            0.65 + Math.sin(elapsed * 2.6) * 0.22 + wingVibration;

          const targetZ =
            5.2 -
            (isBoosting ? 1.45 : 0) -
            action.warpActive * 1.8 +
            action.recoilRemaining * 0.55;
          shipRoot.position.z = THREE.MathUtils.lerp(
            shipRoot.position.z,
            targetZ,
            dt * 8
          );

          const targetRoll = THREE.MathUtils.clamp(
            -velocityX * 0.14 + action.bankAngle,
            -0.65,
            0.65
          );
          shipRoot.rotation.z = THREE.MathUtils.lerp(
            shipRoot.rotation.z,
            targetRoll + Math.cos(elapsed * 1.9) * 0.04,
            dt * 6
          );
          shipRoot.rotation.x = THREE.MathUtils.lerp(
            shipRoot.rotation.x,
            (isBoosting ? -0.09 : 0.03) - action.recoilRemaining * 0.12,
            dt * 7
          );
          action.bankAngle = THREE.MathUtils.lerp(
            action.bankAngle,
            0,
            dt * 3.5
          );

          const shipMesh = shipRoot.children[0];
          if (shipMesh) {
            const boostScale = isBoosting ? 2.2 : 1.0;
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
                4
              );
            }
          }
        }

        // 5. Sync & Animate Active UFO Enemies
        const currentEnemies = activeEnemiesRef.current;
        const activeIds = new Set(currentEnemies.map((e) => e.instanceId));

        for (const [id, mesh] of enemyMeshesMapRef.current.entries()) {
          if (!activeIds.has(id)) {
            enemiesGroup.remove(mesh);
            disposeObject3D(mesh);
            enemyMeshesMapRef.current.delete(id);
          }
        }

        currentEnemies.forEach((enemy, idx) => {
          let ufoGroup = enemyMeshesMapRef.current.get(enemy.instanceId);
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
          }

          const bobY = Math.sin(elapsed * 2.6 + idx * 1.3) * 0.32;
          const swayX = Math.cos(elapsed * 1.7 + idx * 0.9) * 0.4;
          ufoGroup.position.x = THREE.MathUtils.lerp(
            ufoGroup.position.x,
            enemy.x + swayX,
            dt * 4
          );
          ufoGroup.position.y = THREE.MathUtils.lerp(
            ufoGroup.position.y,
            enemy.y + bobY,
            dt * 4
          );
          ufoGroup.position.z = THREE.MathUtils.lerp(
            ufoGroup.position.z,
            enemy.z,
            dt * 4
          );

          const saucer = ufoGroup.getObjectByName('ufoSaucer');
          if (saucer) {
            saucer.rotation.y += dt * 2.2;
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

          if (isTargeted) {
            shipActionRef.current.targetX = enemy.x;
          }
        });

        // 6. Animate Laser Bolts
        for (let i = lasersRef.current.length - 1; i >= 0; i--) {
          const laser = lasersRef.current[i];
          laser.progress += dt * laser.speed;
          if (laser.progress >= 1) {
            spawnExplosion(
              laser.endPos,
              laser.color,
              laser.isPlayerLaser ? '#facc15' : '#ef4444',
              laser.isPlayerLaser ? 16 : 10
            );
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

        // 7. Animate Explosion Particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            effectsGroup.remove(p.mesh);
            (p.mesh.material as THREE.Material).dispose();
            particlesRef.current.splice(i, 1);
          } else {
            p.mesh.position.addScaledVector(p.velocity, dt);
            p.mesh.rotation.x += dt * 5;
            p.mesh.rotation.y += dt * 5;
            const ratio = 1 - p.life / p.maxLife;
            p.mesh.scale.setScalar(Math.max(0.01, ratio));
            (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
          }
        }

        // 8. Camera Shake + Dynamic Boost Pullback
        if (cameraRef.current) {
          const isPortrait =
            container.clientWidth < Math.max(1, container.clientHeight);
          const baseY = isPortrait ? 6.4 : 5.2;
          const baseZ =
            (isPortrait ? 17.5 : 14.5) + (isBoosting ? 1.3 : 0);

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
              0,
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

  // Handle Player Laser Fire Trigger + Recoil + Muzzle Flash
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
    const startPos = playerShipGroupRef.current.position
      .clone()
      .add(new THREE.Vector3(0, 0.25, -1.6));
    const endPos = targetMesh
      ? targetMesh.position.clone()
      : new THREE.Vector3(0, 1.5, -14);

    const colors = ['#38bdf8', '#22d3ee', '#a855f7', '#facc15', '#f43f5e'];
    const color =
      colors[Math.min(laserFireTrigger.weaponLevel - 1, colors.length - 1)] ||
      '#38bdf8';

    const boltCount = Math.min(laserFireTrigger.weaponLevel, 3);
    for (let i = 0; i < boltCount; i++) {
      const offset = (i - (boltCount - 1) / 2) * 0.65;
      const boltStart = startPos.clone().add(new THREE.Vector3(offset, 0, 0));

      const mat = new THREE.MeshBasicMaterial({ color });
      const boltMesh = new THREE.Mesh(SHARED_PLAYER_LASER_GEO, mat);
      boltMesh.position.copy(boltStart);
      boltMesh.lookAt(endPos);

      effectsGroupRef.current.add(boltMesh);
      lasersRef.current.push({
        mesh: boltMesh,
        startPos: boltStart,
        endPos: endPos.clone(),
        progress: 0,
        speed: 4.8,
        color,
        isPlayerLaser: true,
      });
    }

    shipActionRef.current.bankAngle = (Math.random() - 0.5) * 0.45;
    shipActionRef.current.recoilRemaining = 1.0;
    shipActionRef.current.muzzleFlashRemaining = 1.0;
    shipActionRef.current.shakeIntensity = laserFireTrigger.isDestroy
      ? 0.4
      : 0.16;
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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-auto select-none"
      aria-label="Galactic Division Wars 3D Space Arena"
    />
  );
};
