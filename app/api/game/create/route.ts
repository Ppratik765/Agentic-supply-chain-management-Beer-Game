import { createRoom } from '@/lib/game-store';
import type { CreateGameRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const body: CreateGameRequest = await request.json();
    const { settings, player, role } = body;

    // Validate settings
    if (!settings || !player || !role) {
      return Response.json(
        { error: 'Missing required fields: settings, player, role' },
        { status: 400 }
      );
    }

    if (settings.totalWeeks < 5 || settings.totalWeeks > 100) {
      return Response.json(
        { error: 'Total weeks must be between 5 and 100' },
        { status: 400 }
      );
    }

    const gameState = await createRoom(settings, player, role);

    return Response.json({ gameState, roomCode: gameState.roomCode });
  } catch (error) {
    console.error('Create game error:', error);
    return Response.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
