export const CATEGORIES = [
  { id: 'girls', name: 'ගැහැනු', nameEn: 'Girls' },
  { id: 'boys', name: 'පිරිමි', nameEn: 'Boys' },
  { id: 'flowers', name: 'මල්', nameEn: 'Flowers' },
  { id: 'fruits', name: 'පලතුරු', nameEn: 'Fruits' },
  { id: 'animals', name: 'සත්තු', nameEn: 'Animals' },
  { id: 'cities', name: 'නගර', nameEn: 'Cities' }
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];

export interface Category {
  id: CategoryId;
  name: string;
  nameEn: string;
}

export interface Player {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  isHost: boolean;
  isReady: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  totalRounds: number;
  letterMode: 'random' | 'manual';
  currentLetter: string | null;
  status: 'waiting' | 'countdown' | 'playing' | 'validation' | 'round_end' | 'finished';
  currentRound: number;
  currentCategoryIndex: number;
  votingCategory: string | null;
  timerEndsAt: number | null;
  playerScores: Record<string, number>;
  roundScores: Record<string, number>;
}

export interface AnswerData {
  playerId: string;
  playerName?: string;
  answer: string;
  votes: { voterId: string; isValid: boolean }[];
  isDuplicate?: boolean;
  voteCount?: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  avgScore: number;
}
