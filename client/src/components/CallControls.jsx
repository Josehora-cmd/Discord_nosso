export default function CallControls({ micOn, sharingScreen, onToggleMic, onToggleScreenShare, onEndCall }) {
  return (
    <div className="call-controls-bar">
      <button
        className={`call-control-btn ${!micOn ? 'call-control-btn--off' : ''}`}
        onClick={onToggleMic}
        title={micOn ? 'Silenciar microfone' : 'Ativar microfone'}
        type="button"
      >
        {micOn ? '🎙️' : '🔇'}
      </button>

      <button
        className={`call-control-btn ${sharingScreen ? 'call-control-btn--active' : ''}`}
        onClick={onToggleScreenShare}
        title={sharingScreen ? 'Parar de compartilhar tela' : 'Compartilhar tela'}
        type="button"
      >
        🖥️
      </button>

      <button className="call-control-btn" title="Mais opções — em breve" disabled type="button">
        ⋯
      </button>

      <button
        className="call-control-btn call-control-btn--danger"
        onClick={onEndCall}
        title="Sair da chamada"
        type="button"
      >
        📞
      </button>
    </div>
  );
}
