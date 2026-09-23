import * as THREE from 'three';
import { TrackData, CarSpec, PlayerCarState } from '../types/game';
import { CityEnvironmentData, generateRoadsideTrees } from './cityEnvironment';
import { sounds } from './audio';

export const WORLD_SCALE = 0.12;

export interface ThreeSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  playerCarGroup: THREE.Group;
  playerFrontLeftWheel: THREE.Object3D;
  playerFrontRightWheel: THREE.Object3D;
  playerRearWheels: THREE.Object3D[];
  playerNitroFlame1: THREE.Mesh;
  playerNitroFlame2: THREE.Mesh;
  playerHeadlights: THREE.SpotLight;
  playerBrakeLights: THREE.Mesh;
  remoteCarGroups: Map<string, { group: THREE.Group; nameTag: THREE.Sprite }>;
  animals: Array<{
    group: THREE.Group;
    type: 'cow' | 'goat';
    origY: number;
    seed: number;
    head: THREE.Group;
    tail: THREE.Object3D;
    speechSprite: THREE.Sprite;
    lastMooTime: number;
  }>;
  particles: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }>;
  centerX: number;
  centerY: number;
  trackWidth3D: number;
  camMode: 'chase' | 'close' | 'hood';
  animFrameId?: number;
  mouseDragActive?: boolean;
  mouseOrbitYaw?: number;
  mouseOrbitPitch?: number;
  lastMouseDragTime?: number;
}

// -------------------------------------------------------------
// HELPER: CREATE TEXTURE FOR 3D SPEECH BUBBLE (MOO / BAA)
// -------------------------------------------------------------
function createSpeechBubbleTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(6, 6, 116, 44, 14);
  ctx.fill();
  ctx.stroke();

  // Pointer
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(56, 50);
  ctx.lineTo(64, 60);
  ctx.lineTo(72, 50);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 28);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// -------------------------------------------------------------
// BUILD 3D COW MODEL
// -------------------------------------------------------------
function build3DCow(coatPattern?: string): { group: THREE.Group; head: THREE.Group; tail: THREE.Object3D } {
  const group = new THREE.Group();
  const isBrown = coatPattern === 'spotted_brown';

  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  const spotMat = new THREE.MeshLambertMaterial({ color: isBrown ? 0x78350f : 0x0f172a });
  const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 });
  const hoofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const hornMat = new THREE.MeshLambertMaterial({ color: 0xfef08a });

  // Body
  const bodyGeo = new THREE.BoxGeometry(2.4, 1.4, 1.2);
  const body = new THREE.Mesh(bodyGeo, whiteMat);
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);

  // Body spots
  const spot1Geo = new THREE.BoxGeometry(0.9, 0.7, 1.24);
  const spot1 = new THREE.Mesh(spot1Geo, spotMat);
  spot1.position.set(-0.4, 1.3, 0);
  group.add(spot1);

  const spot2Geo = new THREE.BoxGeometry(0.7, 0.8, 1.24);
  const spot2 = new THREE.Mesh(spot2Geo, spotMat);
  spot2.position.set(0.6, 1.25, 0);
  group.add(spot2);

  // 4 Legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
  const legOffsets = [
    [-0.8, 0.4, -0.4],
    [-0.8, 0.4, 0.4],
    [0.8, 0.4, -0.4],
    [0.8, 0.4, 0.4],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, whiteMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);

    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 6), hoofMat);
    hoof.position.set(lx, 0.1, lz);
    group.add(hoof);
  }

  // Head Group (animatable bobbing)
  const head = new THREE.Group();
  head.position.set(1.4, 1.6, 0);

  const headGeo = new THREE.BoxGeometry(0.9, 0.8, 0.7);
  const headMesh = new THREE.Mesh(headGeo, whiteMat);
  head.add(headMesh);

  // Pink Snout
  const snoutGeo = new THREE.BoxGeometry(0.4, 0.45, 0.6);
  const snout = new THREE.Mesh(snoutGeo, pinkMat);
  snout.position.set(0.55, -0.15, 0);
  head.add(snout);

  // Horns
  const hornGeo = new THREE.ConeGeometry(0.08, 0.35, 5);
  const hornL = new THREE.Mesh(hornGeo, hornMat);
  hornL.position.set(0.1, 0.5, -0.3);
  hornL.rotation.z = -0.4;
  hornL.rotation.x = -0.2;
  head.add(hornL);

  const hornR = new THREE.Mesh(hornGeo, hornMat);
  hornR.position.set(0.1, 0.5, 0.3);
  hornR.rotation.z = -0.4;
  hornR.rotation.x = 0.2;
  head.add(hornR);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.1, 0.15, 0.35);
  const earL = new THREE.Mesh(earGeo, whiteMat);
  earL.position.set(-0.1, 0.2, -0.45);
  head.add(earL);

  const earR = new THREE.Mesh(earGeo, whiteMat);
  earR.position.set(-0.1, 0.2, 0.45);
  head.add(earR);

  group.add(head);

  // Tail
  const tailGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 4);
  const tail = new THREE.Mesh(tailGeo, whiteMat);
  tail.position.set(-1.25, 1.2, 0);
  tail.rotation.z = 0.4;
  group.add(tail);

  return { group, head, tail };
}

// -------------------------------------------------------------
// BUILD 3D GOAT MODEL
// -------------------------------------------------------------
function build3DGoat(coatPattern?: string): { group: THREE.Group; head: THREE.Group; tail: THREE.Object3D } {
  const group = new THREE.Group();
  let coatColor = 0xf8fafc;
  if (coatPattern === 'caramel') coatColor = 0xd97706;
  else if (coatPattern === 'tan') coatColor = 0xf59e0b;
  else if (coatPattern === 'black') coatColor = 0x334155;

  const bodyMat = new THREE.MeshLambertMaterial({ color: coatColor });
  const hornMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
  const beardMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
  const hoofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.6, 0.9, 0.8);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.95;
  body.castShadow = true;
  group.add(body);

  // 4 Slender Legs
  const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.7, 5);
  const legOffsets = [
    [-0.55, 0.35, -0.28],
    [-0.55, 0.35, 0.28],
    [0.55, 0.35, -0.28],
    [0.55, 0.35, 0.28],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);

    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 5), hoofMat);
    hoof.position.set(lx, 0.08, lz);
    group.add(hoof);
  }

  // Head
  const head = new THREE.Group();
  head.position.set(0.9, 1.25, 0);

  const headGeo = new THREE.BoxGeometry(0.65, 0.55, 0.5);
  const headMesh = new THREE.Mesh(headGeo, bodyMat);
  head.add(headMesh);

  // Goat Beard
  const beardGeo = new THREE.ConeGeometry(0.12, 0.3, 4);
  const beard = new THREE.Mesh(beardGeo, beardMat);
  beard.position.set(0.3, -0.35, 0);
  beard.rotation.z = -0.3;
  head.add(beard);

  // Backward curved horns
  const hornGeo = new THREE.ConeGeometry(0.06, 0.45, 5);
  const hornL = new THREE.Mesh(hornGeo, hornMat);
  hornL.position.set(-0.1, 0.4, -0.18);
  hornL.rotation.z = 0.5;
  hornL.rotation.x = -0.2;
  head.add(hornL);

  const hornR = new THREE.Mesh(hornGeo, hornMat);
  hornR.position.set(-0.1, 0.4, 0.18);
  hornR.rotation.z = 0.5;
  hornR.rotation.x = 0.2;
  head.add(hornR);

  group.add(head);

  // Little tail
  const tailGeo = new THREE.ConeGeometry(0.07, 0.25, 4);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.set(-0.85, 1.05, 0);
  tail.rotation.z = -0.8;
  group.add(tail);

  return { group, head, tail };
}

// -------------------------------------------------------------
// BUILD 3D SPORTS CAR
// -------------------------------------------------------------
function build3DCar(carSpec: CarSpec, colorHex?: string): {
  group: THREE.Group;
  frontLeftWheel: THREE.Object3D;
  frontRightWheel: THREE.Object3D;
  rearWheels: THREE.Object3D[];
  nitroFlame1: THREE.Mesh;
  nitroFlame2: THREE.Mesh;
  headlights: THREE.SpotLight;
  brakeLights: THREE.Mesh;
} {
  const group = new THREE.Group();
  const carColor = new THREE.Color(colorHex || carSpec.color);

  // Materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: carColor,
    metalness: 0.65,
    roughness: 0.25,
  });

  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.8,
    roughness: 0.3,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.75,
  });

  const tireMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });

  const isInnova = carSpec.id === 'toyota-innova';

  if (isInnova) {
    // 1. MPV Lower Chassis (longer and slightly wider)
    const chassisGeo = new THREE.BoxGeometry(4.4, 0.65, 1.95);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Tall MPV Cabin (Long roofline extending towards the back)
    const cabinGeo = new THREE.BoxGeometry(2.9, 0.8, 1.65);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(-0.35, 1.15, 0);
    cabin.castShadow = true;
    group.add(cabin);

    // 3. Panoramic MPV Roof with Roof Rails
    const roofGeo = new THREE.BoxGeometry(2.7, 0.08, 1.55);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(-0.35, 1.55, 0);
    group.add(roof);

    // Chrome/Silver Roof Rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.1 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.06), railMat);
    railL.position.set(-0.35, 1.6, -0.7);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.06), railMat);
    railR.position.set(-0.35, 1.6, 0.7);
    group.add(railL);
    group.add(railR);

    // 4. Sloped Front MPV Hood (sleek styling of Crysta/Hycross)
    const hoodGeo = new THREE.BoxGeometry(1.1, 0.35, 1.85);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(1.5, 0.75, 0);
    hood.castShadow = true;
    group.add(hood);

    // Front Chrome Grille with Toyota-like Badge
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.2 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, metalness: 0.9, roughness: 0.1 });
    
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 1.3), grilleMat);
    grille.position.set(2.06, 0.65, 0);
    group.add(grille);

    const logo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8), chromeMat);
    logo.rotation.z = Math.PI / 2;
    logo.position.set(2.11, 0.65, 0);
    group.add(logo);

    // Chrome Trim accent on bumper
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 1.5), chromeMat);
    trim.position.set(2.06, 0.38, 0);
    group.add(trim);

    // 5. Rear Tailgate Spoiler (Integrated at the top edge of the minivan)
    const spoilerGeo = new THREE.BoxGeometry(0.4, 0.06, 1.7);
    const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
    spoiler.position.set(-1.8, 1.55, 0);
    group.add(spoiler);
  } else {
    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(4.2, 0.55, 1.9);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.48;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Cockpit Cabin
    const cabinGeo = new THREE.BoxGeometry(2.1, 0.55, 1.45);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(-0.25, 0.95, 0);
    cabin.castShadow = true;
    group.add(cabin);

    // 3. Cabin Roof
    const roofGeo = new THREE.BoxGeometry(1.8, 0.08, 1.4);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(-0.25, 1.25, 0);
    group.add(roof);

    // 4. Front Hood Scoop / Splitter
    const splitterGeo = new THREE.BoxGeometry(0.8, 0.12, 2.0);
    const splitter = new THREE.Mesh(splitterGeo, blackMat);
    splitter.position.set(2.0, 0.24, 0);
    group.add(splitter);

    // 5. Rear Racing Wing
    const wingGeo = new THREE.BoxGeometry(0.5, 0.08, 2.0);
    const wing = new THREE.Mesh(wingGeo, blackMat);
    wing.position.set(-2.0, 1.2, 0);

    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.08), blackMat);
    strutL.position.set(-1.95, 0.95, -0.6);
    const strutR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.08), blackMat);
    strutR.position.set(-1.95, 0.95, 0.6);

    group.add(wing);
    group.add(strutL);
    group.add(strutR);
  }

  // 6. Wheels Helper
  function createWheel(): THREE.Group {
    const wGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12), rimMat);
    rim.rotation.x = Math.PI / 2;
    wGroup.add(rim);
    return wGroup;
  }

  const wheelY = isInnova ? 0.42 : 0.38;
  const wheelZ = isInnova ? 1.04 : 1.02;
  const wheelXFront = isInnova ? 1.4 : 1.3;
  const wheelXRear = isInnova ? -1.4 : -1.3;

  // Front Wheels (pivotable for steering)
  const frontLeftPivot = new THREE.Group();
  frontLeftPivot.position.set(wheelXFront, wheelY, -wheelZ);
  const flWheel = createWheel();
  frontLeftPivot.add(flWheel);
  group.add(frontLeftPivot);

  const frontRightPivot = new THREE.Group();
  frontRightPivot.position.set(wheelXFront, wheelY, wheelZ);
  const frWheel = createWheel();
  frontRightPivot.add(frWheel);
  group.add(frontRightPivot);

  // Rear Wheels
  const rlWheel = createWheel();
  rlWheel.position.set(wheelXRear, wheelY, -wheelZ);
  group.add(rlWheel);

  const rrWheel = createWheel();
  rrWheel.position.set(wheelXRear, wheelY, wheelZ);
  group.add(rrWheel);

  // 7. Headlights
  const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.35), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  lightL.position.set(isInnova ? 2.15 : 2.1, isInnova ? 0.75 : 0.55, -0.65);
  const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.35), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  lightR.position.set(isInnova ? 2.15 : 2.1, isInnova ? 0.75 : 0.55, 0.65);
  group.add(lightL);
  group.add(lightR);

  // Forward Spotlight
  const spotLight = new THREE.SpotLight(0xe0f2fe, 3, 40, Math.PI / 5, 0.35, 1);
  spotLight.position.set(2.2, isInnova ? 0.9 : 0.8, 0);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(12, 0.2, 0);
  group.add(spotTarget);
  spotLight.target = spotTarget;
  group.add(spotLight);

  // 8. Taillights / Brake Lights
  const brakeGeo = new THREE.BoxGeometry(0.1, isInnova ? 0.45 : 0.14, isInnova ? 1.55 : 1.4);
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const brakeLights = new THREE.Mesh(brakeGeo, brakeMat);
  brakeLights.position.set(isInnova ? -1.82 : -2.1, isInnova ? 1.0 : 0.6, 0);
  group.add(brakeLights);

  // 9. Nitro Exhaust Flames
  const flameGeo = new THREE.ConeGeometry(0.18, 0.9, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0 });

  const nitroFlame1 = new THREE.Mesh(flameGeo, flameMat);
  nitroFlame1.rotation.z = Math.PI / 2;
  nitroFlame1.position.set(-2.6, 0.35, -0.4);
  group.add(nitroFlame1);

  const nitroFlame2 = new THREE.Mesh(flameGeo, flameMat.clone());
  nitroFlame2.rotation.z = Math.PI / 2;
  nitroFlame2.position.set(-2.6, 0.35, 0.4);
  group.add(nitroFlame2);

  return {
    group,
    frontLeftWheel: frontLeftPivot,
    frontRightWheel: frontRightPivot,
    rearWheels: [rlWheel, rrWheel],
    nitroFlame1,
    nitroFlame2,
    headlights: spotLight,
    brakeLights,
  };
}

// -------------------------------------------------------------
// MAIN INITIALIZATION FOR THE 3D SCENE
// -------------------------------------------------------------
export function initThreeScene(
  container: HTMLElement,
  track: TrackData,
  playerSpec: CarSpec,
  playerColor?: string
): ThreeSceneContext {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // 1. Scene & Dark Skybox with Cyber City Fog
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b14);
  scene.fog = new THREE.FogExp2(0x070b14, 0.0075);

  // 2. Camera (3D Third-Person Perspective)
  const camera = new THREE.PerspectiveCamera(62, width / height, 0.2, 500);

  // 3. WebGL Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 4. Center Coordinates
  const b = track.bounds;
  const centerX = (b.minX + b.maxX) / 2;
  const centerY = (b.minY + b.maxY) / 2;
  const trackWidth3D = track.trackWidth * WORLD_SCALE;

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0x94a3b8, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xe0f2fe, 1.8);
  dirLight.position.set(60, 100, 40);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 300;
  dirLight.shadow.camera.left = -120;
  dirLight.shadow.camera.right = 120;
  dirLight.shadow.camera.top = 120;
  dirLight.shadow.camera.bottom = -120;
  scene.add(dirLight);

  // 6. Ground Foundation (Terrain)
  const groundGeo = new THREE.PlaneGeometry(1200, 1200);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x08101e });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.05;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // 7. BUILD 3D ROAD SURFACE WITH GUARDRAIL BARRIERS
  const path = track.path;
  const n = path.length;
  const halfW = trackWidth3D / 2;

  // Generate track road ribbon geometry
  const roadIndices: number[] = [];
  const roadPositions: number[] = [];
  const roadUvs: number[] = [];

  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const curr = path[idx];
    const next = path[(idx + 1) % n];
    const prev = path[(idx - 1 + n) % n];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * halfW;
    const nz = (dx / len) * halfW;

    const cx = (curr.x - centerX) * WORLD_SCALE;
    const cz = (curr.y - centerY) * WORLD_SCALE;

    // Left vertex
    roadPositions.push(cx - nx, 0.05, cz - nz);
    roadUvs.push(0, i / n);

    // Right vertex
    roadPositions.push(cx + nx, 0.05, cz + nz);
    roadUvs.push(1, i / n);

    if (i < n) {
      const v = i * 2;
      roadIndices.push(v, v + 1, v + 2);
      roadIndices.push(v + 1, v + 3, v + 2);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();

  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.85,
    metalness: 0.1,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // Guardrail Safety Barriers along both borders
  const railMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.8 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });

  for (let i = 0; i < n; i++) {
    const curr = path[i];
    const next = path[(i + 1) % n];
    const prev = path[(i - 1 + n) % n];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (halfW + 0.6);
    const nz = (dx / len) * (halfW + 0.6);

    const cx = (curr.x - centerX) * WORLD_SCALE;
    const cz = (curr.y - centerY) * WORLD_SCALE;

    // Left post
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6), postMat);
    postL.position.set(cx - nx, 0.6, cz - nz);
    scene.add(postL);

    // Right post
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6), postMat);
    postR.position.set(cx + nx, 0.6, cz + nz);
    scene.add(postR);
  }

  // 8. MANY TREES ON BOTH SIDES OF THE ROAD
  const roadsideTrees = generateRoadsideTrees(track);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

  for (const tree of roadsideTrees) {
    const tx = (tree.x - centerX) * WORLD_SCALE;
    const tz = (tree.y - centerY) * WORLD_SCALE;
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, 0, tz);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 2.2, 6), trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    tGroup.add(trunk);

    // Tiered Foliage Cones
    const foliageMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(tree.color) });
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(tree.radius * 0.08, 2.5, 7), foliageMat);
    cone1.position.y = 2.8;
    cone1.castShadow = true;
    tGroup.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(tree.radius * 0.065, 2.2, 7), foliageMat);
    cone2.position.y = 4.2;
    cone2.castShadow = true;
    tGroup.add(cone2);

    scene.add(tGroup);
  }

  // 9. COWS AND GOATS SCATTERED AROUND THE AREA
  const animalsList: ThreeSceneContext['animals'] = [];
  const mooTex = createSpeechBubbleTexture('🐮 Moo!');
  const baaTex = createSpeechBubbleTexture('🐐 Baa!');

  // Populate animals
  const animalDefs = [
    // Cows
    { type: 'cow' as const, x: 620, y: 550, angle: 0.3, coat: 'spotted_black', seed: 1 },
    { type: 'cow' as const, x: 720, y: 580, angle: -1.2, coat: 'spotted_brown', seed: 2 },
    { type: 'cow' as const, x: 800, y: 530, angle: 2.1, coat: 'spotted_black', seed: 3 },
    { type: 'cow' as const, x: 2020, y: 820, angle: 0.8, coat: 'spotted_black', seed: 4 },
    { type: 'cow' as const, x: 2100, y: 800, angle: -2.3, coat: 'spotted_brown', seed: 5 },
    { type: 'cow' as const, x: 1450, y: 980, angle: 1.4, coat: 'spotted_black', seed: 6 },
    { type: 'cow' as const, x: 420, y: 780, angle: -0.6, coat: 'spotted_black', seed: 7 },
    { type: 'cow' as const, x: 340, y: 850, angle: 1.8, coat: 'spotted_brown', seed: 8 },

    // Goats
    { type: 'goat' as const, x: 670, y: 510, angle: -0.8, coat: 'white', seed: 11 },
    { type: 'goat' as const, x: 840, y: 590, angle: 1.6, coat: 'tan', seed: 12 },
    { type: 'goat' as const, x: 570, y: 620, angle: -2.5, coat: 'caramel', seed: 13 },
    { type: 'goat' as const, x: 1980, y: 760, angle: 0.5, coat: 'white', seed: 14 },
    { type: 'goat' as const, x: 2140, y: 860, angle: -1.7, coat: 'black', seed: 15 },
    { type: 'goat' as const, x: 1520, y: 940, angle: 2.4, coat: 'caramel', seed: 16 },
    { type: 'goat' as const, x: 460, y: 820, angle: -0.2, coat: 'white', seed: 17 },
  ];

  for (const a of animalDefs) {
    const ax = (a.x - centerX) * WORLD_SCALE;
    const az = (a.y - centerY) * WORLD_SCALE;

    let res: { group: THREE.Group; head: THREE.Group; tail: THREE.Object3D };
    if (a.type === 'cow') {
      res = build3DCow(a.coat);
    } else {
      res = build3DGoat(a.coat);
    }

    res.group.position.set(ax, 0, az);
    res.group.rotation.y = -a.angle;
    scene.add(res.group);

    // Floating speech bubble
    const spriteMat = new THREE.SpriteMaterial({
      map: a.type === 'cow' ? mooTex : baaTex,
      transparent: true,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4, 2, 1);
    sprite.position.set(ax, a.type === 'cow' ? 3.8 : 3.0, az);
    scene.add(sprite);

    animalsList.push({
      group: res.group,
      type: a.type,
      origY: 0,
      seed: a.seed,
      head: res.head,
      tail: res.tail,
      speechSprite: sprite,
      lastMooTime: 0,
    });
  }

  // 10. SKYSCRAPERS & CITY BUILDINGS WITH GLOWING WINDOWS
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.3 });
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const buildingCoords = [
    { x: 350, y: 1360, w: 220, h: 180, height: 42, color: 0x111827 },
    { x: 620, y: 1370, w: 280, h: 170, height: 35, color: 0x0f172a },
    { x: 940, y: 1360, w: 320, h: 190, height: 55, color: 0x18181b },
    { x: 1300, y: 1370, w: 260, h: 170, height: 38, color: 0x172554 },
    { x: 1600, y: 1360, w: 300, h: 180, height: 48, color: 0x111827 },
    { x: 2750, y: 400, w: 220, h: 260, height: 60, color: 0x0f172a },
    { x: 2750, y: 700, w: 210, h: 300, height: 46, color: 0x1e1b4b },
    { x: 1350, y: 850, w: 220, h: 200, height: 45, color: 0x090d16 },
    { x: 1610, y: 860, w: 180, h: 180, height: 32, color: 0x141e33 },
    { x: 2110, y: 500, w: 240, h: 320, height: 65, color: 0x1a102f },
    { x: 1110, y: 20, w: 380, h: 140, height: 50, color: 0x090d16 },
  ];

  for (const bldg of buildingCoords) {
    const bx = (bldg.x + bldg.w / 2 - centerX) * WORLD_SCALE;
    const bz = (bldg.y + bldg.h / 2 - centerY) * WORLD_SCALE;
    const bw = bldg.w * WORLD_SCALE;
    const bd = bldg.h * WORLD_SCALE;
    const bh = bldg.height;

    const bMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bd),
      new THREE.MeshStandardMaterial({ color: bldg.color, roughness: 0.6, metalness: 0.4 })
    );
    bMesh.position.set(bx, bh / 2, bz);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    scene.add(bMesh);

    // Blinking antenna tower on tall buildings
    if (bh > 45) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 8, 5), postMat);
      ant.position.set(bx, bh + 4, bz);
      scene.add(ant);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      beacon.position.set(bx, bh + 8, bz);
      scene.add(beacon);
    }
  }

  // 11. BUILD PLAYER'S 3D CAR
  const playerCarData = build3DCar(playerSpec, playerColor);
  scene.add(playerCarData.group);

  // Position at start grid (0, 0, 0)
  const startP = track.startGrid[0] || { x: 500, y: 1200, angle: 0 };
  const initX = (startP.x - centerX) * WORLD_SCALE;
  const initZ = (startP.y - centerY) * WORLD_SCALE;
  playerCarData.group.position.set(initX, 0, initZ);
  playerCarData.group.rotation.y = -startP.angle;

  // Initial Camera placement (3rd Person Chase Camera)
  camera.position.set(initX - 8, 3.8, initZ);
  camera.lookAt(initX + 5, 1.2, initZ);

  return {
    scene,
    camera,
    renderer,
    playerCarGroup: playerCarData.group,
    playerFrontLeftWheel: playerCarData.frontLeftWheel,
    playerFrontRightWheel: playerCarData.frontRightWheel,
    playerRearWheels: playerCarData.rearWheels,
    playerNitroFlame1: playerCarData.nitroFlame1,
    playerNitroFlame2: playerCarData.nitroFlame2,
    playerHeadlights: playerCarData.headlights,
    playerBrakeLights: playerCarData.brakeLights,
    remoteCarGroups: new Map(),
    animals: animalsList,
    particles: [],
    centerX,
    centerY,
    trackWidth3D,
    camMode: 'chase',
  };
}

// -------------------------------------------------------------
// UPDATE & RENDER LOOP FOR THE 3D THIRD-PERSON VIEW
// -------------------------------------------------------------
export function updateThreeScene(
  ctx: ThreeSceneContext,
  playerState: PlayerCarState,
  steerInput: number,
  now: number,
  remoteStates: Record<string, PlayerCarState>
) {
  const {
    scene,
    camera,
    renderer,
    playerCarGroup,
    playerFrontLeftWheel,
    playerFrontRightWheel,
    playerRearWheels,
    playerNitroFlame1,
    playerNitroFlame2,
    playerBrakeLights,
    animals,
    centerX,
    centerY,
    camMode,
  } = ctx;

  // 1. Position & Rotate Player Car
  const px = (playerState.x - centerX) * WORLD_SCALE;
  const pz = (playerState.y - centerY) * WORLD_SCALE;
  const py = 0;

  playerCarGroup.position.set(px, py, pz);
  playerCarGroup.rotation.y = -playerState.angle;

  // Steering angle on front wheels
  const maxSteerAngle = 0.45;
  const currentSteer = -steerInput * maxSteerAngle;
  playerFrontLeftWheel.rotation.y = currentSteer;
  playerFrontRightWheel.rotation.y = currentSteer;

  // Wheel spin rotation based on speed
  const spinSpeed = (playerState.speed * WORLD_SCALE * 0.08);
  for (const wheel of playerRearWheels) {
    wheel.rotation.x += spinSpeed;
  }

  // 2. Nitro Flames Animation
  const isNitro = playerState.speed > 160 && (playerState as unknown as { nitroActive?: boolean }).nitroActive;
  const nitroMat1 = playerNitroFlame1.material as THREE.MeshBasicMaterial;
  const nitroMat2 = playerNitroFlame2.material as THREE.MeshBasicMaterial;

  if (isNitro) {
    const flicker = 0.7 + Math.random() * 0.3;
    nitroMat1.opacity = flicker;
    nitroMat2.opacity = flicker;
    playerNitroFlame1.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.8, 1);
    playerNitroFlame2.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.8, 1);
  } else {
    nitroMat1.opacity = 0;
    nitroMat2.opacity = 0;
  }

  // 3. Brake lights illumination
  const brakeMat = playerBrakeLights.material as THREE.MeshBasicMaterial;
  if (playerState.speed < 0 || (playerState as unknown as { brakeActive?: boolean }).brakeActive) {
    brakeMat.color.setHex(0xff0000);
  } else {
    brakeMat.color.setHex(0x7f1d1d);
  }

  // 4. ANIMALS ANIMATION & PROXIMITY ALERT (COWS & GOATS)
  for (const a of animals) {
    const seed = a.seed;
    const ax = a.group.position.x;
    const az = a.group.position.z;

    const dist = Math.hypot(px - ax, pz - az);

    // Proximity trigger (car drives near)
    if (dist < 14 && playerState.speed > 40) {
      if (now - a.lastMooTime > 3500) {
        a.lastMooTime = now;
        if (a.type === 'cow') {
          sounds.playCowMoo();
        } else {
          sounds.playGoatBaa();
        }
      }
    }

    const isAlert = now - a.lastMooTime < 1800;

    // Tail swishing
    const tailRate = isAlert ? 0.015 : 0.005;
    a.tail.rotation.y = Math.sin(now * tailRate + seed) * (isAlert ? 0.7 : 0.25);

    // Head bobbing / grazing
    a.head.rotation.x = Math.sin(now * 0.004 + seed) * (isAlert ? 0.05 : 0.18);

    // Speech bubble visibility
    const sprMat = a.speechSprite.material as THREE.SpriteMaterial;
    if (isAlert) {
      sprMat.opacity = Math.min(1, (1800 - (now - a.lastMooTime)) / 300);
      a.speechSprite.position.y = (a.type === 'cow' ? 3.8 : 3.0) + Math.sin(now * 0.01) * 0.2;
    } else {
      sprMat.opacity = 0;
    }
  }

  // 5. UPDATE REMOTE CARS IN 3D
  for (const [remId, remState] of Object.entries(remoteStates)) {
    if (!ctx.remoteCarGroups.has(remId)) {
      const dummySpec: CarSpec = {
        id: 'remote',
        name: 'Racer',
        category: 'Sports',
        description: '',
        color: '#f59e0b',
        accentColor: '#ffffff',
        maxSpeed: 230,
        acceleration: 8,
        braking: 10,
        handling: 3,
        driftFactor: 1.2,
        nitroPower: 1.4,
      };
      const remCar = build3DCar(dummySpec, '#38bdf8');
      scene.add(remCar.group);

      // Name sprite
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 32;
      const tCtx = canvas.getContext('2d')!;
      tCtx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      tCtx.roundRect(0, 0, 128, 32, 8);
      tCtx.fill();
      tCtx.fillStyle = '#ffffff';
      tCtx.font = 'bold 16px sans-serif';
      tCtx.textAlign = 'center';
      tCtx.textBaseline = 'middle';
      const label = remId === 'local-player-2' ? 'Player 2 (Innova)' : 'Rival';
      tCtx.fillText(label, 64, 16);
      const nameTex = new THREE.CanvasTexture(canvas);
      const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex }));
      nameSprite.scale.set(3, 0.8, 1);
      remCar.group.add(nameSprite);
      nameSprite.position.set(0, 2.2, 0);

      ctx.remoteCarGroups.set(remId, { group: remCar.group, nameTag: nameSprite });
    }

    const remItem = ctx.remoteCarGroups.get(remId)!;
    const rx = (remState.x - centerX) * WORLD_SCALE;
    const rz = (remState.y - centerY) * WORLD_SCALE;
    remItem.group.position.set(rx, 0, rz);
    remItem.group.rotation.y = -remState.angle;
  }

  // 6. THIRD-PERSON CHASE CAMERA ORBIT / SMOOTH TRACKING
  // Handle manual mouse orbit deceleration/snapping
  const timeSinceLastDrag = now - (ctx.lastMouseDragTime || 0);
  if (!ctx.mouseDragActive && timeSinceLastDrag > 1500) {
    // Smoothly ease manual orbit offsets back to zero
    ctx.mouseOrbitYaw = (ctx.mouseOrbitYaw || 0) * 0.9;
    ctx.mouseOrbitPitch = (ctx.mouseOrbitPitch || 0) * 0.9;
  }

  const carHeadingAngle = -playerState.angle;
  const finalYaw = carHeadingAngle + Math.PI + (ctx.mouseOrbitYaw || 0);
  // Clamp pitch so camera stays within reasonable bounds
  const currentOrbitPitch = ctx.mouseOrbitPitch || 0;
  const finalPitch = 0.35 + currentOrbitPitch;

  // Chase camera offset (behind and above)
  let chaseDist = 7.5;
  let chaseHeight = 3.2;

  if (camMode === 'close') {
    chaseDist = 5.2;
    chaseHeight = 2.4;
  } else if (camMode === 'hood') {
    chaseDist = -0.5;
    chaseHeight = 1.3;
  }

  // Desired camera position incorporating orbit rotation
  const horizontalDist = chaseDist * Math.cos(currentOrbitPitch);
  const verticalDist = chaseDist * Math.sin(currentOrbitPitch) + (chaseHeight - chaseDist * Math.sin(0.35));

  const targetCamX = px + Math.cos(finalYaw) * horizontalDist;
  const targetCamY = py + Math.max(0.6, verticalDist);
  const targetCamZ = pz + Math.sin(finalYaw) * horizontalDist;

  // Smooth camera trailing lerp
  const lerpFactor = 0.14;
  camera.position.x += (targetCamX - camera.position.x) * lerpFactor;
  camera.position.y += (targetCamY - camera.position.y) * 0.2;
  camera.position.z += (targetCamZ - camera.position.z) * lerpFactor;

  // Look-ahead target point ahead of the car
  const lookAheadDist = 6.5;
  const forwardX = Math.cos(-playerState.angle);
  const forwardZ = Math.sin(-playerState.angle);
  const lookTargetX = px + forwardX * lookAheadDist;
  const lookTargetY = py + 1.2;
  const lookTargetZ = pz + forwardZ * lookAheadDist;

  camera.lookAt(lookTargetX, lookTargetY, lookTargetZ);

  // Dynamic FOV widening at high nitro speed
  const speedRatio = Math.min(1, playerState.speed / 240);
  const targetFOV = 62 + speedRatio * 10;
  camera.fov += (targetFOV - camera.fov) * 0.1;
  camera.updateProjectionMatrix();

  // Render Frame
  renderer.render(scene, camera);
}

// -------------------------------------------------------------
// CLEANUP
// -------------------------------------------------------------
export function disposeThreeScene(ctx: ThreeSceneContext) {
  if (ctx.animFrameId) {
    cancelAnimationFrame(ctx.animFrameId);
  }
  ctx.renderer.dispose();
  if (ctx.renderer.domElement.parentElement) {
    ctx.renderer.domElement.parentElement.removeChild(ctx.renderer.domElement);
  }
}
