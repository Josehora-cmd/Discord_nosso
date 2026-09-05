import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function FriendsList({ socket, onCall }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addStatus, setAddStatus] = useState(null);

  async function refreshFriends() {
    const data = await api.listFriends();
    setFriends(data);
  }

  async function refreshRequests() {
    const data = await api.pendingRequests();
    setPendingRequests(data);
  }

  useEffect(() => {
    refreshFriends();
    refreshRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onPresenceUpdate = ({ userId, online }) => {
      setFriends((prev) => prev.map((f) => (f.id === userId ? { ...f, online } : f)));
    };
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

  async function handleAddFriend(e) {
    e.preventDefault();
    setAddStatus(null);
    try {
      await api.sendFriendRequest(searchQuery.trim());
      setAddStatus({ type: 'success', message: 'Solicitação enviada!' });
      setSearchQuery('');
    } catch (err) {
      setAddStatus({ type: 'error', message: err.message });
    }
  }

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
  const offline = friends.filter((f) => !f.online);

  return (
    <div className="friends-panel">
      <form className="add-friend-form" onSubmit={handleAddFriend}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Adicionar por nome de usuário"
        />
        <button type="submit">Adicionar</button>
      </form>
      {addStatus && (
        <p className={addStatus.type === 'error' ? 'error-text' : 'success-text'}>
          {addStatus.message}
        </p>
      )}

      {pendingRequests.length > 0 && (
        <div className="section">
          <h3>Solicitações pendentes</h3>
          {pendingRequests.map((req) => (
            <div className="friend-row" key={req.requestId}>
              <span>{req.from.displayName}</span>
              <div className="row-actions">
                <button onClick={() => handleAccept(req.requestId)}>Aceitar</button>
                <button className="secondary" onClick={() => handleReject(req.requestId)}>
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section">
        <h3>Online — {online.length}</h3>
        {online.map((f) => (
          <div className="friend-row" key={f.id}>
            <span>🟢 {f.displayName}</span>
            <button onClick={() => onCall(f.id, f.username)}>📞 Ligar</button>
          </div>
        ))}
      </div>

      <div className="section">
        <h3>Offline — {offline.length}</h3>
        {offline.map((f) => (
          <div className="friend-row" key={f.id}>
            <span>⚫ {f.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
