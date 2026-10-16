import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { chimeService } from '../utils/audioChime';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastCalledToken, setLastCalledToken] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // In dev Vite proxies /socket.io, in prod it's origin
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('queue:token_called', (data) => {
      setLastCalledToken(data);
      if (audioEnabled) {
        chimeService.announceCall(data.tokenNumber, data.roomNumber);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [audioEnabled]);

  const enableAudio = () => {
    // Browsers require a user interaction to start audio context
    chimeService.getAudioContext();
    chimeService.playChime();
    setAudioEnabled(true);
  };

  const toggleAudio = () => {
    if (!audioEnabled) {
      enableAudio();
    } else {
      setAudioEnabled(false);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      lastCalledToken,
      audioEnabled,
      enableAudio,
      toggleAudio
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
