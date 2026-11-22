import * as THREE from 'three';

function makeSeededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createGrassTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRandom(42);

  ctx.fillStyle = '#5f9842';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const shade = rand();
    ctx.fillStyle =
      shade < 0.35
        ? 'rgba(130, 188, 86, 0.35)'
        : shade < 0.7
          ? 'rgba(66, 114, 42, 0.30)'
          : 'rgba(176, 214, 118, 0.22)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createWaterTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRandom(77);

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#1e6e9c');
  grad.addColorStop(0.5, '#2582b5');
  grad.addColorStop(1, '#1c638c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 12 + rand() * 24;
    ctx.fillStyle = 'rgba(180, 232, 255, 0.16)';
    ctx.fillRect(x, y, w, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  return tex;
}

function createFacadeGridTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334d66';
  ctx.fillRect(0, 0, size, size);

  const cols = 4;
  const rows = 6;
  const cw = size / cols;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 3 === 0 ? '#9ed4f0' : '#73b3d9';
      ctx.fillRect(c * cw + 4, r * rh + 3, cw - 8, rh - 6);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function createWoodTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRandom(99);

  ctx.fillStyle = '#4f3524';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const alpha = 0.06 + rand() * 0.1;
    ctx.fillStyle =
      rand() > 0.5 ? `rgba(26,15,8,${alpha})` : `rgba(115,82,56,${alpha})`;
    ctx.fillRect(0, y, size, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  return tex;
}

function createBrickBumpTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#d4d4d4';

  const rows = 8;
  const cols = 4;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      ctx.fillRect(c * cw + offset + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = anisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    4,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(10, 18, 12, 0.52)');
  grad.addColorStop(0.6, 'rgba(10, 18, 12, 0.20)');
  grad.addColorStop(1, 'rgba(10, 18, 12, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export interface CityMaterialLibrary {
  grassBoard: THREE.MeshStandardMaterial;
  grassLight: THREE.MeshStandardMaterial;
  grassDark: THREE.MeshStandardMaterial;
  sandTile: THREE.MeshStandardMaterial;
  hillGrass: THREE.MeshStandardMaterial;
  mountainRock: THREE.MeshStandardMaterial;
  snowCap: THREE.MeshStandardMaterial;
  earthCutaway: THREE.MeshStandardMaterial;
  waterTile: THREE.MeshStandardMaterial;
  walnutFrame: THREE.MeshStandardMaterial;
  brassAccent: THREE.MeshStandardMaterial;
  stonePlinth: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  roadStripe: THREE.MeshStandardMaterial;
  bridgeSteel: THREE.MeshStandardMaterial;
  wallVariants: THREE.MeshStandardMaterial[];
  roofVariants: THREE.MeshStandardMaterial[];
  glassWindow: THREE.MeshStandardMaterial;
  glassTowerFacade: THREE.MeshStandardMaterial;
  warmWindowGlow: THREE.MeshStandardMaterial;
  woodDoor: THREE.MeshStandardMaterial;
  awningStripes: THREE.MeshStandardMaterial[];
  foliageGreens: THREE.MeshStandardMaterial[];
  pineGreen: THREE.MeshStandardMaterial;
  treeTrunk: THREE.MeshStandardMaterial;
  waterPool: THREE.MeshStandardMaterial;
  factoryBrick: THREE.MeshStandardMaterial;
  steelSilo: THREE.MeshStandardMaterial;
  coolingConcrete: THREE.MeshStandardMaterial;
  hazardStripe: THREE.MeshStandardMaterial;
  waterTankBlue: THREE.MeshStandardMaterial;
  policeBlue: THREE.MeshStandardMaterial;
  fireRed: THREE.MeshStandardMaterial;
  hospitalWhite: THREE.MeshStandardMaterial;
  schoolBrick: THREE.MeshStandardMaterial;
  goldMonument: THREE.MeshStandardMaterial;
  windmillTower: THREE.MeshStandardMaterial;
  windmillBlade: THREE.MeshStandardMaterial;
  copperRoof: THREE.MeshStandardMaterial;
  townhallStone: THREE.MeshStandardMaterial;
  solarPanelBlue: THREE.MeshStandardMaterial;
  stadiumTurf: THREE.MeshStandardMaterial;
  stadiumWhite: THREE.MeshStandardMaterial;
  containerColors: THREE.MeshStandardMaterial[];
  trainYellow: THREE.MeshStandardMaterial;
  tarmacDark: THREE.MeshStandardMaterial;
  floodlightGlow: THREE.MeshStandardMaterial;
  carBodies: THREE.MeshStandardMaterial[];
  tireRubber: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  setWindowEmissive: (intensity: number) => void;
  dispose: () => void;
}

export function createCityMaterialLibrary(
  maxAnisotropy = 4
): CityMaterialLibrary {
  const anisotropy = Math.max(1, Math.min(8, maxAnisotropy));

  const grassTex = createGrassTexture(anisotropy);
  const waterTex = createWaterTexture(anisotropy);
  const facadeTex = createFacadeGridTexture(anisotropy);
  const woodTex = createWoodTexture(anisotropy);
  const brickBump = createBrickBumpTexture(anisotropy);
  const shadowTex = createContactShadowTexture();

  const textures = [
    grassTex,
    waterTex,
    facadeTex,
    woodTex,
    brickBump,
    shadowTex,
  ];
  const materials: THREE.Material[] = [];
  const track = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const grassBoard = track(
    new THREE.MeshStandardMaterial({
      map: grassTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0,
    })
  );

  const grassLight = track(
    new THREE.MeshStandardMaterial({
      map: grassTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0,
    })
  );

  const grassDark = track(
    new THREE.MeshStandardMaterial({
      map: grassTex,
      color: 0xf1f5e8,
      roughness: 0.94,
      metalness: 0.0,
    })
  );

  const sandTile = track(
    new THREE.MeshStandardMaterial({
      color: 0xd8c38a,
      roughness: 0.94,
      metalness: 0.0,
    })
  );

  const hillGrass = track(
    new THREE.MeshStandardMaterial({
      map: grassTex,
      color: 0xbfd896,
      roughness: 0.9,
      metalness: 0.0,
    })
  );

  const mountainRock = track(
    new THREE.MeshStandardMaterial({
      color: 0x767f89,
      roughness: 0.92,
      metalness: 0.05,
    })
  );

  const snowCap = track(
    new THREE.MeshStandardMaterial({
      color: 0xeef3f8,
      roughness: 0.65,
      metalness: 0.02,
    })
  );

  const earthCutaway = track(
    new THREE.MeshStandardMaterial({
      color: 0x6e563f,
      roughness: 0.94,
      metalness: 0.0,
    })
  );

  const waterTile = track(
    new THREE.MeshStandardMaterial({
      map: waterTex,
      color: 0xffffff,
      roughness: 0.14,
      metalness: 0.32,
      transparent: true,
      opacity: 0.9,
    })
  );

  const walnutFrame = track(
    new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.05,
    })
  );

  const brassAccent = track(
    new THREE.MeshStandardMaterial({
      color: 0xd9ad4e,
      roughness: 0.24,
      metalness: 0.88,
    })
  );

  const stonePlinth = track(
    new THREE.MeshStandardMaterial({
      color: 0x9aa3ad,
      roughness: 0.86,
      metalness: 0.04,
    })
  );

  const asphalt = track(
    new THREE.MeshStandardMaterial({
      color: 0x353c44,
      roughness: 0.9,
      metalness: 0.04,
    })
  );

  const sidewalk = track(
    new THREE.MeshStandardMaterial({
      color: 0xc2c6ca,
      roughness: 0.82,
      metalness: 0.02,
    })
  );

  const roadStripe = track(
    new THREE.MeshStandardMaterial({
      color: 0xf7f3e3,
      roughness: 0.7,
      metalness: 0.0,
    })
  );

  const bridgeSteel = track(
    new THREE.MeshStandardMaterial({
      color: 0xb94a3e,
      roughness: 0.42,
      metalness: 0.6,
    })
  );

  const wallVariants = [0xe8dcc8, 0xd9be98, 0xcab09a].map((hex) =>
    track(
      new THREE.MeshStandardMaterial({
        color: hex,
        bumpMap: brickBump,
        bumpScale: 0.0025,
        roughness: 0.86,
        metalness: 0.02,
      })
    )
  );

  const roofVariants = [0xb84a2e, 0x37526d, 0xa86428].map((hex) =>
    track(
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.62,
        metalness: 0.08,
      })
    )
  );

  const glassWindow = track(
    new THREE.MeshStandardMaterial({
      color: 0x89c4e8,
      roughness: 0.14,
      metalness: 0.65,
    })
  );

  const glassTowerFacade = track(
    new THREE.MeshStandardMaterial({
      map: facadeTex,
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.55,
      emissive: 0x4b7ea8,
      emissiveIntensity: 0.18,
    })
  );

  const warmWindowGlow = track(
    new THREE.MeshStandardMaterial({
      color: 0xffe49e,
      emissive: 0xffb84d,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.1,
    })
  );

  const woodDoor = track(
    new THREE.MeshStandardMaterial({
      color: 0x6b3e26,
      roughness: 0.72,
      metalness: 0.04,
    })
  );

  const awningStripes = [0xd94f4f, 0x2f7ec4, 0x3b9b6d].map((hex) =>
    track(
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.78,
        metalness: 0.0,
      })
    )
  );

  const foliageGreens = [0x4c9a45, 0x5fb351, 0x3d823b].map((hex) =>
    track(
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.88,
        metalness: 0.0,
      })
    )
  );

  const pineGreen = track(
    new THREE.MeshStandardMaterial({
      color: 0x2c6838,
      roughness: 0.9,
      metalness: 0.0,
    })
  );

  const treeTrunk = track(
    new THREE.MeshStandardMaterial({
      color: 0x6e472b,
      roughness: 0.9,
      metalness: 0.0,
    })
  );

  const waterPool = track(
    new THREE.MeshStandardMaterial({
      color: 0x46b3e6,
      roughness: 0.1,
      metalness: 0.35,
    })
  );

  const factoryBrick = track(
    new THREE.MeshStandardMaterial({
      color: 0x9b5446,
      bumpMap: brickBump,
      bumpScale: 0.003,
      roughness: 0.88,
      metalness: 0.04,
    })
  );

  const steelSilo = track(
    new THREE.MeshStandardMaterial({
      color: 0xb7c2cc,
      roughness: 0.3,
      metalness: 0.82,
    })
  );

  const coolingConcrete = track(
    new THREE.MeshStandardMaterial({
      color: 0xd0d4d8,
      roughness: 0.88,
      metalness: 0.04,
    })
  );

  const hazardStripe = track(
    new THREE.MeshStandardMaterial({
      color: 0xe05d3a,
      roughness: 0.68,
      metalness: 0.08,
    })
  );

  const waterTankBlue = track(
    new THREE.MeshStandardMaterial({
      color: 0x5093cc,
      roughness: 0.36,
      metalness: 0.45,
    })
  );

  const policeBlue = track(
    new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.35,
      metalness: 0.3,
    })
  );

  const fireRed = track(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.42,
      metalness: 0.18,
    })
  );

  const hospitalWhite = track(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.5,
      metalness: 0.08,
    })
  );

  const schoolBrick = track(
    new THREE.MeshStandardMaterial({
      color: 0xc26d43,
      bumpMap: brickBump,
      bumpScale: 0.0025,
      roughness: 0.84,
      metalness: 0.04,
    })
  );

  const goldMonument = track(
    new THREE.MeshStandardMaterial({
      color: 0xf5b942,
      roughness: 0.22,
      metalness: 0.85,
    })
  );

  const windmillTower = track(
    new THREE.MeshStandardMaterial({
      color: 0xf4f6f8,
      roughness: 0.42,
      metalness: 0.18,
    })
  );

  const windmillBlade = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.28,
      metalness: 0.35,
    })
  );

  const copperRoof = track(
    new THREE.MeshStandardMaterial({
      color: 0x4fa38f,
      roughness: 0.38,
      metalness: 0.45,
    })
  );

  const townhallStone = track(
    new THREE.MeshStandardMaterial({
      color: 0xe6dfd3,
      roughness: 0.78,
      metalness: 0.04,
    })
  );

  const solarPanelBlue = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e40af,
      roughness: 0.2,
      metalness: 0.78,
    })
  );

  const stadiumTurf = track(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.72,
      metalness: 0.04,
    })
  );

  const stadiumWhite = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.55,
      metalness: 0.14,
    })
  );

  const containerColors = [0xdc2626, 0x0284c7, 0xf59e0b].map((hex) =>
    track(
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.45,
        metalness: 0.35,
      })
    )
  );

  const trainYellow = track(
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.3,
      metalness: 0.35,
    })
  );

  const tarmacDark = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.12,
    })
  );

  const floodlightGlow = track(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    })
  );

  const carBodies = [0xe05252, 0x3b82f6, 0xf59e0b, 0x10b981, 0xf8fafc].map(
    (hex) =>
      track(
        new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.25,
          metalness: 0.55,
        })
      )
  );

  const tireRubber = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e2226,
      roughness: 0.9,
      metalness: 0.05,
    })
  );

  const contactShadow = track(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    })
  );

  return {
    grassBoard,
    grassLight,
    grassDark,
    sandTile,
    hillGrass,
    mountainRock,
    snowCap,
    earthCutaway,
    waterTile,
    walnutFrame,
    brassAccent,
    stonePlinth,
    asphalt,
    sidewalk,
    roadStripe,
    bridgeSteel,
    wallVariants,
    roofVariants,
    glassWindow,
    glassTowerFacade,
    warmWindowGlow,
    woodDoor,
    awningStripes,
    foliageGreens,
    pineGreen,
    treeTrunk,
    waterPool,
    factoryBrick,
    steelSilo,
    coolingConcrete,
    hazardStripe,
    waterTankBlue,
    policeBlue,
    fireRed,
    hospitalWhite,
    schoolBrick,
    goldMonument,
    windmillTower,
    windmillBlade,
    copperRoof,
    townhallStone,
    solarPanelBlue,
    stadiumTurf,
    stadiumWhite,
    containerColors,
    trainYellow,
    tarmacDark,
    floodlightGlow,
    carBodies,
    tireRubber,
    contactShadow,
    setWindowEmissive: (intensity: number) => {
      warmWindowGlow.emissiveIntensity = intensity;
      glassTowerFacade.emissiveIntensity = Math.max(0.1, intensity * 0.45);
      floodlightGlow.emissiveIntensity = Math.max(0.45, intensity * 1.1);
    },
    dispose: () => {
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
