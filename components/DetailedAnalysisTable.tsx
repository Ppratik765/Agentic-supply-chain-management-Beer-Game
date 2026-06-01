import React from 'react';
import { type GameState, ROLES, ROLE_META, ROLE_COLORS } from '@/types';
import RoleIcon from './RoleIcon';

interface DetailedAnalysisTableProps {
  gameState: GameState;
}

function calculateVariance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
}

export default function DetailedAnalysisTable({ gameState }: DetailedAnalysisTableProps) {
  const history = gameState.weekHistory;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      {ROLES.map((role) => {
        const m = ROLE_META[role];
        const c = ROLE_COLORS[role];
        
        return (
          <div key={role} className="rounded-xl border p-3 sm:p-4 bg-[var(--bg-card)] flex flex-col min-w-0" style={{ borderColor: c.glow }}>
            <div className="flex items-center gap-2 mb-3 border-b border-[var(--border-subtle)] pb-2 flex-shrink-0">
              <RoleIcon role={role} size={18} style={{ color: c.primary }} />
              <h3 className="text-sm font-bold capitalize tracking-wider" style={{ color: c.primary }}>{m.label} - Detailed Log</h3>
            </div>
            
            <div className="overflow-x-auto overflow-y-hidden flex-1">
              <table className="w-full text-[10px] sm:text-xs text-right whitespace-nowrap">
                <thead className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="text-left py-1.5 font-semibold pr-2">Wk</th>
                    <th className="py-1.5 font-semibold px-1" title="Demand In">In</th>
                    <th className="py-1.5 font-semibold px-1" title="Orders Out">Out</th>
                    <th className="py-1.5 font-semibold px-1">Inv</th>
                    <th className="py-1.5 font-semibold px-1" title="Backlog">Back</th>
                    <th className="py-1.5 font-semibold px-1">Cost</th>
                    <th className="py-1.5 font-semibold pl-2">Bullwhip</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((snap, idx) => {
                    const rs = snap.roles[role];
                    const incomingOrder = role === 'retailer' ? snap.customerDemand : rs.incomingOrder;
                    
                    // Calculate cumulative bullwhip up to this week
                    const currentHistory = history.slice(0, idx + 1);
                    const orders = currentHistory.map(h => h.roles[role].orderPlaced);
                    const incoming = currentHistory.map(h => role === 'retailer' ? h.customerDemand : h.roles[role].incomingOrder);
                    
                    const varO = calculateVariance(orders);
                    const varI = calculateVariance(incoming);
                    let ratio = 1.0;
                    if (varI === 0) {
                      ratio = varO === 0 ? 1.0 : 999;
                    } else {
                      ratio = varO / varI;
                    }
                    
                    let ratioColor = 'text-[var(--text-secondary)]';
                    if (idx > 0) {
                      if (ratio > 2.0) ratioColor = 'text-[#f87171]'; // Red
                      else if (ratio > 1.2) ratioColor = 'text-[#fbbf24]'; // Orange
                      else if (ratio <= 1.0) ratioColor = 'text-[#34d399]'; // Green
                    }

                    const limit = gameState.roleSettings ? gameState.roleSettings[role].capacityLimit : gameState.capacityLimit;
                    let invColor = '';
                    if (rs.inventory > limit) invColor = 'text-[#f87171]';
                    else if (rs.inventory < limit) invColor = 'text-[#34d399]';

                    return (
                      <tr key={snap.week} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-primary)] transition-colors">
                        <td className="text-left py-1.5 pr-2 font-mono font-bold" style={{ color: c.primary }}>{snap.week}</td>
                        <td className="py-1.5 px-1 tabular-nums text-[var(--text-primary)]">{incomingOrder}</td>
                        <td className="py-1.5 px-1 tabular-nums font-semibold text-[var(--text-primary)]">{rs.orderPlaced}</td>
                        <td className={`py-1.5 px-1 tabular-nums ${invColor}`}>{rs.inventory}</td>
                        <td className={`py-1.5 px-1 tabular-nums ${rs.backlog > 0 ? 'text-[#f87171] font-bold' : 'text-[var(--text-primary)]'}`}>{rs.backlog}</td>
                        <td className="py-1.5 px-1 tabular-nums text-[var(--text-secondary)]">₹{rs.weekCost.toFixed(0)}</td>
                        <td className={`py-1.5 pl-2 tabular-nums font-mono font-bold ${ratioColor}`}>
                          {idx === 0 ? '-' : (ratio > 100 ? '>100' : ratio.toFixed(2) + 'x')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
