import { getPusherServer } from '@/lib/pusher-server';

export async function POST(request: Request) {
  try {
    const formData = await request.text();
    const params = new URLSearchParams(formData);

    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      return Response.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    const pusher = getPusherServer();

    // For presence channels, we need user data
    if (channelName.startsWith('presence-')) {
      const userId = params.get('user_id') || `user-${Date.now()}`;
      const userName = params.get('user_name') || 'Anonymous';

      const authResponse = pusher.authorizeChannel(socketId, channelName, {
        user_id: userId,
        user_info: { name: userName },
      });

      return Response.json(authResponse);
    }

    // For private channels
    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return Response.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return Response.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
