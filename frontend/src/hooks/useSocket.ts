import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;

export const useSocket = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) {
      socket = io('/', {
        transports: ['websocket', 'polling'],
        reconnectionDelay: 2000
      });
    }

    socket.on('telemetry:update', () => {
      // Invalidate nodes and alerts to trigger smooth real-time UI refresh
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    return () => {
      // Keep socket open across component mount/unmount
    };
  }, [queryClient]);

  return socket;
};
