import { useEffect, useState } from 'react';
import { api } from '../api.js';

const TABS = [
  { key: 'online', label: 'Online' },
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
];

export default function FriendsPage({ socket, onCall }) {
  const [activeTab, setActiveTab] = useState('online');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  async function refreshFriends() {
    setFriends(await api.listFriends());
  }
  async function refreshRequests() {
    setPendingRequests(await api.pendingRequests());
  }

  useEffect(() => {
    refreshFriends();
    refreshRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onPresenceUpdate = ({ userId, online }) =>
      setFriends((prev) => prev.map((f) => (f.id === userId ? { ...f, online } : f)));
    const onRequestReceived = () => refreshRequests();
    const onRequestAccepted = () => refreshFriends();

    socket.on('presence:update', onPresenceUpdate);
    socket.on('friend:request-received', onRequestReceived);
    socket.on('friend:request-accepted', onRequestAccepted);
    return () => {
      socket.off('presence:update', onPresenceUpdate);
      socket.off('friend:request-received', onRequestReceived);
      socket.off('friend:request-accepted', onRequestAccepted);
    };
  }, [socket]);

  async function handleAccept(requestId) {
    await api.acceptRequest(requestId);
    setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    refreshFriends();
  }
  async function handleReject(requestId) {
    await api.rejectRequest(requestId);
    setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
  }

  const online = friends.filter((f) => f.online);
  const visibleList = activeTab === 'online' ? online : activeTab === 'all' ? friends : [];

  return (
    <div className="friends-page">
      <header className="friends-page__header">
        <h1>Amigos</h1>
        <div className="friends-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`friends-tab ${activeTab === tab.key ? 'friends-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
              {tab.key === 'pending' && pendingRequests.length > 0 && (
                <span className="badge">{pendingRequests.length}</span>
              )}
            </button>
          ))}
        </div>
        <button className="button-accent" onClick={() => setShowAddModal(true)} type="button">
          Adicionar amigo
        </button>
      </header>

      <div className="friends-page__body">
        {activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <EmptyState message="Nenhuma solicitação pendente." />
          ) : (
            <ul className="friend-card-list">
              {pendingRequests.map((req) => (
                <li className="friend-card" key={req.requestId}>
                  <div className="avatar avatar--medium">
                    {req.from.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-card__info">
                    <span className="friend-card__name">{req.from.displayName}</span>
                    <span className="friend-card__meta">quer ser seu amigo</span>
                  </div>
                  <div className="friend-card__actions">
                    <button className="button-accent" onClick={() => handleAccept(req.requestId)} type="button">
                      Aceitar
                    </button>
                    <button className="button-ghost" onClick={() => handleReject(req.requestId)} type="button">
                      Recusar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : visibleList.length === 0 ? (
          <EmptyState
            message={
              activeTab === 'online'
                ? 'Nenhum amigo online agora. Volte mais tarde!'
                : 'Você ainda não tem amigos adicionados.'
            }
          />
        ) : (
          <ul className="friend-card-list">
            {visibleList.map((f) => (
              <li className="friend-card" key={f.id}>
                <div className="avatar avatar--medium">
                  {f.displayName.charAt(0).toUpperCase()}
                  <span className={`status-dot ${f.online ? 'status-dot--online' : 'status-dot--offline'}`} />
                </div>
                <div className="friend-card__info">
                  <span className="friend-card__name">{f.displayName}</span>
                  <span className="friend-card__meta">{f.online ? 'Disponível' : 'Offline'}</span>
                </div>
                <div className="friend-card__actions">
                  <button
                    className="icon-button"
                    title="Ligar"
                    disabled={!f.online}
                    onClick={() => onCall(f.id, f.username)}
                    type="button"
                  >
                    📞
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAddModal && <AddFriendModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">Por enquanto, está quieto...</p>
      <p className="empty-state__message">{message}</p>
    </div>
  );
}

function AddFriendModal({ onClose }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      await api.sendFriendRequest(username.trim());
      setStatus({ type: 'success', message: 'Solicitação enviada!' });
      setUsername('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <p className="modal-title">Adicionar amigo</p>
        <p className="modal-subtitle">Digite o nome de usuário exato da pessoa.</p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="nome de usuário"
          autoFocus
        />
        {status && (
          <p className={status.type === 'error' ? 'error-text' : 'success-text'}>{status.message}</p>
        )}
        <div className="row-actions">
          <button className="button-accent" type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar solicitação'}
          </button>
          <button className="button-ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </form>
    </div>
  );
}
