/* eslint-disable no-restricted-globals */
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

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
      const result = await transcriber(e.data.audio, { sampling_rate: 16000 });
      if (process.env.NODE_ENV === 'development') console.log('[Whisper worker] raw result:', JSON.stringify(result.text));
      self.postMessage({ type: 'transcript', text: result.text.trim() });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
});
