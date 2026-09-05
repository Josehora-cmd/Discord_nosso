// Mapa em memória: userId -> socketId do usuário conectado agora.
// Simples de propósito — se o servidor reiniciar, todo mundo reconecta e
// o mapa é reconstruído do zero (não precisa persistir presença no banco).
const onlineUsers = new Map();

function setOnline(userId, socketId) {
  onlineUsers.set(userId, socketId);
}

function setOffline(userId) {
  onlineUsers.delete(userId);
}

function getSocketId(userId) {
  return onlineUsers.get(userId);
}

function isOnline(userId) {
  return onlineUsers.has(userId);
}

module.exports = { setOnline, setOffline, getSocketId, isOnline };
