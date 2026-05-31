'use client';

import { type WeekSnapshot, type Role, ROLE_COLORS } from '@/types';

interface CostChartProps {
  history: WeekSnapshot[];
  role: Role;
  height?: number;
}

export default function CostChart({ history, role, height = 80 }: CostChartProps) {
  const colors = ROLE_COLORS[role];
  if (history.length === 0) {
    return <div className="flex items-center justify-center text-xs text-[var(--text-muted)]" style={{ height }}>No data yet</div>;
  }
  const costs = history.map((s) => s.roles[role].weekCost);
  const maxCost = Math.max(...costs, 1);
  const barW = Math.max(4, Math.min(16, Math.floor(300 / costs.length)));
  const gap = 2;
  const totalW = costs.length * (barW + gap);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={Math.max(totalW, 100)} height={height} viewBox={`0 0 ${Math.max(totalW, 100)} ${height}`} className="block">
        {costs.map((cost, i) => {
          const bh = (cost / maxCost) * (height - 4);
          return <rect key={i} x={i * (barW + gap)} y={height - bh} width={barW} height={bh} rx={2} fill={colors.primary} opacity={0.6} />;
        })}
        {costs.length > 1 && (
          <polyline fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}
            points={costs.map((c, i) => `${i * (barW + gap) + barW / 2},${height - (c / maxCost) * (height - 4)}`).join(' ')} />
        )}
      </svg>
    </div>
  );
}

export function CostComparisonChart({ history }: { history: WeekSnapshot[] }) {
  if (history.length === 0) return null;
  const roles: Role[] = ['retailer', 'wholesaler', 'distributor', 'factory'];
  const last = history[history.length - 1];
  const totalCosts = roles.map((r) => ({ role: r, cost: last.roles[r].totalCost }));
  const maxCost = Math.max(...totalCosts.map((t) => t.cost), 1);

  return (
    <div className="space-y-2">
      {totalCosts.map(({ role, cost }) => {
        const c = ROLE_COLORS[role];
        return (
          <div key={role} className="flex items-center gap-3">
            <span className="text-xs font-medium w-20 text-right" style={{ color: c.primary }}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
            <div className="flex-1 inventory-bar" style={{ height: 12 }}>
              <div className="inventory-bar-fill" style={{ width: `${(cost / maxCost) * 100}%`, background: `linear-gradient(90deg, ${c.primary}60, ${c.primary})` }} />
            </div>
            <span className="text-xs font-bold tabular-nums w-16 text-right text-[var(--text-secondary)]">₹{cost.toFixed(0)}</span>
          </div>
        );
      })}
    </div>
  );
}
