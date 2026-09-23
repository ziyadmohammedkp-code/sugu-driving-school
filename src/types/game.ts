export type GameState = 'menu' | 'lobby' | 'countdown' | 'racing' | 'results';

export interface Vector2D {
  x: number;
  y: number;
}

export interface CarSpec {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  accentColor: string;
  maxSpeed: number; // pixels per sec
  acceleration: number;
  braking: number;
  handling: number; // turn rate
  driftFactor: number; // higher = slide more
  nitroPower: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  carId: string;
  color: string;
  connected: boolean;
  ping?: number;
}

export interface Checkpoint {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  width: number;
}

export interface BoostPad {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

export interface TrackPoint {
  x: number;
  y: number;
  width?: number;
}

export interface TrackData {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  theme: 'neon' | 'canyon' | 'speedway';
  trackWidth: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  path: TrackPoint[];
  innerBoundary: Vector2D[];
  outerBoundary: Vector2D[];
  checkpoints: Checkpoint[];
  boostPads: BoostPad[];
  startGrid: { x: number; y: number; angle: number }[];
  scenery: Array<{
    type: 'barrier' | 'light' | 'tree' | 'stand' | 'tire';
    x: number;
    y: number;
    radius?: number;
    width?: number;
    height?: number;
    color?: string;
  }>;
}

export interface PlayerRaceInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  nitro: boolean;
  handbrake: boolean;
}

export interface PlayerCarState {
  playerId: string;
  x: number;
  y: number;
  angle: number; // radians
  vx: number;
  vy: number;
  speed: number;
  drift: boolean;
  nitroActive: boolean;
  nitroFuel: number; // 0 to 100
  currentLap: number;
  currentCheckpoint: number;
  lapTimes: number[];
  currentLapStartTime: number;
  totalDistance: number;
  finished: boolean;
  finishTime?: number;
  finishPosition?: number;
  lastUpdated: number;
}

export interface RoomConfig {
  trackId: string;
  totalLaps: number;
  maxPlayers: number;
  collisionEnabled: boolean;
}

export interface RoomData {
  code: string;
  hostId: string;
  state: GameState;
  config: RoomConfig;
  players: Record<string, Player>;
  raceStartTime?: number;
  raceEndTime?: number;
  results?: Array<{
    playerId: string;
    name: string;
    carId: string;
    color: string;
    position: number;
    totalTime: number;
    bestLapTime: number;
    topSpeed: number;
  }>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: number;
  isSystem?: boolean;
  color?: string;
}

// Client to Server Message Types
export type ClientMessage =
  | { type: 'create_room'; playerName: string; carId: string; color: string }
  | { type: 'join_room'; code: string; playerName: string; carId: string; color: string }
  | { type: 'leave_room' }
  | { type: 'update_player'; name?: string; carId?: string; color?: string; isReady?: boolean }
  | { type: 'update_room_config'; config: Partial<RoomConfig> }
  | { type: 'start_race' }
  | { type: 'race_sync'; state: Omit<PlayerCarState, 'finishTime' | 'finishPosition' | 'finished'> }
  | { type: 'player_checkpoint_crossed'; checkpoint: number; lap: number }
  | { type: 'player_finish_race'; totalTime: number; bestLapTime: number; topSpeed: number }
  | { type: 'send_chat'; text: string }
  | { type: 'request_rematch' }
  | { type: 'ping'; timestamp: number };

// Server to Client Message Types
export type ServerMessage =
  | { type: 'error'; message: string }
  | { type: 'room_created'; code: string; playerId: string; room: RoomData }
  | { type: 'room_joined'; code: string; playerId: string; room: RoomData }
  | { type: 'room_update'; room: RoomData }
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string; newHostId?: string }
  | { type: 'countdown_start'; countdownSeconds: number; startsAt: number }
  | { type: 'race_start'; startsAt: number }
  | { type: 'race_state_broadcast'; states: Record<string, PlayerCarState> }
  | { type: 'player_finished_event'; playerId: string; position: number; finishTime: number }
  | { type: 'race_end'; results: RoomData['results'] }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'pong'; timestamp: number; serverTime: number };
