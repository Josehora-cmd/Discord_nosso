const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Banco de dados é um único arquivo local (data.sqlite), criado
// automaticamente na primeira execução. Sem serviço para instalar,
// sem senha, sem porta — é só um arquivo no disco.
//
// Usamos o módulo SQLite embutido do próprio Node.js (node:sqlite),
// disponível desde o Node 22 sem precisar instalar nada nem compilar
// código nativo — ao contrário do pacote "better-sqlite3", que exige
// Visual Studio Build Tools no Windows para compilar.
const db = new DatabaseSync(path.join(__dirname, '..', 'data.sqlite'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(sender_id, receiver_id)
  );

  CREATE TABLE IF NOT EXISTS friendships (
    user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_a_id, user_b_id)
  );
`);

module.exports = db;
