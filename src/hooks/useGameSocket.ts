import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ClientMessage,
  ServerMessage,
  RoomData,
  PlayerCarState,
  ChatMessage,
  RoomConfig,
} from '../types/game';

export function useGameSocket() {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [remoteCarStates, setRemoteCarStates] = useState<Record<string, PlayerCarState>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [countdown, setCountdown] = useState<{ active: boolean; seconds: number; startsAt: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latency, setLatency] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Connect function
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setErrorMessage(null);

        // Start ping heartbeat
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Auto reconnect after 2 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 2000);
        }
      };

      ws.onerror = () => {
        // will trigger onclose
      };
    } catch {
      setErrorMessage('Could not establish connection to race server.');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const handleServerMessage = (msg: ServerMessage) => {
    switch (msg.type) {
      case 'pong': {
        const rtt = Date.now() - msg.timestamp;
        setLatency(Math.round(rtt / 2));
        break;
      }

      case 'error': {
        setErrorMessage(msg.message);
        break;
      }

      case 'room_created':
      case 'room_joined': {
        setRoom(msg.room);
        setPlayerId(msg.playerId);
        setErrorMessage(null);
        setRemoteCarStates({});
        setChatMessages([]);
        setCountdown(null);
        break;
      }

      case 'room_update': {
        setRoom(msg.room);
        break;
      }

      case 'player_left': {
        setRemoteCarStates((prev) => {
          const next = { ...prev };
          delete next[msg.playerId];
          return next;
        });
        break;
      }

      case 'countdown_start': {
        setCountdown({
          active: true,
          seconds: msg.countdownSeconds,
          startsAt: msg.startsAt,
        });
        break;
      }

      case 'race_start': {
        setCountdown(null);
        break;
      }

      case 'race_state_broadcast': {
        setRemoteCarStates(msg.states);
        break;
      }

      case 'chat_message': {
        setChatMessages((prev) => [...prev.slice(-49), msg.message]);
        break;
      }

      case 'race_end': {
        setRoom((prev) => (prev ? { ...prev, state: 'results', results: msg.results } : null));
        break;
      }
    }
  };

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const createRoom = useCallback(
    (playerName: string, carId: string, color: string) => {
      send({ type: 'create_room', playerName, carId, color });
    },
    [send]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string, carId: string, color: string) => {
      send({ type: 'join_room', code, playerName, carId, color });
    },
    [send]
  );

  const leaveRoom = useCallback(() => {
    send({ type: 'leave_room' });
    setRoom(null);
    setRemoteCarStates({});
    setCountdown(null);
  }, [send]);

  const updatePlayer = useCallback(
    (updates: { name?: string; carId?: string; color?: string; isReady?: boolean }) => {
      send({ type: 'update_player', ...updates });
    },
    [send]
  );

  const updateRoomConfig = useCallback(
    (config: Partial<RoomConfig>) => {
      send({ type: 'update_room_config', config });
    },
    [send]
  );

  const startRace = useCallback(() => {
    send({ type: 'start_race' });
  }, [send]);

  const syncRaceState = useCallback(
    (state: Omit<PlayerCarState, 'finishTime' | 'finishPosition' | 'finished'>) => {
      send({ type: 'race_sync', state });
    },
    [send]
  );

  const finishRace = useCallback(
    (totalTime: number, bestLapTime: number, topSpeed: number) => {
      send({ type: 'player_finish_race', totalTime, bestLapTime, topSpeed });
    },
    [send]
  );

  const sendChat = useCallback(
    (text: string) => {
      send({ type: 'send_chat', text });
    },
    [send]
  );

  const requestRematch = useCallback(() => {
    send({ type: 'request_rematch' });
  }, [send]);

  return {
    connected,
    latency,
    room,
    playerId,
    remoteCarStates,
    chatMessages,
    countdown,
    errorMessage,
    clearError: () => setErrorMessage(null),
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
  };
}
