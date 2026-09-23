import React, { useState, useEffect, useRef } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { MenuView } from './components/MenuView';
import { LobbyView } from './components/LobbyView';
import { RaceCanvas } from './components/RaceCanvas';
import { RaceCanvas3D } from './components/RaceCanvas3D';
import { RaceHUD } from './components/RaceHUD';
import { ResultsView } from './components/ResultsView';
import { PlayerCarState } from './types/game';

export default function App() {
  const {
    connected,
    room,
    playerId,
    remoteCarStates,
    chatMessages,
    countdown,
    errorMessage,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    updatePlayer,
    updateRoomConfig,
    startRace,
    syncRaceState,
    finishRace,
    sendChat,
    requestRematch,
  } = useGameSocket();

  // Local state tracked for HUD
  const [localCarState, setLocalCarState] = useState<PlayerCarState | null>(null);
  const [touchInput, setTouchInput] = useState<{
    throttle: number;
    brake: number;
    steer: number;
    nitro: boolean;
    handbrake: boolean;
  }>({ throttle: 0, brake: 0, steer: 0, nitro: false, handbrake: false });

  // Floating in-race emoji reactions
  const [floatingEmojis, setFloatingEmojis] = useState<
    Array<{ id: string; emoji: string; x: number; y: number; createdAt: number }>
  >([]);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Check URL params for room invite code
  const [initialRoomCode, setInitialRoomCode] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setInitialRoomCode(code.toUpperCase());
    }
  }, []);

  // Update floating emojis and clean old ones
  useEffect(() => {
    if (floatingEmojis.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setFloatingEmojis((prev) =>
        prev
          .filter((e) => now - e.createdAt < 2500)
          .map((e) => ({ ...e, y: e.y - 1.5 }))
      );
    }, 30);
    return () => clearInterval(interval);
  }, [floatingEmojis.length]);

  // Sync state handler from RaceCanvas
  const handleSyncState = (state: Omit<PlayerCarState, 'finishTime' | 'finishPosition' | 'finished'>) => {
    setLocalCarState((prev) => ({
      ...state,
      finished: prev?.finished || false,
      finishTime: prev?.finishTime,
      finishPosition: prev?.finishPosition,
    }));
    syncRaceState(state);
  };

  const handleFinishRace = (totalTime: number, bestLap: number, topSpeed: number) => {
    setLocalCarState((prev) => (prev ? { ...prev, finished: true, finishTime: Date.now() } : null));
    finishRace(totalTime, bestLap, topSpeed);
  };

  const handleSendEmoji = (emoji: string) => {
    if (localCarState) {
      setFloatingEmojis((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          emoji,
          x: localCarState.x,
          y: localCarState.y - 40,
          createdAt: Date.now(),
        },
      ]);
    }
    sendChat(emoji);
  };

  // If not in a room, show Menu
  if (!room || !playerId) {
    return (
      <MenuView
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        initialRoomCode={initialRoomCode}
        errorMessage={errorMessage}
        onClearError={clearError}
      />
    );
  }

  // If in Lobby
  if (room.state === 'lobby') {
    return (
      <LobbyView
        room={room}
        playerId={playerId}
        chatMessages={chatMessages}
        onUpdatePlayer={updatePlayer}
        onUpdateRoomConfig={updateRoomConfig}
        onStartRace={startRace}
        onLeaveRoom={leaveRoom}
        onSendChat={sendChat}
      />
    );
  }

  // If in Results
  if (room.state === 'results') {
    return (
      <ResultsView
        room={room}
        playerId={playerId}
        onRequestRematch={requestRematch}
        onReturnToLobby={requestRematch}
      />
    );
  }

  // In Countdown or Racing
  const isRaceActive = room.state === 'racing';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {viewMode === '3d' ? (
        <RaceCanvas3D
          room={room}
          playerId={playerId}
          remoteCarStates={remoteCarStates}
          onSyncState={handleSyncState}
          onFinishRace={handleFinishRace}
          isRaceActive={isRaceActive}
          floatingEmojis={floatingEmojis}
          touchInput={touchInput}
        />
      ) : (
        <RaceCanvas
          room={room}
          playerId={playerId}
          remoteCarStates={remoteCarStates}
          onSyncState={handleSyncState}
          onFinishRace={handleFinishRace}
          isRaceActive={isRaceActive}
          floatingEmojis={floatingEmojis}
          touchInput={touchInput}
        />
      )}

      {/* 3D vs 2D Perspective Toggle Floating Button */}
      <div className="absolute top-4 left-44 z-30 pointer-events-auto">
        <button
          onClick={() => setViewMode((m) => (m === '3d' ? '2d' : '3d'))}
          className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-black tracking-wider transition-all shadow-xl active:scale-95 flex items-center gap-1.5"
          title="Toggle 3D Third Person View vs 2D Top Down View"
        >
          <span>{viewMode === '3d' ? '3D VIEW' : '2D VIEW'}</span>
        </button>
      </div>

      <RaceHUD
        room={room}
        playerId={playerId}
        localCarState={localCarState}
        remoteCarStates={remoteCarStates}
        countdown={countdown}
        onSendEmoji={handleSendEmoji}
        onSendChat={sendChat}
        onLeaveRace={leaveRoom}
        onTouchUpdate={setTouchInput}
      />
    </div>
  );
}
