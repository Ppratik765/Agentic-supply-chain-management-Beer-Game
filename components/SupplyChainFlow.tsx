'use client';

import React from 'react';

import { type GameState, type Role, ROLES, ROLE_META, ROLE_COLORS } from '@/types';
import RoleIcon from '@/components/RoleIcon';
import { User, Cpu, ShoppingCart, ArrowRight } from 'lucide-react';

interface SupplyChainFlowProps {
  gameState: GameState;
  playerRole: Role | null;
}

export default function SupplyChainFlow({ gameState, playerRole }: SupplyChainFlowProps) {
  const currentDemand = gameState.demandPattern[gameState.currentWeek - 1] ?? 0;

  return (
    <div className="glass-card-static p-4 sm:p-6">
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-muted)]">
          Supply Chain
        </h2>
      </div>

      {/* Flow direction label */}
      <div className="flex items-center gap-1.5 mb-3 text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
        <span>Production</span>
        <ArrowRight size={10} />
        <span>Shipment Flow</span>
        <ArrowRight size={10} />
        <span>Customer</span>
      </div>

      {/* Flow Diagram — horizontal on desktop, scrollable horizontally on mobile */}
      <div className="flex items-stretch justify-between w-full gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {/* Customer Node */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[56px]">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] flex items-center justify-center text-[var(--color-danger)]">
            <User size={18} />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium">Customer</span>
        </div>

        {ROLES.map((role, index) => {
          const meta = ROLE_META[role];
          const colors = ROLE_COLORS[role];
          const roleState = gameState.roles[role];
          const isPlayer = role === playerRole;
          const maxInv = Math.max(gameState.initialInventory * 3, 1);
          const invPercent = Math.min((roleState.inventory / maxInv) * 100, 100);
          
          const prevRole = index > 0 ? ROLES[index - 1] : null;
          const pipelineData = prevRole ? gameState.shippingPipeline[prevRole] : null;

          return (
            <React.Fragment key={role}>
              {/* Pipeline connector — ships flow RIGHT-to-LEFT (from role towards customer) */}
              <div className="flex flex-col items-center justify-center flex-1 min-w-[28px] sm:min-w-[48px]">
                {pipelineData && (
                  <div className="text-[10px] text-[var(--text-muted)] mb-1 tabular-nums font-mono">
                    {pipelineData[0]}
                  </div>
                )}
                <div
                  className="pipeline-track pipeline-rtl w-full"
                  style={{ ['--glow' as string]: colors.primary }}
                />
                {pipelineData && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 tabular-nums font-mono">
                    {pipelineData[1]}
                  </div>
                )}
              </div>

              {/* Role Node */}
              <div
                className={`
                  flex-shrink-0 w-[104px] sm:w-36 rounded-xl p-2.5 sm:p-3 border transition-all duration-300
                  ${isPlayer ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''}
                `}
                style={{
                  backgroundColor: colors.bg,
                  borderColor: isPlayer ? colors.primary : colors.glow,
                  ['--tw-ring-color' as string]: colors.glow,
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-1.5 mb-2">
                  <RoleIcon role={role} size={14} style={{ color: colors.primary }} />
                  <span
                    className="text-[11px] sm:text-xs font-bold tracking-wide truncate"
                    style={{ color: colors.primary }}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Inventory Bar */}
                <div className="inventory-bar mb-2">
                  <div
                    className="inventory-bar-fill"
                    style={{
                      width: `${invPercent}%`,
                      backgroundColor: colors.primary,
                    }}
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">Inv</div>
                    <div className="text-xs sm:text-sm font-bold tabular-nums" style={{ color: colors.primary }}>
                      {roleState.inventory}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">Backlog</div>
                    <div className={`text-xs sm:text-sm font-bold tabular-nums ${roleState.backlog > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]'}`}>
                      {roleState.backlog}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">Order In</div>
                    <div className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                      {roleState.incomingOrder}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">Ship Out</div>
                    <div className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                      {roleState.outgoingShipment}
                    </div>
                  </div>
                </div>

                {/* Cost */}
                <div className="mt-2 pt-2 border-t border-[rgba(148,163,184,0.06)]">
                  <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">Total Cost</div>
                  <div className="text-xs font-bold tabular-nums text-[var(--text-secondary)]">
                    ₹{roleState.totalCost.toFixed(0)}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Production */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-[28px] sm:min-w-[48px]">
          <div className="text-[10px] text-[var(--text-muted)] mb-1 tabular-nums font-mono">
            {gameState.shippingPipeline.factory[0]}
          </div>
          <div className="pipeline-track pipeline-rtl w-full" style={{ ['--glow' as string]: 'var(--color-factory)' }} />
          <div className="text-[10px] text-[var(--text-muted)] mt-1 tabular-nums font-mono">
            {gameState.shippingPipeline.factory[1]}
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[56px]">
            <div 
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-factory)', borderColor: 'var(--glow-factory)', color: 'var(--color-factory)' }}
            >
              <Cpu size={18} />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium">Production</span>
        </div>
      </div>
    </div>
  );
}
