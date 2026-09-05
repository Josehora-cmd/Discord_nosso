export default function ParticipantCard({ displayName, speaking, micOn, isLocal }) {
  const initial = displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={`participant-card ${speaking ? 'participant-card--speaking' : ''}`}>
      <div className="participant-card__avatar">{initial}</div>
      <div className="participant-card__footer">
        <span className="participant-card__name">
          {displayName}
          {isLocal && ' (você)'}
        </span>
        {!micOn && <span className="participant-card__muted-icon" title="Microfone mutado">🔇</span>}
      </div>
    </div>
  );
}
