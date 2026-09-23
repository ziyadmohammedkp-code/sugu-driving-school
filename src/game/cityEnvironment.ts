import { TrackData } from '../types/game';
import { sounds } from './audio';

export interface CityBuilding {
  x: number;
  y: number;
  w: number;
  h: number;
  roofColor: string;
  edgeColor: string;
  heightLevel: number; // 1 to 5, determines shadow length and depth
  name?: string;
  neonColor?: string;
  hasHelipad?: boolean;
  hasAC?: boolean;
  hasSolar?: boolean;
  hasAntenna?: boolean;
}

export interface CitySidewalk {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CityPark {
  x: number;
  y: number;
  w: number;
  h: number;
  hasFountain?: boolean;
}

export interface CityCrosswalk {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
}

export interface CityStreetLight {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface CityBillboard {
  x: number;
  y: number;
  angle: number;
  w: number;
  h: number;
  text: string;
  color: string;
  bgColor: string;
}

export interface CityTree {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface CityGrandstand {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  tierColor: string;
}

export interface CityAnimal {
  id: string;
  type: 'cow' | 'goat';
  x: number;
  y: number;
  angle: number; // Orientation in radians
  scale?: number;
  coatPattern?: 'spotted_black' | 'spotted_brown' | 'white' | 'tan' | 'caramel' | 'black';
  seed: number;
  alertUntil?: number; // timestamp until alert state expires
  lastSoundTime?: number;
}

export interface CityEnvironmentData {
  groundColor: string;
  pavementColor: string;
  curbColor: string;
  buildings: CityBuilding[];
  sidewalks: CitySidewalk[];
  parks: CityPark[];
  crosswalks: CityCrosswalk[];
  streetLights: CityStreetLight[];
  billboards: CityBillboard[];
  trees: CityTree[];
  grandstands: CityGrandstand[];
  animals: CityAnimal[];
}

// -------------------------------------------------------------
// HELPER: GENERATE TREES DENSELY LINING BOTH SIDES OF THE ROAD
// -------------------------------------------------------------
export function generateRoadsideTrees(track: TrackData): CityTree[] {
  const trees: CityTree[] = [];
  const path = track.path;
  const n = path.length;
  const halfWidth = track.trackWidth / 2;

  const treePalette = [
    '#047857',
    '#059669',
    '#15803d',
    '#166534',
    '#10b981',
    '#22c55e',
  ];

  // Walk along each track segment and place trees on left and right borders
  for (let i = 0; i < n; i++) {
    const p1 = path[i];
    const p2 = path[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLen = Math.hypot(dx, dy) || 1;
    const stepCount = Math.max(2, Math.floor(segLen / 75)); // A tree every ~75px

    const nx = -dy / segLen;
    const ny = dx / segLen;

    for (let s = 0; s < stepCount; s++) {
      const t = s / stepCount;
      const cx = p1.x + dx * t;
      const cy = p1.y + dy * t;

      const seed = Math.sin((i * 10 + s) * 7.919) * 10000;
      const jitterLeft = ((seed % 10) - 5) * 1.5;
      const jitterRight = (((seed * 3) % 10) - 5) * 1.5;

      const distLeft = halfWidth + 36 + jitterLeft;
      const distRight = halfWidth + 36 + jitterRight;

      // Left side tree
      trees.push({
        x: cx + nx * distLeft,
        y: cy + ny * distLeft,
        radius: 19 + (Math.abs(seed) % 6),
        color: treePalette[Math.abs(Math.floor(seed)) % treePalette.length],
      });

      // Right side tree
      trees.push({
        x: cx - nx * distRight,
        y: cy - ny * distRight,
        radius: 19 + (Math.abs(seed * 2) % 6),
        color: treePalette[Math.abs(Math.floor(seed * 5)) % treePalette.length],
      });
    }
  }

  return trees;
}

// -------------------------------------------------------------
// TRACK 1: NEO METROPOLIS (City with Roadside Trees, Cows & Goats)
// -------------------------------------------------------------
const NEO_METROPOLIS_BASE: CityEnvironmentData = {
  groundColor: '#0b1320',
  pavementColor: '#1e2433',
  curbColor: '#38bdf8',
  sidewalks: [
    { x: 300, y: 1080, w: 1700, h: 22 },
    { x: 300, y: 1300, w: 1700, h: 26 },
    { x: 2690, y: 450, w: 24, h: 420 },
    { x: 2490, y: 450, w: 22, h: 420 },
    { x: 750, y: 80, w: 1350, h: 22 },
    { x: 1250, y: 600, w: 420, h: 22 },
    { x: 1320, y: 820, w: 450, h: 250 },
    { x: 450, y: 400, w: 550, h: 450 },
    { x: 1850, y: 650, w: 400, h: 400 },
  ],
  parks: [
    { x: 550, y: 500, w: 350, h: 250, hasFountain: true },
    { x: 1950, y: 750, w: 220, h: 220, hasFountain: false },
    { x: 1380, y: 920, w: 300, h: 180, hasFountain: false },
    { x: 320, y: 720, w: 180, h: 200, hasFountain: false },
  ],
  buildings: [
    // South skyline
    {
      x: 350,
      y: 1360,
      w: 220,
      h: 180,
      roofColor: '#111827',
      edgeColor: '#1f2937',
      heightLevel: 4,
      name: 'APEX CORP HQ',
      neonColor: '#38bdf8',
      hasHelipad: true,
      hasAntenna: true,
    },
    {
      x: 620,
      y: 1370,
      w: 280,
      h: 170,
      roofColor: '#0f172a',
      edgeColor: '#1e293b',
      heightLevel: 3,
      name: 'HYPERION MOTORS',
      neonColor: '#f59e0b',
      hasAC: true,
    },
    {
      x: 940,
      y: 1360,
      w: 320,
      h: 190,
      roofColor: '#18181b',
      edgeColor: '#27272a',
      heightLevel: 5,
      name: 'CYBER TOWER',
      neonColor: '#06b6d4',
      hasHelipad: true,
      hasAntenna: true,
    },
    {
      x: 1300,
      y: 1370,
      w: 260,
      h: 170,
      roofColor: '#172554',
      edgeColor: '#1e3a8a',
      heightLevel: 3,
      name: 'NEON CASINO',
      neonColor: '#ec4899',
      hasAC: true,
    },
    {
      x: 1600,
      y: 1360,
      w: 300,
      h: 180,
      roofColor: '#111827',
      edgeColor: '#1f2937',
      heightLevel: 4,
      name: 'VERTEX DYNAMICS',
      neonColor: '#10b981',
      hasSolar: true,
    },
    // East district
    {
      x: 2750,
      y: 400,
      w: 220,
      h: 260,
      roofColor: '#0f172a',
      edgeColor: '#1e293b',
      heightLevel: 5,
      name: 'METROPOLIS 101',
      neonColor: '#38bdf8',
      hasHelipad: true,
      hasAntenna: true,
    },
    {
      x: 2750,
      y: 700,
      w: 210,
      h: 300,
      roofColor: '#1e1b4b',
      edgeColor: '#312e81',
      heightLevel: 4,
      name: 'OVERDRIVE CLUB',
      neonColor: '#d946ef',
      hasAC: true,
    },
    // Inner blocks
    {
      x: 1350,
      y: 850,
      w: 220,
      h: 200,
      roofColor: '#090d16',
      edgeColor: '#1e293b',
      heightLevel: 4,
      name: 'SYNERGY PLAZA',
      neonColor: '#00f0ff',
      hasAC: true,
      hasAntenna: true,
    },
    {
      x: 1610,
      y: 860,
      w: 180,
      h: 180,
      roofColor: '#141e33',
      edgeColor: '#1e3a5f',
      heightLevel: 3,
      name: 'HOTEL NITRO',
      neonColor: '#e11d48',
      hasSolar: true,
    },
    {
      x: 2110,
      y: 500,
      w: 240,
      h: 320,
      roofColor: '#1a102f',
      edgeColor: '#2e1065',
      heightLevel: 5,
      name: 'ZENITH SPIRE',
      neonColor: '#a855f7',
      hasHelipad: true,
      hasAntenna: true,
    },
    // North district
    {
      x: 350,
      y: 30,
      w: 320,
      h: 140,
      roofColor: '#0f172a',
      edgeColor: '#1e293b',
      heightLevel: 4,
      name: 'METRO TERMINAL',
      neonColor: '#06b6d4',
      hasHelipad: true,
    },
    {
      x: 1110,
      y: 20,
      w: 380,
      h: 140,
      roofColor: '#090d16',
      edgeColor: '#1e293b',
      heightLevel: 5,
      name: 'CITY HALL',
      neonColor: '#38bdf8',
      hasHelipad: true,
      hasAntenna: true,
    },
  ],
  crosswalks: [
    { x: 380, y: 1200, angle: 0, length: 170, width: 28 },
    { x: 1750, y: 1200, angle: 0, length: 170, width: 28 },
    { x: 2600, y: 920, angle: Math.PI / 2, length: 170, width: 28 },
    { x: 1950, y: 300, angle: 0, length: 170, width: 28 },
    { x: 1250, y: 700, angle: 0, length: 170, width: 28 },
  ],
  streetLights: [
    { x: 500, y: 1100, radius: 180, color: 'rgba(56, 189, 248, 0.28)' },
    { x: 900, y: 1100, radius: 180, color: 'rgba(56, 189, 248, 0.28)' },
    { x: 1300, y: 1100, radius: 180, color: 'rgba(56, 189, 248, 0.28)' },
    { x: 1700, y: 1100, radius: 180, color: 'rgba(56, 189, 248, 0.28)' },
    { x: 2350, y: 1180, radius: 200, color: 'rgba(245, 158, 11, 0.26)' },
    { x: 2500, y: 700, radius: 190, color: 'rgba(56, 189, 248, 0.28)' },
    { x: 800, y: 300, radius: 180, color: 'rgba(16, 185, 129, 0.26)' },
    { x: 350, y: 750, radius: 190, color: 'rgba(56, 189, 248, 0.28)' },
  ],
  billboards: [
    { x: 800, y: 1295, angle: 0, w: 180, h: 18, text: '⚡ APEX NITRO RACING ⚡', color: '#38bdf8', bgColor: '#0f172a' },
    { x: 1250, y: 1295, angle: 0, w: 180, h: 18, text: '🔥 NITROX HYPER FUEL 🔥', color: '#f59e0b', bgColor: '#18181b' },
    { x: 1650, y: 1295, angle: 0, w: 180, h: 18, text: '🏁 VERTEX TIRES 🏁', color: '#10b981', bgColor: '#0f172a' },
    { x: 2685, y: 650, angle: Math.PI / 2, w: 160, h: 18, text: '★ CYBER SPEEDWAY ★', color: '#d946ef', bgColor: '#1e1b4b' },
  ],
  trees: [], // Populated dynamically with trees lining both sides of the road
  grandstands: [
    { x: 700, y: 1330, w: 320, h: 36, angle: 0, tierColor: '#1e293b' },
    { x: 1150, y: 1330, w: 340, h: 36, angle: 0, tierColor: '#1e293b' },
    { x: 1550, y: 1330, w: 300, h: 36, angle: 0, tierColor: '#1e293b' },
  ],
  // Cows and goats scattered in pastures, park greenways, and grassy roadside verges!
  animals: [
    // --- COWS (Scattered around green areas and roadside verges) ---
    { id: 'cow-1', type: 'cow', x: 620, y: 550, angle: 0.3, coatPattern: 'spotted_black', seed: 101 },
    { id: 'cow-2', type: 'cow', x: 720, y: 580, angle: -1.2, coatPattern: 'spotted_black', seed: 102 },
    { id: 'cow-3', type: 'cow', x: 800, y: 530, angle: 2.1, coatPattern: 'spotted_brown', seed: 103 },
    { id: 'cow-4', type: 'cow', x: 2020, y: 820, angle: 0.8, coatPattern: 'spotted_black', seed: 104 },
    { id: 'cow-5', type: 'cow', x: 2100, y: 800, angle: -2.3, coatPattern: 'spotted_brown', seed: 105 },
    { id: 'cow-6', type: 'cow', x: 1450, y: 980, angle: 1.4, coatPattern: 'spotted_black', seed: 106 },
    { id: 'cow-7', type: 'cow', x: 420, y: 780, angle: -0.6, coatPattern: 'spotted_black', seed: 107 },
    { id: 'cow-8', type: 'cow', x: 340, y: 850, angle: 1.8, coatPattern: 'spotted_brown', seed: 108 },
    { id: 'cow-9', type: 'cow', x: 880, y: 1040, angle: -0.4, coatPattern: 'spotted_black', seed: 109 },
    { id: 'cow-10', type: 'cow', x: 1480, y: 1040, angle: 0.9, coatPattern: 'spotted_black', seed: 110 },

    // --- GOATS (Scattered around grassy slopes, parks and road edges) ---
    { id: 'goat-1', type: 'goat', x: 670, y: 510, angle: -0.8, coatPattern: 'white', seed: 201 },
    { id: 'goat-2', type: 'goat', x: 840, y: 590, angle: 1.6, coatPattern: 'tan', seed: 202 },
    { id: 'goat-3', type: 'goat', x: 570, y: 620, angle: -2.5, coatPattern: 'caramel', seed: 203 },
    { id: 'goat-4', type: 'goat', x: 1980, y: 760, angle: 0.5, coatPattern: 'white', seed: 204 },
    { id: 'goat-5', type: 'goat', x: 2140, y: 860, angle: -1.7, coatPattern: 'black', seed: 205 },
    { id: 'goat-6', type: 'goat', x: 1520, y: 940, angle: 2.4, coatPattern: 'caramel', seed: 206 },
    { id: 'goat-7', type: 'goat', x: 460, y: 820, angle: -0.2, coatPattern: 'white', seed: 207 },
    { id: 'goat-8', type: 'goat', x: 1180, y: 1040, angle: 1.1, coatPattern: 'tan', seed: 208 },
    { id: 'goat-9', type: 'goat', x: 1720, y: 1050, angle: -1.9, coatPattern: 'caramel', seed: 209 },
    { id: 'goat-10', type: 'goat', x: 2420, y: 720, angle: 0.7, coatPattern: 'white', seed: 210 },
  ],
};

// -------------------------------------------------------------
// TRACK 2: SUNSET CANYON METRO (Roadside Trees, Cows & Goats)
// -------------------------------------------------------------
const CANYON_METRO_BASE: CityEnvironmentData = {
  groundColor: '#1c130d',
  pavementColor: '#2b1e16',
  curbColor: '#f97316',
  sidewalks: [
    { x: 350, y: 890, w: 800, h: 22 },
    { x: 350, y: 1100, w: 800, h: 26 },
    { x: 1200, y: 400, w: 300, h: 300 },
    { x: 500, y: 450, w: 400, h: 350 },
  ],
  parks: [
    { x: 600, y: 550, w: 250, h: 200, hasFountain: false },
    { x: 950, y: 650, w: 220, h: 180, hasFountain: false },
  ],
  buildings: [
    {
      x: 350,
      y: 1140,
      w: 240,
      h: 160,
      roofColor: '#2d180f',
      edgeColor: '#451a03',
      heightLevel: 3,
      name: 'CANYON HOTEL',
      neonColor: '#f97316',
      hasHelipad: true,
    },
    {
      x: 620,
      y: 1140,
      w: 280,
      h: 170,
      roofColor: '#381a10',
      edgeColor: '#541c08',
      heightLevel: 4,
      name: 'DESERT CASINO',
      neonColor: '#eab308',
      hasAC: true,
      hasAntenna: true,
    },
    {
      x: 930,
      y: 1130,
      w: 260,
      h: 180,
      roofColor: '#29180c',
      edgeColor: '#431407',
      heightLevel: 4,
      name: 'OASIS TOWER',
      neonColor: '#f59e0b',
      hasSolar: true,
    },
    {
      x: 1400,
      y: 40,
      w: 260,
      h: 220,
      roofColor: '#26130b',
      edgeColor: '#3c1809',
      heightLevel: 5,
      name: 'MESA SKYLINE',
      neonColor: '#ea580c',
      hasHelipad: true,
      hasAntenna: true,
    },
  ],
  crosswalks: [
    { x: 420, y: 1000, angle: 0, length: 180, width: 28 },
    { x: 850, y: 1000, angle: 0, length: 180, width: 28 },
  ],
  streetLights: [
    { x: 500, y: 920, radius: 190, color: 'rgba(249, 115, 22, 0.28)' },
    { x: 900, y: 920, radius: 190, color: 'rgba(249, 115, 22, 0.28)' },
    { x: 1400, y: 800, radius: 190, color: 'rgba(234, 179, 8, 0.28)' },
  ],
  billboards: [
    { x: 750, y: 1085, angle: 0, w: 200, h: 18, text: '🏜 CANYON DUST 500 🏜', color: '#f97316', bgColor: '#1c1917' },
  ],
  trees: [],
  grandstands: [
    { x: 650, y: 1110, w: 380, h: 36, angle: 0, tierColor: '#451a03' },
  ],
  animals: [
    { id: 'c-cow-1', type: 'cow', x: 650, y: 580, angle: 0.4, coatPattern: 'spotted_brown', seed: 301 },
    { id: 'c-cow-2', type: 'cow', x: 750, y: 620, angle: -1.3, coatPattern: 'spotted_black', seed: 302 },
    { id: 'c-cow-3', type: 'cow', x: 1000, y: 700, angle: 1.9, coatPattern: 'spotted_brown', seed: 303 },
    { id: 'c-cow-4', type: 'cow', x: 420, y: 600, angle: -0.7, coatPattern: 'spotted_black', seed: 304 },
    { id: 'c-cow-5', type: 'cow', x: 980, y: 850, angle: 0.8, coatPattern: 'spotted_brown', seed: 305 },

    { id: 'c-goat-1', type: 'goat', x: 620, y: 540, angle: -0.5, coatPattern: 'tan', seed: 401 },
    { id: 'c-goat-2', type: 'goat', x: 780, y: 560, angle: 2.2, coatPattern: 'caramel', seed: 402 },
    { id: 'c-goat-3', type: 'goat', x: 1050, y: 660, angle: -1.4, coatPattern: 'white', seed: 403 },
    { id: 'c-goat-4', type: 'goat', x: 460, y: 650, angle: 0.9, coatPattern: 'caramel', seed: 404 },
    { id: 'c-goat-5', type: 'goat', x: 1200, y: 750, angle: -2.1, coatPattern: 'white', seed: 405 },
  ],
};

// -------------------------------------------------------------
// TRACK 3: SPEEDWAY CITY (Roadside Trees, Cows & Goats)
// -------------------------------------------------------------
const SPEEDWAY_BASE: CityEnvironmentData = {
  groundColor: '#0a0d18',
  pavementColor: '#171d30',
  curbColor: '#a855f7',
  sidewalks: [
    { x: 300, y: 1180, w: 1500, h: 22 },
    { x: 300, y: 1400, w: 1500, h: 26 },
    { x: 1200, y: 500, w: 400, h: 400 },
    { x: 400, y: 550, w: 450, h: 400 },
  ],
  parks: [
    { x: 500, y: 650, w: 280, h: 220, hasFountain: true },
    { x: 1300, y: 600, w: 240, h: 220, hasFountain: false },
  ],
  buildings: [
    {
      x: 350,
      y: 1450,
      w: 260,
      h: 180,
      roofColor: '#111827',
      edgeColor: '#1f2937',
      heightLevel: 4,
      name: 'CHAMPIONSHIP TOWER',
      neonColor: '#a855f7',
      hasHelipad: true,
      hasAntenna: true,
    },
    {
      x: 650,
      y: 1450,
      w: 300,
      h: 180,
      roofColor: '#0f172a',
      edgeColor: '#1e293b',
      heightLevel: 4,
      name: 'VELOCITY TECH',
      neonColor: '#06b6d4',
      hasAC: true,
    },
    {
      x: 1000,
      y: 1450,
      w: 320,
      h: 180,
      roofColor: '#1e1b4b',
      edgeColor: '#312e81',
      heightLevel: 5,
      name: 'SPEEDWAY SUITES',
      neonColor: '#ec4899',
      hasHelipad: true,
      hasAntenna: true,
    },
  ],
  crosswalks: [
    { x: 420, y: 1300, angle: 0, length: 175, width: 28 },
    { x: 1500, y: 1300, angle: 0, length: 175, width: 28 },
  ],
  streetLights: [
    { x: 500, y: 1200, radius: 190, color: 'rgba(168, 85, 247, 0.28)' },
    { x: 1100, y: 1200, radius: 190, color: 'rgba(168, 85, 247, 0.28)' },
  ],
  billboards: [
    { x: 800, y: 1390, angle: 0, w: 200, h: 18, text: '★ SPEEDWAY WORLD FINALS ★', color: '#c084fc', bgColor: '#0f172a' },
  ],
  trees: [],
  grandstands: [
    { x: 800, y: 1410, w: 420, h: 36, angle: 0, tierColor: '#1e1b4b' },
  ],
  animals: [
    { id: 's-cow-1', type: 'cow', x: 550, y: 700, angle: 0.3, coatPattern: 'spotted_black', seed: 501 },
    { id: 's-cow-2', type: 'cow', x: 660, y: 750, angle: -1.5, coatPattern: 'spotted_black', seed: 502 },
    { id: 's-cow-3', type: 'cow', x: 1350, y: 640, angle: 1.8, coatPattern: 'spotted_brown', seed: 503 },
    { id: 's-cow-4', type: 'cow', x: 1420, y: 720, angle: -0.8, coatPattern: 'spotted_black', seed: 504 },

    { id: 's-goat-1', type: 'goat', x: 510, y: 670, angle: -0.4, coatPattern: 'white', seed: 601 },
    { id: 's-goat-2', type: 'goat', x: 720, y: 720, angle: 1.4, coatPattern: 'caramel', seed: 602 },
    { id: 's-goat-3', type: 'goat', x: 1380, y: 590, angle: -2.0, coatPattern: 'tan', seed: 603 },
    { id: 's-goat-4', type: 'goat', x: 1480, y: 680, angle: 0.7, coatPattern: 'white', seed: 604 },
  ],
};

// Cached environment data map
const cityDataCache = new Map<string, CityEnvironmentData>();

export function getCityDataForTrack(track: TrackData): CityEnvironmentData {
  if (cityDataCache.has(track.id)) {
    return cityDataCache.get(track.id)!;
  }

  let base: CityEnvironmentData;
  if (track.id === 'canyon-ridge') {
    base = { ...CANYON_METRO_BASE, animals: [...CANYON_METRO_BASE.animals] };
  } else if (track.id === 'cyber-speedway') {
    base = { ...SPEEDWAY_BASE, animals: [...SPEEDWAY_BASE.animals] };
  } else {
    base = { ...NEO_METROPOLIS_BASE, animals: [...NEO_METROPOLIS_BASE.animals] };
  }

  // Generate many trees densely lining BOTH sides of the road
  const roadsideTrees = generateRoadsideTrees(track);
  base.trees = roadsideTrees;

  cityDataCache.set(track.id, base);
  return base;
}

// -------------------------------------------------------------
// CHECK PROXIMITY & TRIGGER CUTE SOUNDS / ALERTS
// -------------------------------------------------------------
export function checkAnimalAlerts(
  animals: CityAnimal[],
  carX: number,
  carY: number,
  carSpeed: number,
  now: number
) {
  if (carSpeed < 30) return;

  for (const animal of animals) {
    const dist = Math.hypot(animal.x - carX, animal.y - carY);
    if (dist < 140) {
      animal.alertUntil = now + 1500;
      if (!animal.lastSoundTime || now - animal.lastSoundTime > 3500) {
        animal.lastSoundTime = now;
        if (animal.type === 'cow') {
          sounds.playCowMoo();
        } else {
          sounds.playGoatBaa();
        }
      }
    }
  }
}

// -------------------------------------------------------------
// DRAW ANIMAL SUBROUTINES (TOP-DOWN 2D COWS & GOATS)
// -------------------------------------------------------------
function drawCow(ctx: CanvasRenderingContext2D, cow: CityAnimal, now: number) {
  const isAlert = cow.alertUntil && now < cow.alertUntil;
  const seed = cow.seed;

  ctx.save();
  ctx.translate(cow.x, cow.y);
  ctx.rotate(cow.angle);

  // Cast drop shadow on grass
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(4, 6, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Four Hooves
  ctx.fillStyle = '#1e293b';
  const legPositions = [
    [-11, -9],
    [-11, 9],
    [9, -9],
    [9, 9],
  ];
  for (const [lx, ly] of legPositions) {
    ctx.fillRect(lx - 2.5, ly - 2.5, 5, 5);
  }

  // 2. Cow Tail with Swish
  const tailSwish = Math.sin((now / 350) + seed) * (isAlert ? 0.6 : 0.25);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.quadraticCurveTo(-22, tailSwish * 10, -25, tailSwish * 14);
  ctx.stroke();

  // Tail tuft
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-25, tailSwish * 14, 3, 0, Math.PI * 2);
  ctx.fill();

  // 3. Cow Body (White base)
  const isBrown = cow.coatPattern === 'spotted_brown';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Patches / Spots (Holstein black or brown patches)
  ctx.fillStyle = isBrown ? '#78350f' : '#0f172a';
  // Spot 1
  ctx.beginPath();
  ctx.ellipse(-6, -4, 6, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Spot 2
  ctx.beginPath();
  ctx.ellipse(5, 3, 7, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Spot 3
  ctx.beginPath();
  ctx.ellipse(-8, 4, 5, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 4. Cow Head with Grazing / Chewing Motion
  const chewOffset = isAlert ? 0 : Math.sin((now / 450) + seed) * 1.5;
  const headX = 17 + chewOffset;
  const headY = 0;

  // Head base
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(headX, headY, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head spot
  ctx.fillStyle = isBrown ? '#78350f' : '#0f172a';
  ctx.beginPath();
  ctx.ellipse(headX - 2, headY - 2, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pink Snout / Muzzle
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.ellipse(headX + 6, headY, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = '#831843';
  ctx.fillRect(headX + 7, headY - 2, 1.8, 1.8);
  ctx.fillRect(headX + 7, headY + 1, 1.8, 1.8);

  // Bovine Ears
  const earTwitch = isAlert ? 0.25 : Math.sin((now / 600) + seed) * 0.1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(headX - 1, headY - 7, 4, 2.5, -0.6 + earTwitch, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headX - 1, headY + 7, 4, 2.5, 0.6 - earTwitch, 0, Math.PI * 2);
  ctx.fill();

  // Cow Horns
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(headX - 2, headY - 5);
  ctx.lineTo(headX + 2, headY - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headX - 2, headY + 5);
  ctx.lineTo(headX + 2, headY + 8);
  ctx.stroke();

  // Dark Eyes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(headX + 2, headY - 4, 1.5, 0, Math.PI * 2);
  ctx.arc(headX + 2, headY + 4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Speech bubble if alert
  if (isAlert) {
    ctx.save();
    ctx.rotate(-cow.angle); // Keep upright
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(-18, -36, 42, 20, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐮 Moo!', 3, -26);
    ctx.restore();
  }

  ctx.restore();
}

function drawGoat(ctx: CanvasRenderingContext2D, goat: CityAnimal, now: number) {
  const isAlert = goat.alertUntil && now < goat.alertUntil;
  const seed = goat.seed;

  ctx.save();
  ctx.translate(goat.x, goat.y);
  ctx.rotate(goat.angle);

  // Cast drop shadow on grass
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(3, 4, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Coat color selection
  let coatColor = '#f8fafc';
  if (goat.coatPattern === 'caramel') coatColor = '#d97706';
  else if (goat.coatPattern === 'tan') coatColor = '#f59e0b';
  else if (goat.coatPattern === 'black') coatColor = '#334155';

  // 1. Four Slender Legs
  ctx.fillStyle = '#1e293b';
  const legs = [
    [-8, -6],
    [-8, 6],
    [7, -6],
    [7, 6],
  ];
  for (const [lx, ly] of legs) {
    ctx.fillRect(lx - 1.8, ly - 1.8, 3.6, 3.6);
  }

  // 2. Short flicking goat tail
  const tailWag = Math.sin((now / 200) + seed) * (isAlert ? 0.7 : 0.3);
  ctx.strokeStyle = coatColor;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-17, tailWag * 6);
  ctx.stroke();

  // 3. Goat Body
  ctx.fillStyle = coatColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Goat Head with Grazing Head-Bob
  const bob = isAlert ? 0 : Math.sin((now / 380) + seed) * 1.8;
  const headX = 13 + bob;
  const headY = 0;

  // Triangular/Tapered head
  ctx.fillStyle = coatColor;
  ctx.beginPath();
  ctx.ellipse(headX, headY, 6.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cute Goat Beard
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(headX + 5, headY);
  ctx.lineTo(headX + 9, headY);
  ctx.stroke();

  // Pointy Perky Ears
  ctx.fillStyle = coatColor;
  ctx.beginPath();
  ctx.ellipse(headX - 1, headY - 5, 3, 1.8, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headX - 1, headY + 5, 3, 1.8, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Backward-curving Goat Horns
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(headX, headY - 3);
  ctx.quadraticCurveTo(headX - 4, headY - 6, headX - 7, headY - 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headX, headY + 3);
  ctx.quadraticCurveTo(headX - 4, headY + 6, headX - 7, headY + 5);
  ctx.stroke();

  // Dark Eyes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(headX + 2, headY - 2.5, 1.2, 0, Math.PI * 2);
  ctx.arc(headX + 2, headY + 2.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Speech bubble if alert
  if (isAlert) {
    ctx.save();
    ctx.rotate(-goat.angle);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(-16, -32, 40, 18, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐐 Baa!', 4, -23);
    ctx.restore();
  }

  ctx.restore();
}

// -------------------------------------------------------------
// MAIN CITY ENVIRONMENT RENDERER (Trees, Buildings, Cows, Goats)
// -------------------------------------------------------------
export function drawCityEnvironment(
  ctx: CanvasRenderingContext2D,
  city: CityEnvironmentData,
  track: TrackData,
  now: number,
  playerX?: number,
  playerY?: number,
  playerSpeed?: number
) {
  const b = track.bounds;
  const padding = 700;

  // Check animal alerts if player car coordinates provided
  if (playerX !== undefined && playerY !== undefined && playerSpeed !== undefined) {
    checkAnimalAlerts(city.animals, playerX, playerY, playerSpeed, now);
  }

  // 1. City Ground Foundation Base (Dark urban soil/asphalt base)
  ctx.fillStyle = city.groundColor;
  ctx.fillRect(b.minX - padding, b.minY - padding, b.maxX - b.minX + padding * 2, b.maxY - b.minY + padding * 2);

  // 2. City Pavement Grid & Road Blocks
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 160;
  const startX = Math.floor((b.minX - padding) / gridSize) * gridSize;
  const endX = Math.ceil((b.maxX + padding) / gridSize) * gridSize;
  const startY = Math.floor((b.minY - padding) / gridSize) * gridSize;
  const endY = Math.ceil((b.maxY + padding) / gridSize) * gridSize;

  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
  ctx.restore();

  // 3. Sidewalks & Plazas
  ctx.save();
  for (const sw of city.sidewalks) {
    ctx.fillStyle = city.pavementColor;
    ctx.fillRect(sw.x, sw.y, sw.w, sw.h);

    ctx.strokeStyle = city.curbColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sw.x, sw.y, sw.w, sw.h);
  }
  ctx.restore();

  // 4. Urban Parks, Green Pastures & Water Fountains (Where animals graze)
  for (const park of city.parks) {
    ctx.save();
    // Lush green lawn
    ctx.fillStyle = '#065f46';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 3;
    ctx.strokeRect(park.x, park.y, park.w, park.h);

    // Walking path inside park
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(park.x + park.w / 2, park.y + park.h / 2, Math.min(park.w, park.h) * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    // Fountain
    if (park.hasFountain) {
      const fx = park.x + park.w / 2;
      const fy = park.y + park.h / 2;
      const fRadius = 26;

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(fx, fy, fRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.stroke();

      const ripple = (now / 600) % 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (1 - ripple) * 0.7 + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy, fRadius * ripple, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5. Crosswalks (Pedestrian Zebra Stripes)
  for (const cw of city.crosswalks) {
    ctx.save();
    ctx.translate(cw.x, cw.y);
    ctx.rotate(cw.angle);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const barWidth = 10;
    const barGap = 10;
    const numBars = Math.floor(cw.width / (barWidth + barGap));
    const startOffset = -cw.width / 2;

    for (let i = 0; i < numBars; i++) {
      const bx = startOffset + i * (barWidth + barGap);
      ctx.fillRect(-cw.length / 2, bx, cw.length, barWidth);
    }
    ctx.restore();
  }

  // 6. Streetlight Glowing Light Halos on the Ground
  for (const light of city.streetLights) {
    ctx.save();
    const grad = ctx.createRadialGradient(light.x, light.y, 10, light.x, light.y, light.radius);
    grad.addColorStop(0, light.color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 7. COWS AND GOATS SCATTERED AROUND THE AREA
  for (const animal of city.animals) {
    if (animal.type === 'cow') {
      drawCow(ctx, animal, now);
    } else {
      drawGoat(ctx, animal, now);
    }
  }

  // 8. MANY TREES ON BOTH SIDES OF THE ROAD
  for (const tree of city.trees) {
    ctx.save();
    // Tree drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(tree.x + 8, tree.y + 12, tree.radius * 1.15, tree.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk center
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Outer dark foliage ring
    ctx.fillStyle = tree.color;
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
    ctx.fill();

    // Secondary mid-tone foliage cluster
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(tree.x - tree.radius * 0.22, tree.y - tree.radius * 0.22, tree.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright canopy highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(tree.x - tree.radius * 0.35, tree.y - tree.radius * 0.35, tree.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 9. Skyscrapers & City Buildings with Rich 2D Rooftops
  for (const bldg of city.buildings) {
    ctx.save();

    // Building Drop Shadow
    const shadowDist = bldg.heightLevel * 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(bldg.x + shadowDist, bldg.y + shadowDist, bldg.w, bldg.h);

    // Building Roof Base
    ctx.fillStyle = bldg.roofColor;
    ctx.fillRect(bldg.x, bldg.y, bldg.w, bldg.h);

    // Parapet Wall Edge Border
    ctx.strokeStyle = bldg.edgeColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(bldg.x + 2, bldg.y + 2, bldg.w - 4, bldg.h - 4);

    // Inner roof inset border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bldg.x + 8, bldg.y + 8, bldg.w - 16, bldg.h - 16);

    // Rooftop Helipad
    if (bldg.hasHelipad && bldg.w > 120 && bldg.h > 120) {
      const hx = bldg.x + bldg.w / 2;
      const hy = bldg.y + bldg.h / 2;
      const padRadius = Math.min(bldg.w, bldg.h) * 0.28;

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(hx, hy, padRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = `bold ${Math.round(padRadius * 1.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', hx, hy);
    }

    // Rooftop AC Condensers
    if (bldg.hasAC) {
      const acCount = 3;
      for (let i = 0; i < acCount; i++) {
        const ax = bldg.x + 20 + i * 35;
        const ay = bldg.y + bldg.h - 35;
        ctx.fillStyle = '#334155';
        ctx.fillRect(ax, ay, 24, 20);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ax, ay, 24, 20);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        const fanAng = (now / 150) + i;
        ctx.beginPath();
        ctx.moveTo(ax + 12 - Math.cos(fanAng) * 6, ay + 10 - Math.sin(fanAng) * 6);
        ctx.lineTo(ax + 12 + Math.cos(fanAng) * 6, ay + 10 + Math.sin(fanAng) * 6);
        ctx.stroke();
      }
    }

    // Solar Panel Arrays
    if (bldg.hasSolar && bldg.w > 140) {
      const sx = bldg.x + bldg.w - 85;
      const sy = bldg.y + 20;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(sx, sy, 65, 45);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, sy, 65, 45);
    }

    // Rooftop Antenna Spire
    if (bldg.hasAntenna) {
      const antX = bldg.x + 25;
      const antY = bldg.y + 25;
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(antX, antY, 6, 0, Math.PI * 2);
      ctx.fill();

      const blink = Math.floor(now / 500) % 2 === 0;
      ctx.fillStyle = blink ? '#ef4444' : '#450a0a';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = blink ? 15 : 0;
      ctx.beginPath();
      ctx.arc(antX, antY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Glowing Rooftop Neon Sign
    if (bldg.name && bldg.neonColor) {
      const nx = bldg.x + bldg.w / 2;
      const ny = bldg.y + (bldg.hasHelipad ? 28 : bldg.h / 2);

      const pulse = 0.85 + Math.sin(now / 350) * 0.15;
      ctx.fillStyle = bldg.neonColor;
      ctx.shadowColor = bldg.neonColor;
      ctx.shadowBlur = 14 * pulse;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bldg.name, nx, ny);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // 10. Spectator Grandstands
  for (const gs of city.grandstands) {
    ctx.save();
    ctx.translate(gs.x, gs.y);
    ctx.rotate(gs.angle);

    const tiers = 4;
    const tierH = gs.h / tiers;
    for (let t = 0; t < tiers; t++) {
      ctx.fillStyle = t % 2 === 0 ? gs.tierColor : '#0f172a';
      ctx.fillRect(-gs.w / 2, t * tierH, gs.w, tierH);

      const crowdSpacing = 14;
      const numPeople = Math.floor(gs.w / crowdSpacing);
      for (let p = 0; p < numPeople; p++) {
        const px = -gs.w / 2 + 7 + p * crowdSpacing;
        const py = t * tierH + tierH / 2;

        const seed = (p * 17 + t * 31) % 5;
        const crowdColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
        ctx.fillStyle = crowdColors[seed];
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-gs.w / 2, 0, gs.w, gs.h);
    ctx.restore();
  }

  // 11. Guardrail Billboards & Sponsor Signs
  for (const bb of city.billboards) {
    ctx.save();
    ctx.translate(bb.x, bb.y);
    ctx.rotate(bb.angle);

    ctx.fillStyle = bb.bgColor;
    ctx.fillRect(-bb.w / 2, -bb.h / 2, bb.w, bb.h);
    ctx.strokeStyle = bb.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = bb.color;
    ctx.shadowBlur = 10;
    ctx.strokeRect(-bb.w / 2, -bb.h / 2, bb.w, bb.h);

    ctx.fillStyle = bb.color;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bb.text, 0, 1);
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}

// -------------------------------------------------------------
// OVERHEAD CITY ELEMENTS (Gantries, Start/Finish Arch)
// -------------------------------------------------------------
export function drawCityOverhead(
  ctx: CanvasRenderingContext2D,
  track: TrackData,
  now: number
) {
  const p0 = track.path[0];
  const p1 = track.path[1];
  if (!p0 || !p1) return;

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const angle = Math.atan2(dy, dx);
  const roadWidth = track.trackWidth;

  ctx.save();
  ctx.translate(p0.x, p0.y);
  ctx.rotate(angle);

  const gantryLength = roadWidth + 50;
  const gantryWidth = 24;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-gantryWidth / 2, -gantryLength / 2, gantryWidth, gantryLength);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-gantryWidth / 2, -gantryLength / 2, gantryWidth, gantryLength);

  const sq = 8;
  const numSq = Math.floor(gantryLength / sq);
  for (let s = 0; s < numSq; s++) {
    ctx.fillStyle = s % 2 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(-gantryWidth / 2 + 2, -gantryLength / 2 + s * sq, gantryWidth - 4, sq);
  }

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-gantryWidth / 2 - 4, -40, gantryWidth + 8, 80);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-gantryWidth / 2 - 4, -40, gantryWidth + 8, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.rotate(Math.PI / 2);
  ctx.fillText('FINISH', 0, 0);
  ctx.restore();

  ctx.restore();
}
