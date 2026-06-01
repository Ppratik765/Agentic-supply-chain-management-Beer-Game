'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/hooks/useGameStore';
import { ROLES, type Role, ROLE_META, ROLE_COLORS, type GameSettings } from '@/types';
import RoleCard from '@/components/RoleCard';
import RoleIcon from '@/components/RoleIcon';
import { Target, Users, Settings, Home, Link, Rocket, Gamepad2, Minus, Plus, ArrowLeft } from 'lucide-react';

type Phase = 'mode' | 'settings' | 'lobby';

export default function HomePage() {
  const router = useRouter();
  const store = useGameStore();

  const [phase, setPhase] = useState<Phase>('mode');
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [selectedRole, setSelectedRole] = useState<Role>('retailer');
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Settings
  const [holdingCost, setHoldingCost] = useState(0.5);
  const [backorderCost, setBackorderCost] = useState(1.0);
  const [initialInventory, setInitialInventory] = useState(1200);
  const [capacityLimit, setCapacityLimit] = useState(5000);
  const [totalWeeks, setTotalWeeks] = useState(35);

  const [settingsTab, setSettingsTab] = useState<'global' | Role>('global');
  // Transentis-equivalent per-role defaults, scaled to 400-unit demand base:
  // Retailer: customer-facing, high backorder penalty (lost sales visible immediately)
  // Wholesaler: moderate, balances retailer service + upstream buffering
  // Distributor: bulk warehouse efficiency, lower holding cost per unit
  // Factory: highest capacity, highest holding cost (raw materials + WIP inventory)
  const [roleSettings, setRoleSettings] = useState<Record<Role, { holdingCost: number; backorderCost: number; initialInventory: number; capacityLimit: number }>>({
    retailer:    { holdingCost: 0.50, backorderCost: 1.00, initialInventory: 1200, capacityLimit: 4000 },
    wholesaler:  { holdingCost: 0.50, backorderCost: 1.00, initialInventory: 1200, capacityLimit: 5000 },
    distributor: { holdingCost: 0.50, backorderCost: 1.00, initialInventory: 1200, capacityLimit: 6000 },
    factory:     { holdingCost: 0.50, backorderCost: 1.00, initialInventory: 1200, capacityLimit: 8000 },
  });

  const handleModeSelect = (m: 'single' | 'multi') => {
    setMode(m);
    store.setMode(m);
    setPhase('settings');
  };

  const handleCreateGame = async () => {
    const name = playerName.trim() || 'Player';
    store.setPlayerInfo(store.playerId, name);

    const settings: GameSettings = {
      holdingCost, backorderCost, initialInventory, capacityLimit, totalWeeks, mode, roleSettings,
    };

    const gs = await store.createGame(settings, selectedRole);
    if (gs) {
      if (mode === 'single') {
        router.push('/game');
      } else {
        setPhase('lobby');
      }
    }
  };

  const handleJoinGame = async () => {
    if (!roomCodeInput.trim()) return;
    const name = playerName.trim() || 'Player';
    store.setPlayerInfo(store.playerId, name);
    setIsJoining(true);

    const gs = await store.joinGame(roomCodeInput.trim(), selectedRole);
    setIsJoining(false);
    if (gs) {
      setPhase('lobby');
    }
  };

  const handleStartGame = () => {
    store.startGame();
    router.push('/game');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2 text-[var(--text-primary)]">
          Supply Chain Simulator
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-md mx-auto">
          Supply Chain Simulation: Master the bullwhip effect
        </p>
      </div>

      {/* ─── Phase 1: Mode Selection ─────────────────────────────────── */}
      {phase === 'mode' && (
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
          <button
            id="mode-single"
            className="glass-card p-8 text-center cursor-pointer opacity-0 animate-fade-in-up flex flex-col items-center justify-center"
            onClick={() => handleModeSelect('single')}
          >
            <Target className="text-[var(--color-retailer)] mb-4" size={40} />
            <h2 className="text-xl font-bold mb-2">Solo Mission</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Play as one role. AI agents manage the rest.
            </p>
          </button>

          <button
            id="mode-multi"
            className="glass-card p-8 text-center cursor-pointer opacity-0 animate-fade-in-up flex flex-col items-center justify-center"
            onClick={() => handleModeSelect('multi')}
          >
            <Users className="text-[var(--color-wholesaler)] mb-4" size={40} />
            <h2 className="text-xl font-bold mb-2">Multiplayer</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Create or join a room. Share with friends.
            </p>
          </button>
        </div>
      )}

      {/* ─── Phase 2: Game Settings ──────────────────────────────────── */}
      {phase === 'settings' && (
        <div className="w-full max-w-2xl animate-fade-in-up">
          <div className="glass-card-static p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Settings className="text-[var(--color-wholesaler)]" size={20} /> Game Settings
            </h2>

            {/* Player Name */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Your Name
              </label>
              <input
                id="player-name-input"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                className="input-field max-w-xs"
              />
            </div>

            {/* Settings Target Tabs */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Configure Parameters For
              </label>
              <div className="flex border-b border-[var(--border-subtle)] pb-1.5 gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${settingsTab === 'global'
                    ? 'bg-[var(--bg-secondary)] border border-[var(--border-glow)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
                    }`}
                  onClick={() => setSettingsTab('global')}
                >
                  All Roles (Global)
                </button>
                {ROLES.map((r) => {
                  const colors = ROLE_COLORS[r];
                  const isActive = settingsTab === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${isActive
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-transparent'
                        }`}
                      style={{
                        borderColor: isActive ? colors.primary : 'transparent',
                      }}
                      onClick={() => setSettingsTab(r)}
                    >
                      <RoleIcon role={r} size={12} style={{ color: colors.primary }} />
                      <span className="capitalize">{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
              <SettingInput
                id="holding-cost"
                label={settingsTab === 'global' ? 'Holding Cost' : `${settingsTab.charAt(0).toUpperCase() + settingsTab.slice(1)} Holding Cost`}
                value={settingsTab === 'global' ? holdingCost : roleSettings[settingsTab].holdingCost}
                onChange={(v) => {
                  if (settingsTab === 'global') {
                    setHoldingCost(v);
                    setRoleSettings((prev) => {
                      const next = { ...prev };
                      for (const r of ROLES) {
                        next[r] = { ...next[r], holdingCost: v };
                      }
                      return next;
                    });
                  } else {
                    setRoleSettings((prev) => ({
                      ...prev,
                      [settingsTab]: { ...prev[settingsTab], holdingCost: v },
                    }));
                  }
                }}
                min={0.1} max={5} step={0.1}
                suffix="₹/unit/wk"
              />
              <SettingInput
                id="backorder-cost"
                label={settingsTab === 'global' ? 'Backorder Cost' : `${settingsTab.charAt(0).toUpperCase() + settingsTab.slice(1)} Backorder Cost`}
                value={settingsTab === 'global' ? backorderCost : roleSettings[settingsTab].backorderCost}
                onChange={(v) => {
                  if (settingsTab === 'global') {
                    setBackorderCost(v);
                    setRoleSettings((prev) => {
                      const next = { ...prev };
                      for (const r of ROLES) {
                        next[r] = { ...next[r], backorderCost: v };
                      }
                      return next;
                    });
                  } else {
                    setRoleSettings((prev) => ({
                      ...prev,
                      [settingsTab]: { ...prev[settingsTab], backorderCost: v },
                    }));
                  }
                }}
                min={0.1} max={10} step={0.1}
                suffix="₹/unit/wk"
              />
              <SettingInput
                id="initial-inventory"
                label={settingsTab === 'global' ? 'Initial Inventory' : `${settingsTab.charAt(0).toUpperCase() + settingsTab.slice(1)} Initial Inventory`}
                value={settingsTab === 'global' ? initialInventory : roleSettings[settingsTab].initialInventory}
                onChange={(v) => {
                  const val = Math.round(v);
                  if (settingsTab === 'global') {
                    setInitialInventory(val);
                    setRoleSettings((prev) => {
                      const next = { ...prev };
                      for (const r of ROLES) {
                        next[r] = { ...next[r], initialInventory: val };
                      }
                      return next;
                    });
                  } else {
                    setRoleSettings((prev) => ({
                      ...prev,
                      [settingsTab]: { ...prev[settingsTab], initialInventory: val },
                    }));
                  }
                }}
                min={0} max={50} step={1}
                suffix="units"
              />
              <SettingInput
                id="capacity-limit"
                label={settingsTab === 'global' ? 'Capacity Limit' : `${settingsTab.charAt(0).toUpperCase() + settingsTab.slice(1)} Capacity Limit`}
                value={settingsTab === 'global' ? capacityLimit : roleSettings[settingsTab].capacityLimit}
                onChange={(v) => {
                  const val = Math.round(v);
                  if (settingsTab === 'global') {
                    setCapacityLimit(val);
                    setRoleSettings((prev) => {
                      const next = { ...prev };
                      for (const r of ROLES) {
                        next[r] = { ...next[r], capacityLimit: val };
                      }
                      return next;
                    });
                  } else {
                    setRoleSettings((prev) => ({
                      ...prev,
                      [settingsTab]: { ...prev[settingsTab], capacityLimit: val },
                    }));
                  }
                }}
                min={10} max={100} step={5}
                suffix="units"
              />
              <SettingInput
                id="total-weeks"
                label="Total Weeks"
                value={totalWeeks}
                onChange={(v) => setTotalWeeks(Math.round(v))}
                min={10} max={60} step={1}
                suffix="weeks"
              />
            </div>

            {/* Role Selection */}
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Choose Your Role
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-5 stagger-children">
              {ROLES.map((role) => (
                <RoleCard
                  key={role}
                  role={role}
                  player={selectedRole === role ? { id: store.playerId, name: playerName || 'You', isAI: false } : null}
                  isSelected={selectedRole === role}
                  isDisabled={false}
                  onClick={() => setSelectedRole(role)}
                  compact
                />
              ))}
            </div>

            {/* Multiplayer: Room Options */}
            {mode === 'multi' && (
              <div className="border-t border-[var(--border-subtle)] pt-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    id="create-room-btn"
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    onClick={handleCreateGame}
                    disabled={store.isLoading}
                  >
                    {store.isLoading ? (
                      <>
                        <div className="spinner" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Home size={16} />
                        <span>Create Room</span>
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      id="join-room-input"
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="ROOM CODE"
                      className="input-field font-mono tracking-widest text-center uppercase"
                      maxLength={6}
                    />
                    <button
                      id="join-room-btn"
                      className="btn-secondary whitespace-nowrap flex items-center gap-2"
                      onClick={handleJoinGame}
                      disabled={isJoining || !roomCodeInput.trim()}
                    >
                      {isJoining ? (
                        <span>Joining...</span>
                      ) : (
                        <>
                          <Link size={16} />
                          <span>Join</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Single Player: Start Button */}
            {mode === 'single' && (
              <button
                id="start-game-btn"
                className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
                onClick={handleCreateGame}
                disabled={store.isLoading}
              >
                {store.isLoading ? (
                  <>
                    <div className="spinner" />
                    <span>Setting Up...</span>
                  </>
                ) : (
                  <>
                    <Rocket size={16} />
                    <span>Start Game</span>
                  </>
                )}
              </button>
            )}

            {/* Error Display */}
            {store.error && (
              <div className="mt-4 p-3 rounded-xl bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)] text-sm text-[var(--color-danger)]">
                {store.error}
              </div>
            )}
          </div>

          {/* Back Button */}
          <button className="btn-secondary mx-auto flex items-center gap-2" onClick={() => setPhase('mode')}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>
      )}

      {/* ─── Phase 3: Lobby (Multiplayer) ────────────────────────────── */}
      {phase === 'lobby' && store.gameState && (
        <div className="w-full max-w-2xl animate-fade-in-up">
          <div className="glass-card-static p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Gamepad2 size={20} className="text-[#a78bfa]" /> Game Lobby
              </h2>
              <span className="badge badge-room text-base px-4 py-1">
                {store.gameState.roomCode}
              </span>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-5">
              Share the room code with friends. Unclaimed roles will be managed by AI agents.
            </p>

            {/* Role Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 stagger-children">
              {ROLES.map((role) => {
                const player = store.gameState?.players[role] ?? null;
                return (
                  <RoleCard
                    key={role}
                    role={role}
                    player={player}
                    isSelected={role === store.playerRole}
                    isDisabled={!player?.isAI && role !== store.playerRole}
                    onClick={() => { }}
                  />
                );
              })}
            </div>

            {/* Start Game Button (Host) */}
            {store.isHost && (
              <button
                id="lobby-start-btn"
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={handleStartGame}
              >
                <Rocket size={16} />
                <span>Start Game</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Setting Input Component ─────────────────────────────────────────────────

function SettingInput({
  id, label, value, onChange, min, max, step, suffix,
}: {
  id: string; label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix: string;
}) {
  const handleDecrement = () => {
    onChange(Math.max(min, parseFloat((value - step).toFixed(2))));
  };
  const handleIncrement = () => {
    onChange(Math.min(max, parseFloat((value + step).toFixed(2))));
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDecrement}
          className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] flex items-center justify-center text-sm font-bold hover:bg-[rgba(255,255,255,0.08)] hover:border-[var(--border-glow)] transition-all cursor-pointer select-none text-[var(--text-primary)]"
        >
          <Minus size={12} />
        </button>
        <input
          id={id}
          type="number"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || min)}
          className="input-field text-center tabular-nums font-bold px-1 py-1 h-8 text-sm w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] flex items-center justify-center text-sm font-bold hover:bg-[rgba(255,255,255,0.08)] hover:border-[var(--border-glow)] transition-all cursor-pointer select-none text-[var(--text-primary)]"
        >
          <Plus size={12} />
        </button>
      </div>
      <div className="text-[10px] text-[var(--text-muted)] mt-1">{suffix}</div>
    </div>
  );
}
