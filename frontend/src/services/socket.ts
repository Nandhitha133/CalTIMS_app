// @ts-ignore
import io from 'socket.io-client/dist/socket.io';
import type { Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import { BASE_URL } from './api';

let socket: Socket | null = null;

const getSocketConfig = () => {
  const apiV1Index = BASE_URL.indexOf('/api/v1');
  if (apiV1Index !== -1) {
    const rootUrl = BASE_URL.substring(0, apiV1Index);
    const doubleSlashIndex = rootUrl.indexOf('//');
    if (doubleSlashIndex !== -1) {
      const rest = rootUrl.substring(doubleSlashIndex + 2);
      const firstSlashIndex = rest.indexOf('/');
      if (firstSlashIndex !== -1) {
        const origin = rootUrl.substring(0, doubleSlashIndex + 2 + firstSlashIndex);
        const path = rest.substring(firstSlashIndex) + '/socket.io';
        return { origin, path };
      }
    }
    return { origin: rootUrl, path: '/socket.io' };
  }
  return { origin: BASE_URL, path: '/socket.io' };
};

export const getSocket = (): Socket => {
  if (!socket) {
    const { origin, path } = getSocketConfig();
    console.log(`[Socket] Initializing socket connection to: ${origin} with path: ${path}`);
    
    const newSocket = io(origin, {
      path,
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
    }) as Socket;

    socket = newSocket;

    newSocket.on('connect', () => {
      console.log(`[Socket] Connected successfully: ${newSocket.id}`);
    });

    newSocket.on('connect_error', (error: any) => {
      console.warn('[Socket] Connection error:', error);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const useSocketEvent = (event: string, callback: (...args: any[]) => void) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const s = getSocket();
    
    // Ensure socket is connected when using hooks
    if (!s.connected) {
      s.connect();
    }

    const listener = (...args: any[]) => {
      savedCallback.current(...args);
    };

    s.on(event, listener);
    console.log(`[Socket] Subscribed to event: ${event}`);

    return () => {
      s.off(event, listener);
      console.log(`[Socket] Unsubscribed from event: ${event}`);
    };
  }, [event]);
};
