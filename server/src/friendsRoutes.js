const { Router } = require('express');
const crypto = require('crypto');
const db = require('./db');
const { requireAuth } = require('./authRoutes');
const { isOnline } = require('./presence');

const router = Router();
router.use(requireAuth);

// Garante que uma amizade é sempre salva com userAId < userBId, pra não
// duplicar a relação (evita ter A-B e B-A como duas linhas diferentes).
function saveFriendship(idOne, idTwo) {
  const [a, b] = [idOne, idTwo].sort();
  db.prepare(
    'INSERT OR IGNORE INTO friendships (user_a_id, user_b_id) VALUES (?, ?)',
  ).run(a, b);
}

router.get('/friends/search', (req, res) => {
  const query = String(req.query.q || '').trim();
  if (query.length < 2) return res.json([]);

  const results = db
    .prepare(
      `SELECT id, username, display_name FROM users
       WHERE username LIKE ? AND id != ? LIMIT 10`,
    )
    .all(`%${query}%`, req.userId);

  res.json(results.map((u) => ({ id: u.id, username: u.username, displayName: u.display_name })));
});

router.post('/friends/requests', (req, res) => {
  const { targetUsername } = req.body;
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(targetUsername);

  if (!target) return res.status(404).json({ error: 'usuário não encontrado' });
  if (target.id === req.userId) return res.status(400).json({ error: 'não é possível adicionar a si mesmo' });

  const [a, b] = [req.userId, target.id].sort();
  const alreadyFriends = db
    .prepare('SELECT 1 FROM friendships WHERE user_a_id = ? AND user_b_id = ?')
    .get(a, b);
  if (alreadyFriends) return res.status(409).json({ error: 'vocês já são amigos' });

  const id = crypto.randomUUID();
  try {
    db.prepare(
      'INSERT INTO friend_requests (id, sender_id, receiver_id, status) VALUES (?, ?, ?, ?)',
    ).run(id, req.userId, target.id, 'pending');
  } catch {
    return res.status(409).json({ error: 'solicitação já enviada' });
  }

  const io = req.app.get('io');
  const { getSocketId } = require('./presence');
  const targetSocketId = getSocketId(target.id);
  if (targetSocketId) {
    const sender = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(req.userId);
    io.to(targetSocketId).emit('friend:request-received', {
      requestId: id,
      from: { id: req.userId, username: sender.username, displayName: sender.display_name },
    });
  }

  res.status(201).json({ id, status: 'pending' });
});

router.get('/friends/requests/pending', (req, res) => {
  const requests = db
    .prepare(
      `SELECT fr.id, u.id as senderId, u.username, u.display_name
       FROM friend_requests fr
       JOIN users u ON u.id = fr.sender_id
       WHERE fr.receiver_id = ? AND fr.status = 'pending'`,
    )
    .all(req.userId);

  res.json(requests.map((r) => ({
    requestId: r.id,
    from: { id: r.senderId, username: r.username, displayName: r.display_name },
  })));
});

router.post('/friends/requests/:id/accept', (req, res) => {
  const request = db
    .prepare('SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = ?')
    .get(req.params.id, req.userId, 'pending');
  if (!request) return res.status(404).json({ error: 'solicitação não encontrada' });

  db.prepare('UPDATE friend_requests SET status = ? WHERE id = ?').run('accepted', request.id);
  saveFriendship(request.sender_id, request.receiver_id);

  const io = req.app.get('io');
  const { getSocketId } = require('./presence');
  const senderSocketId = getSocketId(request.sender_id);
  const receiver = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(req.userId);
  if (senderSocketId) {
    io.to(senderSocketId).emit('friend:request-accepted', {
      by: { id: req.userId, username: receiver.username, displayName: receiver.display_name },
    });
  }

  res.json({ status: 'accepted' });
});

router.post('/friends/requests/:id/reject', (req, res) => {
  const request = db
    .prepare('SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = ?')
    .get(req.params.id, req.userId, 'pending');
  if (!request) return res.status(404).json({ error: 'solicitação não encontrada' });

  db.prepare('UPDATE friend_requests SET status = ? WHERE id = ?').run('rejected', request.id);
  res.json({ status: 'rejected' });
});

router.get('/friends', (req, res) => {
  const friends = db
    .prepare(
      `SELECT u.id, u.username, u.display_name FROM friendships f
       JOIN users u ON u.id = (
         CASE WHEN f.user_a_id = ? THEN f.user_b_id ELSE f.user_a_id END
       )
       WHERE f.user_a_id = ? OR f.user_b_id = ?`,
    )
    .all(req.userId, req.userId, req.userId);

  res.json(
    friends.map((f) => ({
      id: f.id,
      username: f.username,
      displayName: f.display_name,
      online: isOnline(f.id),
    })),
  );
});

module.exports = router;
