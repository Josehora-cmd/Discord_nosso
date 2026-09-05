import { useCallback, useEffect, useRef, useState } from 'react';
import { createSpeakingMonitor } from './audioLevel.js';

// STUN público — suficiente para a maioria das redes domésticas/LAN.
// Sem TURN por enquanto: se as duas redes tiverem NAT muito restritivo
// (ex: redes corporativas), a conexão direta pode falhar. Isso é uma
// limitação conhecida e documentada, não um bug.
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Estados possíveis da chamada, seguindo a máquina de estados do projeto:
// idle -> outgoing/ringing -> connecting -> connected -> ended -> idle
export function useCall(socket, myUserId) {
  const [callState, setCallState] = useState('idle');
  const [incomingCall, setIncomingCall] = useState(null); // { from: {id, username} }
  const [remoteUser, setRemoteUser] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);

  const localMonitorRef = useRef(null);
  const remoteMonitorRef = useRef(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null); // microfone
  const screenStreamRef = useRef(null);
  const targetUserIdRef = useRef(null);
  const remoteAudioElRef = useRef(null); // <audio> setado pela UI via setRemoteAudioEl

  const resetCallInternalState = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localMonitorRef.current) {
      localMonitorRef.current.stop();
      localMonitorRef.current = null;
    }
    if (remoteMonitorRef.current) {
      remoteMonitorRef.current.stop();
      remoteMonitorRef.current = null;
    }
    targetUserIdRef.current = null;
    setRemoteScreenStream(null);
    setSharingScreen(false);
    setMicOn(true);
    setLocalSpeaking(false);
    setRemoteSpeaking(false);
    setRemoteUser(null);
    setIncomingCall(null);
  }, []);

  const endCall = useCallback(
    (notifyRemote = true) => {
      if (notifyRemote && targetUserIdRef.current) {
        socket.emit('call:end', { targetUserId: targetUserIdRef.current });
      }
      resetCallInternalState();
      setCallState('idle');
    },
    [socket, resetCallInternalState],
  );

  // Monta a RTCPeerConnection e liga os handlers (ICE, tracks remotas, estado da conexão).
  const createPeerConnection = useCallback(
    (targetUserId) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call:ice-candidate', { targetUserId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (event.track.kind === 'audio') {
          if (remoteAudioElRef.current) {
            remoteAudioElRef.current.srcObject = stream;
          }
          if (remoteMonitorRef.current) remoteMonitorRef.current.stop();
          remoteMonitorRef.current = createSpeakingMonitor(stream, setRemoteSpeaking);
        } else if (event.track.kind === 'video') {
          setRemoteScreenStream(stream);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallState('connected');
        } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          if (callState !== 'idle') {
            setErrorMessage('Conexão perdida.');
            endCall(false);
          }
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [socket, callState, endCall],
  );

  const getMicStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    localMonitorRef.current = createSpeakingMonitor(stream, setLocalSpeaking);
    return stream;
  }, []);

  // -------------------- Ações disparadas pela UI --------------------

  const call = useCallback(
    async (targetUserId, targetUsername) => {
      try {
        setErrorMessage(null);
        await getMicStream();
        targetUserIdRef.current = targetUserId;
        setRemoteUser({ id: targetUserId, username: targetUsername });
        setCallState('outgoing');
        socket.emit('call:invite', { targetUserId });
      } catch {
        setErrorMessage('Não foi possível acessar o microfone.');
      }
    },
    [socket, getMicStream],
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      await getMicStream();
      targetUserIdRef.current = incomingCall.from.id;
      setRemoteUser(incomingCall.from);
      setCallState('connecting');
      socket.emit('call:accept', { targetUserId: incomingCall.from.id });
      setIncomingCall(null);
    } catch {
      setErrorMessage('Não foi possível acessar o microfone.');
    }
  }, [incomingCall, socket, getMicStream]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    socket.emit('call:reject', { targetUserId: incomingCall.from.id });
    setIncomingCall(null);
  }, [incomingCall, socket]);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
    if (!audioTrack.enabled) setLocalSpeaking(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!pcRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      const [videoTrack] = stream.getVideoTracks();

      pcRef.current.addTrack(videoTrack, stream);
      setSharingScreen(true);

      // Se o usuário parar a transmissão pelo controle nativo do navegador
      // (botão "Parar de compartilhar" da barra do Chrome/Edge), detectamos
      // aqui e limpamos o estado do mesmo jeito que o botão da nossa UI faria.
      videoTrack.onended = () => stopScreenShare();
    } catch {
      setErrorMessage('Não foi possível iniciar o compartilhamento de tela.');
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (!pcRef.current || !screenStreamRef.current) return;
    const videoTrack = screenStreamRef.current.getVideoTracks()[0];
    const sender = pcRef.current.getSenders().find((s) => s.track === videoTrack);
    if (sender) pcRef.current.removeTrack(sender);
    screenStreamRef.current.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setSharingScreen(false);
  }, []);

  const setRemoteAudioEl = useCallback((el) => {
    remoteAudioElRef.current = el;
  }, []);

  // -------------------- Handlers dos eventos de sinalização --------------------

  useEffect(() => {
    if (!socket) return;

    const onIncoming = ({ from }) => {
      setIncomingCall({ from });
      setCallState('ringing');
    };

    const onUnavailable = () => {
      setErrorMessage('Usuário está offline.');
      resetCallInternalState();
      setCallState('idle');
    };

    // O CALLER cria a oferta assim que o destinatário aceita.
    const onAccepted = async ({ by }) => {
      setCallState('connecting');
      const pc = createPeerConnection(by);
      const micStream = await getMicStream();
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', { targetUserId: by, sdp: pc.localDescription });
      };
    };

    const onRejected = () => {
      setErrorMessage('Chamada recusada.');
      resetCallInternalState();
      setCallState('idle');
    };

    // O CALLEE recebe a oferta (primeira negociação, ou renegociações
    // futuras — ex: quando o compartilhamento de tela é ligado/desligado).
    const onOffer = async ({ from, sdp }) => {
      let pc = pcRef.current;
      if (!pc) {
        pc = createPeerConnection(from);
        const micStream = await getMicStream();
        micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

        // Permite que este lado também inicie renegociações no futuro
        // (ex: se for ele quem ligar o compartilhamento de tela depois).
        pc.onnegotiationneeded = async () => {
          // Ignora a primeira negociação (ela já está em andamento via esta
          // própria oferta recebida) — só reage a negociações futuras.
          if (pc.signalingState !== 'stable') return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:offer', { targetUserId: from, sdp: pc.localDescription });
        };
      }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { targetUserId: from, sdp: pc.localDescription });
    };

    const onAnswer = async ({ sdp }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Candidatos que chegam fora de ordem podem falhar silenciosamente sem
          // prejudicar a conexão final — não é um erro fatal.
        }
      }
    };

    const onEnded = () => {
      resetCallInternalState();
      setCallState('idle');
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:unavailable', onUnavailable);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:unavailable', onUnavailable);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:ended', onEnded);
    };
  }, [socket, createPeerConnection, getMicStream, resetCallInternalState]);

  return {
    callState,
    incomingCall,
    remoteUser,
    micOn,
    sharingScreen,
    remoteScreenStream,
    errorMessage,
    localSpeaking,
    remoteSpeaking,
    call,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    startScreenShare,
    stopScreenShare,
    setRemoteAudioEl,
  };
}
