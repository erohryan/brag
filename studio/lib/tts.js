import { spawn } from 'node:child_process';

// Synthesize speech with Kokoro via the Hyperframes CLI. Local model — the
// first run downloads it, later runs are fast. Returns a promise.
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
      reject(err);
      return;
    }
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`hyperframes tts exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}
