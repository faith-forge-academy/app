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
let queue = Promise.resolve();

function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.then(() => {}, () => {});
  return run;
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data.type === 'load') {
    enqueue(async () => {
      if (transcriber) {
        self.postMessage({ type: 'ready' });
        return;
      }
      try {
        // English-only checkpoint. Passing language or task throws for this model.
        transcriber = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            progress_callback: (progress) => self.postMessage({ type: 'loading', progress }),
          }
        );
        self.postMessage({ type: 'ready' });
      } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
      }
    });
    return;
  }

  if (data.type === 'transcribe') {
    const { audio, sampling_rate, epoch } = data;
    enqueue(async () => {
      if (!transcriber) {
        self.postMessage({ type: 'error', message: 'Speech model is not loaded', epoch });
        return;
      }
      try {
        const result = await transcriber(audio, {
          sampling_rate: sampling_rate || 16000,
          // Long test recordings are split inside the model. Short practice
          // windows still fit in a single chunk.
          chunk_length_s: 30,
          stride_length_s: 5,
        });
        self.postMessage({
          type: 'transcript',
          text: (result.text || '').trim(),
          epoch,
        });
      } catch (err) {
        self.postMessage({ type: 'error', message: err.message, epoch });
      }
    });
  }
});
