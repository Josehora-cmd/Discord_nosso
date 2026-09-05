# Comm — chamadas de voz + compartilhamento de tela em tempo real

Projeto novo, com uma stack bem mais simples que a tentativa anterior:

- **Backend**: Node.js + Express + Socket.IO (sem framework pesado)
- **Banco**: SQLite — um único arquivo (`server/data.sqlite`), criado
  automaticamente. Sem serviço pra instalar, sem senha, sem Docker. Usa o
  módulo `node:sqlite` **embutido no próprio Node.js** (Node 22+) — nenhum
  pacote externo pra instalar, nenhuma compilação nativa necessária.
- **Auth**: JWT + bcryptjs (100% JavaScript, sem compilação nativa)
- **Frontend**: React + Vite, JavaScript puro (sem TypeScript por
  enquanto, pra reduzir a superfície de configuração)
- **Tempo real**: Socket.IO (sinalização/presença) + WebRTC nativo do
  navegador (áudio da chamada e compartilhamento de tela)
- **NAT traversal**: só STUN público por enquanto (sem TURN/Coturn — não
  depende de Docker)

Duas pastas independentes (`server` e `client`), cada uma com seu próprio
`npm install`. Sem monorepo, sem workspaces, sem pnpm.

## O que já funciona nesta versão

- Cadastro e login (usuário + senha)
- Lista de amigos com presença online/offline em tempo real
- Adicionar amigo por username, aceitar/recusar solicitação (tudo em
  tempo real via Socket.IO)
- Ligar para um amigo online → chamada toca no outro lado → aceitar/recusar
- Áudio real da chamada via WebRTC (peer-to-peer, não passa pelo servidor)
- Compartilhamento de tela real durante a chamada (liga/desliga sem
  encerrar a chamada)
- Detecta se o próprio navegador parou o compartilhamento (botão nativo
  "Parar de compartilhar" do Chrome/Edge)
- **Interface redesenhada**: barra de servidores + sidebar de navegação +
  painel de usuário fixo, tela de Amigos com abas (Online/Todos/Pendentes),
  e tela de chamada em grid com **indicador real de "quem está falando"**
  (medido de verdade via Web Audio API sobre o volume do áudio, não é
  decoração aleatória). Dark mode, responsivo (a sidebar vira menu
  gaveta em telas estreitas).

### O que é só estrutura visual por enquanto (sem funcionalidade real ainda)

Pra ser transparente sobre o que é real e o que é preparação para o
futuro, seguindo o princípio do projeto de nunca fingir funcionalidade:

- **Barra de servidores/comunidades**: existe visualmente (ícone do seu
  espaço atual), mas múltiplos servidores/comunidades ainda não existem
  no backend — o botão "+" está desabilitado de propósito.
- **"Mensagens" na sidebar**: desabilitado — chat de texto ainda não foi
  implementado.
- **Botão de câmera**: não existe ainda, porque o WebRTC do projeto só
  transmite áudio + tela, não webcam. Prefiro não colocar um botão que
  pareça funcionar e não funcione.
- **Convidar para chamada / Escolher atividade**: como as chamadas hoje
  são sempre 1:1 (você liga diretamente para um amigo específico), não
  existe o cenário "sozinho numa sala de voz esperando alguém entrar" —
  então esses botões da referência não fazem sentido ainda no fluxo atual.
- Não sei se o outro participante mutou o microfone dele (isso exigiria
  um evento de sinalização novo) — por enquanto o card dele nunca mostra
  o ícone de mutado, mesmo que ele esteja mutado de verdade do lado dele.

## O que ainda falta (próximos passos, se você quiser continuar)

- Chat de texto persistido
- Comunidades/canais
- Reconexão automática em caso de queda de rede
- TURN (pra funcionar em redes com NAT mais restritivo, tipo redes
  corporativas)
- Histórico de chamadas

## Pré-requisitos

- Node.js **22.5 ou mais recente** (`node --version` pra conferir) — o
  projeto usa o SQLite embutido do Node, que só existe a partir dessa
  versão
- Nenhum banco de dados externo pra instalar — é só um arquivo

## 1. Configurar e rodar o servidor

No CMD, dentro da pasta `server`:

```
cd server
npm install
copy .env.example .env
```

Abra o `.env` e troque o valor de `JWT_SECRET` por algo aleatório. Pode
gerar um com:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Depois, suba o servidor:

```
npm run dev
```

Deve aparecer `Servidor rodando em http://localhost:3000`. Deixe essa
janela do CMD aberta.

## 2. Configurar e rodar o frontend

Abra **outra janela do CMD** (o servidor precisa continuar rodando na
primeira), e dentro da pasta `client`:

```
cd client
npm install
copy .env.example .env
npm run dev
```

Deve aparecer algo como `Local: http://localhost:5173/`. Abra esse
endereço no navegador.

## 3. Testando sozinho (duas abas)

Antes de testar em dois computadores, dá pra confirmar que tudo funciona
com duas abas do navegador na mesma máquina:

1. Abra `http://localhost:5173` em duas abas (ou uma normal e uma
   anônima, pra não conflitar o token salvo).
2. Cadastre um usuário diferente em cada aba (ex: `maria` e `joao`).
3. Em uma aba, adicione o outro por username. Na outra aba, aceite a
   solicitação.
4. Clique em "Ligar" — a outra aba deve mostrar o modal de chamada
   recebida.
5. Aceite. O áudio deve conectar (seu microfone real é usado — o
   navegador vai pedir permissão).
6. Clique em "Transmitir tela" — a outra aba deve passar a exibir sua
   tela.

## 4. Testando entre dois computadores de verdade

Isso exige duas mudanças, porque `localhost` só funciona na própria
máquina:

1. Descubra o IP local do computador que está rodando o servidor (no
   CMD): `ipconfig` — procure o "Endereço IPv4" (algo como
   `192.168.0.x`).
2. No `client/.env`, troque:
   ```
   VITE_SERVER_URL=http://192.168.0.x:3000
   ```
   (usando o IP real que você encontrou)
3. No `server/.env`, troque:
   ```
   CLIENT_ORIGIN=http://192.168.0.x:5173
   ```
4. Reinicie os dois (`Ctrl+C` e `npm run dev` de novo nos dois).
5. No segundo computador (mesma rede Wi-Fi/LAN), abra
   `http://192.168.0.x:5173` no navegador.

Como estamos usando só STUN (sem TURN), isso funciona bem em rede
local/doméstica. Se um dia vocês estiverem em redes diferentes (cada um
na sua casa, por exemplo), pode ser necessário TURN — mas isso é uma
melhoria pra depois, não um bloqueio para testar agora.

## Estrutura do projeto

```
discord-clone/
├── server/
│   ├── src/
│   │   ├── db.js              # SQLite: schema e conexão
│   │   ├── auth.js            # hash de senha e JWT
│   │   ├── authRoutes.js      # /auth/register, /auth/login, /users/me
│   │   ├── friendsRoutes.js   # busca, solicitação, aceite, lista de amigos
│   │   ├── presence.js        # mapa em memória de quem está online
│   │   ├── socket.js          # Socket.IO: presença + sinalização de chamada
│   │   └── server.js          # ponto de entrada
│   ├── package.json
│   └── .env.example
│
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── Login.jsx
    │   │   ├── FriendsList.jsx
    │   │   ├── IncomingCallModal.jsx
    │   │   └── CallScreen.jsx
    │   ├── api.js              # chamadas REST
    │   ├── socket.js           # cliente Socket.IO
    │   ├── useCall.js          # toda a lógica de WebRTC (o coração do app)
    │   ├── App.jsx
    │   └── styles.css
    ├── package.json
    └── .env.example
```

## Segurança (o que já está aqui)

- Senhas com hash `bcryptjs` (nunca em texto puro)
- Login com mensagem genérica ("credenciais inválidas") — não revela se o
  usuário existe
- Rotas de amigos e perfil exigem token JWT válido
- Socket.IO também exige o mesmo JWT na conexão (sem token = sem conectar)
- `.env` fora do controle de versão (nunca comite o `.env` de verdade,
  só o `.env.example`)

## Se algo der errado

- **Erro de compilação nativa (`node-gyp`, `Visual Studio`, `better-sqlite3`)**:
  isso não deveria mais acontecer nesta versão do projeto (trocamos pelo
  SQLite embutido do Node), mas se você rodou `npm install` **antes**
  dessa correção, sobrou uma instalação quebrada no `node_modules`. Limpe
  assim antes de instalar de novo:
  ```
  rmdir /s /q node_modules
  del package-lock.json
  npm install
  ```
  Se o Windows reclamar de "EPERM"/"operation not permitted" ao apagar
  `node_modules`, feche qualquer editor de código ou terminal que possa
  estar com arquivos daquela pasta abertos, e tente de novo.
- **"Cannot find module"**: rodou `npm install` dentro da pasta certa
  (`server` ou `client`)? Cada uma tem seu próprio `node_modules`.
- **Frontend não conecta no backend**: confira se `VITE_SERVER_URL` (no
  `client/.env`) aponta pro endereço certo onde o servidor está rodando.
- **Chamada não conecta entre dois computadores**: confira se os dois
  estão na mesma rede Wi-Fi/LAN, e se o `CLIENT_ORIGIN`/`VITE_SERVER_URL`
  foram trocados pro IP local (não `localhost`) nos dois `.env`.
- **Microfone/tela não pedem permissão**: alguns navegadores só permitem
  `getUserMedia`/`getDisplayMedia` em `localhost` ou HTTPS — acessar via
  IP puro (`http://192.168.x.x`) pode ser bloqueado pelo Chrome/Edge por
  segurança. Se isso acontecer, me avise que ajustamos (geralmente dá pra
  contornar liberando o IP como "seguro" nas flags do navegador, ou
  configurando HTTPS local).
# Discord_nosso
