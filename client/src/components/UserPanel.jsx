export default function UserPanel({ user, inCall, micOn, onToggleMic, onLogout }) {
  const initial = user.displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="user-panel">
      <div className="user-panel__identity">
        <div className="avatar avatar--small">
          {initial}
          <span className="status-dot status-dot--online" />
        </div>
        <div className="user-panel__text">
          <span className="user-panel__name">{user.displayName}</span>
          <span className="user-panel__status">Disponível</span>
        </div>
      </div>

      <div className="user-panel__actions">
        <button
          className={`icon-button ${inCall && !micOn ? 'icon-button--muted' : ''}`}
          title={inCall ? (micOn ? 'Silenciar microfone' : 'Ativar microfone') : 'Microfone (fora de chamada)'}
          onClick={onToggleMic}
          disabled={!inCall}
          type="button"
        >
          {inCall && !micOn ? '🔇' : '🎙️'}
        </button>
        <button className="icon-button" title="Configurações — em breve" disabled type="button">
          ⚙️
        </button>
        <button className="icon-button" title="Sair da conta" onClick={onLogout} type="button">
          ⏻
        </button>
      </div>
    </div>
  );
}
