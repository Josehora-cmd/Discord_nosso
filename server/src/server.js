require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const { router: authRouter } = require('./authRoutes');
const friendsRouter = require('./friendsRoutes');
const { setupSocket } = require('./socket');

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (!process.env.JWT_SECRET) {
  console.error('ERRO: defina JWT_SECRET no arquivo .env antes de iniciar o servidor.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.use(authRouter);
app.use(friendsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const httpServer = http.createServer(app);
const io = setupSocket(httpServer, CLIENT_ORIGIN);
app.set('io', io); // permite que as rotas REST emitam eventos via socket (ex: friend:request-received)

httpServer.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
