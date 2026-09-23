import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  ClientMessage,
  ServerMessage,
  RoomData,
  Player,
  PlayerCarState,
  ChatMessage,
} from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), activeRooms: Object.keys(rooms).length });
});

// Room list endpoint (for public rooms or discovery)
app.get('/api/rooms', (req, res) => {
  const publicRooms = Object.values(rooms).map((r) => ({
    code: r.code,
    hostName: r.players[r.hostId]?.name || 'Unknown',
    playerCount: Object.keys(r.players).length,
    maxPlayers: r.config.maxPlayers,
    state: r.state,
    trackId: r.config.trackId,
  }));
  res.json(publicRooms);
});

// Setup WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSession {
  ws: WebSocket;
  playerId: string;
  roomCode: string | null;
  lastPing: number;
}

const clients = new Map<WebSocket, ClientSession>();
const rooms: Record<string, RoomData> = {};
const roomSockets = new Map<string, Set<WebSocket>>();
const roomCarStates = new Map<string, Record<string, PlayerCarState>>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms[code]);
  return code;
}

function broadcastToRoom(roomCode: string, message: ServerMessage, excludeWs?: WebSocket) {
  const sockets = roomSockets.get(roomCode);
  if (!sockets) return;
  const payload = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket !== excludeWs && socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

function sendToClient(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function createRoom(
  code: string,
  hostPlayerId: string,
  hostPlayer: Player,
  ws: WebSocket
): RoomData {
  const room: RoomData = {
    code,
    hostId: hostPlayerId,
    state: 'lobby',
    config: {
      trackId: 'neo-metropolis',
      totalLaps: 3,
      maxPlayers: 4,
      collisionEnabled: true,
    },
    players: {
      [hostPlayerId]: hostPlayer,
    },
    results: [],
  };

  rooms[code] = room;
  const socketSet = new Set<WebSocket>();
  socketSet.add(ws);
  roomSockets.set(code, socketSet);
  roomCarStates.set(code, {});

  return room;
}

function removePlayerFromRoom(roomCode: string, playerId: string, ws: WebSocket) {
  const room = rooms[roomCode];
  if (!room) return;

  const leavingPlayer = room.players[playerId];
  delete room.players[playerId];

  const sockets = roomSockets.get(roomCode);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) {
      // Room empty, clean up
      delete rooms[roomCode];
      roomSockets.delete(roomCode);
      roomCarStates.delete(roomCode);
      return;
    }
  }

  // Host migration if host left
  let newHostId: string | undefined;
  if (room.hostId === playerId) {
    const remainingPlayerIds = Object.keys(room.players);
    if (remainingPlayerIds.length > 0) {
      newHostId = remainingPlayerIds[0];
      room.hostId = newHostId;
      room.players[newHostId].isHost = true;
    }
  }

  // Notify remaining players
  broadcastToRoom(roomCode, {
    type: 'player_left',
    playerId,
    newHostId,
  });

  broadcastToRoom(roomCode, {
    type: 'room_update',
    room,
  });

  if (leavingPlayer) {
    broadcastToRoom(roomCode, {
      type: 'chat_message',
      message: {
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'System',
        text: `${leavingPlayer.name} left the room.`,
        time: Date.now(),
        isSystem: true,
      },
    });
  }
}

// WebSocket Connection handling
wss.on('connection', (ws: WebSocket) => {
  const playerId = 'p_' + crypto.randomBytes(4).toString('hex');
  const session: ClientSession = {
    ws,
    playerId,
    roomCode: null,
    lastPing: Date.now(),
  };
  clients.set(ws, session);

  ws.on('message', (data: string) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      handleClientMessage(ws, session, message);
    } catch {
      sendToClient(ws, { type: 'error', message: 'Invalid message payload' });
    }
  });

  ws.on('close', () => {
    if (session.roomCode) {
      removePlayerFromRoom(session.roomCode, session.playerId, ws);
    }
    clients.delete(ws);
  });

  ws.on('error', () => {
    if (session.roomCode) {
      removePlayerFromRoom(session.roomCode, session.playerId, ws);
    }
    clients.delete(ws);
  });
});

function handleClientMessage(ws: WebSocket, session: ClientSession, msg: ClientMessage) {
  switch (msg.type) {
    case 'ping': {
      session.lastPing = Date.now();
      sendToClient(ws, { type: 'pong', timestamp: msg.timestamp, serverTime: Date.now() });
      break;
    }

    case 'create_room': {
      const code = generateRoomCode();
      session.roomCode = code;

      const player: Player = {
        id: session.playerId,
        name: (msg.playerName || 'Racer 1').trim().slice(0, 16),
        isHost: true,
        isReady: true,
        carId: msg.carId || 'apex-viper',
        color: msg.color || '#ef4444',
        connected: true,
      };

      const room = createRoom(code, session.playerId, player, ws);

      sendToClient(ws, {
        type: 'room_created',
        code,
        playerId: session.playerId,
        room,
      });

      broadcastToRoom(code, {
        type: 'chat_message',
        message: {
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          text: `${player.name} created the room! Code: ${code}`,
          time: Date.now(),
          isSystem: true,
        },
      });
      break;
    }

    case 'join_room': {
      const cleanCode = (msg.code || '').trim().toUpperCase();
      const room = rooms[cleanCode];

      if (!room) {
        sendToClient(ws, { type: 'error', message: `Room "${cleanCode}" not found. Check the code!` });
        return;
      }

      if (room.state !== 'lobby') {
        sendToClient(ws, { type: 'error', message: 'Race is currently in progress! Please wait or create a new room.' });
        return;
      }

      const currentCount = Object.keys(room.players).length;
      if (currentCount >= room.config.maxPlayers) {
        sendToClient(ws, { type: 'error', message: 'Room is full! Maximum players reached.' });
        return;
      }

      session.roomCode = cleanCode;

      const newPlayer: Player = {
        id: session.playerId,
        name: (msg.playerName || `Racer ${currentCount + 1}`).trim().slice(0, 16),
        isHost: false,
        isReady: false,
        carId: msg.carId || 'apex-viper',
        color: msg.color || '#06b6d4',
        connected: true,
      };

      room.players[session.playerId] = newPlayer;
      const sockets = roomSockets.get(cleanCode);
      if (sockets) sockets.add(ws);

      sendToClient(ws, {
        type: 'room_joined',
        code: cleanCode,
        playerId: session.playerId,
        room,
      });

      broadcastToRoom(cleanCode, {
        type: 'player_joined',
        player: newPlayer,
      }, ws);

      broadcastToRoom(cleanCode, {
        type: 'room_update',
        room,
      });

      broadcastToRoom(cleanCode, {
        type: 'chat_message',
        message: {
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          text: `${newPlayer.name} joined the race!`,
          time: Date.now(),
          isSystem: true,
        },
      });
      break;
    }

    case 'leave_room': {
      if (session.roomCode) {
        removePlayerFromRoom(session.roomCode, session.playerId, ws);
        session.roomCode = null;
      }
      break;
    }

    case 'update_player': {
      if (!session.roomCode) return;
      const room = rooms[session.roomCode];
      if (!room) return;

      const player = room.players[session.playerId];
      if (!player) return;

      if (msg.name !== undefined) player.name = msg.name.trim().slice(0, 16);
      if (msg.carId !== undefined) player.carId = msg.carId;
      if (msg.color !== undefined) player.color = msg.color;
      if (msg.isReady !== undefined) player.isReady = msg.isReady;

      broadcastToRoom(session.roomCode, {
        type: 'room_update',
        room,
      });
      break;
    }

    case 'update_room_config': {
      if (!session.roomCode) return;
      const room = rooms[session.roomCode];
      if (!room || room.hostId !== session.playerId) return;

      room.config = {
        ...room.config,
        ...msg.config,
      };

      broadcastToRoom(session.roomCode, {
        type: 'room_update',
        room,
      });
      break;
    }

    case 'start_race': {
      if (!session.roomCode) return;
      const room = rooms[session.roomCode];
      if (!room || room.hostId !== session.playerId) return;

      if (room.state !== 'lobby' && room.state !== 'results') return;

      // Start synchronized countdown: 3.5 seconds
      room.state = 'countdown';
      room.results = [];
      const countdownSeconds = 3;
      const startsAt = Date.now() + countdownSeconds * 1000 + 400; // Extra buffer for sync
      room.raceStartTime = startsAt;

      // Reset car states
      const carStates: Record<string, PlayerCarState> = {};
      roomCarStates.set(session.roomCode, carStates);

      broadcastToRoom(session.roomCode, {
        type: 'room_update',
        room,
      });

      broadcastToRoom(session.roomCode, {
        type: 'countdown_start',
        countdownSeconds,
        startsAt,
      });

      // Schedule actual race start
      const timeToStart = Math.max(0, startsAt - Date.now());
      setTimeout(() => {
        if (rooms[session.roomCode!] && rooms[session.roomCode!].state === 'countdown') {
          rooms[session.roomCode!].state = 'racing';
          broadcastToRoom(session.roomCode!, {
            type: 'race_start',
            startsAt,
          });
          broadcastToRoom(session.roomCode!, {
            type: 'room_update',
            room: rooms[session.roomCode!],
          });
        }
      }, timeToStart);

      break;
    }

    case 'race_sync': {
      if (!session.roomCode) return;
      const room = rooms[session.roomCode];
      if (!room || (room.state !== 'racing' && room.state !== 'countdown')) return;

      let states = roomCarStates.get(session.roomCode);
      if (!states) {
        states = {};
        roomCarStates.set(session.roomCode, states);
      }

      states[session.playerId] = {
        ...msg.state,
        playerId: session.playerId,
        finished: states[session.playerId]?.finished || false,
        finishTime: states[session.playerId]?.finishTime,
        finishPosition: states[session.playerId]?.finishPosition,
        lastUpdated: Date.now(),
      };
      break;
    }

    case 'player_finish_race': {
      if (!session.roomCode) return;
      const room = rooms[session.roomCode];
      if (!room || room.state !== 'racing') return;

      const player = room.players[session.playerId];
      if (!player) return;

      const states = roomCarStates.get(session.roomCode);
      if (states && states[session.playerId]) {
        states[session.playerId].finished = true;
      }

      if (!room.results) room.results = [];

      // Check if player already finished
      const alreadyFinished = room.results.some((r) => r.playerId === session.playerId);
      if (!alreadyFinished) {
        const position = room.results.length + 1;
        const resultItem = {
          playerId: session.playerId,
          name: player.name,
          carId: player.carId,
          color: player.color,
          position,
          totalTime: msg.totalTime,
          bestLapTime: msg.bestLapTime,
          topSpeed: msg.topSpeed,
        };
        room.results.push(resultItem);

        broadcastToRoom(session.roomCode, {
          type: 'player_finished_event',
          playerId: session.playerId,
          position,
          finishTime: msg.totalTime,
        });

        broadcastToRoom(session.roomCode, {
          type: 'chat_message',
          message: {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: `🏁 ${player.name} finished in ${position}${
              position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'
            } place! (${msg.totalTime.toFixed(2)}s)`,
            time: Date.now(),
            isSystem: true,
          },
        });

        // Check if all active players finished
        const totalConnectedPlayers = Object.keys(room.players).length;
        if (room.results.length >= totalConnectedPlayers) {
          room.state = 'results';
          room.raceEndTime = Date.now();
          broadcastToRoom(session.roomCode, {
            type: 'race_end',
            results: room.results,
          });
          broadcastToRoom(session.roomCode, {
            type: 'room_update',
            room,
          });
        }
      }
      break;
    }

    case 'request_rematch': {
      if (!session.roomCode) return;
      const room = rooms[session.roomCode];
      if (!room) return;

      room.state = 'lobby';
      room.results = [];
      // Reset readiness
      for (const pid of Object.keys(room.players)) {
        room.players[pid].isReady = false;
      }
      if (room.players[room.hostId]) {
        room.players[room.hostId].isReady = true;
      }

      broadcastToRoom(session.roomCode, {
        type: 'room_update',
        room,
      });

      broadcastToRoom(session.roomCode, {
        type: 'chat_message',
        message: {
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          text: `🔄 Rematch ready! Returned to lobby.`,
          time: Date.now(),
          isSystem: true,
        },
      });
      break;
    }

    case 'send_chat': {
      if (!session.roomCode) return;
      const room = rooms[session.roomCode];
      if (!room) return;

      const player = room.players[session.playerId];
      const cleanText = (msg.text || '').trim().slice(0, 140);
      if (!cleanText) return;

      const chatMsg: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: session.playerId,
        senderName: player?.name || 'Racer',
        text: cleanText,
        time: Date.now(),
        color: player?.color,
      };

      broadcastToRoom(session.roomCode, {
        type: 'chat_message',
        message: chatMsg,
      });
      break;
    }
  }
}

// High-frequency race state sync loop (~25Hz = every 40ms)
setInterval(() => {
  for (const [roomCode, carStates] of roomCarStates.entries()) {
    const room = rooms[roomCode];
    if (!room || (room.state !== 'racing' && room.state !== 'countdown')) continue;
    if (Object.keys(carStates).length === 0) continue;

    broadcastToRoom(roomCode, {
      type: 'race_state_broadcast',
      states: carStates,
    });
  }
}, 40);

// Client heartbeat sweep
setInterval(() => {
  const now = Date.now();
  for (const [ws, session] of clients.entries()) {
    if (now - session.lastPing > 35000) {
      // Timeout
      ws.terminate();
    }
  }
}, 15000);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Apex Nitro] Server running on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
