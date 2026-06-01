'use client';

import { useState, useMemo } from 'react';
import { type GameState, type Role, ROLES, ROLE_META, ROLE_COLORS } from '@/types';
import RoleIcon from './RoleIcon';
import { X, LineChart, CheckSquare, Square, TrendingUp, Info, Table2 } from 'lucide-react';
import DetailedAnalysisTable from './DetailedAnalysisTable';

interface GameAnalysisModalProps {
  gameState: GameState;
  onClose: () => void;
}

type MetricType = 'inventory' | 'backlog' | 'orders' | 'cost';

const METRICS: { value: MetricType; label: string; description: string }[] = [
  { value: 'inventory', label: 'Inventory', description: 'Safety stock held in inventory' },
  { value: 'backlog', label: 'Backlog', description: 'Unfulfilled customer/downstream orders' },
  { value: 'orders', label: 'Orders Placed', description: 'Orders sent to upstream supplier' },
  { value: 'cost', label: 'Weekly Cost', description: 'Sum of holding and backlog costs' },
];

export default function GameAnalysisModal({ gameState, onClose }: GameAnalysisModalProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('inventory');
  const [visibleRoles, setVisibleRoles] = useState<Record<Role, boolean>>({
    retailer: true,
    wholesaler: true,
    distributor: true,
    factory: true,
  });
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  const history = gameState.weekHistory;
  const totalWeeks = history.length;

  // Toggle role visibility
  const toggleRole = (role: Role) => {
    setVisibleRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  // Helper stats for each role
  const roleStats = useMemo(() => {
    const stats = {} as Record<
      Role,
      {
        peakInventory: number;
        peakBacklog: number;
        bullwhipRatio: number;
        totalCost: number;
        meanOrder: number;
        varianceOrder: number;
        varianceDemand: number;
        behaviorLabel: string;
        behaviorColor: string;
      }
    >;

    for (const role of ROLES) {
      const roleData = history.map((h) => h.roles[role]);
      const inventories = roleData.map((d) => d.inventory);
      const backlogs = roleData.map((d) => d.backlog);
      const orders = roleData.map((d) => d.orderPlaced);

      // Determine incoming orders for variance
      const incoming = history.map((h, i) => {
        if (role === 'retailer') return h.customerDemand;
        // Wholesaler, distributor, factory get incoming from history
        return h.roles[role].incomingOrder;
      });

      // Calculate means
      const meanOrder = orders.reduce((s, v) => s + v, 0) / (orders.length || 1);
      const meanIncoming = incoming.reduce((s, v) => s + v, 0) / (incoming.length || 1);

      // Calculate variances
      const varianceOrder =
        orders.reduce((s, v) => s + Math.pow(v - meanOrder, 2), 0) / (orders.length || 1);
      const varianceDemand =
        incoming.reduce((s, v) => s + Math.pow(v - meanIncoming, 2), 0) / (incoming.length || 1);

      // Bullwhip ratio: variance of orders placed / variance of incoming demand
      const bullwhipRatio =
        varianceDemand === 0
          ? varianceOrder === 0
            ? 1.0
            : varianceOrder
          : varianceOrder / varianceDemand;

      // Behavioral analysis labels
      let behaviorLabel = 'Stable & Balanced';
      let behaviorColor = 'text-[var(--color-success)]';

      if (bullwhipRatio > 1.8) {
        behaviorLabel = 'Severe Bullwhip (Extreme Panic)';
        behaviorColor = 'text-red-400';
      } else if (bullwhipRatio > 1.2) {
        behaviorLabel = 'Moderate Bullwhip (Amplifier)';
        behaviorColor = 'text-yellow-400';
      } else if (Math.max(...backlogs) > 1500) {
        behaviorLabel = 'Stock Starvation';
        behaviorColor = 'text-orange-400';
      }

      stats[role] = {
        peakInventory: Math.max(...inventories, 0),
        peakBacklog: Math.max(...backlogs, 0),
        bullwhipRatio,
        totalCost: gameState.roles[role].totalCost,
        meanOrder,
        varianceOrder,
        varianceDemand,
        behaviorLabel,
        behaviorColor,
      };
    }

    return stats;
  }, [history, gameState.roles]);

  // Extract graph points
  const graphData = useMemo(() => {
    return history.map((h) => {
      const week = h.week;
      const values = {} as Record<Role, number>;
      for (const role of ROLES) {
        if (selectedMetric === 'inventory') {
          values[role] = h.roles[role].inventory;
        } else if (selectedMetric === 'backlog') {
          values[role] = h.roles[role].backlog;
        } else if (selectedMetric === 'orders') {
          values[role] = h.roles[role].orderPlaced;
        } else if (selectedMetric === 'cost') {
          values[role] = h.roles[role].weekCost;
        }
      }
      return { week, values };
    });
  }, [history, selectedMetric]);

  // Find max value for Y scaling
  const maxValue = useMemo(() => {
    let max = 400; // minimum threshold for graph height
    for (const d of graphData) {
      for (const role of ROLES) {
        if (visibleRoles[role]) {
          max = Math.max(max, d.values[role]);
        }
      }
    }
    return Math.ceil(max * 1.15); // Add padding to top of chart
  }, [graphData, visibleRoles]);

  // SVG dimensions
  const width = 500;
  const height = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Convert week indices to coordinates
  const getCoords = (weekIndex: number, value: number) => {
    const x = paddingLeft + (weekIndex / Math.max(1, totalWeeks - 1)) * chartW;
    const y = paddingTop + chartH - (value / maxValue) * chartH;
    return { x, y };
  };

  // Generate SVG path for a role
  const getPathD = (role: Role) => {
    const coords = graphData.map((d, i) => getCoords(i, d.values[role]));
    return coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  };

  // Generate SVG area path for a role (shadow under line)
  const getAreaPathD = (role: Role) => {
    if (graphData.length === 0) return '';
    const coords = graphData.map((d, i) => getCoords(i, d.values[role]));
    const first = coords[0];
    const last = coords[coords.length - 1];
    const baselineY = paddingTop + chartH;
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    return `${linePath} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
  };

  // Map mouse hover to week index
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const chartLeft = (paddingLeft / width) * rect.width;
    const chartRight = ((width - paddingRight) / width) * rect.width;

    if (clickX >= chartLeft && clickX <= chartRight) {
      const percentage = (clickX - chartLeft) / (chartRight - chartLeft);
      const weekIndex = Math.round(percentage * (totalWeeks - 1));
      if (weekIndex >= 0 && weekIndex < totalWeeks) {
        setHoveredWeek(weekIndex);
      }
    } else {
      setHoveredWeek(null);
    }
  };

  const activeHoveredSnapshot = hoveredWeek !== null ? graphData[hoveredWeek] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className={`modal-card w-full ${viewMode === 'table' ? 'max-w-[95vw]' : 'max-w-4xl'} max-h-[95vh] flex flex-col p-4 sm:p-6 animate-fade-in-up transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LineChart className="text-[#a78bfa]" size={20} />
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Supply Chain Performance Analysis
              </h2>
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'chart' 
                    ? 'bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <LineChart size={14} /> Chart
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'table' 
                    ? 'bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Table2 size={14} /> Detailed Log
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 py-4 space-y-5">
          
          {viewMode === 'table' ? (
            <DetailedAnalysisTable gameState={gameState} />
          ) : (
            <>
              {/* Controls & Metric Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Select Metric
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {METRICS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setSelectedMetric(m.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedMetric === m.value
                            ? 'bg-[var(--bg-secondary)] border-[var(--text-secondary)] text-[var(--text-primary)] shadow-sm'
                            : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="text-xs font-bold">{m.label}</div>
                        <div className="text-[9px] opacity-60 mt-0.5 leading-tight line-clamp-2">
                          {m.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Compare Roles
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((role) => {
                      const colors = ROLE_COLORS[role];
                      const isVisible = visibleRoles[role];
                      return (
                        <button
                          key={role}
                          onClick={() => toggleRole(role)}
                          className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-all text-left cursor-pointer"
                        >
                          <span style={{ color: colors.primary }}>
                            {isVisible ? <CheckSquare size={16} /> : <Square size={16} className="opacity-40" />}
                          </span>
                          <RoleIcon role={role} size={14} style={{ color: colors.primary }} />
                          <span className="text-xs font-medium text-[var(--text-secondary)] capitalize">
                            {role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SVG Multi-Line Chart Card */}
              <div className="glass-card-static p-3 sm:p-4 relative">
                {/* Legend / Stats overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Info size={11} /> Hover to inspect weekly stats
                  </span>
                </div>

                {/* SVG Plot */}
                <div className="w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto overflow-visible select-none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredWeek(null)}
                  >
                    {/* Horizontal Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = paddingTop + ratio * chartH;
                      const labelVal = Math.round(maxValue * (1 - ratio));
                      return (
                        <g key={ratio} className="opacity-30">
                          <line
                            x1={paddingLeft}
                            y1={y}
                            x2={width - paddingRight}
                            y2={y}
                            stroke="var(--border-subtle)"
                            strokeDasharray="2,3"
                          />
                          <text
                            x={paddingLeft - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize={8}
                            fill="var(--text-muted)"
                            className="tabular-nums"
                          >
                            {labelVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Vertical Gridlines (Weeks) */}
                    {Array.from({ length: Math.min(totalWeeks, 10) }).map((_, idx, arr) => {
                      const wIdx = Math.round((idx / (arr.length - 1)) * (totalWeeks - 1));
                      const x = paddingLeft + (wIdx / Math.max(1, totalWeeks - 1)) * chartW;
                      return (
                        <g key={idx} className="opacity-20">
                          <line
                            x1={x}
                            y1={paddingTop}
                            x2={x}
                            y2={paddingTop + chartH}
                            stroke="var(--border-subtle)"
                          />
                          <text
                            x={x}
                            y={paddingTop + chartH + 12}
                            textAnchor="middle"
                            fontSize={8}
                            fill="var(--text-muted)"
                          >
                            W{wIdx + 1}
                          </text>
                        </g>
                      );
                    })}

                    {/* SVG Paths for selected roles - Areas (Shadows) */}
                    {ROLES.map((role) => {
                      if (!visibleRoles[role]) return null;
                      const colors = ROLE_COLORS[role];
                      return (
                        <path
                          key={`${role}-area`}
                          d={getAreaPathD(role)}
                          fill={colors.primary}
                          fillOpacity={0.12}
                          className="transition-all duration-300"
                        />
                      );
                    })}

                    {/* SVG Paths for selected roles - Lines */}
                    {ROLES.map((role) => {
                      if (!visibleRoles[role]) return null;
                      const colors = ROLE_COLORS[role];
                      return (
                        <path
                          key={role}
                          d={getPathD(role)}
                          fill="none"
                          stroke={colors.primary}
                          strokeWidth={1.75}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-all duration-300"
                        />
                      );
                    })}

                    {/* Hover line and points */}
                    {hoveredWeek !== null && activeHoveredSnapshot && (
                      <g>
                        {/* Vertical guide bar */}
                        <line
                          x1={getCoords(hoveredWeek, 0).x}
                          y1={paddingTop}
                          x2={getCoords(hoveredWeek, 0).x}
                          y2={paddingTop + chartH}
                          stroke="var(--border-glow)"
                          strokeWidth={1}
                        />

                        {/* Nodes representing each role's data value at that week */}
                        {ROLES.map((role) => {
                          if (!visibleRoles[role]) return null;
                          const colors = ROLE_COLORS[role];
                          const val = activeHoveredSnapshot.values[role];
                          const coord = getCoords(hoveredWeek, val);

                          return (
                            <g key={role}>
                              <circle
                                cx={coord.x}
                                cy={coord.y}
                                r={3.5}
                                fill={colors.primary}
                                stroke="var(--bg-primary)"
                                strokeWidth={1.5}
                              />
                            </g>
                          );
                        })}
                      </g>
                    )}
                  </svg>
                </div>

                {/* Hover Tooltip Stats Box */}
                <div className="mt-3 py-2 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] min-h-[50px] flex items-center justify-between flex-wrap gap-2.5">
                  {hoveredWeek !== null && activeHoveredSnapshot ? (
                    <>
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        Week {activeHoveredSnapshot.week} Stats
                      </div>
                      <div className="flex gap-4 flex-wrap">
                        {ROLES.map((role) => {
                          if (!visibleRoles[role]) return null;
                          const colors = ROLE_COLORS[role];
                          const val = activeHoveredSnapshot.values[role];
                          return (
                            <div key={role} className="flex items-center gap-1.5 text-xs">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colors.primary }}
                              />
                              <span className="text-[var(--text-muted)] capitalize">{role}:</span>
                              <span className="font-bold tabular-nums text-[var(--text-primary)]">{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-[var(--text-muted)] mx-auto flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-[#a78bfa]" /> Hover over the chart lines to inspect detailed weekly metrics.
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Supply Chain Analysis Summaries */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Role Performance & Bullwhip Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {ROLES.map((role) => {
                    const colors = ROLE_COLORS[role];
                    const stats = roleStats[role];
                    const meta = ROLE_META[role];

                    return (
                      <div
                        key={role}
                        className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-glow)] transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Role Badge */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <RoleIcon role={role} size={16} style={{ color: colors.primary }} />
                              <h4 className="text-sm font-bold capitalize" style={{ color: colors.primary }}>
                                {meta.label}
                              </h4>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] ${stats.behaviorColor}`}>
                              {stats.behaviorLabel}
                            </span>
                          </div>
 
                          {/* Performance Grid */}
                          <div className="grid grid-cols-3 gap-2 text-center mb-3">
                            <div className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                              <div className="text-[9px] text-[var(--text-muted)] uppercase font-semibold">
                                Peak Inv
                              </div>
                              <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
                                {stats.peakInventory}
                              </div>
                            </div>
                            <div className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                              <div className="text-[9px] text-[var(--text-muted)] uppercase font-semibold">
                                Peak Backlog
                              </div>
                              <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
                                {stats.peakBacklog}
                              </div>
                            </div>
                            <div className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                              <div className="text-[9px] text-[var(--text-muted)] uppercase font-semibold">
                                Bullwhip
                              </div>
                              <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">
                                {stats.bullwhipRatio.toFixed(2)}x
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Explanatory insights */}
                        <div className="text-[11px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)] pt-2.5 mt-1">
                          {role === 'retailer' && (
                            <span>
                              Directly exposed to final customer demand. A bullwhip ratio of{' '}
                              <strong>{stats.bullwhipRatio.toFixed(2)}x</strong> shows{' '}
                              {stats.bullwhipRatio > 1.4
                                ? 'severe overreaction to demand changes, causing a panic surge upstream.'
                                : 'excellent control, keeping orders highly aligned to demand.'}
                            </span>
                          )}
                          {role === 'wholesaler' && (
                            <span>
                              Ordered from the Distributor to supply the Retailer.{' '}
                              {stats.peakBacklog > 10
                                ? `Suffered from supply shortages (backlog peaked at ${stats.peakBacklog} units) due to delayed upstream shipments.`
                                : `Kept inventories balanced, incurring a total cost of ₹${stats.totalCost.toFixed(0)}.`}
                            </span>
                          )}
                          {role === 'distributor' && (
                            <span>
                              Located in the middle of the supply chain. Amplified demand variability by{' '}
                              <strong>{stats.bullwhipRatio.toFixed(2)}x</strong>.{' '}
                              {stats.peakInventory > 20
                                ? `Over-ordered when stock was low, resulting in a mountain of excess safety stock (${stats.peakInventory} units) at the end.`
                                : 'Managed to cushion shipping delays effectively.'}
                            </span>
                          )}
                          {role === 'factory' && (
                            <span>
                              Controls production lines with a 2-week brewing delay.{' '}
                              {stats.bullwhipRatio > 1.6
                                ? `Suffered from massive order fluctuations (${stats.bullwhipRatio.toFixed(2)}x) passed down from the distributor, causing erratic production runs.`
                                : `Kept production steady and production costs optimal.`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 pt-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button onClick={onClose} className="btn-secondary px-5 py-2.5 h-10">
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
