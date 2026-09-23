import React, { useState, useEffect, useRef } from 'react';
import { CARS, PRESET_COLORS, getCarById, renderCarCanvas } from '../game/cars';
import {
  Trophy,
  Users,
  Play,
  Flame,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface MenuViewProps {
  onCreateRoom: (playerName: string, carId: string, color: string) => void;
  onJoinRoom: (code: string, playerName: string, carId: string, color: string) => void;
  initialRoomCode?: string;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export const MenuView: React.FC<MenuViewProps> = ({
  onCreateRoom,
  onJoinRoom,
  initialRoomCode = '',
  errorMessage,
  onClearError,
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('apex_racer_name') || `Racer_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [selectedCarId, setSelectedCarId] = useState('apex-viper');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [publicRooms, setPublicRooms] = useState<
    Array<{ code: string; hostName: string; playerCount: number; maxPlayers: number; trackId: string; state: string }>
  >([]);

  const selectedCar = getCarById(selectedCarId);

  // Save name
  useEffect(() => {
    localStorage.setItem('apex_racer_name', playerName);
  }, [playerName]);

  // Fetch active public rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const data = await res.json();
          setPublicRooms(data);
        }
      } catch {
        // ignore
      }
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = () => {
    if (!playerName.trim()) return;
    onCreateRoom(playerName.trim(), selectedCarId, selectedColor);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCodeInput.trim()) return;
    onJoinRoom(roomCodeInput.trim().toUpperCase(), playerName.trim(), selectedCarId, selectedColor);
  };

  const handleJoinSpecificCode = (code: string) => {
    if (!playerName.trim()) return;
    onJoinRoom(code, playerName.trim(), selectedCarId, selectedColor);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 sm:p-6 lg:p-10 relative overflow-y-auto">
      {/* Background neon ambient lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg">
            <Flame className="w-6 h-6 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-sky-400">
              APEX NITRO
            </h1>
            <p className="text-xs text-slate-400">REAL-TIME MULTIPLAYER CAR RACING</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" /> Live WebSockets
          </span>
          <span>•</span>
          <span>Zero Simulated AI</span>
          <span>•</span>
          <span>2-4 Racers</span>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="max-w-6xl mx-auto w-full my-4 p-4 rounded-2xl bg-red-950/80 border border-red-500 text-red-200 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={onClearError} className="text-xs text-red-300 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 relative z-10 flex-1">
        {/* Left Column: Driver & Car Customization (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Driver Identity
              </span>
              <h2 className="text-xl font-bold text-white mt-1">Configure Your Racer</h2>
            </div>

            {/* Name input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Driver Call-sign</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={16}
                placeholder="Enter racer name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Car Canvas Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Selected Vehicle</span>
                <span className="text-sky-400">{selectedCar.name}</span>
              </div>

              <div className="h-44 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
                <MenuCarCanvas car={selectedCar} color={selectedColor} />
              </div>
            </div>

            {/* Car selection chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Choose Car Model</label>
              <div className="grid grid-cols-2 gap-2">
                {CARS.map((car) => {
                  const isSel = car.id === selectedCarId;
                  return (
                    <button
                      key={car.id}
                      onClick={() => {
                        setSelectedCarId(car.id);
                        setSelectedColor(car.color);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSel
                          ? 'bg-sky-500/20 border-sky-400 text-white font-bold shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs truncate">{car.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{car.category}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Livery Colors */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">Livery Paint</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((hex) => {
                  const isSel = selectedColor === hex;
                  return (
                    <button
                      key={hex}
                      onClick={() => setSelectedColor(hex)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        isSel ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
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

        {/* Right Column: Multiplayer Matchmaking & Room Actions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6 justify-between">
          <div className="space-y-6">
            {/* Create Room Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
              <div className="space-y-2 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" /> Host a Grand Prix
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">Create Private Race Room</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Spin up a multiplayer room with a unique 5-letter code. Invite 1-5 friends to join your grid in real time with live physics and synchronized checkpoints!
                </p>
              </div>

              <button
                onClick={handleCreate}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400 hover:from-red-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-2xl transition flex items-center justify-center gap-3 hover:scale-[1.02]"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                CREATE RACE ROOM NOW
              </button>
            </div>

            {/* Join Room Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="space-y-2 mb-5">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-400" /> Join Existing Race
                </span>
                <h3 className="text-xl font-bold text-white">Enter Room Code</h3>
                <p className="text-xs text-slate-400">
                  Got an invite code from a friend? Enter their 5-character code below to enter their paddock.
                </p>
              </div>

              <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  maxLength={5}
                  placeholder="e.g. APEX1"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-base sm:text-lg font-mono font-black text-white uppercase tracking-widest placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={!roomCodeInput.trim()}
                  className="px-8 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider transition flex items-center justify-center gap-2"
                >
                  <span>JOIN RACE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Active Public Rooms if available */}
            {publicRooms.length > 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
                  <span>Active Public Paddocks</span>
                  <span>{publicRooms.length} Open</span>
                </div>

                <div className="space-y-2">
                  {publicRooms.map((r) => (
                    <div
                      key={r.code}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-sky-400 text-sm">{r.code}</span>
                        <div className="text-xs">
                          <span className="text-white font-bold">{r.hostName}'s Paddock</span>
                          <span className="text-slate-500 ml-2">
                            ({r.playerCount}/{r.maxPlayers} racers)
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinSpecificCode(r.code)}
                        className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-xs font-bold text-slate-300 transition"
                      >
                        Join Grid
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick instructions footer */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Tip: You can test multiplayer on 1 computer by opening a second browser tab with the room code!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Canvas for 360 preview in menu
const MenuCarCanvas: React.FC<{ car: ReturnType<typeof getCarById>; color: string }> = ({
  car,
  color,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(-Math.PI / 6);

  useEffect(() => {
    let anim: number;
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      angleRef.current += 0.012;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angleRef.current);

      renderCarCanvas(ctx, {
        car,
        colorOverride: color,
        scale: 1.6,
      });

      ctx.restore();
      anim = requestAnimationFrame(render);
    };

    anim = requestAnimationFrame(render);
    return () => cancelAnimationFrame(anim);
  }, [car, color]);

  return <canvas ref={canvasRef} width={260} height={180} className="w-full h-full block" />;
};
