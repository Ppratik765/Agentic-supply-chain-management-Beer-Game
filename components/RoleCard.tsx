'use client';

import { type Role, ROLE_META, ROLE_COLORS, type PlayerInfo } from '@/types';
import RoleIcon from '@/components/RoleIcon';
import { Bot } from 'lucide-react';

interface RoleCardProps {
  role: Role;
  player: PlayerInfo | null;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  compact?: boolean;
}

export default function RoleCard({
  role,
  player,
  isSelected,
  isDisabled,
  onClick,
  compact = false,
}: RoleCardProps) {
  const meta = ROLE_META[role];
  const colors = ROLE_COLORS[role];
  const isAI = player?.isAI ?? true;

  return (
    <button
      id={`role-card-${role}`}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        glass-card glow-card-${role} text-left w-full
        ${isSelected ? 'glow-active' : ''}
        ${isDisabled && !isSelected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${compact ? 'p-3' : 'p-5'}
        transition-all duration-300
      `}
      style={{
        ['--glow' as string]: colors.primary,
      }}
    >
      {/* Icon & Label */}
      <div className="flex items-center gap-3 mb-2">
        <RoleIcon role={role} size={compact ? 20 : 28} className="flex-shrink-0" style={{ color: colors.primary }} />
        <div className="flex-1 min-w-0">
          <h3
            className={`font-bold ${compact ? 'text-sm' : 'text-lg'} tracking-tight`}
            style={{ color: colors.primary }}
          >
            {meta.label}
          </h3>
          {!compact && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {meta.description}
            </p>
          )}
        </div>
      </div>

      {/* Player Assignment */}
      <div className="flex items-center gap-2 mt-3">
        {player && !isAI ? (
          <span className="badge badge-human">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse-glow" />
            {player.name}
          </span>
        ) : (
          <span className="badge badge-ai flex items-center gap-1">
            <Bot size={12} className="text-[#a78bfa]" />
            AI Agent
          </span>
        )}
        {isSelected && (
          <span
            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${colors.primary}20`,
              color: colors.primary,
            }}
          >
            YOU
          </span>
        )}
      </div>
    </button>
  );
}
