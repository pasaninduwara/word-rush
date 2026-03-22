import { Server } from "socket.io";

const PORT = 3003;

const io = new Server(PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game categories
const CATEGORIES = [
  { id: 'girls', name: 'ගැහැනු', nameEn: 'Girls' },
  { id: 'boys', name: 'පිරිමි', nameEn: 'Boys' },
  { id: 'flowers', name: 'මල්', nameEn: 'Flowers' },
  { id: 'fruits', name: 'පලතුරු', nameEn: 'Fruits' },
  { id: 'animals', name: 'සත්තු', nameEn: 'Animals' },
  { id: 'cities', name: 'නගර', nameEn: 'Cities' }
];

// Sinhala alphabet letters (consonants commonly used)
const LETTERS = 'අආඇඈඉඊඋඌඑඒඔඕකඛගඝඟචඡජඣඤඥටඨඩඪණතථදධනපඵබභමයරලවශෂසහලෂABCDEFHIJKLMNOPQRSTUVWYZ'.split('');

// In-memory storage
interface Player {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  isHost: boolean;
  isReady: boolean;
  socketId: string;
}

interface Answer {
  category: string;
  answer: string;
  points: number;
  isValid: boolean | null;
  votes: { voterId: string; isValid: boolean }[];
}

interface PlayerAnswers {
  [categoryId: string]: string;
}

interface GameRoom {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  totalRounds: number;
  letterMode: 'random' | 'manual';
  currentLetter: string | null;
  status: 'waiting' | 'playing' | 'countdown' | 'validation' | 'round_end' | 'finished';
  currentRound: number;
  currentCategoryIndex: number;
  answers: Map<string, PlayerAnswers>; // playerId -> answers
  roundAnswers: Map<string, Map<string, Answer>>; // categoryId -> (playerId -> answer)
  votingCategory: string | null;
  timerEndsAt: number | null;
  playerScores: Map<string, number>; // cumulative scores
  roundScores: Map<string, number>; // round scores
  letterRotationIndex: number;
}

const lobbies = new Map<string, GameRoom>();
const userSocketMap = new Map<string, string>(); // userId -> socketId
const socketRoomMap = new Map<string, string>(); // socketId -> roomCode

// Generate unique 6-character code
function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return lobbies.has(code) ? generateLobbyCode() : code;
}

// Get random letter
function getRandomLetter(): string {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

// Check if word starts with letter
function wordStartsWithLetter(word: string, letter: string): boolean {
  if (!word || !letter) return false;
  return word.trim().toLowerCase().startsWith(letter.toLowerCase());
}

// Broadcast to room
function broadcastToRoom(roomCode: string, event: string, data: any) {
  io.to(roomCode).emit(event, data);
}

// Get room state for client
function getRoomState(room: GameRoom) {
  const players = Array.from(room.players.values()).map(p => ({
    id: p.id,
    userId: p.userId,
    username: p.username,
    avatar: p.avatar,
    isHost: p.isHost,
    isReady: p.isReady
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    players,
    maxPlayers: room.maxPlayers,
    totalRounds: room.totalRounds,
    letterMode: room.letterMode,
    currentLetter: room.currentLetter,
    status: room.status,
    currentRound: room.currentRound,
    currentCategoryIndex: room.currentCategoryIndex,
    votingCategory: room.votingCategory,
    timerEndsAt: room.timerEndsAt,
    playerScores: Object.fromEntries(room.playerScores),
    roundScores: Object.fromEntries(room.roundScores)
  };
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Create lobby
  socket.on('create_lobby', (data: {
    userId: string;
    username: string;
    avatar: string | null;
    maxPlayers: number;
    totalRounds: number;
    letterMode: 'random' | 'manual';
  }) => {
    const code = generateLobbyCode();
    const playerId = data.userId;
    
    const room: GameRoom = {
      id: code,
      code,
      hostId: playerId,
      players: new Map(),
      maxPlayers: data.maxPlayers || 6,
      totalRounds: data.totalRounds || 3,
      letterMode: data.letterMode || 'random',
      currentLetter: null,
      status: 'waiting',
      currentRound: 0,
      currentCategoryIndex: 0,
      answers: new Map(),
      roundAnswers: new Map(),
      votingCategory: null,
      timerEndsAt: null,
      playerScores: new Map(),
      roundScores: new Map(),
      letterRotationIndex: 0
    };

    const player: Player = {
      id: playerId,
      userId: data.userId,
      username: data.username,
      avatar: data.avatar,
      isHost: true,
      isReady: true,
      socketId: socket.id
    };

    room.players.set(playerId, player);
    room.playerScores.set(playerId, 0);
    lobbies.set(code, room);
    
    socket.join(code);
    userSocketMap.set(data.userId, socket.id);
    socketRoomMap.set(socket.id, code);

    socket.emit('lobby_created', { code, playerId });
    broadcastToRoom(code, 'room_update', getRoomState(room));
  });

  // Join lobby
  socket.on('join_lobby', (data: {
    code: string;
    userId: string;
    username: string;
    avatar: string | null;
  }) => {
    const room = lobbies.get(data.code.toUpperCase());
    
    if (!room) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    if (room.players.size >= room.maxPlayers) {
      socket.emit('error', { message: 'Lobby is full' });
      return;
    }

    // Check if player already in room
    if (room.players.has(data.userId)) {
      // Update socket ID for reconnection
      const player = room.players.get(data.userId)!;
      player.socketId = socket.id;
      socket.join(data.code);
      userSocketMap.set(data.userId, socket.id);
      socketRoomMap.set(socket.id, data.code);
      socket.emit('lobby_joined', { code: data.code, playerId: data.userId });
      broadcastToRoom(data.code, 'room_update', getRoomState(room));
      return;
    }

    const player: Player = {
      id: data.userId,
      userId: data.userId,
      username: data.username,
      avatar: data.avatar,
      isHost: false,
      isReady: false,
      socketId: socket.id
    };

    room.players.set(data.userId, player);
    room.playerScores.set(data.userId, 0);
    
    socket.join(data.code);
    userSocketMap.set(data.userId, socket.id);
    socketRoomMap.set(socket.id, data.code);

    socket.emit('lobby_joined', { code: data.code, playerId: data.userId });
    broadcastToRoom(data.code, 'room_update', getRoomState(room));
    broadcastToRoom(data.code, 'player_joined', { 
      player: { 
        id: player.id, 
        username: player.username, 
        avatar: player.avatar 
      } 
    });
  });

  // Update settings (host only)
  socket.on('update_settings', (data: {
    code: string;
    userId: string;
    maxPlayers?: number;
    totalRounds?: number;
    letterMode?: 'random' | 'manual';
  }) => {
    const room = lobbies.get(data.code);
    if (!room) return;
    
    if (room.hostId !== data.userId) {
      socket.emit('error', { message: 'Only host can update settings' });
      return;
    }

    if (data.maxPlayers) room.maxPlayers = data.maxPlayers;
    if (data.totalRounds) room.totalRounds = data.totalRounds;
    if (data.letterMode) room.letterMode = data.letterMode;

    broadcastToRoom(data.code, 'room_update', getRoomState(room));
  });

  // Toggle ready
  socket.on('toggle_ready', (data: { code: string; userId: string }) => {
    const room = lobbies.get(data.code);
    if (!room) return;

    const player = room.players.get(data.userId);
    if (!player) return;

    player.isReady = !player.isReady;
    broadcastToRoom(data.code, 'room_update', getRoomState(room));
  });

  // Kick player (host only)
  socket.on('kick_player', (data: { code: string; hostId: string; playerId: string }) => {
    const room = lobbies.get(data.code);
    if (!room) return;

    if (room.hostId !== data.hostId) {
      socket.emit('error', { message: 'Only host can kick players' });
      return;
    }

    const player = room.players.get(data.playerId);
    if (player) {
      const kickedSocket = io.sockets.sockets.get(player.socketId);
      if (kickedSocket) {
        kickedSocket.emit('kicked', { message: 'You have been removed from the lobby' });
        kickedSocket.leave(data.code);
      }
      room.players.delete(data.playerId);
      broadcastToRoom(data.code, 'room_update', getRoomState(room));
    }
  });

  // Start game (host only)
  socket.on('start_game', (data: { code: string; userId: string }) => {
    const room = lobbies.get(data.code);
    if (!room) return;

    if (room.hostId !== data.userId) {
      socket.emit('error', { message: 'Only host can start the game' });
      return;
    }

    if (room.players.size < 3) {
      socket.emit('error', { message: 'Need at least 3 players to start' });
      return;
    }

    // Initialize game
    room.status = 'playing';
    room.currentRound = 1;
    room.currentCategoryIndex = 0;
    room.roundScores = new Map();
    
    // Set letter
    if (room.letterMode === 'random') {
      room.currentLetter = getRandomLetter();
    } else {
      // Manual rotation - host sets it first
      room.currentLetter = getRandomLetter();
      room.letterRotationIndex = 0;
    }

    // Clear answers
    room.answers = new Map();
    room.roundAnswers = new Map();
    for (const playerId of room.players.keys()) {
      room.answers.set(playerId, {});
      room.roundScores.set(playerId, 0);
    }

    broadcastToRoom(data.code, 'game_started', {
      letter: room.currentLetter,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      categories: CATEGORIES
    });
    broadcastToRoom(data.code, 'room_update', getRoomState(room));
  });

  // Submit answer
  socket.on('submit_answer', (data: {
    code: string;
    userId: string;
    category: string;
    answer: string;
  }) => {
    const room = lobbies.get(data.code);
    if (!room || room.status !== 'playing') return;

    const playerAnswers = room.answers.get(data.userId);
    if (playerAnswers) {
      playerAnswers[data.category] = data.answer;
    }
  });

  // Player done - trigger countdown
  socket.on('player_done', (data: { code: string; userId: string }) => {
    const room = lobbies.get(data.code);
    if (!room || room.status !== 'playing') return;

    // Check if all categories filled
    const playerAnswers = room.answers.get(data.userId);
    const filledCategories = Object.keys(playerAnswers || {}).filter(
      cat => (playerAnswers?.[cat]?.trim().length || 0) > 0
    );

    if (filledCategories.length < 6) {
      socket.emit('error', { message: 'Fill all categories first' });
      return;
    }

    // First to finish triggers countdown
    if (room.status === 'playing') {
      room.status = 'countdown';
      room.timerEndsAt = Date.now() + 20000; // 20 seconds

      broadcastToRoom(data.code, 'countdown_started', {
        timerEndsAt: room.timerEndsAt,
        triggeredBy: data.userId
      });

      // Set timeout for countdown end
      setTimeout(() => {
        if (room.status === 'countdown') {
          startValidation(data.code);
        }
      }, 20000);
    }
  });

  // Start validation phase
  function startValidation(roomCode: string) {
    const room = lobbies.get(roomCode);
    if (!room) return;

    room.status = 'validation';
    room.currentCategoryIndex = 0;
    
    // Process answers for first category
    processCategoryAnswers(roomCode, CATEGORIES[0].id);
  }

  // Process answers for a category
  function processCategoryAnswers(roomCode: string, categoryId: string) {
    const room = lobbies.get(roomCode);
    if (!room) return;

    room.votingCategory = categoryId;
    
    // Collect all answers for this category
    const categoryAnswers = new Map<string, Answer>();
    const answersByWord = new Map<string, string[]>(); // word -> playerIds

    for (const [playerId, playerAnswers] of room.answers) {
      const answer = playerAnswers[categoryId] || '';
      const answerObj: Answer = {
        category: categoryId,
        answer,
        points: 0,
        isValid: null,
        votes: []
      };
      categoryAnswers.set(playerId, answerObj);

      const normalizedWord = answer.toLowerCase().trim();
      if (normalizedWord) {
        if (!answersByWord.has(normalizedWord)) {
          answersByWord.set(normalizedWord, []);
        }
        answersByWord.get(normalizedWord)!.push(playerId);
      }
    }

    // Mark duplicates
    for (const [word, playerIds] of answersByWord) {
      if (playerIds.length > 1) {
        for (const pid of playerIds) {
          const ans = categoryAnswers.get(pid);
          if (ans) ans.isValid = false; // Will be voted, mark as potential duplicate
        }
      }
    }

    room.roundAnswers.set(categoryId, categoryAnswers);

    // Send answers to all players for voting
    const answersData = Array.from(categoryAnswers.entries()).map(([playerId, ans]) => {
      const wordArray = answersByWord.get(ans.answer.toLowerCase().trim());
      return {
        playerId,
        playerName: room.players.get(playerId)?.username,
        answer: ans.answer,
        votes: ans.votes,
        isDuplicate: wordArray ? wordArray.length > 1 : false
      };
    });

    broadcastToRoom(roomCode, 'validation_phase', {
      category: categoryId,
      categoryName: CATEGORIES.find(c => c.id === categoryId)?.name,
      answers: answersData
    });
    broadcastToRoom(roomCode, 'room_update', getRoomState(room));
  }

  // Submit vote
  socket.on('submit_vote', (data: {
    code: string;
    userId: string;
    answerPlayerId: string;
    isValid: boolean;
  }) => {
    const room = lobbies.get(data.code);
    if (!room || room.status !== 'validation' || !room.votingCategory) return;

    const categoryAnswers = room.roundAnswers.get(room.votingCategory);
    if (!categoryAnswers) return;

    const answer = categoryAnswers.get(data.answerPlayerId);
    if (!answer) return;

    // Check if already voted
    const existingVote = answer.votes.find(v => v.voterId === data.userId);
    if (existingVote) {
      existingVote.isValid = data.isValid;
    } else {
      answer.votes.push({ voterId: data.userId, isValid: data.isValid });
    }

    // Broadcast vote update
    const answersData = Array.from(categoryAnswers.entries()).map(([playerId, ans]) => ({
      playerId,
      playerName: room.players.get(playerId)?.username,
      answer: ans.answer,
      votes: ans.votes,
      voteCount: ans.votes.length
    }));

    broadcastToRoom(data.code, 'vote_update', {
      category: room.votingCategory,
      answers: answersData
    });
  });

  // Finish voting for current category
  socket.on('finish_category_voting', (data: { code: string; userId: string }) => {
    const room = lobbies.get(data.code);
    if (!room || room.status !== 'validation') return;

    // Calculate scores for current category
    if (room.votingCategory) {
      calculateCategoryScores(room, room.votingCategory);
    }

    // Move to next category
    room.currentCategoryIndex++;
    
    if (room.currentCategoryIndex < CATEGORIES.length) {
      processCategoryAnswers(data.code, CATEGORIES[room.currentCategoryIndex].id);
    } else {
      // End of round
      endRound(data.code);
    }
  });

  // Calculate scores for a category
  function calculateCategoryScores(room: GameRoom, categoryId: string) {
    const categoryAnswers = room.roundAnswers.get(categoryId);
    if (!categoryAnswers) return;

    // Find duplicates
    const answersByWord = new Map<string, string[]>();
    for (const [playerId, ans] of categoryAnswers) {
      const normalizedWord = ans.answer.toLowerCase().trim();
      if (normalizedWord) {
        if (!answersByWord.has(normalizedWord)) {
          answersByWord.set(normalizedWord, []);
        }
        answersByWord.get(normalizedWord)!.push(playerId);
      }
    }

    for (const [playerId, answer] of categoryAnswers) {
      // Count valid votes
      const validVotes = answer.votes.filter(v => v.isValid).length;
      const totalVotes = answer.votes.length;
      
      // Determine if valid (majority vote or no votes = auto-valid)
      const isWordValid = totalVotes === 0 || validVotes > totalVotes / 2;
      
      // Check if starts with correct letter
      const startsWithLetter = wordStartsWithLetter(answer.answer, room.currentLetter || '');
      
      // Check if duplicate
      const normalizedWord = answer.answer.toLowerCase().trim();
      const isDuplicate = (answersByWord.get(normalizedWord)?.length || 0) > 1;

      if (isWordValid && startsWithLetter && answer.answer.trim()) {
        answer.points = isDuplicate ? 5 : 10;
      } else {
        answer.points = 0;
      }
      answer.isValid = isWordValid && startsWithLetter;

      // Update round scores
      const currentScore = room.roundScores.get(playerId) || 0;
      room.roundScores.set(playerId, currentScore + answer.points);
    }

    broadcastToRoom(room.code, 'category_scores', {
      category: categoryId,
      categoryName: CATEGORIES.find(c => c.id === categoryId)?.name,
      scores: Object.fromEntries(
        Array.from(categoryAnswers.entries()).map(([pid, ans]) => [pid, ans.points])
      )
    });
  }

  // End round
  function endRound(roomCode: string) {
    const room = lobbies.get(roomCode);
    if (!room) return;

    room.status = 'round_end';

    // Add round scores to total
    for (const [playerId, score] of room.roundScores) {
      const currentTotal = room.playerScores.get(playerId) || 0;
      room.playerScores.set(playerId, currentTotal + score);
    }

    broadcastToRoom(roomCode, 'round_end', {
      round: room.currentRound,
      totalRounds: room.totalRounds,
      roundScores: Object.fromEntries(room.roundScores),
      totalScores: Object.fromEntries(room.playerScores)
    });
    broadcastToRoom(roomCode, 'room_update', getRoomState(room));
  }

  // Next round (host only)
  socket.on('next_round', (data: { code: string; userId: string }) => {
    const room = lobbies.get(data.code);
    if (!room) return;

    if (room.hostId !== data.userId) {
      socket.emit('error', { message: 'Only host can start next round' });
      return;
    }

    if (room.currentRound >= room.totalRounds) {
      // Game finished
      room.status = 'finished';
      broadcastToRoom(data.code, 'game_end', {
        finalScores: Object.fromEntries(room.playerScores)
      });
      broadcastToRoom(data.code, 'room_update', getRoomState(room));
      return;
    }

    // Start new round
    room.status = 'playing';
    room.currentRound++;
    room.currentCategoryIndex = 0;
    room.roundScores = new Map();
    
    // New letter
    if (room.letterMode === 'random') {
      room.currentLetter = getRandomLetter();
    } else {
      // Rotate to next player
      const playerArray = Array.from(room.players.keys());
      room.letterRotationIndex = (room.letterRotationIndex + 1) % playerArray.length;
      room.currentLetter = getRandomLetter(); // In manual mode, could let player choose
    }

    // Clear answers
    room.answers = new Map();
    room.roundAnswers = new Map();
    for (const playerId of room.players.keys()) {
      room.answers.set(playerId, {});
      room.roundScores.set(playerId, 0);
    }

    broadcastToRoom(data.code, 'new_round', {
      letter: room.currentLetter,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      categories: CATEGORIES
    });
    broadcastToRoom(data.code, 'room_update', getRoomState(room));
  });

  // Leave lobby
  socket.on('leave_lobby', (data: { code: string; userId: string }) => {
    const room = lobbies.get(data.code);
    if (!room) return;

    const player = room.players.get(data.userId);
    if (player) {
      socket.leave(data.code);
      room.players.delete(data.userId);
      socketRoomMap.delete(socket.id);
      
      // If host leaves, assign new host or close room
      if (room.hostId === data.userId) {
        if (room.players.size > 0) {
          const newHost = room.players.values().next().value;
          room.hostId = newHost.userId;
          newHost.isHost = true;
          broadcastToRoom(data.code, 'host_changed', { newHostId: newHost.userId });
        } else {
          lobbies.delete(data.code);
        }
      }

      broadcastToRoom(data.code, 'room_update', getRoomState(room));
      broadcastToRoom(data.code, 'player_left', { playerId: data.userId });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    const roomCode = socketRoomMap.get(socket.id);
    if (roomCode) {
      const room = lobbies.get(roomCode);
      if (room) {
        // Find player by socket
        for (const [playerId, player] of room.players) {
          if (player.socketId === socket.id) {
            room.players.delete(playerId);
            socketRoomMap.delete(socket.id);
            
            if (room.hostId === playerId && room.players.size > 0) {
              const newHost = room.players.values().next().value;
              room.hostId = newHost.userId;
              newHost.isHost = true;
              broadcastToRoom(roomCode, 'host_changed', { newHostId: newHost.userId });
            }

            broadcastToRoom(roomCode, 'room_update', getRoomState(room));
            broadcastToRoom(roomCode, 'player_left', { playerId });
            break;
          }
        }
      }
    }
  });

  // Get categories
  socket.on('get_categories', () => {
    socket.emit('categories', CATEGORIES);
  });
});

console.log(`Game server running on port ${PORT}`);
