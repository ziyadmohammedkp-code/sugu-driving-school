import { CarSpec, PlayerCarState, PlayerRaceInput, TrackData } from '../types/game';
import { isCarOnTrack, lineSegmentsIntersect, clampCarToTrack } from './tracks';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'smoke' | 'spark' | 'flame' | 'dust' | 'confetti';
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
}

export class CarPhysics {
  // Local car state
  public state: PlayerCarState;
  public carSpec: CarSpec;
  public track: TrackData;
  public totalLaps: number;

  // Collision shape
  public readonly radius = 18;
  public readonly width = 24;
  public readonly length = 46;

  // Effects
  public skidMarks: SkidMark[] = [];
  public particles: Particle[] = [];
  private particleId = 0;

  // Boost pad state
  private boostTimer = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(
    playerId: string,
    carSpec: CarSpec,
    track: TrackData,
    totalLaps: number,
    initialX: number,
    initialY: number,
    initialAngle: number
  ) {
    this.carSpec = carSpec;
    this.track = track;
    this.totalLaps = totalLaps;

    this.state = {
      playerId,
      x: initialX,
      y: initialY,
      angle: initialAngle,
      vx: 0,
      vy: 0,
      speed: 0,
      drift: false,
      nitroActive: false,
      nitroFuel: 100,
      currentLap: 1,
      currentCheckpoint: 0,
      lapTimes: [],
      currentLapStartTime: Date.now(),
      totalDistance: 0,
      finished: false,
      lastUpdated: Date.now(),
    };

    this.lastX = initialX;
    this.lastY = initialY;
  }

  public update(
    dt: number,
    input: PlayerRaceInput,
    otherCars: PlayerCarState[],
    onCheckpointCrossed?: (checkpoint: number, lap: number) => void,
    onLapFinished?: (lap: number, lapTime: number) => void,
    onRaceFinished?: (totalTime: number, bestLap: number, topSpeed: number) => void,
    onCollision?: (intensity: number) => void
  ) {
    if (this.state.finished) {
      // Slow down smoothly when finished
      this.state.speed *= Math.pow(0.5, dt);
      this.state.vx = Math.cos(this.state.angle) * this.state.speed;
      this.state.vy = Math.sin(this.state.angle) * this.state.speed;
      this.state.x += this.state.vx * dt;
      this.state.y += this.state.vy * dt;
      this.updateParticles(dt);
      return;
    }

    const prevX = this.state.x;
    const prevY = this.state.y;
    this.lastX = prevX;
    this.lastY = prevY;

    // Check if on track surface
    const { onTrack } = isCarOnTrack(this.track, this.state.x, this.state.y);
    const surfaceMultiplier = onTrack ? 1.0 : 0.42;

    // Boost timer decay
    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - dt);
    }

    // Nitro handling
    let isBoosting = false;
    if (input.nitro && this.state.nitroFuel > 5) {
      isBoosting = true;
      this.state.nitroActive = true;
      this.state.nitroFuel = Math.max(0, this.state.nitroFuel - dt * 28);
    } else {
      this.state.nitroActive = false;
      // Passive fuel regeneration when not boosting
      this.state.nitroFuel = Math.min(100, this.state.nitroFuel + dt * 4.5);
    }

    if (this.boostTimer > 0) {
      isBoosting = true;
    }

    // Check boost pad activation
    for (const pad of this.track.boostPads) {
      const dx = Math.abs(this.state.x - pad.x);
      const dy = Math.abs(this.state.y - pad.y);
      if (dx < pad.width * 0.6 && dy < pad.height * 0.6) {
        this.boostTimer = 1.6;
        this.state.nitroFuel = Math.min(100, this.state.nitroFuel + 30);
        this.spawnBoostSparks(pad.x, pad.y);
      }
    }

    // Acceleration & Max Speed
    let maxSpeed = this.carSpec.maxSpeed * surfaceMultiplier;
    let accel = this.carSpec.acceleration * surfaceMultiplier;

    if (isBoosting) {
      maxSpeed *= this.carSpec.nitroPower;
      accel *= 1.65;
    }

    // Steering
    const isDrifting = input.handbrake || (Math.abs(input.steer) > 0.8 && Math.abs(this.state.speed) > 350);
    this.state.drift = isDrifting;

    if (Math.abs(this.state.speed) > 10) {
      const speedRatio = Math.min(1, Math.abs(this.state.speed) / (this.carSpec.maxSpeed * 0.65));
      const steerDirection = this.state.speed >= 0 ? 1 : -1;
      let turnRate = this.carSpec.handling * steerDirection * speedRatio * (isDrifting ? 1.35 : 1.0);
      this.state.angle += input.steer * turnRate * dt;
    }

    // Throttle / Brake
    if (input.throttle > 0) {
      this.state.speed += accel * input.throttle * dt;
      if (this.state.speed > maxSpeed) {
        this.state.speed = Math.max(maxSpeed, this.state.speed - 300 * dt);
      }
    } else if (input.brake > 0) {
      if (this.state.speed > 0) {
        this.state.speed -= this.carSpec.braking * input.brake * dt;
      } else {
        // Reverse
        this.state.speed -= this.carSpec.acceleration * 0.45 * input.brake * dt;
        if (this.state.speed < -maxSpeed * 0.35) {
          this.state.speed = -maxSpeed * 0.35;
        }
      }
    } else {
      // Natural rolling friction
      const friction = onTrack ? 240 : 550;
      if (this.state.speed > 0) {
        this.state.speed = Math.max(0, this.state.speed - friction * dt);
      } else if (this.state.speed < 0) {
        this.state.speed = Math.min(0, this.state.speed + friction * dt);
      }
    }

    // Handbrake friction
    if (input.handbrake) {
      this.state.speed = Math.max(0, this.state.speed - 380 * dt);
    }

    // Calculate heading forward vector
    const forwardX = Math.cos(this.state.angle);
    const forwardY = Math.sin(this.state.angle);

    // Lateral drift blending:
    // With driftFactor, velocity vector aligns to car angle with some slip
    const driftRetention = isDrifting ? this.carSpec.driftFactor : 0.75;
    const targetVx = forwardX * this.state.speed;
    const targetVy = forwardY * this.state.speed;

    this.state.vx = this.state.vx * driftRetention + targetVx * (1 - driftRetention);
    this.state.vy = this.state.vy * driftRetention + targetVy * (1 - driftRetention);

    // Apply movement
    this.state.x += this.state.vx * dt;
    this.state.y += this.state.vy * dt;

    const actualSpeed = Math.hypot(this.state.vx, this.state.vy);
    this.state.totalDistance += actualSpeed * dt;

    // Strict track boundary enforcement: keep car inside the track barriers at all times
    const constraint = clampCarToTrack(this.track, this.state.x, this.state.y, this.radius);
    if (constraint.collided) {
      this.state.x = constraint.clampedX;
      this.state.y = constraint.clampedY;

      // Normal velocity component pointing outward into the barrier
      const vDotN = this.state.vx * constraint.normalX + this.state.vy * constraint.normalY;
      if (vDotN > 0) {
        // Elastic bounce inward off the barrier
        const restitution = 0.28;
        this.state.vx -= (1 + restitution) * vDotN * constraint.normalX;
        this.state.vy -= (1 + restitution) * vDotN * constraint.normalY;

        // Wall scraping friction along tangent
        this.state.vx *= 0.86;
        this.state.vy *= 0.86;
        this.state.speed = Math.hypot(this.state.vx, this.state.vy);

        const impact = Math.min(1.0, Math.abs(vDotN) / 220);
        if (impact > 0.08) {
          onCollision?.(impact);
          this.spawnSparks(this.state.x, this.state.y, -constraint.normalX, -constraint.normalY, Math.round(impact * 8));
        }
      }
    }

    // Car-to-Car Collisions
    for (const other of otherCars) {
      if (!other || other.playerId === this.state.playerId) continue;
      const cdx = this.state.x - other.x;
      const cdy = this.state.y - other.y;
      const dist = Math.hypot(cdx, cdy);
      const minDistance = this.radius * 2;

      if (dist < minDistance && dist > 0.001) {
        // Elastic separation
        const overlap = minDistance - dist;
        const nx = cdx / dist;
        const ny = cdy / dist;

        // Push local car back
        this.state.x += nx * overlap * 0.6;
        this.state.y += ny * overlap * 0.6;

        // Bounce velocity impulse
        const dot = this.state.vx * nx + this.state.vy * ny;
        if (dot < 0) {
          this.state.vx -= 1.6 * dot * nx;
          this.state.vy -= 1.6 * dot * ny;
        }

        this.spawnCollisionSparks((this.state.x + other.x) / 2, (this.state.y + other.y) / 2);
        onCollision?.(Math.min(1, actualSpeed / 400));
      }
    }

    // Checkpoint crossing detection
    const checkpoints = this.track.checkpoints;
    const totalCP = checkpoints.length;
    const nextCPIndex = (this.state.currentCheckpoint + 1) % totalCP;
    const targetGate = checkpoints[nextCPIndex];

    if (
      lineSegmentsIntersect(
        prevX,
        prevY,
        this.state.x,
        this.state.y,
        targetGate.x1,
        targetGate.y1,
        targetGate.x2,
        targetGate.y2
      )
    ) {
      this.state.currentCheckpoint = nextCPIndex;
      onCheckpointCrossed?.(nextCPIndex, this.state.currentLap);

      // If crossing checkpoint 0, a lap is completed!
      if (nextCPIndex === 0) {
        const now = Date.now();
        const lapDuration = (now - this.state.currentLapStartTime) / 1000;
        this.state.lapTimes.push(lapDuration);
        this.state.currentLapStartTime = now;
        onLapFinished?.(this.state.currentLap, lapDuration);

        if (this.state.currentLap >= this.totalLaps) {
          // Race finished!
          this.state.finished = true;
          this.state.finishTime = Date.now();
          const totalRaceTime = this.state.lapTimes.reduce((a, b) => a + b, 0);
          const bestLap = Math.min(...this.state.lapTimes);
          const topSpeedKmh = Math.round(this.carSpec.maxSpeed * (isBoosting ? 1.5 : 1) * 0.36);
          onRaceFinished?.(totalRaceTime, bestLap, topSpeedKmh);
          this.spawnFinishConfetti();
        } else {
          this.state.currentLap += 1;
        }
      }
    }

    // Generate skidmarks & tire smoke when drifting or off-track
    if ((isDrifting && actualSpeed > 140) || !onTrack) {
      this.addSkidmarks(prevX, prevY, this.state.x, this.state.y, this.state.angle, !onTrack);
      this.spawnTireSmoke(!onTrack);
    }

    // Nitro flame particles
    if (this.state.nitroActive || this.boostTimer > 0) {
      this.spawnNitroParticles();
    }

    this.updateParticles(dt);
    this.state.lastUpdated = Date.now();
  }

  private addSkidmarks(x1: number, y1: number, x2: number, y2: number, angle: number, offTrack: boolean) {
    const halfW = 11;
    const perpX = -Math.sin(angle) * halfW;
    const perpY = Math.cos(angle) * halfW;

    // Left and right tire tracks
    this.skidMarks.push({
      x1: x1 + perpX,
      y1: y1 + perpY,
      x2: x2 + perpX,
      y2: y2 + perpY,
      alpha: offTrack ? 0.35 : 0.6,
      width: offTrack ? 4.5 : 3.5,
    });
    this.skidMarks.push({
      x1: x1 - perpX,
      y1: y1 - perpY,
      x2: x2 - perpX,
      y2: y2 - perpY,
      alpha: offTrack ? 0.35 : 0.6,
      width: offTrack ? 4.5 : 3.5,
    });

    // Keep max 400 skid segments to maintain 60 FPS
    if (this.skidMarks.length > 500) {
      this.skidMarks.splice(0, 100);
    }
  }

  private spawnTireSmoke(isDust: boolean) {
    const rearX = this.state.x - Math.cos(this.state.angle) * 18;
    const rearY = this.state.y - Math.sin(this.state.angle) * 18;

    this.particles.push({
      id: this.particleId++,
      x: rearX + (Math.random() - 0.5) * 10,
      y: rearY + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 40 - this.state.vx * 0.1,
      vy: (Math.random() - 0.5) * 40 - this.state.vy * 0.1,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.4,
      size: 4 + Math.random() * 6,
      color: isDust ? '#d97706' : '#cbd5e1',
      type: isDust ? 'dust' : 'smoke',
    });
  }

  private spawnNitroParticles() {
    const rearX = this.state.x - Math.cos(this.state.angle) * 22;
    const rearY = this.state.y - Math.sin(this.state.angle) * 22;

    this.particles.push({
      id: this.particleId++,
      x: rearX,
      y: rearY,
      vx: -Math.cos(this.state.angle) * 120 + (Math.random() - 0.5) * 30,
      vy: -Math.sin(this.state.angle) * 120 + (Math.random() - 0.5) * 30,
      life: 0,
      maxLife: 0.28,
      size: 6 + Math.random() * 4,
      color: Math.random() > 0.4 ? '#38bdf8' : '#60a5fa',
      type: 'flame',
    });
  }

  private spawnCollisionSparks(x: number, y: number) {
    for (let i = 0; i < 16; i++) {
      const spd = 120 + Math.random() * 240;
      const ang = Math.random() * Math.PI * 2;
      this.particles.push({
        id: this.particleId++,
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        size: 2.5 + Math.random() * 2,
        color: Math.random() > 0.3 ? '#fef08a' : '#f97316',
        type: 'spark',
      });
    }
  }

  public spawnSparks(x: number, y: number, dirX: number, dirY: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const ang = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 1.5;
      const spd = 60 + Math.random() * 120;
      this.particles.push({
        id: this.particleId++,
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.35,
        size: 3,
        color: '#f59e0b',
        type: 'spark',
      });
    }
  }

  private spawnBoostSparks(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 100;
      this.particles.push({
        id: this.particleId++,
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.5,
        size: 3,
        color: '#06b6d4',
        type: 'spark',
      });
    }
  }

  private spawnFinishConfetti() {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < 80; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 220;
      this.particles.push({
        id: this.particleId++,
        x: this.state.x,
        y: this.state.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        life: 0,
        maxLife: 2.5 + Math.random() * 1.5,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'confetti',
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'confetti') {
        p.vy += 120 * dt; // Gravity
        p.vx *= 0.98;
      } else if (p.type === 'smoke' || p.type === 'dust') {
        p.size += dt * 8;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
    }
  }
}
