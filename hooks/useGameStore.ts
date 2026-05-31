'use client';

import { create } from 'zustand';
import type { GameState, Role, PlayerInfo, GameSettings } from '@/types';
import { ROLES } from '@/types';

// ─── Store Shape ─────────────────────────────────────────────────────────────

interface GameStore {
  // ─ Game State ─
  gameState: GameState | null;
  playerId: string;
  playerName: string;
  playerRole: Role | null;
  isHost: boolean;
  mode: 'single' | 'multi';

  // ─ UI State ─
  isLoading: boolean;
  error: string | null;
  aiRecommendation: string | null;

  // ─ Actions ─
  setPlayerInfo: (id: string, name: string) => void;
  setMode: (mode: 'single' | 'multi') => void;
  setPlayerRole: (role: Role | null) => void;
  setGameState: (state: GameState) => void;
  setIsHost: (isHost: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setAIRecommendation: (rec: string | null) => void;

  // ─ API Actions ─
  createGame: (settings: GameSettings, role: Role) => Promise<GameState | null>;
  joinGame: (roomCode: string, role: Role) => Promise<GameState | null>;
  submitOrder: (orderQuantity: number) => Promise<void>;
  requestAIHelp: () => Promise<{ recommendation: string; orderQuantity: number } | null>;
  startGame: () => Promise<void>;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameState: null,
  playerId: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  playerName: '',
  playerRole: null,
  isHost: false,
  mode: 'single',
  isLoading: false,
  error: null,
  aiRecommendation: null,

  // Setters
  setPlayerInfo: (id, name) => set({ playerId: id, playerName: name }),
  setMode: (mode) => set({ mode }),
  setPlayerRole: (role) => set({ playerRole: role }),
  setGameState: (state) => set({ gameState: state }),
  setIsHost: (isHost) => set({ isHost }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),
  setAIRecommendation: (rec) => set({ aiRecommendation: rec }),

  // ─── Create a new game room ─────────────────────────────────────────────
  createGame: async (settings, role) => {
    const { playerId, playerName } = get();
    set({ isLoading: true, error: null });

    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          player: { id: playerId, name: playerName || 'Player', isAI: false },
          role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const { gameState } = await res.json();
      set({ gameState, playerRole: role, isHost: true, isLoading: false });
      return gameState;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // ─── Join an existing game room ─────────────────────────────────────────
  joinGame: async (roomCode, role) => {
    const { playerId, playerName } = get();
    set({ isLoading: true, error: null });

    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: roomCode.toUpperCase(),
          player: { id: playerId, name: playerName || 'Player', isAI: false },
          role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join game');
      }

      const { gameState } = await res.json();
      set({ gameState, playerRole: role, isHost: false, isLoading: false });
      return gameState;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // ─── Submit an order for the current week ───────────────────────────────
  submitOrder: async (orderQuantity) => {
    const { gameState, playerRole } = get();
    if (!gameState || !playerRole) return;

    set({ isLoading: true, error: null });

    try {
      const res = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: gameState.roomCode,
          role: playerRole,
          orderQuantity,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit order');
      }

      const { gameState: updatedState } = await res.json();
      set({ gameState: updatedState, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },

  // ─── Request AI help recommendation ─────────────────────────────────────
  requestAIHelp: async () => {
    const { gameState, playerRole } = get();
    if (!gameState || !playerRole) return null;

    set({ isLoading: true, aiRecommendation: null });

    try {
      const res = await fetch('/api/ai-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: gameState.roomCode,
          role: playerRole,
          mode: 'help',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get AI help');
      }

      const { recommendation, orderQuantity } = await res.json();
      const rec = recommendation || `AI suggests ordering ${orderQuantity} units.`;
      set({ aiRecommendation: rec, isLoading: false });
      return { recommendation: rec, orderQuantity };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // ─── Start the game (host only, transition from lobby) ──────────────────
  startGame: async () => {
    const { gameState } = get();
    if (!gameState) return;

    // Simply update the phase locally; the create/action routes handle server state
    set({
      gameState: { ...gameState, gamePhase: 'playing' },
    });
  },
}));
