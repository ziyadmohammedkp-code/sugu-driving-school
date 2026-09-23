import React, { useEffect, useRef } from 'react';
import { RoomData } from '../types/game';
import { getCarById, renderCarCanvas } from '../game/cars';
import { Trophy, Medal, RotateCcw, Home, Flag, Zap, Timer } from 'lucide-react';
import { sounds } from '../game/audio';

interface ResultsViewProps {
  room: RoomData;
  playerId: string;
  onRequestRematch: () => void;
  onReturnToLobby: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  room,
  playerId,
  onRequestRematch,
  onReturnToLobby,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const results = room.results || [];
  const winner = results[0];

  useEffect(() => {
    sounds.playFinishFanfare();
  }, []);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '--:--.--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Winner car render
  useEffect(() => {
    if (!winner) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const winnerCar = getCarById(winner.carId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 12);

    renderCarCanvas(ctx, {
      car: winnerCar,
      colorOverride: winner.color,
      scale: 1.8,
    });
    ctx.restore();
  }, [winner]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-y-auto">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6 relative z-10 my-auto">
        {/* Top Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Trophy className="w-4 h-4 text-amber-400" /> Grand Prix Final Standings
          </div>
          <h1 className="text-3xl sm:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
            {winner?.playerId === playerId ? 'VICTORY IS YOURS!' : `${winner?.name || 'Racer'} WINS THE RACE!`}
          </h1>
        </div>

        {/* Winner Spotlight Card */}
        {winner && (
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_35px_rgba(245,158,11,0.15)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xl">
                1st
              </div>
              <div>
                <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Race Champion</div>
                <div className="text-2xl sm:text-3xl font-black text-white">{winner.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <span>Car: {getCarById(winner.carId).name}</span>
                  <span>•</span>
                  <span>Total: {formatTime(winner.totalTime)}</span>
                </div>
              </div>
            </div>

            <div className="w-44 h-28 relative">
              <canvas ref={canvasRef} width={200} height={120} className="w-full h-full block" />
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-800 mb-4">
            Official Race Classification
          </div>

          <div className="space-y-3">
            {results.map((res, index) => {
              const pos = index + 1;
              const isMe = res.playerId === playerId;
              const carSpec = getCarById(res.carId);

              return (
                <div
                  key={res.playerId}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                    isMe
                      ? 'bg-sky-950/40 border-sky-500/50'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                        pos === 1
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                          : pos === 2
                          ? 'bg-slate-300 text-slate-950'
                          : pos === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {pos}
                    </div>

                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: res.color }}
                    />

                    <div>
                      <div className="font-bold text-base text-white flex items-center gap-2">
                        <span>{res.name}</span>
                        {isMe && <span className="text-xs text-sky-400 font-semibold">(You)</span>}
                      </div>
                      <div className="text-xs text-slate-400">{carSpec.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-3 sm:mt-0 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1 justify-end">
                        <Flag className="w-3 h-3 text-emerald-400" /> Total Time
                      </div>
                      <div className="font-mono font-bold text-white text-sm">
                        {formatTime(res.totalTime)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1 justify-end">
                        <Timer className="w-3 h-3 text-sky-400" /> Best Lap
                      </div>
                      <div className="font-mono font-bold text-sky-300 text-sm">
                        {formatTime(res.bestLapTime)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1 justify-end">
                        <Zap className="w-3 h-3 text-amber-400" /> Top Speed
                      </div>
                      <div className="font-mono font-bold text-amber-400 text-sm">
                        {res.topSpeed} KM/H
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rematch & Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onRequestRematch}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400 hover:from-red-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-2xl transition flex items-center justify-center gap-2.5 hover:scale-[1.02]"
          >
            <RotateCcw className="w-4 h-4 fill-slate-950" />
            REMATCH RACE
          </button>

          <button
            onClick={onReturnToLobby}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-sm tracking-wider uppercase transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Return to Paddock Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
