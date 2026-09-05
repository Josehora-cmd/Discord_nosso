const STATUS_LABEL = {
  outgoing: 'Chamando...',
  connecting: 'Conectando...',
  connected: 'Conectado',
};

export default function CallHeader({ remoteUsername, callState }) {
  return (
    <header className="call-header">
      <span className="call-header__icon">🔊</span>
      <span className="call-header__name">{remoteUsername}</span>
      <span className={`call-header__status call-header__status--${callState}`}>
        {STATUS_LABEL[callState]}
      </span>
    </header>
  );
}
