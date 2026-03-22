'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/lib/game-store';
import { CATEGORIES, Category, RoomState, AnswerData, User, LeaderboardEntry } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Users, Play, Trophy, HelpCircle, LogOut, Copy, Check, X, 
  ChevronLeft, ChevronRight, Clock, Crown, Star, Zap, 
  BookOpen, Gamepad2, UserPlus, LogIn, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type View = 'auth' | 'home' | 'lobby' | 'game' | 'validation' | 'results';

export default function GamePage() {
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // View state
  const [view, setView] = useState<View>('auth');
  const [lobbyCode, setLobbyCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  // Lobby settings
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [totalRounds, setTotalRounds] = useState(3);
  const [letterMode, setLetterMode] = useState<'random' | 'manual'>('random');
  
  // Game state
  const [currentInput, setCurrentInput] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [playerToKick, setPlayerToKick] = useState<string | null>(null);
  
  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Socket
  const socketRef = useRef<Socket | null>(null);
  
  // Store
  const {
    user, setUser, isAuthenticated,
    currentRoom, setCurrentRoom,
    isHost, setIsHost, playerId, setPlayerId,
    currentLetter, setCurrentLetter,
    currentRound, setCurrentRound,
    totalRounds: storeTotalRounds, setTotalRounds: setStoreTotalRounds,
    categories, setCategories,
    currentCategoryIndex, setCurrentCategoryIndex,
    answers, setAnswer, clearAnswers,
    validationAnswers, setValidationAnswers,
    currentVotingCategory, setCurrentVotingCategory,
    roundScores, setRoundScores,
    totalScores, setTotalScores,
    timerEndsAt, setTimerEndsAt,
    isConnected, setIsConnected,
    resetGame
  } = useGameStore();
  
  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      const newSocket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling']
      });
      
      newSocket.on('connect', () => {
        console.log('Connected to game server');
        setIsConnected(true);
      });
      
      newSocket.on('disconnect', () => {
        console.log('Disconnected from game server');
        setIsConnected(false);
      });
      
      newSocket.on('error', (data: { message: string }) => {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive'
        });
      });
      
      newSocket.on('lobby_created', (data: { code: string; playerId: string }) => {
        setPlayerId(data.playerId);
        setIsHost(true);
        setView('lobby');
        toast({
          title: 'Lobby Created!',
          description: `Your lobby code is: ${data.code}`
        });
      });
      
      newSocket.on('lobby_joined', (data: { code: string; playerId: string }) => {
        setPlayerId(data.playerId);
        setIsHost(false);
        setView('lobby');
        toast({
          title: 'Joined Lobby!',
          description: `You joined lobby: ${data.code}`
        });
      });
      
      newSocket.on('room_update', (room: RoomState) => {
        setCurrentRoom(room);
        setIsHost(room.hostId === playerId);
      });
      
      newSocket.on('player_joined', (data: { player: { id: string; username: string; avatar: string | null } }) => {
        toast({
          title: 'Player Joined',
          description: `${data.player.username} joined the lobby`
        });
      });
      
      newSocket.on('player_left', (data: { playerId: string }) => {
        toast({
          title: 'Player Left',
          description: 'A player left the lobby'
        });
      });
      
      newSocket.on('kicked', (data: { message: string }) => {
        toast({
          title: 'Kicked',
          description: data.message,
          variant: 'destructive'
        });
        setView('home');
        setCurrentRoom(null);
      });
      
      newSocket.on('host_changed', (data: { newHostId: string }) => {
        setIsHost(data.newHostId === playerId);
        toast({
          title: 'New Host',
          description: 'You are now the host!'
        });
      });
      
      newSocket.on('game_started', (data: { letter: string; round: number; totalRounds: number; categories: Category[] }) => {
        setCurrentLetter(data.letter);
        setCurrentRound(data.round);
        setStoreTotalRounds(data.totalRounds);
        setCategories(data.categories);
        setCurrentCategoryIndex(0);
        clearAnswers();
        setView('game');
        toast({
          title: 'Game Started!',
          description: `Letter: ${data.letter} - Round ${data.round}/${data.totalRounds}`
        });
      });
      
      newSocket.on('countdown_started', (data: { timerEndsAt: number; triggeredBy: string }) => {
        setTimerEndsAt(data.timerEndsAt);
        toast({
          title: 'Hurry Up!',
          description: 'Someone finished! 20 seconds remaining!'
        });
      });
      
      newSocket.on('validation_phase', (data: { category: string; categoryName: string; answers: AnswerData[] }) => {
        setCurrentVotingCategory(data.category);
        setValidationAnswers(data.answers);
        setView('validation');
      });
      
      newSocket.on('vote_update', (data: { category: string; answers: AnswerData[] }) => {
        setValidationAnswers(data.answers);
      });
      
      newSocket.on('category_scores', (data: { category: string; categoryName: string; scores: Record<string, number> }) => {
        setRoundScores(prev => {
          const newScores = { ...prev };
          for (const [pid, score] of Object.entries(data.scores)) {
            newScores[pid] = (newScores[pid] || 0) + score;
          }
          return newScores;
        });
      });
      
      newSocket.on('round_end', (data: { round: number; totalRounds: number; roundScores: Record<string, number>; totalScores: Record<string, number> }) => {
        setRoundScores(data.roundScores);
        setTotalScores(data.totalScores);
        setView('results');
      });
      
      newSocket.on('new_round', (data: { letter: string; round: number; totalRounds: number; categories: Category[] }) => {
        setCurrentLetter(data.letter);
        setCurrentRound(data.round);
        setStoreTotalRounds(data.totalRounds);
        setCategories(data.categories);
        setCurrentCategoryIndex(0);
        clearAnswers();
        setRoundScores({});
        setView('game');
        toast({
          title: 'New Round!',
          description: `Letter: ${data.letter} - Round ${data.round}/${data.totalRounds}`
        });
      });
      
      newSocket.on('game_end', (data: { finalScores: Record<string, number> }) => {
        setTotalScores(data.finalScores);
        setView('results');
        toast({
          title: 'Game Over!',
          description: 'Check the final results!'
        });
      });
      
      socketRef.current = newSocket;
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  // Countdown timer
  useEffect(() => {
    if (!timerEndsAt) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, timerEndsAt - Date.now());
      setCountdown(remaining > 0 ? Math.ceil(remaining / 1000) : null);
      
      if (remaining <= 0) {
        setTimerEndsAt(null);
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [timerEndsAt]);
  
  // Load leaderboard
  useEffect(() => {
    fetchLeaderboard();
  }, []);
  
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };
  
  // Auth handlers
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      setUser(data.user);
      localStorage.setItem('userId', data.user.id);
      setView('home');
      toast({
        title: 'Welcome!',
        description: `Account created successfully, ${data.user.username}!`
      });
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setAuthLoading(false);
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      setUser(data.user);
      localStorage.setItem('userId', data.user.id);
      setView('home');
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.user.username}`
      });
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setAuthLoading(false);
    }
  };
  
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('userId');
    setView('auth');
    setCurrentRoom(null);
    resetGame();
  };
  
  // Lobby handlers
  const handleCreateLobby = () => {
    if (!user || !socketRef.current) return;
    
    socketRef.current.emit('create_lobby', {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      maxPlayers,
      totalRounds,
      letterMode
    });
  };
  
  const handleJoinLobby = () => {
    if (!user || !socketRef.current || !joinCode.trim()) return;
    
    socketRef.current.emit('join_lobby', {
      code: joinCode.toUpperCase(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar
    });
  };
  
  const handleCopyCode = () => {
    if (currentRoom?.code) {
      navigator.clipboard.writeText(currentRoom.code);
      toast({
        title: 'Copied!',
        description: 'Lobby code copied to clipboard'
      });
    }
  };
  
  const handleToggleReady = () => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('toggle_ready', {
      code: currentRoom.code,
      userId: playerId
    });
  };
  
  const handleStartGame = () => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('start_game', {
      code: currentRoom.code,
      userId: playerId
    });
  };
  
  const handleKickPlayer = (targetPlayerId: string) => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('kick_player', {
      code: currentRoom.code,
      hostId: playerId,
      playerId: targetPlayerId
    });
    setShowKickDialog(false);
    setPlayerToKick(null);
  };
  
  const handleLeaveLobby = () => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('leave_lobby', {
      code: currentRoom.code,
      userId: playerId
    });
    setCurrentRoom(null);
    setView('home');
  };
  
  // Game handlers
  const handleAnswerChange = (value: string) => {
    setCurrentInput(value);
    if (currentRoom && categories[currentCategoryIndex]) {
      const category = categories[currentCategoryIndex].id;
      setAnswer(category, value);
      socketRef.current?.emit('submit_answer', {
        code: currentRoom.code,
        userId: playerId,
        category,
        answer: value
      });
    }
  };
  
  const handleNextCategory = () => {
    if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setCurrentInput(answers[categories[currentCategoryIndex + 1]?.id] || '');
    }
  };
  
  const handlePrevCategory = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
      setCurrentInput(answers[categories[currentCategoryIndex - 1]?.id] || '');
    }
  };
  
  const handleDone = () => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('player_done', {
      code: currentRoom.code,
      userId: playerId
    });
  };
  
  // Voting handlers
  const handleVote = (answerPlayerId: string, isValid: boolean) => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('submit_vote', {
      code: currentRoom.code,
      userId: playerId,
      answerPlayerId,
      isValid
    });
  };
  
  const handleFinishVoting = () => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('finish_category_voting', {
      code: currentRoom.code,
      userId: playerId
    });
  };
  
  // Results handlers
  const handleNextRound = () => {
    if (!socketRef.current || !currentRoom) return;
    socketRef.current.emit('next_round', {
      code: currentRoom.code,
      userId: playerId
    });
  };
  
  // Calculate filled categories
  const filledCategories = Object.values(answers).filter(a => a?.trim()).length;
  
  // Get player name by ID
  const getPlayerName = (id: string) => {
    return currentRoom?.players.find(p => p.id === id)?.username || 'Unknown';
  };
  
  // Get winner
  const getWinner = () => {
    if (!totalScores || !currentRoom) return null;
    const sortedScores = Object.entries(totalScores).sort((a, b) => b[1] - a[1]);
    if (sortedScores.length === 0) return null;
    return { id: sortedScores[0][0], score: sortedScores[0][1] };
  };
  
  // Render functions
  const renderAuth = () => (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass border-purple-500/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold neon-text">Word Rush</CardTitle>
          <CardDescription className="text-muted-foreground">
            The ultimate word game challenge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Create Profile</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={authLoading}>
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                  Login
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={authLoading}>
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Create Profile
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
  
  const renderHome = () => (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold neon-text">Word Rush</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={user?.avatar || undefined} />
                <AvatarFallback className="gradient-primary">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-medium hidden sm:inline">{user?.username}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="glass border-purple-500/30 hover:border-purple-500/60 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-purple-400" />
                Create Game
              </CardTitle>
              <CardDescription>Start a new game and invite friends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Max Players: {maxPlayers}</label>
                <Slider
                  value={[maxPlayers]}
                  onValueChange={([v]) => setMaxPlayers(v)}
                  min={3}
                  max={12}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Total Rounds: {totalRounds}</label>
                <Slider
                  value={[totalRounds]}
                  onValueChange={([v]) => setTotalRounds(v)}
                  min={1}
                  max={15}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Letter Mode</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Random</span>
                  <Switch
                    checked={letterMode === 'manual'}
                    onCheckedChange={(checked) => setLetterMode(checked ? 'manual' : 'random')}
                  />
                  <span className="text-xs">Manual</span>
                </div>
              </div>
              <Button className="w-full gradient-primary" onClick={handleCreateLobby}>
                Create Lobby
              </Button>
            </CardContent>
          </Card>
          
          <Card className="glass border-purple-500/30 hover:border-purple-500/60 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Join Game
              </CardTitle>
              <CardDescription>Enter a lobby code to join</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter lobby code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono bg-secondary border-border"
                />
              </div>
              <Button className="w-full gradient-primary" onClick={handleJoinLobby}>
                Join Lobby
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs for Leaderboard and How to Play */}
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary">
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="howto" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              How to Play
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="leaderboard">
            <Card className="glass border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  All-Time Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.userId}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          index < 3 ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            index === 2 ? 'bg-amber-700 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <Avatar>
                            <AvatarImage src={entry.avatar || undefined} />
                            <AvatarFallback>{entry.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{entry.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.gamesPlayed} games • {entry.gamesWon} wins
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-purple-400">{entry.totalScore}</p>
                          <p className="text-xs text-muted-foreground">avg: {entry.avgScore}</p>
                        </div>
                      </div>
                    ))}
                    {leaderboard.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No players yet. Be the first to play!
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="howto">
            <Card className="glass border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  How to Play
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-secondary border border-purple-500/30">
                    <h3 className="text-lg font-bold text-purple-400 mb-2">🎯 Objective</h3>
                    <p className="text-muted-foreground">
                      Fill 6 categories with words starting from a selected letter. Score points by being unique and fast!
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary border border-purple-500/30">
                    <h3 className="text-lg font-bold text-purple-400 mb-2">📋 Categories</h3>
                    <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {CATEGORIES.map(cat => (
                        <li key={cat.id} className="flex items-center gap-2 text-muted-foreground">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          {cat.name} ({cat.nameEn})
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary border border-purple-500/30">
                    <h3 className="text-lg font-bold text-purple-400 mb-2">⏱️ Game Flow</h3>
                    <ol className="space-y-3 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold shrink-0">1</span>
                        <span>Wait for all players to join (minimum 3 players required)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold shrink-0">2</span>
                        <span>A random letter is selected and displayed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold shrink-0">3</span>
                        <span>Fill in all 6 categories with words starting with that letter</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold shrink-0">4</span>
                        <span>First player to finish triggers a 20-second countdown</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold shrink-0">5</span>
                        <span>Vote on other players&apos; answers (valid or invalid)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold shrink-0">6</span>
                        <span>Scores are calculated and next round begins</span>
                      </li>
                    </ol>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary border border-purple-500/30">
                    <h3 className="text-lg font-bold text-purple-400 mb-2">💰 Scoring</h3>
                    <div className="space-y-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span><strong>10 points</strong> - Unique valid word</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-blue-400" />
                        <span><strong>5 points</strong> - Duplicate valid word (same as another player)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-400" />
                        <span><strong>0 points</strong> - Invalid word or doesn&apos;t start with the letter</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary border border-purple-500/30">
                    <h3 className="text-lg font-bold text-purple-400 mb-2">💡 Tips</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-1" />
                        <span>Be quick but also be unique - think of uncommon words!</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-1" />
                        <span>Use the arrow buttons to navigate between categories quickly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-1" />
                        <span>Pay attention during voting - invalid words don&apos;t score!</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
  
  const renderLobby = () => (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Lobby</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{currentRoom?.code}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyCode}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLeaveLobby}>
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Players */}
          <Card className="glass border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Players ({currentRoom?.players.length || 0}/{currentRoom?.maxPlayers || 6})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentRoom?.players.map(player => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.isHost ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={player.avatar || undefined} />
                          <AvatarFallback>{player.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {player.isHost && (
                          <Crown className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{player.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.isHost ? 'Host' : player.isReady ? 'Ready' : 'Not Ready'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {player.isReady && !player.isHost && (
                        <Check className="w-4 h-4 text-green-400" />
                      )}
                      {isHost && !player.isHost && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => {
                            setPlayerToKick(player.id);
                            setShowKickDialog(true);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Settings & Actions */}
          <Card className="glass border-purple-500/30">
            <CardHeader>
              <CardTitle>Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary text-center">
                  <p className="text-2xl font-bold text-purple-400">{currentRoom?.totalRounds || 3}</p>
                  <p className="text-xs text-muted-foreground">Rounds</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary text-center">
                  <p className="text-2xl font-bold text-purple-400 capitalize">{currentRoom?.letterMode || 'random'}</p>
                  <p className="text-xs text-muted-foreground">Letter Mode</p>
                </div>
              </div>
              
              <Separator />
              
              {!isHost && (
                <Button
                  className={`w-full ${currentRoom?.players.find(p => p.id === playerId)?.isReady ? 'bg-green-600 hover:bg-green-700' : 'gradient-primary'}`}
                  onClick={handleToggleReady}
                >
                  {currentRoom?.players.find(p => p.id === playerId)?.isReady ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Ready!
                    </>
                  ) : (
                    'Mark as Ready'
                  )}
                </Button>
              )}
              
              {isHost && (
                <>
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-sm text-yellow-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {(currentRoom?.players.length || 0) < 3
                        ? `Need ${3 - (currentRoom?.players.length || 0)} more players to start`
                        : 'Ready to start! All players must be ready.'}
                    </p>
                  </div>
                  
                  <Button
                    className="w-full gradient-primary animate-pulse-glow"
                    onClick={handleStartGame}
                    disabled={(currentRoom?.players.length || 0) < 3}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Game
                  </Button>
                </>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Share code: <span className="font-mono font-bold text-purple-400">{currentRoom?.code}</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Kick Dialog */}
        <Dialog open={showKickDialog} onOpenChange={setShowKickDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kick Player?</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this player from the lobby?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowKickDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => playerToKick && handleKickPlayer(playerToKick)}>
                Kick
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
  
  const renderGame = () => (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg">
              Round {currentRound}/{storeTotalRounds}
            </Badge>
            {countdown !== null && (
              <Badge variant="destructive" className="animate-countdown-pulse">
                <Clock className="w-4 h-4 mr-1" />
                {countdown}s
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(filledCategories / 6) * 100} className="w-24 h-2" />
            <span className="text-sm text-muted-foreground">{filledCategories}/6</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {/* Letter Display */}
        <div className="mb-8 text-center">
          <p className="text-muted-foreground mb-2">Current Letter</p>
          <div className="letter-display">{currentLetter}</div>
        </div>
        
        {/* Category */}
        <div className="w-full max-w-md mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevCategory}
              disabled={currentCategoryIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold text-center">
              {categories[currentCategoryIndex]?.name}
              <span className="text-muted-foreground text-sm ml-2">
                ({categories[currentCategoryIndex]?.nameEn})
              </span>
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextCategory}
              disabled={currentCategoryIndex === categories.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Category indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentCategoryIndex
                    ? 'bg-purple-500 scale-125'
                    : answers[cat.id]?.trim()
                      ? 'bg-green-500'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          {/* Input */}
          <Input
            placeholder={`Enter a word starting with ${currentLetter}...`}
            value={currentInput}
            onChange={(e) => handleAnswerChange(e.target.value)}
            className="text-lg py-6 bg-secondary border-border"
            autoFocus
          />
        </div>
        
        {/* Done Button */}
        {filledCategories === 6 && (
          <Button
            size="lg"
            className="gradient-primary animate-pulse-glow"
            onClick={handleDone}
          >
            <Check className="w-5 h-5 mr-2" />
            I&apos;m Done!
          </Button>
        )}
      </main>
    </div>
  );
  
  const renderValidation = () => (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Badge variant="outline" className="text-lg">
            Voting: {CATEGORIES.find(c => c.id === currentVotingCategory)?.name}
          </Badge>
          <Badge variant="secondary">
            {validationAnswers.reduce((sum, a) => sum + a.votes.length, 0)} / {validationAnswers.length * (currentRoom?.players.length || 0) - validationAnswers.length} votes
          </Badge>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {validationAnswers.map((answerData) => (
            <Card key={answerData.playerId} className={`glass ${answerData.isDuplicate ? 'border-yellow-500/50' : 'border-purple-500/30'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{answerData.playerName?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{answerData.playerName}</span>
                  </div>
                  {answerData.isDuplicate && (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                      Duplicate
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold mb-4 text-center">
                  {answerData.answer || <span className="text-muted-foreground italic">No answer</span>}
                </p>
                
                {answerData.playerId !== playerId && answerData.answer && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500 text-green-400 hover:bg-green-500/20"
                      onClick={() => handleVote(answerData.playerId, true)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Valid
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-400 hover:bg-red-500/20"
                      onClick={() => handleVote(answerData.playerId, false)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Invalid
                    </Button>
                  </div>
                )}
                
                {answerData.votes.length > 0 && (
                  <div className="flex justify-center gap-4 mt-2 text-sm">
                    <span className="text-green-400">{answerData.votes.filter(v => v.isValid).length} valid</span>
                    <span className="text-red-400">{answerData.votes.filter(v => !v.isValid).length} invalid</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center">
          <Button size="lg" className="gradient-primary" onClick={handleFinishVoting}>
            Next Category
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
  
  const renderResults = () => {
    const winner = getWinner();
    const isGameEnd = currentRoom?.status === 'finished' || currentRound >= storeTotalRounds;
    
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border glass sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Badge variant="outline" className="text-lg">
              {isGameEnd ? 'Game Over!' : `Round ${currentRound} Results`}
            </Badge>
          </div>
        </header>
        
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Winner celebration */}
          {isGameEnd && winner && (
            <div className="text-center mb-8 animate-winner">
              <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-4xl font-bold mb-2">
                🎉 {getPlayerName(winner.id)} Wins! 🎉
              </h2>
              <p className="text-xl text-purple-400">{winner.score} points</p>
            </div>
          )}
          
          {/* Scoreboard */}
          <Card className="glass border-purple-500/30 max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                {isGameEnd ? 'Final Scores' : 'Round Scores'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(isGameEnd ? totalScores : roundScores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([playerId, score], index) => (
                    <div
                      key={playerId}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-muted'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium">{getPlayerName(playerId)}</span>
                      </div>
                      <span className="text-lg font-bold text-purple-400">{score}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <div className="flex justify-center gap-4 mt-8">
            {isHost && !isGameEnd && (
              <Button size="lg" className="gradient-primary" onClick={handleNextRound}>
                Next Round
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            
            {isGameEnd && (
              <Button size="lg" variant="outline" onClick={handleLeaveLobby}>
                <LogOut className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  };
  
  // Main render
  switch (view) {
    case 'auth':
      return renderAuth();
    case 'home':
      return renderHome();
    case 'lobby':
      return renderLobby();
    case 'game':
      return renderGame();
    case 'validation':
      return renderValidation();
    case 'results':
      return renderResults();
    default:
      return renderAuth();
  }
}
