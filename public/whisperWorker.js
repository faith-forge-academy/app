import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;

// iOS 16.4–16.6 has a WebKit bug where WASM SIMD produces incorrect float values,
// causing Whisper to return garbage without crashing. Disable SIMD on those versions.
const iosMatch = (self.navigator?.userAgent || '').match(/CPU (?:iPhone )?OS (\d+)_(\d+)/);
if (iosMatch) {
  const major = parseInt(iosMatch[1], 10);
  const minor = parseInt(iosMatch[2], 10);
  if (major === 16 && minor >= 4 && minor <= 6) {
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.simd = false;
    }
  }
}

let transcriber = null;

self.addEventListener('message', async (e) => {
  if (e.data.type === 'load') {
    try {
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        progress_callback: (p) => self.postMessage({ type: 'loading', progress: p }),
      });
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  } else if (e.data.type === 'transcribe') {
    try {
      const result = await transcriber(e.data.audio, { sampling_rate: e.data.sampling_rate || 16000 });
      self.postMessage({ type: 'transcript', text: result.text.trim() });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
});
