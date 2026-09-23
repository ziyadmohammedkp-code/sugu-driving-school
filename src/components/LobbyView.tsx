import React, { useState, useEffect, useRef } from 'react';
import { RoomData, Player, ChatMessage } from '../types/game';
import { CARS, PRESET_COLORS, getCarById, renderCarCanvas } from '../game/cars';
import { TRACKS, getTrack } from '../game/tracks';
import {
  Crown,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Users,
  Flag,
  Gauge,
  Zap,
  Send,
  Sparkles,
  LogOut,
  Play,
} from 'lucide-react';

interface LobbyViewProps {
  room: RoomData;
  playerId: string;
  chatMessages: ChatMessage[];
  onUpdatePlayer: (updates: { name?: string; carId?: string; color?: string; isReady?: boolean }) => void;
  onUpdateRoomConfig: (config: { trackId?: string; totalLaps?: number }) => void;
  onStartRace: () => void;
  onLeaveRoom: () => void;
  onSendChat: (text: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  playerId,
  chatMessages,
  onUpdatePlayer,
  onUpdateRoomConfig,
  onStartRace,
  onLeaveRoom,
  onSendChat,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const currentPlayer = room.players[playerId];
  const isHost = room.hostId === playerId;
  const currentCar = getCarById(currentPlayer?.carId || 'apex-viper');
  const selectedTrack = getTrack(room.config.trackId);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyJoinLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenSecondPlayer = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    window.open(url, '_blank');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput('');
    }
  };

  const allPlayers = Object.values(room.players);
  const allReady = allPlayers.length > 0 && allPlayers.every((p) => p.isReady);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header bar */}
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onLeaveRoom}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Leave Lobby"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-sky-400">
              APEX NITRO
            </h1>
            <p className="text-xs text-slate-400">MULTIPLAYER RACE PADDOCK</p>
          </div>
        </div>

        {/* Room Code Card */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-xl">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Room Code</div>
            <div className="text-xl font-mono font-black tracking-widest text-sky-400">{room.code}</div>
          </div>
          <button
            onClick={copyRoomCode}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Copy Room Code"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={copyJoinLink}
            className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-bold transition flex items-center gap-1.5"
            title="Copy Share Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
            <span>Share Link</span>
          </button>
          <button
            onClick={handleOpenSecondPlayer}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition flex items-center gap-1.5"
            title="Open 2nd Player in New Tab to Test Multiplayer"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add 2nd Player Tab</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1">
        {/* Left Column: Racers in Room & Live Chat (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Racers Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                Grid Lineup ({allPlayers.length}/{room.config.maxPlayers})
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                Live Synced
              </span>
            </div>

            <div className="space-y-3">
              {allPlayers.map((player, idx) => {
                const isMe = player.id === playerId;
                const car = getCarById(player.carId);
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-sky-950/40 border-sky-500/50 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                        : 'bg-slate-800/40 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
                          style={{ backgroundColor: player.color }}
                        >
                          P{idx + 1}
                        </div>
                        {player.isHost && (
                          <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow">
                            <Crown className="w-3 h-3 fill-slate-950" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{player.name}</span>
                          {isMe && <span className="text-[10px] text-sky-400 font-semibold">(You)</span>}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: player.color }}
                          />
                          <span>{car.name}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {player.isHost ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3" /> Host
                        </span>
                      ) : player.isReady ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Waiting
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty slot placeholders */}
              {Array.from({ length: Math.max(0, room.config.maxPlayers - allPlayers.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-3.5 rounded-2xl border border-dashed border-slate-800/80 flex items-center justify-center text-xs text-slate-500"
                >
                  Empty Slot — Share Room Code to Join!
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Room Chat */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex-1 flex flex-col min-h-[260px] max-h-[380px]">
            <div className="pb-3 border-b border-slate-800 mb-3">
              <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Paddock Chat
              </span>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-slate-500 italic text-center py-6">
                  No messages yet. Send a greeting to other racers!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-xl ${
                      msg.isSystem
                        ? 'bg-slate-800/50 text-slate-400 italic text-[11px]'
                        : msg.senderId === playerId
                        ? 'bg-sky-950/60 border border-sky-800/50 text-slate-200 ml-4'
                        : 'bg-slate-800/70 text-slate-200 mr-4'
                    }`}
                  >
                    {!msg.isSystem && (
                      <div className="flex items-center gap-1.5 font-bold mb-0.5" style={{ color: msg.color || '#38bdf8' }}>
                        <span>{msg.senderName}</span>
                      </div>
                    )}
                    <div>{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick message chips */}
            <div className="flex items-center gap-1.5 py-2 overflow-x-auto text-[11px]">
              {["Ready to roll!", "Good luck!", "Watch my dust! 🏎️", "Rematch?"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => onSendChat(chip)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={80}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Car Selection & Track Settings (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Car Showcase & Customization */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Garage & Car Select
                </span>
                <h2 className="text-2xl font-black text-white">{currentCar.name}</h2>
                <p className="text-xs text-slate-400">{currentCar.description}</p>
              </div>

              {/* Player Name Change */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Driver:</span>
                <input
                  type="text"
                  value={currentPlayer?.name || ''}
                  onChange={(e) => onUpdatePlayer({ name: e.target.value })}
                  maxLength={16}
                  placeholder="Enter racer name"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-sky-400 w-36"
                />
              </div>
            </div>

            {/* Car Canvas Preview & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 items-center">
              {/* Car Live Canvas */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-950/70 rounded-2xl border border-slate-800 relative overflow-hidden h-52">
                <CarPreviewCanvas car={currentCar} color={currentPlayer?.color || currentCar.color} />
                <div className="absolute bottom-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  360° Preview
                </div>
              </div>

              {/* Specs Bars */}
              <div className="md:col-span-7 space-y-3.5">
                <CarStatBar label="Top Speed" value={currentCar.maxSpeed} max={750} color="from-sky-500 to-cyan-400" />
                <CarStatBar label="Acceleration" value={currentCar.acceleration} max={600} color="from-amber-500 to-yellow-400" />
                <CarStatBar label="Handling & Cornering" value={currentCar.handling} max={4.0} color="from-emerald-500 to-teal-400" />
                <CarStatBar label="Drift Control" value={currentCar.driftFactor} max={1.0} color="from-purple-500 to-fuchsia-400" />
                <CarStatBar label="Nitro Boost" value={currentCar.nitroPower} max={1.8} color="from-red-500 to-orange-400" />
              </div>
            </div>

            {/* Car Models Selector Tabs */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Choose Vehicle</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {CARS.map((car) => {
                  const isSelected = car.id === currentCar.id;
                  return (
                    <button
                      key={car.id}
                      onClick={() => onUpdatePlayer({ carId: car.id })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black truncate text-white">{car.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{car.category}</div>
                    </button>
                  );
                })}
              </div>

              {/* Color Customizer */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Livery Paint Color
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((hex) => {
                    const isSelected = (currentPlayer?.color || currentCar.color) === hex;
                    return (
                      <button
                        key={hex}
                        onClick={() => onUpdatePlayer({ color: hex })}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          isSelected ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Track & Race Settings */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" /> Circuit Selection
                </span>
                <h3 className="text-lg font-bold text-white">{selectedTrack.name}</h3>
              </div>

              {/* Host only badge */}
              <div className="text-xs font-medium text-slate-400">
                {isHost ? (
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                    Host Config Controls
                  </span>
                ) : (
                  <span className="text-slate-500">Configured by Host</span>
                )}
              </div>
            </div>

            {/* Track Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
              {Object.values(TRACKS).map((t) => {
                const isSelected = t.id === selectedTrack.id;
                return (
                  <button
                    key={t.id}
                    disabled={!isHost}
                    onClick={() => onUpdateRoomConfig({ trackId: t.id })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-950/60 border-slate-800'
                    } ${isHost ? 'cursor-pointer hover:border-slate-700' : 'cursor-default opacity-85'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{t.name}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                          t.difficulty === 'Easy'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : t.difficulty === 'Medium'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {t.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2">{t.description}</div>
                  </button>
                );
              })}
            </div>

            {/* Lap count config */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-sky-400" /> Total Laps
              </span>

              <div className="flex items-center gap-2">
                {[2, 3, 5].map((laps) => {
                  const isSelected = room.config.totalLaps === laps;
                  return (
                    <button
                      key={laps}
                      disabled={!isHost}
                      onClick={() => onUpdateRoomConfig({ totalLaps: laps })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      } ${!isHost && 'cursor-default'}`}
                    >
                      {laps} Laps {laps === 3 && '(Standard)'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Bar (Start Race / Toggle Ready) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="text-xs text-slate-400">
              {isHost ? (
                allReady ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> All racers are ready to launch!
                  </span>
                ) : (
                  <span>Waiting for racers to ready up (you can start anytime).</span>
                )
              ) : currentPlayer?.isReady ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> You are ready! Waiting for host to start race...
                </span>
              ) : (
                <span>Click Ready when you are prepared to race!</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!isHost && (
                <button
                  onClick={() => onUpdatePlayer({ isReady: !currentPlayer?.isReady })}
                  className={`flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2 ${
                    currentPlayer?.isReady
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {currentPlayer?.isReady ? 'Cancel Ready' : "I'm Ready!"}
                </button>
              )}

              {isHost && (
                <button
                  onClick={onStartRace}
                  className="flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase transition shadow-2xl bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400 hover:from-red-400 hover:to-yellow-300 text-slate-950 flex items-center justify-center gap-2.5 hover:scale-[1.02]"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  START RACE NOW
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Mini Car Stat Bar ---
const CarStatBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({
  label,
  value,
  max,
  color,
}) => {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <span>{label}</span>
        <span className="font-mono text-slate-400">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

// --- Rotating Car Preview Canvas ---
const CarPreviewCanvas: React.FC<{ car: ReturnType<typeof getCarById>; color: string }> = ({
  car,
  color,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    let animId: number;
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      angleRef.current += 0.015;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angleRef.current);

      renderCarCanvas(ctx, {
        car,
        colorOverride: color,
        scale: 1.5,
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [car, color]);

  return <canvas ref={canvasRef} width={240} height={180} className="w-full h-full block" />;
};
