const { Router } = require('express');
const crypto = require('crypto');
const db = require('./db');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('./auth');

const router = Router();

// Middleware que exige um Bearer token válido, usado nas rotas protegidas.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'token ausente' });

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: 'token inválido ou expirado' });
  }
}

router.post('/auth/register', async (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'username, password e displayName são obrigatórios' });
  }
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return res.status(400).json({ error: 'username deve ter 3-24 caracteres, apenas letras/números/underscore' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'senha deve ter ao menos 6 caracteres' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'username já está em uso' });
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  db.prepare(
    'INSERT INTO users (id, username, display_name, password_hash) VALUES (?, ?, ?, ?)',
  ).run(id, username, displayName, passwordHash);

  const token = signToken(id, username);
  res.status(201).json({ token, user: { id, username, displayName } });
});

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username e password são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  // Mensagem genérica proposital: não revela se o usuário existe ou não.
  if (!user) return res.status(401).json({ error: 'credenciais inválidas' });

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'credenciais inválidas' });

  const token = signToken(user.id, user.username);
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name } });
});

router.get('/users/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(req.userId);
  res.json(user);
});

module.exports = { router, requireAuth };
