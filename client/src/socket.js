import { io } from 'socket.io-client';
import { SERVER_URL, getToken } from './api.js';

let socket = null;

// Cria (ou reaproveita) a conexão de socket autenticada. Chamado uma vez
// depois do login, e reaproveitado por toda a aplicação a partir daí.
export function connectSocket() {
  if (socket && socket.connected) return socket;

  socket = io(SERVER_URL, {
    auth: { token: getToken() },
    autoConnect: true,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
