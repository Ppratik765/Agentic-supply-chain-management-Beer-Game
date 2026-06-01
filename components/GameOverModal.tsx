import { useState } from 'react';
import { type GameState, type Role, ROLES, ROLE_META, ROLE_COLORS } from '@/types';
import { CostComparisonChart } from './CostChart';
import RoleIcon from './RoleIcon';
import GameAnalysisModal from './GameAnalysisModal';
import { Trophy, Award, RotateCcw, LineChart } from 'lucide-react';

interface GameOverModalProps {
  gameState: GameState;
  playerRole: Role | null;
  onPlayAgain: () => void;
}

export default function GameOverModal({ gameState, playerRole, onPlayAgain }: GameOverModalProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const totalCosts = ROLES.map((r) => ({
    role: r,
    cost: gameState.roles[r].totalCost,
  })).sort((a, b) => a.cost - b.cost);

  const teamTotal = totalCosts.reduce((sum, t) => sum + t.cost, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
        <div className="modal-card w-full max-w-lg max-h-[90vh] flex flex-col p-5 sm:p-7 animate-fade-in-up">
          {/* Sticky Header - Trophy */}
          <div className="text-center mb-4 flex flex-col items-center flex-shrink-0">
            <Trophy size={36} className="text-[#fbbf24] mb-2 animate-bounce-subtle sm:w-10 sm:h-10" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Game Over!</h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              {gameState.totalWeeks} weeks completed
            </p>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4 mb-4">
            {/* Scoreboard */}
            <div className="space-y-2">
              {totalCosts.map(({ role, cost }, idx) => {
                const meta = ROLE_META[role];
                const colors = ROLE_COLORS[role];
                const isPlayer = role === playerRole;

                return (
                  <div
                    key={role}
                    className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl border transition-all ${
                      isPlayer ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: isPlayer ? colors.primary : colors.glow,
                      ['--tw-ring-color' as string]: colors.glow,
                    }}
                  >
                    <span className="w-7 sm:w-8 flex justify-center flex-shrink-0">
                      {idx === 0 ? (
                        <Trophy size={15} className="text-[#fbbf24]" />
                      ) : idx === 1 ? (
                        <Award size={15} className="text-[#e2e8f0]" />
                      ) : idx === 2 ? (
                        <Award size={15} className="text-[#cd7f32]" />
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">#{idx + 1}</span>
                      )}
                    </span>
                    <RoleIcon role={role} size={16} style={{ color: colors.primary }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate" style={{ color: colors.primary }}>
                        {meta.label}
                        {isPlayer && <span className="ml-1.5 text-[9px] opacity-60">(YOU)</span>}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)] truncate">
                        {gameState.players[role].isAI ? 'AI Agent' : gameState.players[role].name}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm sm:text-base font-bold tabular-nums" style={{ color: colors.primary }}>
                        ₹{cost.toFixed(0)}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">total cost</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Team Total */}
            <div className="text-center p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                Team Total Cost
              </div>
              <div className="text-xl sm:text-2xl font-bold mt-0.5 text-[var(--text-primary)]">
                ₹{teamTotal.toFixed(0)}
              </div>
            </div>

            {/* Cost Comparison Chart */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
                Cost Comparison Breakdown
              </h4>
              <CostComparisonChart history={gameState.weekHistory} />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex-shrink-0 pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row gap-2">
            <button
              id="play-again-btn"
              className="btn-primary flex-1 flex items-center justify-center gap-2 h-11"
              onClick={onPlayAgain}
            >
              <RotateCcw size={16} />
              <span>Play Again</span>
            </button>
            <button
              id="game-analysis-btn"
              className="btn-secondary flex-1 flex items-center justify-center gap-2 h-11"
              onClick={() => setShowAnalysis(true)}
            >
              <LineChart size={16} />
              <span>Game Analysis</span>
            </button>
          </div>
        </div>
      </div>

      {showAnalysis && (
        <GameAnalysisModal
          gameState={gameState}
          onClose={() => setShowAnalysis(false)}
        />
      )}
    </>
  );
}
