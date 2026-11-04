import * as THREE from 'three';
import {
  AlienTypeConfig,
  PlanetConfig,
  SpaceEnvironmentTheme,
  SpaceshipConfig,
  UfoTypeConfig,
} from '../types/game';

/**
 * Generates a lightweight, high-contrast procedural CanvasTexture for planets (256x128 for fast GPU upload)
 */
export function createPlanetTexture(
  primaryHex: string,
  secondaryHex: string,
  atmosphereHex: string,
  seedId: number,
  maxAnisotropy: number = 2
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, secondaryHex);
  grad.addColorStop(0.5, primaryHex);
  grad.addColorStop(1, secondaryHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 18; i++) {
    const y = (i / 18) * canvas.height;
    const h = 3 + (i % 4) * 2;
    ctx.fillStyle = i % 2 === 0 ? primaryHex : secondaryHex;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(0, y, canvas.width, h);
  }

  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 20; i++) {
    const cx = (Math.sin(i * 73.1 + seedId) * 0.5 + 0.5) * canvas.width;
    const cy = (Math.cos(i * 39.7 + seedId) * 0.5 + 0.5) * canvas.height;
    const rx = 4 + (i % 5) * 3;
    const ry = 3 + (i % 3) * 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? atmosphereHex : secondaryHex;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, maxAnisotropy);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Builds a multi-part 3D Planet & Category Arena Backdrop Group
 */
export function buildPlanetGroup(
  planet: PlanetConfig,
  maxAnisotropy: number,
  _isSoftwareGl: boolean,
  envTheme?: SpaceEnvironmentTheme
): THREE.Group {
  const group = new THREE.Group();
  const pPrimary = envTheme ? envTheme.planetPrimary : planet.primaryColor;
  const pSecondary = envTheme ? envTheme.planetSecondary : planet.secondaryColor;
  const pAtmo = envTheme ? envTheme.planetAtmosphere : planet.atmosphereColor;
  const pScale = envTheme ? envTheme.planetScale : 1.0;

  const tex = createPlanetTexture(pPrimary, pSecondary, pAtmo, planet.id, maxAnisotropy);

  // 1. Primary Planet Sphere (Optimized 24x18 segments)
  const sphereGeo = new THREE.SphereGeometry(7.2 * pScale, 24, 18);
  const sphereMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.72,
    metalness: 0.12,
  });
  const planetMesh = new THREE.Mesh(sphereGeo, sphereMat);
  planetMesh.name = 'planetCore';
  group.add(planetMesh);

  // 2. Atmosphere Rim Halo
  const atmoGeo = new THREE.SphereGeometry(7.65 * pScale, 20, 16);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(pAtmo),
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  group.add(atmoMesh);

  // 3. Planetary Rings
  const showRings = envTheme ? envTheme.hasRings : planet.hasRings;
  const ringCol = envTheme?.ringColor || planet.ringColor || pAtmo;
  if (showRings) {
    const ringGeo = new THREE.RingGeometry(9.2 * pScale, 14.5 * pScale, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(ringCol),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI * 0.42;
    ringMesh.rotation.y = 0.25;
    ringMesh.name = 'planetRing';
    group.add(ringMesh);
  }

  // 4. Orbital Defense Station / Satellite
  const showStation = envTheme ? envTheme.hasStation : planet.hasStation;
  if (showStation) {
    const stationGroup = new THREE.Group();
    stationGroup.name = 'orbitalStation';

    const hubMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.25,
    });
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      metalness: 0.5,
      roughness: 0.5,
    });

    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 10), hubMat);
    stationGroup.add(core);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 8, 20), hubMat);
    ring.rotation.x = Math.PI / 2;
    stationGroup.add(ring);

    const panelLeft = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.7), solarMat);
    panelLeft.position.set(-1.6, 0, 0);
    stationGroup.add(panelLeft);

    const panelRight = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.7), solarMat);
    panelRight.position.set(1.6, 0, 0);
    stationGroup.add(panelRight);

    stationGroup.position.set(-10.5, 3.8, 3.5);
    stationGroup.rotation.set(0.4, 0.5, -0.2);
    group.add(stationGroup);
  }

  // 5. Intergalactic Portal Gate for Category 7 (Alien Dark Galaxy)
  if (envTheme?.hasPortal) {
    const portalGroup = new THREE.Group();
    portalGroup.name = 'orbitalStation';
    const portalTorus = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.22, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xd946ef })
    );
    const portalInner = new THREE.Mesh(
      new THREE.CircleGeometry(3.0, 24),
      new THREE.MeshBasicMaterial({
        color: 0x7e22ce,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    );
    portalGroup.add(portalTorus);
    portalGroup.add(portalInner);
    portalGroup.position.set(-11, 3.5, 2.0);
    group.add(portalGroup);
  }

  return group;
}

/**
 * Builds all 9 distinct Player Spaceship 3D models (including Phantom X-9, Titan Destroyer, and Quantum Phoenix)
 * Optimized with lightweight MeshStandardMaterial / MeshBasicMaterial for 60 FPS performance.
 */
export function buildPlayerSpaceship(
  ship: SpaceshipConfig,
  laserLevel: number,
  armorLevel: number,
  _isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  const primaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(ship.primaryColor),
    metalness: 0.78,
    roughness: 0.25,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(ship.secondaryColor),
    metalness: 0.55,
    roughness: 0.48,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(ship.accentColor || ship.engineColor),
    emissive: new THREE.Color(ship.accentColor || ship.engineColor),
    emissiveIntensity: 0.5,
    metalness: 0.7,
    roughness: 0.2,
  });

  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    metalness: 0.2,
    roughness: 0.12,
    transparent: true,
    opacity: 0.85,
  });

  const engineGlowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(ship.engineColor),
  });

  // === MODEL 7: PHANTOM X-9 – THE SPEED INTERCEPTOR ===
  if (ship.wingStyle === 'phantom_x9') {
    // 1. Long slender needle nose & body
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 2.9, 8).rotateX(-Math.PI / 2),
      primaryMat
    );
    nose.position.set(0, 0, -1.6);
    group.add(nose);

    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.55, 2.8, 8).rotateX(-Math.PI / 2),
      primaryMat
    );
    fuselage.position.set(0, 0, 1.0);
    group.add(fuselage);

    // 2. Transparent aerodynamic canopy
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), cockpitMat);
    canopy.scale.set(0.75, 0.58, 2.2);
    canopy.position.set(0, 0.28, -0.2);
    group.add(canopy);

    // 3. Wide Swept Delta Wings
    const deltaWing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 1.6), secondaryMat);
    deltaWing.position.set(0, -0.02, 0.9);
    group.add(deltaWing);

    // 4. Two Vertical Rear Tail Fins
    [-0.85, 0.85].forEach((fx, i) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 1.2), accentMat);
      fin.position.set(fx, 0.42, 1.55);
      fin.rotation.z = i === 0 ? 0.22 : -0.22;
      group.add(fin);
    });

    // 5. Two Large Boost Engines + Long Blue Energy Trails
    [-0.55, 0.55].forEach((ex) => {
      const engine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.3, 1.6, 10).rotateX(Math.PI / 2),
        secondaryMat
      );
      engine.position.set(ex, -0.04, 1.65);
      group.add(engine);

      const plume = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 1.85, 10).rotateX(Math.PI / 2),
        engineGlowMat
      );
      plume.position.set(ex, -0.04, 2.95);
      plume.name = 'thrusterPlume';
      group.add(plume);
    });
  }
  // === MODEL 8: TITAN DESTROYER – THE HEAVY PLASMA SHIP ===
  else if (ship.wingStyle === 'titan_destroyer') {
    // 1. Massive Armored Prow & Heavy Hull
    const prow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 2.2), primaryMat);
    prow.position.set(0, 0, -0.8);
    group.add(prow);

    const coreHull = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.78, 2.4), primaryMat);
    coreHull.position.set(0, 0.05, 1.0);
    group.add(coreHull);

    // 2. Armored Cockpit Bridge
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 1.3), secondaryMat);
    bridge.position.set(0, 0.55, 0.4);
    group.add(bridge);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.2, 0.4), cockpitMat);
    visor.position.set(0, 0.58, -0.15);
    group.add(visor);

    // 3. Wide Steel-Plated Battle Wings
    const heavyWing = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.65), primaryMat);
    heavyWing.position.set(0, 0, 0.85);
    group.add(heavyWing);

    const goldPlate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 0.55), secondaryMat);
    goldPlate.position.set(0, 0.02, 0.55);
    group.add(goldPlate);

    // 4. Two Heavy Wing-Mounted Red Laser Cannons
    [-1.85, 1.85].forEach((cx) => {
      const cannonMount = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 1.2), secondaryMat);
      cannonMount.position.set(cx, 0.18, 0.4);
      group.add(cannonMount);

      const heavyBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 2.1, 10).rotateX(Math.PI / 2),
        accentMat
      );
      heavyBarrel.position.set(cx, 0.18, -0.7);
      group.add(heavyBarrel);
    });

    // 5. Four Plasma Thruster Engines
    [-1.1, -0.45, 0.45, 1.1].forEach((ex) => {
      const thruster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 1.2, 10).rotateX(Math.PI / 2),
        secondaryMat
      );
      thruster.position.set(ex, -0.05, 1.85);
      group.add(thruster);

      const plume = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 1.35, 10).rotateX(Math.PI / 2),
        engineGlowMat
      );
      plume.position.set(ex, -0.05, 2.75);
      plume.name = 'thrusterPlume';
      group.add(plume);
    });
  }
  // === MODEL 9: QUANTUM PHOENIX – THE LEGENDARY STARSHIP ===
  else if (ship.wingStyle === 'quantum_phoenix') {
    // 1. Sleek Pearl-White Curved Fuselage
    const frontSpire = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 2.5, 10).rotateX(-Math.PI / 2),
      primaryMat
    );
    frontSpire.position.set(0, 0, -1.35);
    group.add(frontSpire);

    const bodyRingHull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.65, 2.2, 10).rotateX(-Math.PI / 2),
      primaryMat
    );
    bodyRingHull.position.set(0, 0, 0.9);
    group.add(bodyRingHull);

    // 2. Pulsing Crystal Energy Core in Center
    const crystalCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.48, 0),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    crystalCore.position.set(0, 0.38, 0.35);
    crystalCore.name = 'quantumCore';
    group.add(crystalCore);

    // 3. Translucent Crystal Energy Wings + Side Crystal Blades
    const crystalWingMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.82,
      roughness: 0.15,
    });

    [-1, 1].forEach((dir) => {
      const mainBlade = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 1.25), crystalWingMat);
      mainBlade.position.set(dir * 1.45, 0.08, 0.75);
      mainBlade.rotation.z = dir * 0.18;
      group.add(mainBlade);

      const subCrystal = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.65), accentMat);
      subCrystal.position.set(dir * 1.65, -0.15, 0.95);
      subCrystal.rotation.z = -dir * 0.22;
      group.add(subCrystal);
    });

    // 4. Circular Quantum Energy Ring Shield
    const quantumHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.07, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    quantumHalo.rotation.x = Math.PI / 2;
    quantumHalo.position.set(0, 0.05, 0.55);
    quantumHalo.name = 'quantumRing';
    group.add(quantumHalo);

    // 5. Six Glowing Quantum Thrusters
    [-1.25, -0.78, -0.32, 0.32, 0.78, 1.25].forEach((ex) => {
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 1.1, 8).rotateX(Math.PI / 2),
        secondaryMat
      );
      pod.position.set(ex, -0.04, 1.65);
      group.add(pod);

      const plume = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 1.45, 8).rotateX(Math.PI / 2),
        engineGlowMat
      );
      plume.position.set(ex, -0.04, 2.55);
      plume.name = 'thrusterPlume';
      group.add(plume);
    });
  }
  // === ORIGINAL 6 SPACESHIP MODELS ===
  else {
    const noseGeo = new THREE.ConeGeometry(0.55, 2.2, 8);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, primaryMat);
    noseMesh.position.set(0, 0, -1.2);
    group.add(noseMesh);

    const hullGeo = new THREE.CylinderGeometry(0.55, 0.72, 2.4, 8);
    hullGeo.rotateX(-Math.PI / 2);
    const hullMesh = new THREE.Mesh(hullGeo, primaryMat);
    hullMesh.position.set(0, 0, 0.9);
    group.add(hullMesh);

    const canopyGeo = new THREE.SphereGeometry(0.42, 12, 10);
    canopyGeo.scale(0.85, 0.65, 1.85);
    const canopyMesh = new THREE.Mesh(canopyGeo, cockpitMat);
    canopyMesh.position.set(0, 0.35, -0.1);
    group.add(canopyMesh);

    const wingSpan =
      ship.wingStyle === 'legend_phoenix' ? 4.4 : ship.wingStyle === 'falcon' ? 3.8 : 3.4;
    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.12, 1.35), secondaryMat);
    mainWing.position.set(0, -0.04, 0.75);
    group.add(mainWing);

    const finGeo = new THREE.BoxGeometry(0.12, 0.75, 1.1);
    const leftFin = new THREE.Mesh(finGeo, primaryMat);
    leftFin.position.set(-wingSpan / 2, 0.22, 0.85);
    leftFin.rotation.z = 0.25;
    group.add(leftFin);

    const rightFin = new THREE.Mesh(finGeo, primaryMat);
    rightFin.position.set(wingSpan / 2, 0.22, 0.85);
    rightFin.rotation.z = -0.25;
    group.add(rightFin);

    if (ship.wingStyle === 'plasma_ring' || ship.wingStyle === 'legend_phoenix') {
      const haloRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.07, 8, 24),
        engineGlowMat
      );
      haloRing.position.set(0, 0.05, 1.1);
      group.add(haloRing);
    }

    if (ship.wingStyle === 'quantum_x' || ship.wingStyle === 'legend_phoenix') {
      const xWingA = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.7), primaryMat);
      xWingA.position.set(0, 0.15, 0.85);
      xWingA.rotation.z = 0.32;
      group.add(xWingA);

      const xWingB = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.7), primaryMat);
      xWingB.position.set(0, 0.15, 0.85);
      xWingB.rotation.z = -0.32;
      group.add(xWingB);
    }

    [-0.65, 0.65].forEach((xOffset) => {
      const nacelle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 1.5, 8).rotateX(Math.PI / 2),
        secondaryMat
      );
      nacelle.position.set(xOffset, -0.05, 1.45);
      group.add(nacelle);

      const plume = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 1.1, 8).rotateX(Math.PI / 2),
        engineGlowMat
      );
      plume.position.set(xOffset, -0.05, 2.45);
      plume.name = 'thrusterPlume';
      group.add(plume);
    });
  }

  // Upgrade Laser Cannons (scaled by laserLevel)
  const cannonMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.2,
  });
  const cannonPositions =
    laserLevel >= 3 ? [-1.35, -0.85, 0.85, 1.35] : [-1.15, 1.15];
  cannonPositions.forEach((cx) => {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1.3, 6).rotateX(Math.PI / 2),
      cannonMat
    );
    barrel.position.set(cx, -0.08, 0.1);
    group.add(barrel);
  });

  // Muzzle Flash Glow Node at Nose (activates on shooting)
  const muzzleGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
    })
  );
  muzzleGlow.position.set(0, 0, -2.1);
  muzzleGlow.name = 'muzzleFlashGlow';
  group.add(muzzleGlow);

  // 3D Holographic Armor Shield Dome
  const shieldGeo = new THREE.SphereGeometry(2.4, 16, 12);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: armorLevel > 1 ? 0.1 : 0.0,
    wireframe: true,
    depthWrite: false,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.name = 'playerArmorShield';
  group.add(shieldMesh);

  return group;
}

/**
 * Builds a lightweight multi-part 3D Alien Character seated inside the UFO cockpit
 */
export function buildAlienCharacter(alien: AlienTypeConfig): THREE.Group {
  const alienGroup = new THREE.Group();
  alienGroup.name = 'alienPilot';

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(alien.bodyColor),
    roughness: 0.5,
    metalness: 0.15,
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(alien.eyeColor),
  });

  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x020617 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.42, 8), skinMat);
  torso.position.y = 0.15;
  alienGroup.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skinMat);
  head.position.y = 0.55;
  head.name = 'alienHead';
  alienGroup.add(head);

  [-0.12, 0.12].forEach((ex, i) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 6), eyeMat);
    eye.position.set(ex, 0.58, 0.26);
    eye.name = i === 0 ? 'alienEyeL' : 'alienEyeR';
    alienGroup.add(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), pupilMat);
    pupil.position.set(ex, 0.58, 0.33);
    alienGroup.add(pupil);
  });

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x0f172a })
  );
  mouth.position.set(0, 0.44, 0.29);
  mouth.name = 'alienMouth';
  alienGroup.add(mouth);

  if (alien.feature === 'antennae') {
    [-0.14, 0.14].forEach((ax) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), skinMat);
      stalk.position.set(ax, 0.9, 0);
      alienGroup.add(stalk);
    });
  } else if (alien.feature === 'horns' || alien.feature === 'ice_spikes') {
    [-0.18, 0.18].forEach((hx, i) => {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.32, 6),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      horn.position.set(hx, 0.88, 0);
      horn.rotation.z = i === 0 ? 0.35 : -0.35;
      alienGroup.add(horn);
    });
  } else if (alien.feature === 'supreme_crown' || alien.feature === 'crystal_crown') {
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.18, 0.22, 8),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    crown.position.set(0, 0.92, 0);
    alienGroup.add(crown);
  }

  return alienGroup;
}

/**
 * Builds a complete, fast-rendering 3D UFO + Alien Pilot Group
 */
export function buildUfoWithAlien(
  ufo: UfoTypeConfig,
  alien: AlienTypeConfig,
  _isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(ufo.color),
    metalness: 0.72,
    roughness: 0.28,
  });

  const accentMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(ufo.accentColor),
  });

  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    metalness: 0.1,
    roughness: 0.15,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  // 1. Main Saucer Disc (16 segments for lightweight 60fps)
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.55, 0.38, 16), hullMat);
  saucer.name = 'ufoSaucer';
  group.add(saucer);

  // 2. Lower Reactor Core Cone
  const bottomGeo = new THREE.ConeGeometry(0.85, 0.48, 12);
  bottomGeo.rotateX(Math.PI);
  const bottomCore = new THREE.Mesh(bottomGeo, accentMat);
  bottomCore.position.y = -0.35;
  group.add(bottomCore);

  // 3. Glowing Perimeter Ring
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.08, 8, 20), accentMat);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.name = 'ufoRim';
  group.add(rimRing);

  // 4. Special UFO Geometry by Ability
  if (ufo.ability === 'spider') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 1.1, 6), hullMat);
      leg.position.set(Math.cos(a) * 1.3, -0.35, Math.sin(a) * 1.3);
      leg.rotation.z = Math.cos(a) * 0.6;
      leg.rotation.x = Math.sin(a) * 0.6;
      group.add(leg);
    }
  } else if (ufo.ability === 'twin_laser' || ufo.ability === 'royal') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.8), hullMat);
    wing.position.y = 0.05;
    group.add(wing);
  } else if (ufo.ability === 'mothership') {
    const outerTorus = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.18, 8, 24), hullMat);
    outerTorus.rotation.x = Math.PI / 2;
    group.add(outerTorus);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 6), accentMat);
      spire.position.set(Math.cos(a) * 2.0, 0.45, Math.sin(a) * 2.0);
      group.add(spire);
    }
  }

  // 5. Alien Pilot Seated Inside
  const alienMesh = buildAlienCharacter(alien);
  alienMesh.position.y = 0.08;
  group.add(alienMesh);

  // 6. Transparent Cockpit Dome
  const domeGeo = new THREE.SphereGeometry(0.88, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 0.14;
  dome.renderOrder = 3;
  group.add(dome);

  if (ufo.ability === 'shield') {
    const shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 12, 10),
      new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      })
    );
    shieldBubble.name = 'ufoShieldBubble';
    group.add(shieldBubble);
  }

  group.scale.setScalar(ufo.scale);
  return group;
}

/**
 * Builds the 3D Futuristic Astronaut + Golden Trophy for the Galactic Champion Scene
 */
export function buildChampionAstronautWithTrophy(): THREE.Group {
  const group = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.3,
    roughness: 0.25,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.9,
    roughness: 0.18,
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.85,
    roughness: 0.15,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.35, 0.6), suitMat);
  group.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.66), goldMat);
  chestPlate.position.set(0, 0.2, 0);
  group.add(chestPlate);

  const jetpack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.45), suitMat);
  jetpack.position.set(0, 0.05, -0.45);
  group.add(jetpack);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), suitMat);
  helmet.position.set(0, 1.12, 0);
  group.add(helmet);

  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 12), visorMat);
  visor.position.set(0, 1.12, 0.14);
  group.add(visor);

  [-0.65, 0.65].forEach((ax, i) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 1.15, 8), suitMat);
    arm.position.set(ax, 0.95, 0.2);
    arm.rotation.z = i === 0 ? -0.45 : 0.45;
    arm.rotation.x = -0.35;
    group.add(arm);
  });

  [-0.28, 0.28].forEach((lx, i) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 1.15, 8), suitMat);
    leg.position.set(lx, -1.15, i === 0 ? -0.1 : 0.1);
    leg.rotation.x = i === 0 ? 0.25 : -0.15;
    group.add(leg);
  });

  const trophyGroup = new THREE.Group();
  trophyGroup.name = 'goldenTrophy';
  trophyGroup.position.set(0, 2.35, 0.35);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.32, 12), goldMat);
  trophyGroup.add(pedestal);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.55, 10), goldMat);
  stem.position.y = 0.4;
  trophyGroup.add(stem);

  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.26, 0.85, 16), goldMat);
  cup.position.y = 0.95;
  trophyGroup.add(cup);

  const starCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), goldMat);
  starCore.position.y = 1.65;
  trophyGroup.add(starCore);

  group.add(trophyGroup);

  return group;
}
