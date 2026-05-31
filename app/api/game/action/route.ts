import { getRoom, updateRoom } from '@/lib/game-store';
import { advanceWeek, calculateERPAgentOrder } from '@/lib/supply-chain-engine';
import { getPusherServer } from '@/lib/pusher-server';
import type { GameActionRequest, Role } from '@/types';
import { ROLES } from '@/types';

export async function POST(request: Request) {
  try {
    const body: GameActionRequest = await request.json();
    const { roomCode, role, orderQuantity } = body;

    if (!roomCode || !role || orderQuantity === undefined) {
      return Response.json(
        { error: 'Missing required fields: roomCode, role, orderQuantity' },
        { status: 400 }
      );
    }

    const gameState = await getRoom(roomCode);
    if (!gameState) {
      return Response.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    if (gameState.gamePhase !== 'playing') {
      return Response.json(
        { error: 'Game is not in playing phase' },
        { status: 400 }
      );
    }

    if (gameState.currentWeek > gameState.totalWeeks) {
      return Response.json(
        { error: 'Game is already finished' },
        { status: 400 }
      );
    }

    // Check if this role already submitted this week
    if (gameState.ordersSubmittedThisWeek.includes(role)) {
      return Response.json(
        { error: `${role} has already submitted an order this week` },
        { status: 409 }
      );
    }

    // Validate order quantity
    const clampedOrder = Math.max(0, Math.min(Math.round(orderQuantity), gameState.capacityLimit));

    // Record the order
    gameState.pendingOrders[role] = clampedOrder;
    gameState.ordersSubmittedThisWeek.push(role);

    // ─── Check if all roles have submitted ──────────────────────────────
    // Auto-submit for AI-controlled roles
    for (const r of ROLES) {
      if (
        gameState.players[r].isAI &&
        !gameState.ordersSubmittedThisWeek.includes(r)
      ) {
        const aiOrder = calculateERPAgentOrder(r, gameState);
        gameState.pendingOrders[r] = aiOrder;
        gameState.ordersSubmittedThisWeek.push(r);
      }
    }

    // If all 4 roles have submitted, advance the week
    const allSubmitted = ROLES.every((r) =>
      gameState.ordersSubmittedThisWeek.includes(r)
    );

    let updatedState = gameState;

    if (allSubmitted) {
      updatedState = advanceWeek(gameState);
      await updateRoom(roomCode, updatedState);

      // Broadcast via Pusher (best-effort)
      try {
        const pusher = getPusherServer();
        await pusher.trigger(`presence-beergame-${roomCode}`, 'room-update', {
          gameState: updatedState,
        });
      } catch {
        // Pusher might not be configured
      }
    } else {
      await updateRoom(roomCode, gameState);
    }

    return Response.json({ gameState: updatedState });
  } catch (error) {
    console.error('Game action error:', error);
    return Response.json(
      { error: 'Failed to process game action' },
      { status: 500 }
    );
  }
}
