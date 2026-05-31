import { Redis } from '@upstash/redis';
import {
  type GameState,
  type GameSettings,
  type PlayerInfo,
  type Role,
  type RoleState,
  type Pipeline,
  ROLES,
  createInitialRoleState,
  generateDemandPattern,
} from '@/types';

const memoryStore = new Map<string, any>();

const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasRedisConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : {
      get: async (key: string) => memoryStore.get(key) || null,
      set: async (key: string, value: any, opts?: any) => { memoryStore.set(key, value); return 'OK'; },
      exists: async (key: string) => memoryStore.has(key) ? 1 : 0,
    };

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createRoom(
  settings: GameSettings,
  hostPlayer: PlayerInfo,
  hostRole: Role
): Promise<GameState> {
  let roomCode = generateRoomCode();
  
  while (await redis.exists(`room:${roomCode}`)) {
    roomCode = generateRoomCode();
  }

  const initialRoleState = {} as Record<Role, RoleState>;
  const players = {} as Record<Role, PlayerInfo>;
  const shippingPipeline = {} as Record<Role, Pipeline>;

  for (const role of ROLES) {
    const roleInitInv = settings.roleSettings ? settings.roleSettings[role].initialInventory : settings.initialInventory;
    initialRoleState[role] = createInitialRoleState(roleInitInv);

    if (role === hostRole) {
      players[role] = hostPlayer;
    } else {
      players[role] = {
        id: `ai-${role}`,
        name: `AI ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        isAI: true,
      };
    }

    shippingPipeline[role] = [400, 400];
  }

  const demandPattern = generateDemandPattern(settings.totalWeeks);

  const gameState: GameState = {
    roomCode,
    currentWeek: 1,
    totalWeeks: settings.totalWeeks,
    holdingCost: settings.holdingCost,
    backorderCost: settings.backorderCost,
    initialInventory: settings.initialInventory,
    capacityLimit: settings.capacityLimit,
    demandPattern,
    roles: initialRoleState,
    players,
    shippingPipeline,
    ordersSubmittedThisWeek: [],
    pendingOrders: { retailer: 0, wholesaler: 0, distributor: 0, factory: 0 },
    gamePhase: settings.mode === 'single' ? 'playing' : 'lobby',
    weekHistory: [],
    roleSettings: settings.roleSettings,
  };

  await redis.set(`room:${roomCode}`, gameState, { ex: 86400 });
  return gameState;
}

export async function getRoom(code: string): Promise<GameState | null> {
  return await redis.get(`room:${code}`);
}

export async function updateRoom(code: string, state: GameState): Promise<void> {
  await redis.set(`room:${code}`, state, { ex: 86400 });
}