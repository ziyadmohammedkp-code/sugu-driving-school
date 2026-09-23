import { TrackData, Checkpoint, BoostPad, Vector2D } from '../types/game';

// Helper to generate track bounds, inner and outer polygon boundaries from a centerline path
function buildTrackBoundaries(
  path: Array<{ x: number; y: number }>,
  trackWidth: number
): { innerBoundary: Vector2D[]; outerBoundary: Vector2D[]; checkpoints: Checkpoint[] } {
  const n = path.length;
  const inner: Vector2D[] = [];
  const outer: Vector2D[] = [];
  const checkpoints: Checkpoint[] = [];
  const halfWidth = trackWidth / 2;

  for (let i = 0; i < n; i++) {
    const prev = path[(i - 1 + n) % n];
    const curr = path[i];
    const next = path[(i + 1) % n];

    // Tangent vector
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    // Outer & inner boundary points
    const ox = curr.x + nx * (halfWidth + 12);
    const oy = curr.y + ny * (halfWidth + 12);
    const ix = curr.x - nx * (halfWidth + 12);
    const iy = curr.y - ny * (halfWidth + 12);

    outer.push({ x: ox, y: oy });
    inner.push({ x: ix, y: iy });

    // Checkpoint gate (perpendicular to track centerline)
    checkpoints.push({
      id: i,
      x1: curr.x - nx * (halfWidth + 24),
      y1: curr.y - ny * (halfWidth + 24),
      x2: curr.x + nx * (halfWidth + 24),
      y2: curr.y + ny * (halfWidth + 24),
      midX: curr.x,
      midY: curr.y,
      width: trackWidth,
    });
  }

  return { innerBoundary: inner, outerBoundary: outer, checkpoints };
}

// Track 1: Neo Tokyo Metropolis
const track1Path = [
  { x: 500, y: 1200 }, // Start / Finish straight
  { x: 900, y: 1200 },
  { x: 1400, y: 1200 },
  { x: 1900, y: 1200 },
  { x: 2300, y: 1100 }, // Turn 1 right
  { x: 2600, y: 800 },
  { x: 2600, y: 500 }, // Northward straight
  { x: 2400, y: 300 }, // Turn 2 hairpin left
  { x: 2000, y: 300 },
  { x: 1800, y: 500 },
  { x: 1600, y: 700 }, // Chicane
  { x: 1300, y: 700 },
  { x: 1100, y: 500 },
  { x: 1100, y: 300 }, // North loop
  { x: 800, y: 200 },
  { x: 400, y: 300 },
  { x: 250, y: 600 }, // West bend
  { x: 300, y: 950 },
  { x: 400, y: 1150 },
];

const track1Data = buildTrackBoundaries(track1Path, 170);

const TRACK_1: TrackData = {
  id: 'neo-metropolis',
  name: 'Neo Metropolis Downtown',
  difficulty: 'Medium',
  description: 'Downtown skyscraper night street circuit with glowing neon towers, helipads, spectator grandstands, and high-speed avenues.',
  theme: 'neon',
  trackWidth: 170,
  bounds: { minX: 100, minY: 100, maxX: 2800, maxY: 1400 },
  path: track1Path,
  innerBoundary: track1Data.innerBoundary,
  outerBoundary: track1Data.outerBoundary,
  checkpoints: track1Data.checkpoints,
  boostPads: [
    { x: 1100, y: 1200, width: 90, height: 60, angle: 0 },
    { x: 2600, y: 650, width: 60, height: 90, angle: -Math.PI / 2 },
    { x: 1450, y: 700, width: 90, height: 60, angle: Math.PI },
    { x: 320, y: 800, width: 60, height: 90, angle: Math.PI / 2 },
  ],
  startGrid: [
    { x: 600, y: 1170, angle: 0 },
    { x: 520, y: 1230, angle: 0 },
    { x: 440, y: 1170, angle: 0 },
    { x: 360, y: 1230, angle: 0 },
    { x: 280, y: 1170, angle: 0 },
    { x: 200, y: 1230, angle: 0 },
  ],
  scenery: [
    { type: 'tire', x: 2650, y: 1150, radius: 25 },
    { type: 'tire', x: 2450, y: 250, radius: 30 },
  ],
};

// Track 2: Canyon Ridge Circuit
const track2Path = [
  { x: 500, y: 1000 },
  { x: 900, y: 1000 },
  { x: 1300, y: 900 },
  { x: 1600, y: 650 },
  { x: 1500, y: 350 },
  { x: 1200, y: 250 },
  { x: 850, y: 400 },
  { x: 650, y: 300 },
  { x: 350, y: 450 },
  { x: 280, y: 800 },
];
const track2Data = buildTrackBoundaries(track2Path, 180);

const TRACK_2: TrackData = {
  id: 'canyon-ridge',
  name: 'Sunset Canyon Metro',
  difficulty: 'Easy',
  description: 'Golden-hour desert metropolis with luxury hotel towers, palm plazas, wide avenues, and flowing drift corners.',
  theme: 'canyon',
  trackWidth: 180,
  bounds: { minX: 100, minY: 100, maxX: 1800, maxY: 1200 },
  path: track2Path,
  innerBoundary: track2Data.innerBoundary,
  outerBoundary: track2Data.outerBoundary,
  checkpoints: track2Data.checkpoints,
  boostPads: [
    { x: 750, y: 1000, width: 90, height: 60, angle: 0 },
    { x: 1550, y: 550, width: 60, height: 90, angle: -Math.PI / 2 },
    { x: 450, y: 350, width: 80, height: 60, angle: Math.PI * 0.8 },
  ],
  startGrid: [
    { x: 580, y: 970, angle: 0 },
    { x: 500, y: 1030, angle: 0 },
    { x: 420, y: 970, angle: 0 },
    { x: 340, y: 1030, angle: 0 },
  ],
  scenery: [],
};

// Track 3: Cyber Speedway Oval & Chicanes
const track3Path = [
  { x: 500, y: 1300 },
  { x: 1000, y: 1300 },
  { x: 1600, y: 1300 },
  { x: 2100, y: 1200 },
  { x: 2400, y: 950 },
  { x: 2400, y: 500 },
  { x: 2100, y: 250 },
  { x: 1600, y: 200 },
  { x: 1200, y: 400 },
  { x: 900, y: 650 },
  { x: 600, y: 400 },
  { x: 300, y: 300 },
  { x: 180, y: 650 },
  { x: 220, y: 1050 },
];
const track3Data = buildTrackBoundaries(track3Path, 175);

const TRACK_3: TrackData = {
  id: 'cyber-speedway',
  name: 'Cyber Speedway City',
  difficulty: 'Hard',
  description: 'Championship mega-city circuit with high-rise financial district towers, dual chicanes, and waterfront plazas.',
  theme: 'speedway',
  trackWidth: 175,
  bounds: { minX: 80, minY: 80, maxX: 2600, maxY: 1450 },
  path: track3Path,
  innerBoundary: track3Data.innerBoundary,
  outerBoundary: track3Data.outerBoundary,
  checkpoints: track3Data.checkpoints,
  boostPads: [
    { x: 1200, y: 1300, width: 90, height: 60, angle: 0 },
    { x: 2400, y: 700, width: 60, height: 90, angle: -Math.PI / 2 },
    { x: 1800, y: 210, width: 90, height: 60, angle: Math.PI },
    { x: 750, y: 520, width: 70, height: 60, angle: -Math.PI * 0.7 },
  ],
  startGrid: [
    { x: 600, y: 1270, angle: 0 },
    { x: 520, y: 1330, angle: 0 },
    { x: 440, y: 1270, angle: 0 },
    { x: 360, y: 1330, angle: 0 },
    { x: 280, y: 1270, angle: 0 },
  ],
  scenery: [
    { type: 'tire', x: 2480, y: 1050, radius: 25 },
    { type: 'tire', x: 950, y: 720, radius: 25 },
  ],
};

export const TRACKS: Record<string, TrackData> = {
  'neo-metropolis': TRACK_1,
  'canyon-ridge': TRACK_2,
  'cyber-speedway': TRACK_3,
};

export function getTrack(id: string): TrackData {
  return TRACKS[id] || TRACKS['neo-metropolis'];
}

// Distance from point (px, py) to line segment (x1, y1) - (x2, y2)
export function pointDistanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { dist: number; projX: number; projY: number; t: number } {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return { dist: Math.hypot(px - x1, py - y1), projX: x1, projY: y1, t: 0 };
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return { dist: Math.hypot(px - projX, py - projY), projX, projY, t };
}

// Checks if car (px, py) is on the asphalt road or off-track
export function isCarOnTrack(track: TrackData, px: number, py: number): { onTrack: boolean; distToCenter: number } {
  let minDistance = Infinity;
  const path = track.path;
  const n = path.length;

  for (let i = 0; i < n; i++) {
    const p1 = path[i];
    const p2 = path[(i + 1) % n];
    const { dist } = pointDistanceToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  const halfWidth = track.trackWidth / 2;
  return {
    onTrack: minDistance <= halfWidth + 10,
    distToCenter: minDistance,
  };
}

// Line segment intersection detection (for robust checkpoint crossing)
export function lineSegmentsIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  };
  return (
    ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
    ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
  );
}

// Strict track boundary enforcement: clamps car inside barriers
export function clampCarToTrack(
  track: TrackData,
  px: number,
  py: number,
  carRadius: number
): {
  clampedX: number;
  clampedY: number;
  collided: boolean;
  normalX: number;
  normalY: number;
  distToCenter: number;
} {
  let minDistance = Infinity;
  let closestProjX = px;
  let closestProjY = py;
  const path = track.path;
  const n = path.length;

  for (let i = 0; i < n; i++) {
    const p1 = path[i];
    const p2 = path[(i + 1) % n];
    const { dist, projX, projY } = pointDistanceToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
    if (dist < minDistance) {
      minDistance = dist;
      closestProjX = projX;
      closestProjY = projY;
    }
  }

  // Maximum allowed distance from track center line before hitting the guardrail barrier
  const maxAllowedDist = track.trackWidth * 0.48 - carRadius;

  if (minDistance > maxAllowedDist && minDistance > 0.001) {
    const nx = (px - closestProjX) / minDistance;
    const ny = (py - closestProjY) / minDistance;
    return {
      clampedX: closestProjX + nx * maxAllowedDist,
      clampedY: closestProjY + ny * maxAllowedDist,
      collided: true,
      normalX: nx,
      normalY: ny,
      distToCenter: maxAllowedDist,
    };
  }

  return {
    clampedX: px,
    clampedY: py,
    collided: false,
    normalX: 0,
    normalY: 0,
    distToCenter: minDistance,
  };
}
