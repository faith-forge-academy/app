import { useState, useEffect, useRef, useCallback } from 'react';

const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args) => { if (isDev) console.log('[Whisper]', ...args); };

// Each continuous-mode chunk is this long regardless of ambient noise level.
// Longer = more context for Whisper (better accuracy), more latency before feedback.
const CHUNK_DURATION_MS = 5000;

export function useWhisper() {
  const [isReady, setIsReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [listening, setListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');

  const workerRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const shouldListenRef = useRef(false);
  const continuousRef = useRef(false);
  const internalStartRef = useRef(null);
  const chunkTimerRef = useRef(null);
  // Persistent AudioContext created during the user-gesture (button tap) so iOS
  // Safari doesn't block it when we later use it inside the async onstop callback.
  const audioCtxRef = useRef(null);

  // Spawn worker and load model on mount
  useEffect(() => {
    const worker = new Worker(new URL('../whisperWorker.js', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'loading') {
        setLoadingProgress(e.data.progress);
      } else if (type === 'ready') {
        devLog('model ready');
        setIsReady(true);
        setLoadingProgress(null);
      } else if (type === 'transcript') {
        devLog('transcript received:', JSON.stringify(e.data.text));
        setFinalTranscript(e.data.text);
        setIsProcessing(false);
        // Restart is handled in onstop for continuous mode — nothing to do here.
      } else if (type === 'error') {
        console.error('Whisper worker error:', e.data.message);
        setIsProcessing(false);
      }
    };

    worker.postMessage({ type: 'load' });

    return () => {
      worker.terminate();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const getStream = useCallback(async () => {
    // Re-acquire mic if tracks have ended (e.g. another tab grabbed it)
    if (
      streamRef.current &&
      streamRef.current.getTracks().every((t) => t.readyState === 'live')
    ) {
      return streamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  const startRecordingSession = useCallback(async () => {
    if (!shouldListenRef.current) return;

    let stream;
    try {
      stream = await getStream();
    } catch (err) {
      console.error('Mic access error:', err);
      shouldListenRef.current = false;
      setListening(false);
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // Capture chunks NOW before the restart below resets chunksRef.current.
      const capturedChunks = [...chunksRef.current];

      // In continuous mode, kick off the next recording immediately so there's
      // no gap in audio capture while Whisper processes this chunk.
      if (shouldListenRef.current && continuousRef.current) {
        internalStartRef.current?.();
      } else {
        setListening(false);
      }

      if (capturedChunks.length === 0) return;
      setIsProcessing(true);
      const blob = new Blob(capturedChunks, { type: recorder.mimeType });
      const arrayBuffer = await blob.arrayBuffer();
      try {
        // Reuse the AudioContext that was created during the button-tap gesture.
        // Creating a new one here (async, outside a gesture) is blocked on iOS Safari.
        const ctx = audioCtxRef.current;
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        const float32 = decoded.getChannelData(0);
        const samplingRate = ctx.sampleRate;
        devLog('sending to worker — samples: %d, duration: %ss, sampleRate: %d', float32.length, (float32.length / samplingRate).toFixed(2), samplingRate);
        workerRef.current.postMessage(
          { type: 'transcribe', audio: float32, sampling_rate: samplingRate },
          [float32.buffer]
        );
      } catch (err) {
        console.error('Audio decode error:', err);
        setIsProcessing(false);
      }
    };

    devLog('recording session started (continuous=%s)', continuousRef.current);
    recorder.start(100);
    setListening(true);

    // In continuous mode, stop after CHUNK_DURATION_MS regardless of ambient noise.
    // This replaces the old silence-detection approach which fails in noisy environments.
    if (continuousRef.current) {
      chunkTimerRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, CHUNK_DURATION_MS);
    }
  }, [getStream]);

  // Store the function in a ref so onstop can call it without a stale closure
  useEffect(() => {
    internalStartRef.current = startRecordingSession;
  }, [startRecordingSession]);

  const startListening = useCallback(
    ({ continuous = false } = {}) => {
      shouldListenRef.current = true;
      continuousRef.current = continuous;
      setFinalTranscript('');

      // Create (or reuse) the AudioContext here, synchronously inside the user-gesture
      // call stack. iOS Safari blocks AudioContext creation in async callbacks.
      // webkitAudioContext covers iOS < 12; modern iOS uses AudioContext directly.
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AC({ sampleRate: 16000 });
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      startRecordingSession();
    },
    [startRecordingSession]
  );

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    continuousRef.current = false;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    } else {
      setListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
  }, []);

  return {
    isReady,
    loadingProgress,
    listening,
    isProcessing,
    finalTranscript,
    startListening,
    stopListening,
    resetTranscript,
  };
}
