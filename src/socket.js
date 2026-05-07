import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  console.log('Connecting to Socket.IO at:', apiUrl);
  console.log('Token present:', !!token);

  socket = io(apiUrl, {
    path: '/api/socket.io/',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socket.emit('join');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    console.error('Full error:', err);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
