import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  TrackData,
  PlayerCarState,
  PlayerRaceInput,
  RoomData,
} from '../types/game';
import { getTrack } from '../game/tracks';
import { CARS, getCarById } from '../game/cars';
import { CarPhysics } from '../game/physics';
import { sounds } from '../game/audio';
import {
  initThreeScene,
  updateThreeScene,
  disposeThreeScene,
  ThreeSceneContext,
} from '../game/threeScene';
import { Eye } from 'lucide-react';

interface RaceCanvas3DProps {
  room: RoomData;
  playerId: string;
  remoteCarStates: Record<string, PlayerCarState>;
  onSyncState: (state: Omit<PlayerCarState, 'finishTime' | 'finishPosition' | 'finished'>) => void;
  onFinishRace: (totalTime: number, bestLap: number, topSpeed: number) => void;
  isRaceActive: boolean;
  floatingEmojis?: Array<{ id: string; emoji: string; x: number; y: number }>;
  touchInput?: PlayerRaceInput;
}

export const RaceCanvas3D: React.FC<RaceCanvas3DProps> = ({
  room,
  playerId,
  remoteCarStates,
  onSyncState,
  onFinishRace,
  isRaceActive,
  floatingEmojis = [],
  touchInput,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threeContextRef = useRef<ThreeSceneContext | null>(null);

  const [camMode, setCamMode] = useState<'chase' | 'close' | 'hood'>('chase');

  // Input states
  const keysRef = useRef<Record<string, boolean>>({});
  const touchInputRef = useRef<PlayerRaceInput>({
    throttle: 0,
    brake: 0,
    steer: 0,
    nitro: false,
    handbrake: false,
  });

  // Track & Car physics
  const trackRef = useRef<TrackData>(getTrack(room.config.trackId));
  const physicsRef = useRef<CarPhysics | null>(null);
  const player2PhysicsRef = useRef<CarPhysics | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);
  const netTickTimerRef = useRef<number>(0);

  // Sync touch input
  useEffect(() => {
    if (touchInput) {
      touchInputRef.current = touchInput;
    }
  }, [touchInput]);

  // Current player data
  const currentPlayer = room.players[playerId];
  const playerCarSpec = getCarById(currentPlayer?.carId || 'apex-viper');

  // Initialize Three.js 3D Scene and Physics
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const track = getTrack(room.config.trackId);
    trackRef.current = track;

    // Start grid position
    const startGrid = track.startGrid || [{ x: 500, y: 1200, angle: 0 }];
    const playerIndex = Object.keys(room.players).indexOf(playerId);
    const startSlot = startGrid[Math.max(0, playerIndex % startGrid.length)] || startGrid[0];

    // Player 1
    const physics = new CarPhysics(
      playerId,
      playerCarSpec,
      track,
      room.config.totalLaps,
      startSlot.x,
      startSlot.y,
      startSlot.angle
    );
    physicsRef.current = physics;

    // Player 2 - Toyota Innova MPV
    const startSlot2 = startGrid[Math.min(1, startGrid.length - 1)] || startGrid[0];
    const car2Spec = getCarById('toyota-innova');
    const physics2 = new CarPhysics(
      'local-player-2',
      car2Spec,
      track,
      room.config.totalLaps,
      startSlot2.x,
      startSlot2.y,
      startSlot2.angle
    );
    player2PhysicsRef.current = physics2;

    // Initialize 3D scene
    const threeCtx = initThreeScene(
      container,
      track,
      playerCarSpec,
      currentPlayer?.color || '#38bdf8'
    );
    threeContextRef.current = threeCtx;

    // Initialize sound engine
    sounds.init();
    sounds.resume();

    // Mouse and Touch Drag listeners for free camera orbiting
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      if (threeContextRef.current) {
        threeContextRef.current.mouseDragActive = true;
        threeContextRef.current.lastMouseDragTime = Date.now();
        if (threeContextRef.current.mouseOrbitYaw === undefined) {
          threeContextRef.current.mouseOrbitYaw = 0;
          threeContextRef.current.mouseOrbitPitch = 0;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      const ctx = threeContextRef.current;
      if (ctx) {
        ctx.lastMouseDragTime = Date.now();
        ctx.mouseOrbitYaw = (ctx.mouseOrbitYaw || 0) + dx * 0.007;
        // Clamp pitch to avoid turning completely upside down or going beneath ground
        ctx.mouseOrbitPitch = Math.max(-0.4, Math.min(1.1, (ctx.mouseOrbitPitch || 0) - dy * 0.007));
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      if (threeContextRef.current) {
        threeContextRef.current.mouseDragActive = false;
        threeContextRef.current.lastMouseDragTime = Date.now();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      isDragging = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
      if (threeContextRef.current) {
        threeContextRef.current.mouseDragActive = true;
        threeContextRef.current.lastMouseDragTime = Date.now();
        if (threeContextRef.current.mouseOrbitYaw === undefined) {
          threeContextRef.current.mouseOrbitYaw = 0;
          threeContextRef.current.mouseOrbitPitch = 0;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - prevX;
      const dy = e.touches[0].clientY - prevY;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;

      const ctx = threeContextRef.current;
      if (ctx) {
        ctx.lastMouseDragTime = Date.now();
        ctx.mouseOrbitYaw = (ctx.mouseOrbitYaw || 0) + dx * 0.01;
        ctx.mouseOrbitPitch = Math.max(-0.4, Math.min(1.1, (ctx.mouseOrbitPitch || 0) - dy * 0.01));
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    // Handle window resize
    const handleResize = () => {
      if (!threeCtx || !container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      threeCtx.camera.aspect = w / h;
      threeCtx.camera.updateProjectionMatrix();
      threeCtx.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      sounds.stopCarAudio();
      if (threeContextRef.current) {
        disposeThreeScene(threeContextRef.current);
        threeContextRef.current = null;
      }
    };
  }, [playerId, room.config.trackId, room.config.totalLaps]);

  // Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Main 3D Simulation & Render Loop
  const loop = useCallback(
    (now: number) => {
      const dt = Math.min(0.06, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const physics = physicsRef.current;
      const threeCtx = threeContextRef.current;

      if (!physics || !threeCtx) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // 1. Gather Driving Inputs
      const keys = keysRef.current;
      const touch = touchInputRef.current;

      // Player 1: W, S, A, D, Space, ShiftLeft
      let throttle = 0;
      let brake = 0;
      let steer = 0;
      let nitro = false;
      let handbrake = false;

      if (isRaceActive && !physics.state.finished) {
        if (keys['KeyW'] || keys['w']) throttle = 1;
        if (keys['KeyS'] || keys['s']) brake = 1;
        if (keys['KeyA'] || keys['a']) steer -= 1;
        if (keys['KeyD'] || keys['d']) steer += 1;
        if (keys['Space'] || keys[' ']) nitro = true;
        if (keys['ShiftLeft']) handbrake = true;

        if (touch.throttle > 0) throttle = touch.throttle;
        if (touch.brake > 0) brake = touch.brake;
        if (touch.steer !== 0) steer = touch.steer;
        if (touch.nitro) nitro = true;
        if (touch.handbrake) handbrake = true;
      }

      // Player 2: ArrowUp, ArrowDown, ArrowLeft, ArrowRight, N, ShiftRight
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

      // 2. Run Car Physics Simulation (strictly clamped to road)
      const otherStates = Object.values(remoteCarStates).filter((s) => s.playerId !== playerId);
      
      // Update Player 1
      physics.update(
        dt,
        { throttle, brake, steer, nitro, handbrake },
        otherStates,
        () => {
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

      // Update Audio Engine
      const speedRatio = physics.state.speed / physics.carSpec.maxSpeed;
      sounds.updateCarAudio(speedRatio, physics.state.drift, physics.state.nitroActive);

      // 3. Network Sync Broadcast (Every ~40ms)
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

      // 4. Update Three.js 3D Scene with 3rd-Person Chase View
      threeCtx.camMode = camMode;

      // Inject Player 2 state into remoteStates dynamically for rendering
      const combinedStates = { ...remoteCarStates };
      if (player2PhysicsRef.current) {
        combinedStates['local-player-2'] = player2PhysicsRef.current.state;
      }

      updateThreeScene(threeCtx, physics.state, steer, now, combinedStates);

      // Request next frame
      animFrameRef.current = requestAnimationFrame(loop);
    },
    [isRaceActive, playerId, remoteCarStates, onFinishRace, onSyncState, camMode]
  );

  // Start Animation Loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [loop]);

  // Cycle Camera Mode (Chase 3D -> Close 3D -> Hood 3D)
  const toggleCameraMode = () => {
    setCamMode((prev) => {
      if (prev === 'chase') return 'close';
      if (prev === 'close') return 'hood';
      return 'chase';
    });
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      {/* Three.js 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full block" />

      {/* Camera Mode Toggle Button in 3D */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto">
        <button
          onClick={toggleCameraMode}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-sky-400 font-bold text-xs border border-sky-500/40 shadow-xl backdrop-blur-md transition-all active:scale-95"
          title="Switch 3D Camera View"
        >
          <Eye className="w-4 h-4" />
          <span className="uppercase tracking-wider">
            {camMode === 'chase' ? '3D Chase Cam' : camMode === 'close' ? '3D Close Cam' : '3D Hood Cam'}
          </span>
        </button>
      </div>
    </div>
  );
};
