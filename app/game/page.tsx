'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/hooks/useGameStore';
import { ROLES, ROLE_META, ROLE_COLORS } from '@/types';
import SupplyChainFlow from '@/components/SupplyChainFlow';
import OrderPanel from '@/components/OrderPanel';
import CostChart from '@/components/CostChart';
import GameOverModal from '@/components/GameOverModal';
import RoleIcon from '@/components/RoleIcon';
import BullwhipDashboard from '@/components/BullwhipDashboard';

export default function GamePage() {
  const router = useRouter();
  const store = useGameStore();
  const { gameState, playerRole, isLoading, aiRecommendation } = store;

  // Redirect if no game state
  useEffect(() => {
    if (!gameState) {
      router.push('/');
    }
  }, [gameState, router]);

  if (!gameState || !playerRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const roleState = gameState.roles[playerRole];
  const colors = ROLE_COLORS[playerRole];
  const meta = ROLE_META[playerRole];
  const hasSubmitted = gameState.ordersSubmittedThisWeek.includes(playerRole);
  const teamTotal = ROLES.reduce((s, r) => s + gameState.roles[r].totalCost, 0);
  const currentDemand = gameState.demandPattern[gameState.currentWeek - 1] ?? 0;

  const handlePlayAgain = () => {
    store.setGameState(null as unknown as typeof gameState);
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Top Header Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 glass-card-static border-b border-[var(--border-subtle)] px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Game Info */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight whitespace-nowrap text-[var(--text-primary)]">
              Supply Chain Simulator
            </h1>
            <span className="badge badge-room text-[10px] sm:text-xs">{gameState.roomCode}</span>
          </div>

          {/* Center: Week Counter */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-center">
              <div className="stat-label text-[9px] sm:text-[0.7rem]">Week</div>
              <div className="text-base sm:text-xl font-bold tabular-nums" style={{ color: colors.primary }}>
                {gameState.currentWeek}
                <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">/{gameState.totalWeeks}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="hidden sm:block w-24 h-1.5 rounded-full bg-[rgba(148,163,184,0.1)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(gameState.currentWeek / gameState.totalWeeks) * 100}%`,
                  backgroundColor: colors.primary,
                }}
              />
            </div>
          </div>

          {/* Right: Role & Cost */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="stat-label">Your Cost</div>
              <div className="text-lg font-bold tabular-nums" style={{ color: roleState.totalCost > 0 ? '#f87171' : colors.primary }}>
                ₹{roleState.totalCost.toFixed(0)}
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs sm:text-sm font-semibold"
              style={{ borderColor: colors.glow, color: colors.primary, backgroundColor: colors.bg }}
            >
              <RoleIcon role={playerRole} size={14} style={{ color: colors.primary }} />
              <span className="hidden sm:inline">{meta.label}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Mobile-only Quick Stats Bar ─────────────────────────────── */}
      <div className="sm:hidden px-3 py-2 flex items-center justify-between gap-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase">Cost:</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: roleState.totalCost > 0 ? '#f87171' : colors.primary }}>
            ₹{roleState.totalCost.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase">Demand:</span>
          <span className="text-xs font-bold tabular-nums text-[#f87171]">{currentDemand}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase">Inv:</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: colors.primary }}>{roleState.inventory}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase">BL:</span>
          <span className={`text-xs font-bold tabular-nums ${roleState.backlog > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]'}`}>
            {roleState.backlog}
          </span>
        </div>
      </div>

      {/* ─── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-5 pb-8">
        {/* Supply Chain Visualization */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <SupplyChainFlow gameState={gameState} playerRole={playerRole} />
        </div>

        {/* Order Panel */}
        <div style={{ animationDelay: '0.1s' }}>
          <OrderPanel
            role={playerRole}
            roleState={roleState}
            capacityLimit={gameState.capacityLimit}
            isSubmitting={isLoading}
            hasSubmitted={hasSubmitted}
            currentWeek={gameState.currentWeek} // ADD THIS LINE
            aiRecommendation={aiRecommendation}
            onSubmitOrder={(qty) => store.submitOrder(qty)}
            onRequestHelp={() => store.requestAIHelp()}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {/* Cost Chart */}
          <div className="glass-card-static p-4 sm:p-5">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Your Weekly Costs
            </h3>
            <CostChart history={gameState.weekHistory} role={playerRole} height={100} />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <div>
                <div className="stat-label">Team Total</div>
                <div className="text-base sm:text-lg font-bold tabular-nums text-[var(--text-primary)]">₹{teamTotal.toFixed(0)}</div>
              </div>
              <div className="text-right">
                <div className="stat-label">This Week</div>
                <div className="text-base sm:text-lg font-bold tabular-nums" style={{ color: colors.primary }}>
                  ₹{roleState.weekCost.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="glass-card-static p-4 sm:p-5">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Week History
            </h3>
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="text-left py-2 font-semibold">Wk</th>
                    <th className="text-right py-2 font-semibold">Demand</th>
                    <th className="text-right py-2 font-semibold">Inv</th>
                    <th className="text-right py-2 font-semibold">Backlog</th>
                    <th className="text-right py-2 font-semibold">Ordered</th>
                    <th className="text-right py-2 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {gameState.weekHistory.slice().reverse().map((snap) => {
                    const rs = snap.roles[playerRole];
                    return (
                      <tr key={snap.week} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-primary)] transition-colors">
                        <td className="py-1.5 font-mono tabular-nums font-bold" style={{ color: colors.primary }}>
                          {snap.week}
                        </td>
                        <td className="text-right py-1.5 tabular-nums">{snap.customerDemand}</td>
                        <td className="text-right py-1.5 tabular-nums">{rs.inventory}</td>
                        <td className={`text-right py-1.5 tabular-nums ${rs.backlog > 0 ? 'text-[var(--color-danger)]' : ''}`}>
                          {rs.backlog}
                        </td>
                        <td className="text-right py-1.5 tabular-nums">{rs.orderPlaced}</td>
                        <td className="text-right py-1.5 tabular-nums font-semibold">₹{rs.weekCost.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                  {gameState.weekHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-[var(--text-muted)]">
                        No history yet — place your first order!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* All Roles Overview & Bullwhip Dashboard */}
        <BullwhipDashboard gameState={gameState} playerRole={playerRole} />
      </main>

      {/* ─── Game Over Modal ────────────────────────────────────────── */}
      {gameState.gamePhase === 'finished' && (
        <GameOverModal
          gameState={gameState}
          playerRole={playerRole}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
