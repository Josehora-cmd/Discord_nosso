import ParticipantGrid from './ParticipantGrid.jsx';
import CallControls from './CallControls.jsx';
import CallHeader from './CallHeader.jsx';

export default function VoiceCallPage({ call, myDisplayName }) {
  const {
    callState,
    remoteUser,
    micOn,
    sharingScreen,
    remoteScreenStream,
    localSpeaking,
    remoteSpeaking,
    errorMessage,
    endCall,
    toggleMic,
    startScreenShare,
    stopScreenShare,
    setRemoteAudioEl,
  } = call;

  const participants = [
    { id: 'me', displayName: myDisplayName, speaking: localSpeaking, micOn, isLocal: true },
    {
      id: remoteUser?.id || 'peer',
      displayName: remoteUser?.username || '...',
      speaking: remoteSpeaking,
      micOn: true, // não temos como saber se o OUTRO mutou o mic dele; assumimos ligado até termos esse evento de sinalização
      isLocal: false,
    },
  ];

  return (
    <div className="voice-call-page">
      <CallHeader remoteUsername={remoteUser?.username || '...'} callState={callState} />

      {errorMessage && <p className="error-text call-error">{errorMessage}</p>}

      {/* Áudio remoto tocado aqui, sem elemento visível próprio */}
      <audio ref={setRemoteAudioEl} autoPlay />

      <div className="voice-call-page__content">
        <ParticipantGrid participants={participants} />

        {remoteScreenStream && (
          <div className="screen-share-tile">
            <video
              autoPlay
              playsInline
              ref={(el) => {
                if (el) el.srcObject = remoteScreenStream;
              }}
            />
          </div>
        )}
      </div>

      <CallControls
        micOn={micOn}
        sharingScreen={sharingScreen}
        onToggleMic={toggleMic}
        onToggleScreenShare={() => (sharingScreen ? stopScreenShare() : startScreenShare())}
        onEndCall={() => endCall()}
      />
    </div>
  );
}
