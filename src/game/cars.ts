import { CarSpec } from '../types/game';

export const CARS: CarSpec[] = [
  {
    id: 'toyota-innova',
    name: 'Toyota Innova MPV',
    category: 'Premium MPV',
    description: 'Iconic family utility cruiser delivering supreme passenger space, luxury comfort, robust highway cruising, and smooth drift glide.',
    color: '#475569', // Sophisticated Slate Grey / Metallic
    accentColor: '#cbd5e1',
    maxSpeed: 620,
    acceleration: 490,
    braking: 540,
    handling: 3.25,
    driftFactor: 0.93,
    nitroPower: 1.5,
  },
  {
    id: 'apex-viper',
    name: 'Apex Viper',
    category: 'Balanced Supercar',
    description: 'Precision engineering with balanced acceleration, top speed, and sharp responsive steering.',
    color: '#ef4444', // Red
    accentColor: '#ffffff',
    maxSpeed: 640,
    acceleration: 480,
    braking: 580,
    handling: 3.3,
    driftFactor: 0.94,
    nitroPower: 1.5,
  },
  {
    id: 'cyber-phantom',
    name: 'Cyber Phantom',
    category: 'Speed Demon',
    description: 'Aerodynamic electric beast with supreme top-end straightaway velocity.',
    color: '#06b6d4', // Cyan
    accentColor: '#38bdf8',
    maxSpeed: 700,
    acceleration: 420,
    braking: 520,
    handling: 2.9,
    driftFactor: 0.92,
    nitroPower: 1.65,
  },
  {
    id: 'drift-ronin',
    name: 'Drift Ronin',
    category: 'Drift Specialist',
    description: 'Lightweight twin-turbo coupe tailored for hairpin slides and rapid corner exits.',
    color: '#eab308', // Gold/Yellow
    accentColor: '#18181b',
    maxSpeed: 610,
    acceleration: 530,
    braking: 640,
    handling: 3.8,
    driftFactor: 0.88,
    nitroPower: 1.45,
  },
  {
    id: 'venom-gt',
    name: 'Venom Muscle',
    category: 'Heavy Torque',
    description: 'V8 supercharged brute with violent low-gear acceleration and durable armor.',
    color: '#a855f7', // Purple
    accentColor: '#f97316',
    maxSpeed: 630,
    acceleration: 550,
    braking: 540,
    handling: 3.0,
    driftFactor: 0.95,
    nitroPower: 1.55,
  },
  {
    id: 'neon-formula',
    name: 'Neon Formula',
    category: 'Grand Prix Racer',
    description: 'Ground-effect open-wheel racing machine with immense downforce and braking power.',
    color: '#10b981', // Emerald Green
    accentColor: '#6ee7b7',
    maxSpeed: 670,
    acceleration: 510,
    braking: 700,
    handling: 3.6,
    driftFactor: 0.97,
    nitroPower: 1.5,
  },
];

export const PRESET_COLORS = [
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#eab308', // Amber/Yellow
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#f97316', // Orange
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f43f5e', // Rose
];

export function getCarById(id: string): CarSpec {
  return CARS.find((c) => c.id === id) || CARS[0];
}

/**
 * Draws a high quality top-down car onto an HTML5 2D canvas context.
 */
export function renderCarCanvas(
  ctx: CanvasRenderingContext2D,
  options: {
    car: CarSpec;
    colorOverride?: string;
    steerAngle?: number;
    drift?: boolean;
    nitro?: boolean;
    isCurrentPlayer?: boolean;
    playerName?: string;
    speed?: number;
    scale?: number;
  }
) {
  const {
    car,
    colorOverride,
    steerAngle = 0,
    nitro = false,
    isCurrentPlayer = false,
    playerName,
    scale = 1,
  } = options;

  const primaryColor = colorOverride || car.color;
  const length = 46 * scale;
  const width = 24 * scale;

  ctx.save();

  // Shadow under car
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(3 * scale, 3 * scale, length * 0.52, width * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Nitro exhaust flames
  if (nitro) {
    ctx.save();
    const flameLen = (18 + Math.random() * 12) * scale;
    const flameGrad = ctx.createLinearGradient(-length / 2, 0, -length / 2 - flameLen, 0);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.3, '#38bdf8');
    flameGrad.addColorStop(0.7, '#0284c7');
    flameGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = flameGrad;
    // Left exhaust
    ctx.beginPath();
    ctx.moveTo(-length / 2, -width * 0.28);
    ctx.lineTo(-length / 2 - flameLen, -width * 0.28 + (Math.random() - 0.5) * 4);
    ctx.lineTo(-length / 2, -width * 0.28 + 5 * scale);
    ctx.fill();

    // Right exhaust
    ctx.beginPath();
    ctx.moveTo(-length / 2, width * 0.28);
    ctx.lineTo(-length / 2 - flameLen, width * 0.28 + (Math.random() - 0.5) * 4);
    ctx.lineTo(-length / 2, width * 0.28 - 5 * scale);
    ctx.fill();
    ctx.restore();
  }

  // Wheels
  const wheelLen = 13 * scale;
  const wheelWidth = 5.5 * scale;
  const wheelRadius = 2.5 * scale;

  const drawWheel = (x: number, y: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-wheelLen / 2, -wheelWidth / 2, wheelLen, wheelWidth, wheelRadius);
    ctx.fill();

    // Rim
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-wheelLen * 0.25, -wheelWidth * 0.25, wheelLen * 0.5, wheelWidth * 0.5);
    ctx.restore();
  };

  // Front wheels (steerable)
  drawWheel(length * 0.3, -width * 0.52, steerAngle * 0.45);
  drawWheel(length * 0.3, width * 0.52, steerAngle * 0.45);

  // Rear wheels (straight)
  drawWheel(-length * 0.3, -width * 0.52, 0);
  drawWheel(-length * 0.3, width * 0.52, 0);

  // Main Car Body
  ctx.save();
  // Chassis gradient
  const bodyGrad = ctx.createLinearGradient(length / 2, 0, -length / 2, 0);
  bodyGrad.addColorStop(0, primaryColor);
  bodyGrad.addColorStop(0.8, primaryColor);
  bodyGrad.addColorStop(1, '#0f172a');

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8 * scale;

  const isInnova = car.id === 'toyota-innova';

  if (isInnova) {
    ctx.beginPath();
    // MPV robust utility box silhouette: slightly longer, taller, blunt sloped hood, flat tailgate rear
    ctx.moveTo(length * 0.46, -width * 0.28);
    ctx.quadraticCurveTo(length * 0.48, 0, length * 0.46, width * 0.28); // Bold Chrome grille line
    ctx.lineTo(length * 0.38, width * 0.46); // Hood corner right
    ctx.lineTo(-length * 0.42, width * 0.46); // Tall robust side panel right
    ctx.lineTo(-length * 0.48, width * 0.38); // Sloped rear hatch right corner
    ctx.lineTo(-length * 0.48, -width * 0.38); // Sloped rear hatch left corner
    ctx.lineTo(-length * 0.42, -width * 0.46); // Tall robust side panel left
    ctx.lineTo(length * 0.38, -width * 0.46); // Hood corner left
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chrome front grille outline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(length * 0.45, -width * 0.16);
    ctx.lineTo(length * 0.45, width * 0.16);
    ctx.stroke();

    // Elegant chrome bonnet line
    ctx.beginPath();
    ctx.moveTo(length * 0.26, -width * 0.4);
    ctx.lineTo(length * 0.34, -width * 0.25);
    ctx.moveTo(length * 0.26, width * 0.4);
    ctx.lineTo(length * 0.34, width * 0.25);
    ctx.stroke();

    // 3-Row Glass Canopy (MPV design with Windshield, Side-glass panels, Cargo-glass)
    const glassGrad = ctx.createLinearGradient(length * 0.22, 0, -length * 0.35, 0);
    glassGrad.addColorStop(0, '#38bdf8');
    glassGrad.addColorStop(0.4, '#0284c7');
    glassGrad.addColorStop(0.8, '#0f172a');
    ctx.fillStyle = glassGrad;

    ctx.beginPath();
    ctx.moveTo(length * 0.2, -width * 0.32);
    ctx.lineTo(length * 0.2, width * 0.32);
    ctx.lineTo(-length * 0.38, width * 0.34);
    ctx.lineTo(-length * 0.38, -width * 0.34);
    ctx.closePath();
    ctx.fill();

    // Cabin Pillars (Dividing the glass into three distinct MPV window panels)
    ctx.fillStyle = '#0f172a';
    // A-pillars
    ctx.fillRect(length * 0.12, -width * 0.34, 2 * scale, width * 0.68);
    // B-pillars
    ctx.fillRect(-length * 0.08, -width * 0.34, 2.5 * scale, width * 0.68);
    // C-pillars
    ctx.fillRect(-length * 0.24, -width * 0.34, 2.5 * scale, width * 0.68);

    // Luxury Roof
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(-length * 0.28, -width * 0.26, length * 0.45, width * 0.52, 4 * scale);
    ctx.fill();

    // Roof Luggage Rails (Chrome look)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-length * 0.16, -width * 0.29, length * 0.36, 1.8 * scale);
    ctx.fillRect(-length * 0.16, width * 0.29 - 1.8 * scale, length * 0.36, 1.8 * scale);

    // Headlights
    ctx.fillStyle = '#ffffff'; // Modern high-power white LED headlights
    ctx.beginPath();
    ctx.ellipse(length * 0.42, -width * 0.32, 4 * scale, 2.5 * scale, 0.1, 0, Math.PI * 2);
    ctx.ellipse(length * 0.42, width * 0.32, 4 * scale, 2.5 * scale, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Taillights (Signature MPV horizontal and vertical split tail lamps)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-length * 0.48, -width * 0.36, 3 * scale, 4 * scale);
    ctx.fillRect(-length * 0.48, width * 0.36 - 4 * scale, 3 * scale, 4 * scale);

    // Sporty Integrated Tailgate Roof Spoiler
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-length * 0.48, -width * 0.32, 2.5 * scale, width * 0.64);
  } else {
    ctx.beginPath();
    // Sleek car silhouette
    ctx.moveTo(length * 0.48, -width * 0.2);
    ctx.quadraticCurveTo(length * 0.52, 0, length * 0.48, width * 0.2); // Front bumper
    ctx.lineTo(length * 0.38, width * 0.44); // Front right fender
    ctx.lineTo(-length * 0.35, width * 0.44); // Right skirt
    ctx.lineTo(-length * 0.48, width * 0.38); // Rear right fender
    ctx.lineTo(-length * 0.5, 0); // Rear bumper
    ctx.lineTo(-length * 0.48, -width * 0.38); // Rear left fender
    ctx.lineTo(-length * 0.35, -width * 0.44); // Left skirt
    ctx.lineTo(length * 0.38, -width * 0.44); // Front left fender
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Racing stripes
    ctx.fillStyle = car.accentColor;
    ctx.fillRect(-length * 0.45, -width * 0.08, length * 0.9, width * 0.16);

    // Windshield & Cabin Glass
    const glassGrad = ctx.createLinearGradient(length * 0.2, 0, -length * 0.25, 0);
    glassGrad.addColorStop(0, '#38bdf8');
    glassGrad.addColorStop(0.5, '#0369a1');
    glassGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = glassGrad;

    ctx.beginPath();
    ctx.moveTo(length * 0.18, -width * 0.26);
    ctx.lineTo(length * 0.18, width * 0.26);
    ctx.lineTo(-length * 0.22, width * 0.3);
    ctx.lineTo(-length * 0.22, -width * 0.3);
    ctx.closePath();
    ctx.fill();

    // Roof
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(-length * 0.12, -width * 0.22, length * 0.24, width * 0.44, 3 * scale);
    ctx.fill();

    // Headlights
    ctx.fillStyle = '#fef08a'; // Bright yellow / white
    ctx.beginPath();
    ctx.ellipse(length * 0.44, -width * 0.3, 3.5 * scale, 2 * scale, 0.2, 0, Math.PI * 2);
    ctx.ellipse(length * 0.44, width * 0.3, 3.5 * scale, 2 * scale, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Taillights
    ctx.fillStyle = '#ef4444'; // Red
    ctx.beginPath();
    ctx.rect(-length * 0.49, -width * 0.35, 2 * scale, 4.5 * scale);
    ctx.rect(-length * 0.49, width * 0.35 - 4.5 * scale, 2 * scale, 4.5 * scale);
    ctx.fill();

    // Rear Spoiler / Wing
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-length * 0.46, -width * 0.46, 3.5 * scale, width * 0.92);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(-length * 0.46, -width * 0.4, 2.5 * scale, width * 0.8);
  }

  ctx.restore();
  ctx.restore();

  // Player Name Tag & Indicator (drawn unrotated if called separately or in local coordinate space)
  if (playerName) {
    ctx.save();
    // Invert the car rotation for text so it always stays upright
    ctx.rotate(0);
    ctx.font = `bold ${Math.max(10, 11 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const textWidth = ctx.measureText(playerName).width;
    const tagY = -width - 8 * scale;

    // Background pill
    ctx.fillStyle = isCurrentPlayer ? 'rgba(15, 23, 42, 0.85)' : 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = isCurrentPlayer ? '#38bdf8' : primaryColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-textWidth / 2 - 8, tagY - 16, textWidth + 16, 20, 10);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = isCurrentPlayer ? '#38bdf8' : '#ffffff';
    ctx.fillText(playerName, 0, tagY);
    ctx.restore();
  }
}
