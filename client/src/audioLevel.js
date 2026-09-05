// Monitora o volume de um MediaStream de áudio em tempo real, usando a
// Web Audio API (AnalyserNode). Isso é usado pelo indicador visual de
// "quem está falando" — não é decoração aleatória, é o volume real do
// microfone/áudio remoto sendo medido a cada quadro.
export function createSpeakingMonitor(stream, onSpeakingChange, threshold = 12) {
  if (!stream || stream.getAudioTracks().length === 0) {
    return { stop: () => {} };
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let rafId = null;
  let currentlySpeaking = false;

  function tick() {
    analyser.getByteFrequencyData(data);
    const average = data.reduce((sum, v) => sum + v, 0) / data.length;
    const isSpeaking = average > threshold;

    if (isSpeaking !== currentlySpeaking) {
      currentlySpeaking = isSpeaking;
      onSpeakingChange(isSpeaking);
    }
    rafId = requestAnimationFrame(tick);
  }
  tick();

  return {
    stop: () => {
      if (rafId) cancelAnimationFrame(rafId);
      source.disconnect();
      analyser.disconnect();
      audioContext.close().catch(() => {});
    },
  };
}
