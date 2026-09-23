import { spawn } from 'node:child_process';

const INSTALL_HINT =
  'Voice narration needs Kokoro TTS: Python 3.10+ with `pip install kokoro-onnx soundfile`. ' +
  'If your default python3 is older, install on a newer one and set HYPERFRAMES_PYTHON to it.';

// Synthesize speech with Kokoro via the Hyperframes CLI. Kokoro runs through
// Python (kokoro-onnx); the CLI resolves it via HYPERFRAMES_PYTHON or python3.
// The first run downloads the model; later runs are fast. Returns a promise.
export function runTts({ text, voice, output }) {
  return new Promise((resolve, reject) => {
    const bin = process.env.BRAG_HYPERFRAMES_BIN;
    const cmd = bin || 'npx';
    const args = bin
      ? ['tts', text, '--voice', voice, '--output', output]
      : ['--yes', 'hyperframes', 'tts', text, '--voice', voice, '--output', output];

    let child;
    try {
      child = spawn(cmd, args, { env: process.env });
    } catch (err) {
      reject(new Error(err.message));
      return;
    }
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const lower = out.toLowerCase();
      const msg =
        lower.includes('kokoro') || lower.includes('onnxruntime') || lower.includes('soundfile')
          ? INSTALL_HINT
          : `hyperframes tts failed: ${out.trim().slice(-400) || 'exit ' + code}`;
      reject(new Error(msg));
    });
  });
}

// Fast preflight: can we actually synthesize speech on this machine?
// Checks that the Python interpreter Hyperframes will use can import kokoro-onnx.
export function checkTts() {
  return new Promise((resolve) => {
    const python = process.env.HYPERFRAMES_PYTHON || 'python3';
    let child;
    try {
      child = spawn(python, ['-c', 'import kokoro_onnx, soundfile']);
    } catch (err) {
      resolve({ ok: false, python, reason: `Python not runnable (${err.message}). ${INSTALL_HINT}` });
      return;
    }
    let err = '';
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', (e) =>
      resolve({ ok: false, python, reason: `Python not found (${e.message}). ${INSTALL_HINT}` }),
    );
    child.on('close', (code) =>
      resolve(
        code === 0
          ? { ok: true, python }
          : { ok: false, python, reason: INSTALL_HINT },
      ),
    );
  });
}
