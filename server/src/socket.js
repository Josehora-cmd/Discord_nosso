const { Server } = require('socket.io');
const db = require('./db');
const { verifyToken } = require('./auth');
const { setOnline, setOffline, getSocketId } = require('./presence');

function setupSocket(httpServer, clientOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
  });

  // Autentica a conexão de socket usando o mesmo JWT emitido no login/registro.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('token ausente'));
    try {
      const payload = verifyToken(token);
      socket.userId = payload.sub;
      socket.username = payload.username;
      next();
    } catch {
      next(new Error('token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;
    setOnline(userId, socket.id);
    console.log(`[presence] ${socket.username} (${userId}) conectou — socket ${socket.id}`);

    // Avisa os amigos deste usuário que ele ficou online.
    broadcastPresence(io, userId, true);

    // -------------------- Amigos / presença --------------------

    socket.on('disconnect', () => {
      setOffline(userId);
      console.log(`[presence] ${socket.username} (${userId}) desconectou`);
      broadcastPresence(io, userId, false);
    });

    // -------------------- Sinalização de chamada --------------------
    // Eventos: call:invite -> call:incoming -> call:accept/call:reject
    // -> call:offer -> call:answer -> call:ice-candidate -> call:end

    socket.on('call:invite', ({ targetUserId }) => {
      const targetSocketId = getSocketId(targetUserId);
      if (!targetSocketId) {
        socket.emit('call:unavailable', { targetUserId, reason: 'offline' });
        return;
      }
      io.to(targetSocketId).emit('call:incoming', {
        from: { id: userId, username: socket.username },
      });
    });

    socket.on('call:accept', ({ targetUserId }) => {
      const targetSocketId = getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:accepted', { by: userId });
      }
    });

    socket.on('call:reject', ({ targetUserId }) => {
      const targetSocketId = getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:rejected', { by: userId });
      }
    });

    socket.on('call:offer', ({ targetUserId, sdp }) => {
      const targetSocketId = getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:offer', { from: userId, sdp });
      }
    });

    socket.on('call:answer', ({ targetUserId, sdp }) => {
      const targetSocketId = getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:answer', { from: userId, sdp });
      }
    });

    socket.on('call:ice-candidate', ({ targetUserId, candidate }) => {
      const targetSocketId = getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ice-candidate', { from: userId, candidate });
      }
    });

    socket.on('call:end', ({ targetUserId }) => {
      const targetSocketId = getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ended', { by: userId });
      }
    });
  });

  return io;
}

// Notifica todos os amigos do usuário (que estiverem online agora) sobre
// a mudança de status. Consulta direto no banco quem são os amigos.
function broadcastPresence(io, userId, isOnlineNow) {
  const friends = db
    .prepare(
      `SELECT (CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END) as friendId
       FROM friendships WHERE user_a_id = ? OR user_b_id = ?`,
    )
    .all(userId, userId, userId);

  for (const { friendId } of friends) {
    const friendSocketId = getSocketId(friendId);
    if (friendSocketId) {
      io.to(friendSocketId).emit('presence:update', { userId, online: isOnlineNow });
    }
  }
}

module.exports = { setupSocket };
