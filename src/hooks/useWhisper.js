import { useState, useEffect, useRef, useCallback } from 'react';

const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args) => { if (isDev) console.log('[Whisper]', ...args); };

// Practice hears a 3s window (1s overlap + 2s of new audio) so a word that
// crosses a boundary is still whole in one of the windows.
const STEP_MS = 2000;
const OVERLAP_SECONDS = 1;
const SILENCE_RMS = 0.008;

function rms(samples) {
  if (!samples || samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

function concatFloat32(head, tail) {
  if (!head || head.length === 0) return tail;
  const out = new Float32Array(head.length + tail.length);
  out.set(head, 0);
  out.set(tail, head.length);
  return out;
}

function tailOf(samples, sampleRate, seconds) {
  const count = Math.min(samples.length, Math.round(sampleRate * seconds));
  return samples.slice(samples.length - count);
}

function createAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  try {
    return new AC({ sampleRate: 16000 });
  } catch (err) {
    return new AC();
  }
}

export function useWhisper() {
  const [isReady, setIsReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [listening, setListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [transcriptId, setTranscriptId] = useState(0);
  const [error, setError] = useState(null);

  const workerRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const shouldListenRef = useRef(false);
  const continuousRef = useRef(false);
  const internalStartRef = useRef(null);
  const chunkTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const tailRef = useRef(new Float32Array(0));
  const epochRef = useRef(0);
  const pendingRef = useRef(0);
  const transcriptSeqRef = useRef(0);

  const publishTranscript = useCallback((text) => {
    transcriptSeqRef.current += 1;
    setFinalTranscript(text);
    setTranscriptId(transcriptSeqRef.current);
  }, []);

  const finishPending = useCallback((epoch) => {
    if (epoch !== epochRef.current) return;
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    setIsProcessing(pendingRef.current > 0);
  }, []);

  useEffect(() => {
    const worker = new Worker('/whisperWorker.js', { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'loading') {
        setLoadingProgress(e.data.progress);
      } else if (type === 'ready') {
        devLog('model ready');
        setIsReady(true);
        setLoadingProgress(null);
        setError(null);
      } else if (type === 'transcript') {
        devLog('transcript received:', JSON.stringify(e.data.text));
        finishPending(e.data.epoch);
        if (e.data.epoch !== epochRef.current) return;
        setError(null);
        publishTranscript(e.data.text || '');
      } else if (type === 'error') {
        console.error('Whisper worker error:', e.data.message);
        if (e.data.epoch == null || e.data.epoch === epochRef.current) {
          setError(e.data.message || 'Speech recognition failed');
          pendingRef.current = 0;
          setIsProcessing(false);
        } else {
          finishPending(e.data.epoch);
        }
      }
    };

    worker.postMessage({ type: 'load' });

    return () => {
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      worker.terminate();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [finishPending, publishTranscript]);

  const getStream = useCallback(async () => {
    if (
      streamRef.current &&
      streamRef.current.getTracks().every((track) => track.readyState === 'live')
    ) {
      return streamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;
    return stream;
  }, []);

  const transcribeBlob = useCallback(async (blob, { overlap, epoch }) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !workerRef.current) return;
    try {
      const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
      const samples = new Float32Array(decoded.getChannelData(0));
      const sampleRate = decoded.sampleRate || ctx.sampleRate;
      if (epoch !== epochRef.current) return;

      const previousTail = overlap ? tailRef.current : new Float32Array(0);
      tailRef.current = overlap ? tailOf(samples, sampleRate, OVERLAP_SECONDS) : new Float32Array(0);

      if (rms(samples) < SILENCE_RMS) {
        devLog('skipping silent window');
        publishTranscript('');
        return;
      }

      const combined = concatFloat32(previousTail, samples);
      const audio = combined.slice();
      pendingRef.current += 1;
      setIsProcessing(true);
      workerRef.current.postMessage(
        { type: 'transcribe', audio, sampling_rate: sampleRate, epoch },
        [audio.buffer]
      );
    } catch (err) {
      console.error('Audio decode error:', err);
      setError('Could not read the recording');
      if (epoch === epochRef.current) {
        pendingRef.current = 0;
        setIsProcessing(false);
        publishTranscript('');
      }
    }
  }, [publishTranscript]);

  const startRecordingSession = useCallback(async () => {
    if (!shouldListenRef.current) return;

    let stream;
    try {
      stream = await getStream();
    } catch (err) {
      console.error('Mic access error:', err);
      shouldListenRef.current = false;
      setListening(false);
      setError('Microphone access was blocked');
      return;
    }

    if (!shouldListenRef.current) return;

    const epoch = epochRef.current;
    const continuous = continuousRef.current;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const capturedChunks = chunksRef.current.slice();
      if (shouldListenRef.current && continuousRef.current) {
        internalStartRef.current?.();
      } else {
        setListening(false);
      }
      if (capturedChunks.length === 0) {
        if (epoch === epochRef.current) publishTranscript('');
        return;
      }
      const blob = new Blob(capturedChunks, { type: recorder.mimeType });
      transcribeBlob(blob, { overlap: continuous, epoch });
    };

    devLog('recording session started (continuous=%s)', continuous);
    recorder.start();
    setListening(true);

    if (continuous) {
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state === 'recording') {
          recorder.stop();
        }
      }, STEP_MS);
    }
  }, [getStream, publishTranscript, transcribeBlob]);

  useEffect(() => {
    internalStartRef.current = startRecordingSession;
  }, [startRecordingSession]);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = createAudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const startListening = useCallback(({ continuous = false } = {}) => {
    epochRef.current += 1;
    pendingRef.current = 0;
    setIsProcessing(false);
    tailRef.current = new Float32Array(0);
    setFinalTranscript('');
    setError(null);
    shouldListenRef.current = true;
    continuousRef.current = continuous;
    ensureAudioContext();

    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch (err) {
        startRecordingSession();
      }
    } else {
      startRecordingSession();
    }
  }, [ensureAudioContext, startRecordingSession]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    continuousRef.current = false;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch (err) {
        setListening(false);
        publishTranscript('');
      }
    } else {
      setListening(false);
      // Nothing is coming back from the recorder. Wake anyone waiting to grade.
      publishTranscript('');
    }
  }, [publishTranscript]);

  const cancelPending = useCallback(() => {
    epochRef.current += 1;
    pendingRef.current = 0;
    setIsProcessing(false);
    tailRef.current = new Float32Array(0);
    setFinalTranscript('');
    stopListening();
  }, [stopListening]);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
  }, []);

  return {
    isReady,
    loadingProgress,
    listening,
    isProcessing,
    finalTranscript,
    transcriptId,
    error,
    startListening,
    stopListening,
    cancelPending,
    resetTranscript,
  };
}
