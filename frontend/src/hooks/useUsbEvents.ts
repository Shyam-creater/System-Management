import { useEffect } from 'react';
import { Socket } from 'socket.io-client';

export interface UsbEventHandlerOptions {
  onInserted?: (msg: { type: 'inserted'; nodeId: string; event: any }) => void;
  onUnlocked?: (msg: { type: 'unlocked'; nodeId: string }) => void;
  onRemoved?: (msg: { type: 'removed'; nodeId: string; serial?: string }) => void;
}

export function useUsbEvents(socket: Socket | null, handlers: UsbEventHandlerOptions) {
  useEffect(() => {
    if (!socket) return;
    const handler = (msg: any) => {
      if (msg.type === 'inserted') handlers.onInserted?.(msg);
      if (msg.type === 'unlocked') handlers.onUnlocked?.(msg);
      if (msg.type === 'removed') handlers.onRemoved?.(msg);
    };
    socket.on('usb:event', handler);
    return () => {
      socket.off('usb:event', handler);
    };
  }, [socket, handlers.onInserted, handlers.onUnlocked, handlers.onRemoved]);
}

export default useUsbEvents;
