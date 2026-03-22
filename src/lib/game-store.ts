import { create } from 'zustand';
import { User, RoomState, Category, AnswerData } from '@/types/game';

interface GameState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Lobby state
  currentRoom: RoomState | null;
  isHost: boolean;
  playerId: string | null;
  
  // Game state
  currentLetter: string | null;
  currentRound: number;
  totalRounds: number;
  categories: Category[];
  currentCategoryIndex: number;
  
  // Answers
  answers: Record<string, string>;
  validationAnswers: AnswerData[];
  currentVotingCategory: string | null;
  
  // Scores
  roundScores: Record<string, number>;
  totalScores: Record<string, number>;
  
  // Timer
  timerEndsAt: number | null;
  
  // Connection
  isConnected: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setCurrentRoom: (room: RoomState | null) => void;
  setIsHost: (value: boolean) => void;
  setPlayerId: (id: string | null) => void;
  setCurrentLetter: (letter: string | null) => void;
  setCurrentRound: (round: number) => void;
  setTotalRounds: (total: number) => void;
  setCategories: (categories: Category[]) => void;
  setCurrentCategoryIndex: (index: number) => void;
  setAnswer: (category: string, answer: string) => void;
  clearAnswers: () => void;
  setValidationAnswers: (answers: AnswerData[]) => void;
  setCurrentVotingCategory: (category: string | null) => void;
  setRoundScores: (scores: Record<string, number>) => void;
  setTotalScores: (scores: Record<string, number>) => void;
  setTimerEndsAt: (time: number | null) => void;
  setIsConnected: (value: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  currentRoom: null,
  isHost: false,
  playerId: null,
  currentLetter: null,
  currentRound: 0,
  totalRounds: 3,
  categories: [],
  currentCategoryIndex: 0,
  answers: {},
  validationAnswers: [],
  currentVotingCategory: null,
  roundScores: {},
  totalScores: {},
  timerEndsAt: null,
  isConnected: false,
  
  // Actions
  setUser: (user) => set({ user }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setIsHost: (value) => set({ isHost: value }),
  setPlayerId: (id) => set({ playerId: id }),
  setCurrentLetter: (letter) => set({ currentLetter: letter }),
  setCurrentRound: (round) => set({ currentRound: round }),
  setTotalRounds: (total) => set({ totalRounds: total }),
  setCategories: (categories) => set({ categories }),
  setCurrentCategoryIndex: (index) => set({ currentCategoryIndex: index }),
  setAnswer: (category, answer) => set((state) => ({
    answers: { ...state.answers, [category]: answer }
  })),
  clearAnswers: () => set({ answers: {} }),
  setValidationAnswers: (answers) => set({ validationAnswers: answers }),
  setCurrentVotingCategory: (category) => set({ currentVotingCategory: category }),
  setRoundScores: (scores) => set({ roundScores: scores }),
  setTotalScores: (scores) => set({ totalScores: scores }),
  setTimerEndsAt: (time) => set({ timerEndsAt: time }),
  setIsConnected: (value) => set({ isConnected: value }),
  resetGame: () => set({
    currentLetter: null,
    currentRound: 0,
    currentCategoryIndex: 0,
    answers: {},
    validationAnswers: [],
    currentVotingCategory: null,
    roundScores: {},
    timerEndsAt: null
  })
}));
