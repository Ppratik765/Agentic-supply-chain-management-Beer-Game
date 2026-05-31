import React from 'react';
import { type GameState, type Role, ROLES, ROLE_META, ROLE_COLORS } from '@/types';
import RoleIcon from '@/components/RoleIcon';

interface BullwhipDashboardProps {
  gameState: GameState;
  playerRole: Role;
}

function calculateVariance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
}

function calculateBullwhipRatio(ordersPlaced: number[], ordersReceived: number[]): number {
  const varianceReceived = calculateVariance(ordersReceived);
  const variancePlaced = calculateVariance(ordersPlaced);
  
  if (varianceReceived === 0) {
    return variancePlaced === 0 ? 1 : 999;
  }
  return variancePlaced / varianceReceived;
}

export default function BullwhipDashboard({ gameState, playerRole }: BullwhipDashboardProps) {
  const history = gameState.weekHistory;

  return (
    <div className="glass-card-static p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">
        Live Supply Chain Dashboard & Bullwhip Meter
      </h3>
      
      <div className="flex flex-col xl:flex-row gap-4 overflow-x-auto pb-2">
        {ROLES.map((role) => {
          const m = ROLE_META[role];
          const c = ROLE_COLORS[role];
          const isMe = role === playerRole;
          
          const ordersPlaced = history.map(snap => snap.roles[role].orderPlaced);
          const ordersReceived = history.map(snap => snap.roles[role].incomingOrder);
          
          const ratio = calculateBullwhipRatio(ordersPlaced, ordersReceived);
          
          let meterColor = c.primary;
          if (ratio > 2.0) meterColor = '#f87171'; // Red
          else if (ratio > 1.2) meterColor = '#fbbf24'; // Orange
          else if (ratio <= 1.0) meterColor = '#34d399'; // Green
          
          const ratioDisplay = ratio > 100 ? '> 100' : ratio.toFixed(2);
          
          return (
            <div 
              key={role} 
              className={`flex-1 min-w-[280px] rounded-xl border p-3 flex flex-col transition-all ${isMe ? 'ring-1' : ''}`}
              style={{
                backgroundColor: `${c.primary}06`,
                borderColor: `${c.primary}15`,
                ['--tw-ring-color' as string]: `${c.primary}30`,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 border-b border-[rgba(255,255,255,0.05)] pb-2">
                <div className="flex items-center gap-1.5">
                  <RoleIcon role={role} size={16} style={{ color: c.primary }} />
                  <span className="text-sm font-bold" style={{ color: c.primary }}>
                    {m.label} {isMe && <span className="opacity-50">(You)</span>}
                  </span>
                </div>
                
                {/* Bullwhip Meter */}
                <div className="flex flex-col items-end">
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Bullwhip Ratio</span>
                  <div className="font-mono font-bold text-lg" style={{ color: meterColor }}>
                    {ratioDisplay}
                  </div>
                </div>
              </div>

              {/* Tabular Data */}
              <div className="flex-1 overflow-y-auto max-h-[250px] pr-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0c1222] z-10 shadow-sm">
                    <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <th className="text-left py-1.5 font-semibold">Wk</th>
                      <th className="text-right py-1.5 font-semibold">Inv</th>
                      <th className="text-right py-1.5 font-semibold">BL</th>
                      <th className="text-right py-1.5 font-semibold" title="Incoming Order (Demand)">In</th>
                      <th className="text-right py-1.5 font-semibold" title="Order Placed">Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice().reverse().map((snap) => {
                      const rs = snap.roles[role];
                      const limit = gameState.roleSettings ? gameState.roleSettings[role].capacityLimit : gameState.capacityLimit;
                      let invColor = '';
                      if (rs.inventory > limit) invColor = 'text-[#f87171]';
                      else if (rs.inventory < limit) invColor = 'text-[#34d399]';

                      return (
                        <tr key={snap.week} className="border-b border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)]">
                          <td className="py-1 font-mono font-bold" style={{ color: c.primary }}>{snap.week}</td>
                          <td className={`text-right py-1 tabular-nums ${invColor}`}>{rs.inventory}</td>
                          <td className={`text-right py-1 tabular-nums ${rs.backlog > 0 ? 'text-[var(--color-danger)]' : ''}`}>{rs.backlog}</td>
                          <td className="text-right py-1 tabular-nums">{rs.incomingOrder}</td>
                          <td className="text-right py-1 font-semibold tabular-nums">{rs.orderPlaced}</td>
                        </tr>
                      );
                    })}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-[var(--text-muted)] italic">
                          No data yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
