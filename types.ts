// ─── Supply Chain Simulator: Global Type Definitions ──────────────────────────

export const ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'] as const;
export type Role = (typeof ROLES)[number];

/** Upstream supplier for each role */
export const UPSTREAM: Record<Role, Role | 'production'> = {
  retailer: 'wholesaler',
  wholesaler: 'distributor',
  distributor: 'factory',
  factory: 'production',
};

/** Downstream customer for each role */
export const DOWNSTREAM: Record<Role, Role | 'customer'> = {
  retailer: 'customer',
  wholesaler: 'retailer',
  distributor: 'wholesaler',
  factory: 'distributor',
};

/** Color theming per role */
export const ROLE_COLORS: Record<Role, { primary: string; glow: string; bg: string }> = {
  retailer: { primary: '#22d3ee', glow: 'rgba(34,211,238,0.3)', bg: 'rgba(34,211,238,0.08)' },
  wholesaler: { primary: '#a78bfa', glow: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.08)' },
  distributor: { primary: '#fbbf24', glow: 'rgba(251,191,36,0.3)', bg: 'rgba(251,191,36,0.08)' },
  factory: { primary: '#34d399', glow: 'rgba(52,211,153,0.3)', bg: 'rgba(52,211,153,0.08)' },
};

/** Role display metadata */
export const ROLE_META: Record<Role, { label: string; icon: Role; description: string }> = {
  retailer: { label: 'Retailer', icon: 'retailer', description: 'Sells goods to end customers' },
  wholesaler: { label: 'Wholesaler', icon: 'wholesaler', description: 'Supplies retailers with goods' },
  distributor: { label: 'Distributor', icon: 'distributor', description: 'Ships goods from factory to wholesalers' },
  factory: { label: 'Factory', icon: 'factory', description: 'Manufactures and produces goods' },
};

// ─── Per-Role State ──────────────────────────────────────────────────────────

export interface RoleState {
  inventory: number;
  backlog: number;
  incomingShipment: number;
  incomingOrder: number;
  outgoingShipment: number;
  orderPlaced: number;
  weekCost: number;
  totalCost: number;
  holtLevel?: number;
  holtTrend?: number;
}

// ─── Player Info ─────────────────────────────────────────────────────────────

export interface PlayerInfo {
  id: string;
  name: string;
  isAI: boolean;
}

// ─── Pipeline (2-week delay) ─────────────────────────────────────────────────

/** [arriving_next_week, arriving_in_2_weeks] */
export type Pipeline = [number, number];

// ─── Week Snapshot for History ───────────────────────────────────────────────

export interface WeekSnapshot {
  week: number;
  roles: Record<Role, RoleState>;
  customerDemand: number;
}

// ─── Full Game State ─────────────────────────────────────────────────────────

export type GamePhase = 'lobby' | 'playing' | 'finished';

export interface RoleSettingConfig {
  holdingCost: number;
  backorderCost: number;
  initialInventory: number;
  capacityLimit: number;
}

export interface GameState {
  roomCode: string;
  currentWeek: number;
  totalWeeks: number;
  holdingCost: number;
  backorderCost: number;
  initialInventory: number;
  capacityLimit: number;
  demandPattern: number[];
  roles: Record<Role, RoleState>;
  players: Record<Role, PlayerInfo>;
  /** Shipping delay pipeline: items in transit to this role */
  shippingPipeline: Record<Role, Pipeline>;
  /** Roles that have submitted orders this week */
  ordersSubmittedThisWeek: Role[];
  /** Pending orders for this week (before advancement) */
  pendingOrders: Record<Role, number>;
  gamePhase: GamePhase;
  weekHistory: WeekSnapshot[];
  roleSettings?: Record<Role, RoleSettingConfig>;
}

// ─── Game Settings (from lobby) ──────────────────────────────────────────────

export interface GameSettings {
  holdingCost: number;
  backorderCost: number;
  initialInventory: number;
  capacityLimit: number;
  totalWeeks: number;
  mode: 'single' | 'multi';
  roleSettings?: Record<Role, RoleSettingConfig>;
}

// ─── Pusher Event Payloads ───────────────────────────────────────────────────

export interface RoomUpdatePayload {
  gameState: GameState;
}

export interface PlayerJoinedPayload {
  role: Role;
  player: PlayerInfo;
}

export interface OrderSubmittedPayload {
  role: Role;
  orderQuantity: number;
}

// ─── API Request/Response Types ──────────────────────────────────────────────

export interface CreateGameRequest {
  settings: GameSettings;
  player: PlayerInfo;
  role: Role;
}

export interface JoinGameRequest {
  roomCode: string;
  player: PlayerInfo;
  role: Role;
}

export interface GameActionRequest {
  roomCode: string;
  role: Role;
  orderQuantity: number;
}

export interface AITurnRequest {
  roomCode: string;
  role: Role;
  mode: 'auto-order' | 'help';
}

// ─── Helper: Create initial role state ───────────────────────────────────────

export function createInitialRoleState(initialInventory: number): RoleState {
  return {
    inventory: initialInventory,
    backlog: 0,
    incomingShipment: 0,
    incomingOrder: 400, // default starting demand
    outgoingShipment: 400,
    orderPlaced: 400,
    weekCost: initialInventory * 0.5, // will be recalculated
    totalCost: 0,
  };
}

// ─── Helper: Generate demand pattern ─────────────────────────────────────────

export function generateDemandPattern(totalWeeks: number): number[] {
  const pattern: number[] = [];
  for (let w = 0; w < totalWeeks; w++) {
    if (w < 4) {
      pattern.push(400);
    } else {
      // Step up to 800 with slight random fluctuation (±20)
      const fluctuation = Math.floor(Math.random() * 41) - 20; // -20 to 20
      pattern.push(Math.max(400, 800 + fluctuation));
    }
  }
  return pattern;
}
