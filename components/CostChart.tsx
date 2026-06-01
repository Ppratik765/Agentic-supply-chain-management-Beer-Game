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

  // Map data values to coordinates
  const points = costs.map((c, i) => {
    const x = i * (barW + gap) + barW / 2;
    // Leave a small margin top and bottom
    const y = height - (c / maxCost) * (height - 8) - 4;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`
    : '';

  return (
    <div className="w-full overflow-x-auto">
      <svg width={Math.max(totalW, 100)} height={height} viewBox={`0 0 ${Math.max(totalW, 100)} ${height}`} className="block overflow-visible">
        {points.length > 0 && (
          <path
            d={areaPath}
            fill={colors.primary}
            fillOpacity={0.15}
            className="transition-all duration-300"
          />
        )}
        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke={colors.primary}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
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
              <div className="inventory-bar-fill" style={{ width: `${(cost / maxCost) * 100}%`, backgroundColor: c.primary }} />
            </div>
            <span className="text-xs font-bold tabular-nums w-16 text-right text-[var(--text-secondary)]">₹{cost.toFixed(0)}</span>
          </div>
        );
      })}
    </div>
  );
}
