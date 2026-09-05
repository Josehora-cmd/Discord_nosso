export default function IncomingCallModal({ incomingCall, onAccept, onReject }) {
  if (!incomingCall) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <p className="modal-title">📞 Chamada recebida</p>
        <p>{incomingCall.from.username} está ligando para você.</p>
        <div className="row-actions">
          <button className="button-accent" onClick={onAccept} type="button">
            Atender
          </button>
          <button className="button-ghost" onClick={onReject} type="button">
            Recusar
          </button>
        </div>
      </div>
    </div>
  );
}
