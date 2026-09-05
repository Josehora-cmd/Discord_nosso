import UserPanel from './UserPanel.jsx';

export default function HomeSidebar({ user, pendingCount, call, onLogout }) {
  return (
    <aside className="home-sidebar">
      <div className="home-sidebar__header">
        <span>Comm</span>
      </div>

      <nav className="home-sidebar__nav">
        <button className="nav-item nav-item--active" type="button">
          <span className="nav-item__icon">👥</span>
          Amigos
          {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
        </button>
        <button className="nav-item" type="button" disabled title="Chat direto — em breve">
          <span className="nav-item__icon">💬</span>
          Mensagens
        </button>
      </nav>

      <div className="home-sidebar__spacer" />

      <UserPanel
        user={user}
        inCall={call.callState !== 'idle'}
        micOn={call.micOn}
        onToggleMic={call.toggleMic}
        onLogout={onLogout}
      />
    </aside>
  );
}
