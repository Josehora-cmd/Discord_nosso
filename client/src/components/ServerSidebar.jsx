export default function ServerSidebar({ displayName }) {
  const initial = displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <nav className="server-sidebar" aria-label="Servidores">
      <button className="server-icon server-icon--active" title="Seu espaço" type="button">
        {initial}
      </button>
      <div className="server-divider" />
      <button
        className="server-icon server-icon--add"
        title="Comunidades — em breve"
        type="button"
        disabled
      >
        +
      </button>
    </nav>
  );
}
