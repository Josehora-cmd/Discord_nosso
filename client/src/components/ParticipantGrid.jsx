import ParticipantCard from './ParticipantCard.jsx';

export default function ParticipantGrid({ participants }) {
  const gridSizeClass = participants.length <= 1 ? 'participant-grid--single' : 'participant-grid--multi';

  return (
    <div className={`participant-grid ${gridSizeClass}`}>
      {participants.map((p) => (
        <ParticipantCard key={p.id} {...p} />
      ))}
    </div>
  );
}
