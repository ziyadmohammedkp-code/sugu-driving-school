import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoomData, PlayerCarState, PlayerRaceInput } from '../types/game';
import { getTrack } from '../game/tracks';
import { sounds } from '../game/audio';
import { getCityDataForTrack } from '../game/cityEnvironment';
import {
  Volume2,
  VolumeX,
  Flame,
  Flag,
  Timer,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquare,
  Gamepad2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface RaceHUDProps {
  room: RoomData;
  playerId: string;
  localCarState: PlayerCarState | null;
  remoteCarStates: Record<string, PlayerCarState>;
  countdown: { active: boolean; seconds: number; startsAt: number } | null;
  onSendEmoji: (emoji: string) => void;
  onSendChat: (text: string) => void;
  onLeaveRace: () => void;
  onTouchUpdate?: (input: PlayerRaceInput) => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  room,
  playerId,
  localCarState,
  remoteCarStates,
  countdown,
  onSendEmoji,
  onSendChat,
  onLeaveRace,
  onTouchUpdate,
}) => {
  const [muted, setMuted] = useState(sounds.getMuted());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [countdownNum, setCountdownNum] = useState<string | number | null>(null);
  const [showTouchControls, setShowTouchControls] = useState(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  const touchStateRef = useRef<PlayerRaceInput>({
    throttle: 0,
    brake: 0,
    steer: 0,
    nitro: false,
    handbrake: false,
  });

  const updateTouch = useCallback(
    (partial: Partial<PlayerRaceInput>) => {
      touchStateRef.current = { ...touchStateRef.current, ...partial };
      onTouchUpdate?.(touchStateRef.current);
    },
    [onTouchUpdate]
  );

  const track = getTrack(room.config.trackId);
  const currentPlayer = room.players[playerId];

  // Countdown timer calculation
  useEffect(() => {
    if (!countdown) {
      setCountdownNum(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = countdown.startsAt - Date.now();
      if (remainingMs > 2000) {
        setCountdownNum(3);
      } else if (remainingMs > 1000) {
        setCountdownNum(2);
      } else if (remainingMs > 0) {
        setCountdownNum(1);
      } else if (remainingMs > -1000) {
        setCountdownNum('GO!');
      } else {
        setCountdownNum(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [countdown]);

  // Sound triggers on countdown changes
  useEffect(() => {
    if (countdownNum === 3 || countdownNum === 2 || countdownNum === 1) {
      sounds.playCountdownBeep(false);
    } else if (countdownNum === 'GO!') {
      sounds.playCountdownBeep(true);
    }
  }, [countdownNum]);

  // Combine and sort racers for live standings
  const allRacers = Object.values(room.players).map((p) => {
    const isMe = p.id === playerId;
    const state = isMe ? localCarState : remoteCarStates[p.id];
    const lap = state?.currentLap || 1;
    const cp = state?.currentCheckpoint || 0;
    const dist = state?.totalDistance || 0;
    const finished = state?.finished || false;
    const finishPos = state?.finishPosition;

    // Scoring metric: finished players first, then higher lap, then higher checkpoint, then distance
    const score = finished ? 1000000 - (finishPos || 99) * 10000 : lap * 10000 + cp * 100 + dist * 0.01;

    return {
      player: p,
      state,
      isMe,
      lap,
      score,
      finished,
      finishPos,
      speed: state?.speed || 0,
    };
  });

  allRacers.sort((a, b) => b.score - a.score);

  const myRank = allRacers.findIndex((r) => r.isMe) + 1;
  const currentLap = localCarState?.currentLap || 1;
  const totalLaps = room.config.totalLaps;
  const speedKmh = Math.round(Math.abs(localCarState?.speed || 0) * 0.36);
  const nitroFuel = Math.round(localCarState?.nitroFuel || 100);
  const isNitro = localCarState?.nitroActive || false;

  // Format time
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const bestLapTime = localCarState?.lapTimes?.length ? Math.min(...localCarState.lapTimes) : 0;

  const handleToggleMute = () => {
    const isM = sounds.toggleMute();
    setMuted(isM);
  };

  const submitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput('');
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* --- TOP ROW --- */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Standings Leaderboard */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 shadow-2xl pointer-events-auto min-w-[200px] sm:min-w-[240px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Live Positions
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">
              {allRacers.length} Racers
            </span>
          </div>

          <div className="space-y-1.5">
            {allRacers.map((racer, index) => {
              const rank = index + 1;
              return (
                <div
                  key={racer.player.id}
                  className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                    racer.isMe
                      ? 'bg-sky-500/25 border border-sky-400/50 font-bold text-white'
                      : 'text-slate-300 bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : rank === 3
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {rank}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: racer.player.color }}
                    />
                    <span className="truncate max-w-[90px] sm:max-w-[120px]">
                      {racer.player.name} {racer.isMe && '(You)'}
                    </span>
                  </div>

                  <div className="text-right text-[11px]">
                    {racer.finished ? (
                      <span className="text-emerald-400 font-bold">FINISHED</span>
                    ) : (
                      <span className="text-slate-400">
                        L{racer.lap}/{totalLaps}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Lap & Timer Banner */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl px-6 py-2 shadow-2xl flex items-center gap-6">
            {/* Position Display */}
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Position</div>
              <div className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
                {myRank}
                <span className="text-sm font-semibold text-slate-400">/{allRacers.length}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-slate-700/70" />

            {/* Lap Counter */}
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                <Flag className="w-3 h-3 text-red-400" /> Lap
              </div>
              <div className="text-2xl font-black text-white">
                {Math.min(currentLap, totalLaps)}
                <span className="text-slate-500 text-lg font-bold">/{totalLaps}</span>
              </div>
            </div>

            {/* Best Lap */}
            {bestLapTime > 0 && (
              <>
                <div className="w-px h-8 bg-slate-700/70 hidden sm:block" />
                <div className="text-center hidden sm:block">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                    <Timer className="w-3 h-3 text-sky-400" /> Best
                  </div>
                  <div className="text-base font-mono font-bold text-sky-300">
                    {formatTime(bestLapTime)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Mini-Map and Sound / Leave buttons */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTouchControls(!showTouchControls)}
              className={`p-2.5 rounded-xl border transition shadow-lg ${
                showTouchControls
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                  : 'bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
              title="Toggle On-Screen Touch Controls"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleToggleMute}
              className="p-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shadow-lg"
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="p-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shadow-lg"
              title="Toggle Chat"
            >
              <MessageSquare className="w-4 h-4 text-sky-400" />
            </button>

            <button
              onClick={onLeaveRace}
              className="px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-800 transition shadow-lg"
            >
              Exit
            </button>
          </div>

          {/* Mini-Map */}
          <div className="w-36 h-28 sm:w-48 sm:h-36 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800 p-2 shadow-2xl relative overflow-hidden">
            <MiniMap track={track} racers={allRacers} myPlayerId={playerId} />
          </div>
        </div>
      </div>

      {/* --- CENTER: COUNTDOWN / STATUS OVERLAY --- */}
      {countdownNum !== null && (
        <div className="self-center my-auto flex flex-col items-center justify-center">
          <div
            className={`text-7xl sm:text-9xl font-black italic tracking-wider transition-all transform animate-bounce ${
              countdownNum === 'GO!'
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 scale-110 drop-shadow-[0_0_35px_rgba(16,185,129,0.9)]'
                : 'text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]'
            }`}
          >
            {countdownNum}
          </div>
          {countdownNum === 'GO!' && (
            <div className="text-xl sm:text-2xl font-bold uppercase tracking-widest text-emerald-300 mt-2">
              Accelerate to victory!
            </div>
          )}
        </div>
      )}

      {/* Finished Banner if player completed race */}
      {localCarState?.finished && (
        <div className="self-center my-auto bg-slate-900/90 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-lg animate-pulse">
          <div className="text-4xl sm:text-5xl font-black text-emerald-400 mb-2">🏁 FINISH!</div>
          <div className="text-lg text-slate-300">
            Waiting for other racers to cross the line...
          </div>
        </div>
      )}

      {/* --- TOUCH CONTROLS OVERLAY (MOBILE & TOUCH USERS) --- */}
      {showTouchControls && (
        <div className="w-full flex items-end justify-between pointer-events-auto px-2 py-1 mb-2 z-20">
          {/* Left / Right Steering Buttons */}
          <div className="flex items-center gap-3">
            <button
              onMouseDown={() => updateTouch({ steer: -1 })}
              onMouseUp={() => updateTouch({ steer: 0 })}
              onMouseLeave={() => updateTouch({ steer: 0 })}
              onTouchStart={(e) => {
                e.preventDefault();
                updateTouch({ steer: -1 });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                updateTouch({ steer: 0 });
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900/85 active:bg-sky-500 active:text-slate-950 border border-slate-700 active:border-sky-400 text-white flex items-center justify-center shadow-2xl backdrop-blur-md select-none touch-none"
            >
              <ChevronLeft className="w-9 h-9" />
            </button>

            <button
              onMouseDown={() => updateTouch({ steer: 1 })}
              onMouseUp={() => updateTouch({ steer: 0 })}
              onMouseLeave={() => updateTouch({ steer: 0 })}
              onTouchStart={(e) => {
                e.preventDefault();
                updateTouch({ steer: 1 });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                updateTouch({ steer: 0 });
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900/85 active:bg-sky-500 active:text-slate-950 border border-slate-700 active:border-sky-400 text-white flex items-center justify-center shadow-2xl backdrop-blur-md select-none touch-none"
            >
              <ChevronRight className="w-9 h-9" />
            </button>
          </div>

          {/* Nitro and Drift Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onMouseDown={() => updateTouch({ handbrake: true })}
              onMouseUp={() => updateTouch({ handbrake: false })}
              onMouseLeave={() => updateTouch({ handbrake: false })}
              onTouchStart={(e) => {
                e.preventDefault();
                updateTouch({ handbrake: true });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                updateTouch({ handbrake: false });
              }}
              className="w-14 h-14 rounded-2xl bg-purple-950/85 active:bg-purple-500 active:text-slate-950 border border-purple-700 text-purple-200 font-black text-xs uppercase flex items-center justify-center shadow-2xl backdrop-blur-md select-none touch-none"
            >
              Drift
            </button>

            <button
              onMouseDown={() => updateTouch({ nitro: true })}
              onMouseUp={() => updateTouch({ nitro: false })}
              onMouseLeave={() => updateTouch({ nitro: false })}
              onTouchStart={(e) => {
                e.preventDefault();
                updateTouch({ nitro: true });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                updateTouch({ nitro: false });
              }}
              className="w-16 h-16 rounded-2xl bg-cyan-950/85 active:bg-cyan-400 active:text-slate-950 border border-cyan-500 text-cyan-300 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md select-none touch-none"
            >
              <Flame className="w-5 h-5 fill-cyan-400" />
              <span className="text-[10px] font-black uppercase">Nitro</span>
            </button>
          </div>

          {/* Gas & Brake Pedals */}
          <div className="flex items-center gap-3">
            <button
              onMouseDown={() => updateTouch({ brake: 1 })}
              onMouseUp={() => updateTouch({ brake: 0 })}
              onMouseLeave={() => updateTouch({ brake: 0 })}
              onTouchStart={(e) => {
                e.preventDefault();
                updateTouch({ brake: 1 });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                updateTouch({ brake: 0 });
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-950/85 active:bg-red-500 active:text-slate-950 border border-red-800 text-red-300 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md select-none touch-none"
            >
              <ArrowDown className="w-6 h-6" />
              <span className="text-[9px] font-black uppercase">Brake</span>
            </button>

            <button
              onMouseDown={() => updateTouch({ throttle: 1 })}
              onMouseUp={() => updateTouch({ throttle: 0 })}
              onMouseLeave={() => updateTouch({ throttle: 0 })}
              onTouchStart={(e) => {
                e.preventDefault();
                updateTouch({ throttle: 1 });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                updateTouch({ throttle: 0 });
              }}
              className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-emerald-950/85 active:bg-emerald-400 active:text-slate-950 border border-emerald-600 text-emerald-300 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md select-none touch-none"
            >
              <ArrowUp className="w-8 h-8" />
              <span className="text-[10px] font-black uppercase">Gas</span>
            </button>
          </div>
        </div>
      )}

      {/* --- BOTTOM ROW --- */}
      <div className="flex items-end justify-between w-full">
        {/* Left: Controls hint & Reaction bar */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Quick Reaction Emojis */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-full px-2.5 py-1.5 shadow-xl">
            {['🔥', '💨', '💥', '👋', '🏁', '🏆'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendEmoji(emoji)}
                className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-lg hover:scale-125 transition-transform"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Keyboard Controls Hint */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-400 flex items-center gap-3">
            <span className="font-semibold text-slate-300">Controls:</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-200">W/↑</kbd> Gas
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-200">S/↓</kbd> Brake
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-200">A/D</kbd> Steer
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-200">SPACE</kbd> Nitro
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-200">SHIFT</kbd> Drift
            </span>
          </div>
        </div>

        {/* Right: Speedometer & Nitro Boost Gauge */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center gap-2 min-w-[160px] sm:min-w-[190px]">
          {/* Speed Number */}
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-black italic tracking-tighter text-white font-mono">
              {speedKmh}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">KM/H</span>
          </div>

          {/* Nitro Tank Gauge */}
          <div className="w-full space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="text-cyan-400 flex items-center gap-1">
                <Flame className={`w-3 h-3 ${isNitro ? 'animate-bounce text-cyan-300' : 'text-cyan-500'}`} />
                Nitro Fuel
              </span>
              <span className={nitroFuel > 20 ? 'text-cyan-300' : 'text-red-400'}>
                {nitroFuel}%
              </span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  isNitro
                    ? 'bg-gradient-to-r from-sky-400 via-cyan-300 to-white shadow-[0_0_12px_#38bdf8]'
                    : nitroFuel > 20
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-400'
                    : 'bg-red-500'
                }`}
                style={{ width: `${nitroFuel}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Drawer if opened */}
      {chatOpen && (
        <div className="absolute top-20 right-4 sm:right-6 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl pointer-events-auto flex flex-col gap-2 z-20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" /> Race Chat
            </span>
            <button
              onClick={() => setChatOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={submitChat} className="flex gap-2 mt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message..."
              maxLength={80}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Top-Right MiniMap Component ---
const MiniMap: React.FC<{
  track: ReturnType<typeof getTrack>;
  racers: Array<{
    player: { id: string; name: string; color: string };
    state: PlayerCarState | null;
    isMe: boolean;
  }>;
  myPlayerId: string;
}> = ({ track, racers, myPlayerId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const b = track.bounds;
    const margin = 100;
    const worldW = b.maxX - b.minX + margin * 2;
    const worldH = b.maxY - b.minY + margin * 2;

    const mapW = canvas.width;
    const mapH = canvas.height;

    const scale = Math.min(mapW / worldW, mapH / worldH);
    const offsetX = (mapW - worldW * scale) / 2 - (b.minX - margin) * scale;
    const offsetY = (mapH - worldH * scale) / 2 - (b.minY - margin) * scale;

    ctx.clearRect(0, 0, mapW, mapH);

    // Draw City Building Footprints on Mini-Map
    const city = getCityDataForTrack(track);
    ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
    for (const bldg of city.buildings) {
      ctx.fillRect(
        bldg.x * scale + offsetX,
        bldg.y * scale + offsetY,
        bldg.w * scale,
        bldg.h * scale
      );
    }

    // Draw Track Path on Mini-Map
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const path = track.path;
    ctx.moveTo(path[0].x * scale + offsetX, path[0].y * scale + offsetY);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x * scale + offsetX, path[i].y * scale + offsetY);
    }
    ctx.closePath();
    ctx.stroke();

    // Finish Line Marker
    const finish = track.checkpoints[0];
    if (finish) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(finish.x1 * scale + offsetX, finish.y1 * scale + offsetY);
      ctx.lineTo(finish.x2 * scale + offsetX, finish.y2 * scale + offsetY);
      ctx.stroke();
    }

    // Draw Racers Dots
    for (const racer of racers) {
      const state = racer.state;
      if (!state) continue;

      const rx = state.x * scale + offsetX;
      const ry = state.y * scale + offsetY;

      ctx.save();
      if (racer.isMe) {
        // Glowing halo for player
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(rx, ry, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rx, ry, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = racer.player.color || '#f59e0b';
        ctx.beginPath();
        ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }, [track, racers, myPlayerId]);

  return <canvas ref={canvasRef} width={200} height={150} className="w-full h-full block" />;
};
