import { useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import ServerSidebar from './components/ServerSidebar.jsx';
import HomeSidebar from './components/HomeSidebar.jsx';
import FriendsPage from './components/FriendsPage.jsx';
import VoiceCallPage from './components/VoiceCallPage.jsx';
import IncomingCallModal from './components/IncomingCallModal.jsx';
import { api, getToken } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';
import { useCall } from './useCall.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      if (getToken()) {
        try {
          const me = await api.me();
          setUser({ id: me.id, username: me.username, displayName: me.display_name });
        } catch {
          localStorage.removeItem('token');
        }
      }
      setCheckingSession(false);
    }
    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    const s = connectSocket();
    setSocket(s);
    return () => disconnectSocket();
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    async function refreshPendingCount() {
      const requests = await api.pendingRequests();
      setPendingCount(requests.length);
    }
    refreshPendingCount();
    socket.on('friend:request-received', refreshPendingCount);
    return () => socket.off('friend:request-received', refreshPendingCount);
  }, [socket]);

  const call = useCall(socket, user?.id);

  function handleLogout() {
    call.endCall(false);
    disconnectSocket();
    localStorage.removeItem('token');
    setUser(null);
    setSocket(null);
  }

  if (checkingSession) return null;
  if (!user) return <Login onAuthenticated={setUser} />;
  if (!socket) return null;

  const inCall = call.callState !== 'idle';

  return (
    <div className="app-shell">
      <ServerSidebar displayName={user.displayName} />
      <div className={`home-sidebar-wrapper ${mobileNavOpen ? 'home-sidebar-wrapper--open' : ''}`}>
        <HomeSidebar user={user} pendingCount={pendingCount} call={call} onLogout={handleLogout} />
      </div>
      {mobileNavOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} />
      )}

      <main className="main-content">
        <button
          className="mobile-menu-button"
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Abrir menu"
          type="button"
        >
          ☰
        </button>

        {inCall ? (
          <VoiceCallPage call={call} myDisplayName={user.displayName} />
        ) : (
          <FriendsPage socket={socket} onCall={(id, username) => call.call(id, username)} />
        )}
      </main>

      <IncomingCallModal
        incomingCall={call.incomingCall}
        onAccept={call.acceptCall}
        onReject={call.rejectCall}
      />
    </div>
  );
}
