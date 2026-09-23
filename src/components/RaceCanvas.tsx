import React, { useEffect, useRef, useCallback } from 'react';
import {
  TrackData,
  PlayerCarState,
  PlayerRaceInput,
  RoomData,
} from '../types/game';
import { getTrack } from '../game/tracks';
import { CARS, getCarById, renderCarCanvas } from '../game/cars';
import { CarPhysics } from '../game/physics';
import { sounds } from '../game/audio';
import { getCityDataForTrack, drawCityEnvironment, drawCityOverhead } from '../game/cityEnvironment';

interface RaceCanvasProps {
  room: RoomData;
  playerId: string;
  remoteCarStates: Record<string, PlayerCarState>;
  onSyncState: (state: Omit<PlayerCarState, 'finishTime' | 'finishPosition' | 'finished'>) => void;
  onFinishRace: (totalTime: number, bestLap: number, topSpeed: number) => void;
  isRaceActive: boolean;
  floatingEmojis?: Array<{ id: string; emoji: string; x: number; y: number }>;
  touchInput?: PlayerRaceInput;
}

export const RaceCanvas: React.FC<RaceCanvasProps> = ({
  room,
  playerId,
  remoteCarStates,
  onSyncState,
  onFinishRace,
  isRaceActive,
  floatingEmojis = [],
  touchInput,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skidCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const physicsRef = useRef<CarPhysics | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchInputRef = useRef<PlayerRaceInput>({
    throttle: 0,
    brake: 0,
    steer: 0,
    nitro: false,
    handbrake: false,
  });

  useEffect(() => {
    if (touchInput) {
      touchInputRef.current = touchInput;
    }
  }, [touchInput]);

  const lastTimeRef = useRef<number>(performance.now());
  const netTickTimerRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Smooth remote interpolation targets
  const interpolatedRemoteCars = useRef<
    Record<
      string,
      {
        x: number;
        y: number;
        angle: number;
        speed: number;
        drift: boolean;
        nitro: boolean;
        targetX: number;
        targetY: number;
        targetAngle: number;
      }
    >
  >({});

  const track: TrackData = getTrack(room.config.trackId);
  const currentPlayer = room.players[playerId];
  const player2PhysicsRef = useRef<CarPhysics | null>(null);

  // Initialize Physics on Mount / Track Change
  useEffect(() => {
    const playerIndex = Object.keys(room.players).indexOf(playerId);
    const gridIndex = Math.max(0, playerIndex % track.startGrid.length);
    const startPos = track.startGrid[gridIndex] || { x: 500, y: 1200, angle: 0 };
    const carSpec = getCarById(currentPlayer?.carId || 'apex-viper');

    physicsRef.current = new CarPhysics(
      playerId,
      carSpec,
      track,
      room.config.totalLaps,
      startPos.x,
      startPos.y,
      startPos.angle
    );

    // Initialize Player 2 (Toyota Innova MPV) at the second start position
    const gridIndex2 = Math.min(1, track.startGrid.length - 1);
    const startPos2 = track.startGrid[gridIndex2] || startPos;
    const car2Spec = getCarById('toyota-innova');

    player2PhysicsRef.current = new CarPhysics(
      'local-player-2',
      car2Spec,
      track,
      room.config.totalLaps,
      startPos2.x,
      startPos2.y,
      startPos2.angle
    );

    // Initialize skid canvas
    const skidCanvas = document.createElement('canvas');
    skidCanvas.width = track.bounds.maxX + 400;
    skidCanvas.height = track.bounds.maxY + 400;
    skidCanvasRef.current = skidCanvas;

    sounds.init();
    sounds.resume();

    return () => {
      sounds.stopCarAudio();
    };
  }, [playerId, room.config.trackId, room.config.totalLaps]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;
      keysRef.current[e.key.toLowerCase()] = true;
      sounds.resume();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update remote car interpolation targets when network states change
  useEffect(() => {
    for (const [id, netState] of Object.entries(remoteCarStates)) {
      if (id === playerId) continue;
      const existing = interpolatedRemoteCars.current[id];
      if (!existing) {
        interpolatedRemoteCars.current[id] = {
          x: netState.x,
          y: netState.y,
          angle: netState.angle,
          speed: netState.speed,
          drift: netState.drift,
          nitro: netState.nitroActive,
          targetX: netState.x,
          targetY: netState.y,
          targetAngle: netState.angle,
        };
      } else {
        existing.targetX = netState.x;
        existing.targetY = netState.y;
        existing.targetAngle = netState.angle;
        existing.speed = netState.speed;
        existing.drift = netState.drift;
        existing.nitro = netState.nitroActive;
      }
    }
  }, [remoteCarStates, playerId]);

  // Main Render & Simulation Loop
  const loop = useCallback(
    (now: number) => {
      const dt = Math.min(0.06, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const canvas = canvasRef.current;
      const physics = physicsRef.current;

      if (!canvas || !physics) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Check canvas dimensions
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      // 1. Gather Input
      const keys = keysRef.current;
      const touch = touchInputRef.current;

      // Player 1 inputs: W, S, A, D, Space, ShiftLeft
      let throttle = 0;
      let brake = 0;
      let steer = 0;
      let nitro = false;
      let handbrake = false;

      // Only allow driving controls if race is active
      if (isRaceActive && !physics.state.finished) {
        if (keys['KeyW'] || keys['w']) throttle = 1;
        if (keys['KeyS'] || keys['s']) brake = 1;
        if (keys['KeyA'] || keys['a']) steer -= 1;
        if (keys['KeyD'] || keys['d']) steer += 1;
        if (keys['Space'] || keys[' ']) nitro = true;
        if (keys['ShiftLeft']) handbrake = true;

        // Merge touch controls
        if (touch.throttle > 0) throttle = touch.throttle;
        if (touch.brake > 0) brake = touch.brake;
        if (touch.steer !== 0) steer = touch.steer;
        if (touch.nitro) nitro = true;
        if (touch.handbrake) handbrake = true;
      }

      // Player 2 inputs: ArrowUp, ArrowDown, ArrowLeft, ArrowRight, N, ShiftRight
      let throttle2 = 0;
      let brake2 = 0;
      let steer2 = 0;
      let nitro2 = false;
      let handbrake2 = false;

      if (isRaceActive && player2PhysicsRef.current && !player2PhysicsRef.current.state.finished) {
        if (keys['ArrowUp'] || keys['arrowup']) throttle2 = 1;
        if (keys['ArrowDown'] || keys['arrowdown']) brake2 = 1;
        if (keys['ArrowLeft'] || keys['arrowleft']) steer2 -= 1;
        if (keys['ArrowRight'] || keys['arrowright']) steer2 += 1;
        if (keys['KeyN'] || keys['n']) nitro2 = true;
        if (keys['ShiftRight']) handbrake2 = true;
      }

      // 2. Physics Update
      const otherStates = Object.values(remoteCarStates).filter((s) => s.playerId !== playerId);
      
      // Update Player 1
      physics.update(
        dt,
        { throttle, brake, steer, nitro, handbrake },
        otherStates,
        (cp) => {
          sounds.playCheckpointChime();
        },
        () => {
          // Lap finished
        },
        (totalTime, bestLap, topSpeed) => {
          sounds.playFinishFanfare();
          onFinishRace(totalTime, bestLap, topSpeed);
        },
        (intensity) => {
          sounds.playCollisionSound(intensity);
        }
      );

      // Update Player 2
      if (player2PhysicsRef.current) {
        const otherForP2 = [physics.state, ...otherStates];
        player2PhysicsRef.current.update(
          dt,
          { throttle: throttle2, brake: brake2, steer: steer2, nitro: nitro2, handbrake: handbrake2 },
          otherForP2,
          () => {},
          () => {},
          () => {},
          () => {}
        );
      }

      // Sound update for local car
      const speedRatio = physics.state.speed / physics.carSpec.maxSpeed;
      sounds.updateCarAudio(speedRatio, physics.state.drift, physics.state.nitroActive);

      // 3. Interpolate Remote Cars
      for (const [id, car] of Object.entries(interpolatedRemoteCars.current)) {
        // Lerp towards target network coordinates
        car.x += (car.targetX - car.x) * 0.32;
        car.y += (car.targetY - car.y) * 0.32;

        // Angle unwrapping lerp
        let diff = (car.targetAngle - car.angle) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        car.angle += diff * 0.35;
      }

      // 4. Network State Sync Tick (~25Hz)
      netTickTimerRef.current += dt;
      if (netTickTimerRef.current >= 0.04) {
        netTickTimerRef.current = 0;
        onSyncState({
          playerId,
          x: Math.round(physics.state.x * 10) / 10,
          y: Math.round(physics.state.y * 10) / 10,
          angle: Math.round(physics.state.angle * 1000) / 1000,
          vx: Math.round(physics.state.vx),
          vy: Math.round(physics.state.vy),
          speed: Math.round(physics.state.speed),
          drift: physics.state.drift,
          nitroActive: physics.state.nitroActive,
          nitroFuel: Math.round(physics.state.nitroFuel),
          currentLap: physics.state.currentLap,
          currentCheckpoint: physics.state.currentCheckpoint,
          lapTimes: physics.state.lapTimes,
          currentLapStartTime: physics.state.currentLapStartTime,
          totalDistance: Math.round(physics.state.totalDistance),
          lastUpdated: Date.now(),
        });
      }

      // 5. Render Scene with Dynamic Camera
      const viewW = canvas.width;
      const viewH = canvas.height;

      // Camera lead ahead of car
      const cameraLookAhead = Math.min(180, physics.state.speed * 0.22);
      const camTargetX = physics.state.x + Math.cos(physics.state.angle) * cameraLookAhead;
      const camTargetY = physics.state.y + Math.sin(physics.state.angle) * cameraLookAhead;

      // Slight zoom out at extreme nitro speeds
      const zoom = 1.0 - Math.min(0.18, (physics.state.speed / physics.carSpec.maxSpeed) * 0.14);

      ctx.save();
      ctx.clearRect(0, 0, viewW, viewH);

      // Camera Transform
      ctx.translate(viewW / 2, viewH / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-camTargetX, -camTargetY);

      // Draw City Environment (Ground, Sidewalks, Plazas, Streetlight Glow, Many Trees along Both Sides of Road, Cows & Goats, Skyscrapers, Grandstands, Billboards)
      const cityData = getCityDataForTrack(track);
      drawCityEnvironment(
        ctx,
        cityData,
        track,
        performance.now(),
        physics.state.x,
        physics.state.y,
        physics.state.speed
      );

      // Draw Skidmarks from Buffer
      drawSkidmarks(ctx, physics.skidMarks);

      // Draw Track Asphalt, Curbs, Checkpoints, Boost Pads
      drawTrackRoad(ctx, track);

      // Draw Scenery (Barriers, Lights, Stands)
      drawScenery(ctx, track);

      // Draw Particles (Smoke, Sparks, Nitro Flames, Confetti)
      drawParticles(ctx, physics.particles);

      // Draw Remote Cars
      for (const [remId, remCar] of Object.entries(interpolatedRemoteCars.current)) {
        const remPlayer = room.players[remId];
        if (!remPlayer) continue;
        const remSpec = getCarById(remPlayer.carId);

        ctx.save();
        ctx.translate(remCar.x, remCar.y);
        ctx.rotate(remCar.angle);
        renderCarCanvas(ctx, {
          car: remSpec,
          colorOverride: remPlayer.color,
          steerAngle: 0,
          drift: remCar.drift,
          nitro: remCar.nitro,
          isCurrentPlayer: false,
          playerName: remPlayer.name,
          speed: remCar.speed,
        });
        ctx.restore();
      }

      // Draw Local Player Car
      ctx.save();
      ctx.translate(physics.state.x, physics.state.y);
      ctx.rotate(physics.state.angle);
      renderCarCanvas(ctx, {
        car: physics.carSpec,
        colorOverride: currentPlayer?.color,
        steerAngle: steer,
        drift: physics.state.drift,
        nitro: physics.state.nitroActive,
        isCurrentPlayer: true,
        playerName: currentPlayer?.name || 'You',
        speed: physics.state.speed,
      });
      ctx.restore();

      // Draw Local Player 2 Car (Innova MPV)
      if (player2PhysicsRef.current) {
        const p2State = player2PhysicsRef.current.state;
        ctx.save();
        ctx.translate(p2State.x, p2State.y);
        ctx.rotate(p2State.angle);
        renderCarCanvas(ctx, {
          car: player2PhysicsRef.current.carSpec,
          colorOverride: '#475569',
          steerAngle: steer2,
          drift: p2State.drift,
          nitro: p2State.nitroActive,
          isCurrentPlayer: false,
          playerName: 'Player 2 (Innova)',
          speed: p2State.speed,
        });
        ctx.restore();
      }

      // Draw City Overhead structures (Start/Finish truss arch gantry)
      drawCityOverhead(ctx, track, performance.now());

      // Draw Floating In-Race Emojis
      for (const emojiItem of floatingEmojis) {
        ctx.save();
        ctx.font = '28px system-ui';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.fillText(emojiItem.emoji, emojiItem.x, emojiItem.y);
        ctx.restore();
      }

      ctx.restore();

      // Request next frame
      animFrameRef.current = requestAnimationFrame(loop);
    },
    [
      track,
      isRaceActive,
      playerId,
      currentPlayer,
      room.players,
      remoteCarStates,
      onSyncState,
      onFinishRace,
      floatingEmojis,
    ]
  );

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [loop]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full cursor-crosshair" />
    </div>
  );
};

// --- Canvas Drawing Subroutines ---

function drawTrackRoad(ctx: CanvasRenderingContext2D, track: TrackData) {
  const path = track.path;
  const n = path.length;
  const halfW = track.trackWidth / 2;

  ctx.save();

  // 1. Gravel / Curb Outer Borders (Red & White Rumble Strips)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = track.theme === 'neon' ? '#0284c7' : '#e2e8f0';
  ctx.lineWidth = track.trackWidth + 24;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i <= n; i++) {
    const pt = path[i % n];
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();

  // Red dash curbs
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = track.trackWidth + 24;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i <= n; i++) {
    const pt = path[i % n];
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Solid Guardrail Safety Barriers (Visual boundary where cars bounce)
  ctx.strokeStyle = track.theme === 'neon' ? 'rgba(56, 189, 248, 0.85)' : 'rgba(249, 115, 22, 0.85)';
  ctx.lineWidth = track.trackWidth + 30;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i <= n; i++) {
    const pt = path[i % n];
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();

  // 2. Asphalt Surface
  ctx.strokeStyle = track.theme === 'neon' ? '#111827' : '#1c1917';
  ctx.lineWidth = track.trackWidth;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i <= n; i++) {
    const pt = path[i % n];
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();

  // 3. Centerline Dash
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([24, 28]);
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i <= n; i++) {
    const pt = path[i % n];
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Boost Pads
  for (const pad of track.boostPads) {
    ctx.save();
    ctx.translate(pad.x, pad.y);
    ctx.rotate(pad.angle);

    // Glowing pad background
    ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(-pad.width / 2, -pad.height / 2, pad.width, pad.height, 8);
    ctx.fill();
    ctx.stroke();

    // Arrows
    ctx.fillStyle = '#ffffff';
    for (let a = -1; a <= 1; a++) {
      ctx.beginPath();
      const ax = a * 18;
      ctx.moveTo(ax - 8, -pad.height * 0.3);
      ctx.lineTo(ax + 6, 0);
      ctx.lineTo(ax - 8, pad.height * 0.3);
      ctx.lineTo(ax - 2, pad.height * 0.3);
      ctx.lineTo(ax + 12, 0);
      ctx.lineTo(ax - 2, -pad.height * 0.3);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Start / Finish Line (Checkpoint 0)
  const finishCP = track.checkpoints[0];
  if (finishCP) {
    ctx.save();
    const len = Math.hypot(finishCP.x2 - finishCP.x1, finishCP.y2 - finishCP.y1);
    const angle = Math.atan2(finishCP.y2 - finishCP.y1, finishCP.x2 - finishCP.x1);

    ctx.translate(finishCP.x1, finishCP.y1);
    ctx.rotate(angle);

    const squareSize = 14;
    const numRows = 2;
    const numCols = Math.floor(len / squareSize);

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(c * squareSize, (r - 1) * squareSize, squareSize, squareSize);
      }
    }

    // Overhead Finish Banner / Gantry
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.fillRect(0, -squareSize * 1.5, len, 4);
    ctx.fillRect(0, squareSize * 1.5, len, 4);
    ctx.restore();
  }

  // 6. Starting Grid Boxes
  for (let g = 0; g < track.startGrid.length; g++) {
    const grid = track.startGrid[g];
    ctx.save();
    ctx.translate(grid.x, grid.y);
    ctx.rotate(grid.angle);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-26, -18, 52, 36);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`P${g + 1}`, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function drawSkidmarks(ctx: CanvasRenderingContext2D, skidMarks: CarPhysics['skidMarks']) {
  if (skidMarks.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const s of skidMarks) {
    ctx.strokeStyle = `rgba(15, 23, 42, ${s.alpha})`;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScenery(ctx: CanvasRenderingContext2D, track: TrackData) {
  ctx.save();
  for (const item of track.scenery) {
    if (item.type === 'stand') {
      ctx.fillStyle = item.color || '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(item.x - (item.width || 200) / 2, item.y - (item.height || 40) / 2, item.width || 200, item.height || 40);
      ctx.strokeRect(item.x - (item.width || 200) / 2, item.y - (item.height || 40) / 2, item.width || 200, item.height || 40);

      // Colorful crowd dots
      const cols = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ffffff'];
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = cols[i % cols.length];
        const dotX = item.x - (item.width || 200) / 2 + 10 + i * ((item.width || 200) - 20) / 20;
        const dotY = item.y + ((i % 3) - 1) * 8;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.type === 'light') {
      // Light post base
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Light beam radial gradient
      const grad = ctx.createRadialGradient(item.x, item.y, 5, item.x, item.y, 140);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.1)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 140, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'tree') {
      ctx.fillStyle = item.color || '#166534';
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius || 20, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'tire') {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius || 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: CarPhysics['particles']) {
  ctx.save();
  for (const p of particles) {
    const alpha = Math.max(0, 1 - p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.type === 'spark') {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'confetti') {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 1.5);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
