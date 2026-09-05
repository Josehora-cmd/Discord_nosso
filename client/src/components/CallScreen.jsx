const STATUS_LABEL = {
  outgoing: (name) => `Chamando ${name}...`,
  connecting: () => 'Conectando...',
  connected: () => 'Conectado',
};

export default function CallScreen({ call }) {
  const {
    callState,
    remoteUser,
    micOn,
    sharingScreen,
    remoteScreenStream,
    errorMessage,
    endCall,
    toggleMic,
    startScreenShare,
    stopScreenShare,
    setRemoteAudioEl,
  } = call;

  if (callState === 'idle') return null;

  const statusText = STATUS_LABEL[callState]
    ? STATUS_LABEL[callState](remoteUser?.username || '')
    : '';

  return (
    <div className="call-overlay">
      <div className="call-card">
        <h2>Chamada com {remoteUser?.username}</h2>
        <p className="call-status">{statusText}</p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        {/* O áudio remoto é reproduzido por este elemento, mesmo sem UI visível */}
        <audio ref={setRemoteAudioEl} autoPlay />

        {remoteScreenStream && (
          <video
            className="remote-screen"
            autoPlay
            playsInline
            ref={(el) => {
              if (el) el.srcObject = remoteScreenStream;
            }}
          />
        )}

        {callState === 'connected' && (
          <div className="call-controls">
            <button onClick={toggleMic}>{micOn ? '🎙️ Microfone ligado' : '🔇 Microfone mudo'}</button>
            {sharingScreen ? (
              <button onClick={stopScreenShare}>⏹ Parar transmissão</button>
            ) : (
              <button onClick={startScreenShare}>🖥️ Transmitir tela</button>
            )}
            <button className="danger" onClick={() => endCall()}>
              📞 Encerrar
            </button>
          </div>
        )}

        {callState !== 'connected' && (
          <div className="call-controls">
            <button className="danger" onClick={() => endCall()}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
