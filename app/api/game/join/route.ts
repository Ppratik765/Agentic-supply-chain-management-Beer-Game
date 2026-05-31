import { getRoom, updateRoom } from '@/lib/game-store';
import { getPusherServer } from '@/lib/pusher-server';
import type { JoinGameRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const body: JoinGameRequest = await request.json();
    const { roomCode, player, role } = body;

    if (!roomCode || !player || !role) {
      return Response.json(
        { error: 'Missing required fields: roomCode, player, role' },
        { status: 400 }
      );
    }

    const gameState = await getRoom(roomCode.toUpperCase());
    if (!gameState) {
      return Response.json(
        { error: 'Room not found. Check your room code.' },
        { status: 404 }
      );
    }

    // Check if role is already taken by a human player
    const existingPlayer = gameState.players[role];
    if (existingPlayer && !existingPlayer.isAI) {
      return Response.json(
        { error: `The ${role} role is already taken by ${existingPlayer.name}` },
        { status: 409 }
      );
    }

    // Assign the player to the role
    gameState.players[role] = {
      id: player.id,
      name: player.name,
      isAI: false,
    };

    await updateRoom(roomCode, gameState);

    // Broadcast the update via Pusher (best-effort)
    try {
      const pusher = getPusherServer();
      await pusher.trigger(`presence-beergame-${roomCode}`, 'room-update', {
        gameState,
      });
    } catch {
      // Pusher might not be configured; continue silently
    }

    return Response.json({ gameState });
  } catch (error) {
    console.error('Join game error:', error);
    return Response.json(
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
}
