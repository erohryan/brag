#!/usr/bin/env node
// brag studio TTS — same interface as `hyperframes tts`, but also speaks in
// cloned Voicebox voices (`--voice vb:<profileId>`), fully on this machine.
//
//   node bin/tts.mjs "Text to speak" --voice vb:<id> --speed 1.1 --output voiceover.wav
//   node bin/tts.mjs script.txt      --voice af_heart --output voiceover.wav
//
// Kokoro voice ids are passed straight through to `hyperframes tts`.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { ensureVoicebox, isVoiceboxId, profileIdOf, synthesize } from '../lib/voicebox.mjs';

function parse(argv) {
  const opts = { voice: 'af_heart', speed: 1, output: 'speech.wav', input: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const take = () => argv[++i];
    if (a === '--voice' || a === '-v') opts.voice = take();
    else if (a.startsWith('--voice=')) opts.voice = a.slice(8);
    else if (a === '--speed' || a === '-s') opts.speed = Number(take());
    else if (a.startsWith('--speed=')) opts.speed = Number(a.slice(8));
    else if (a === '--output' || a === '-o') opts.output = take();
    else if (a.startsWith('--output=')) opts.output = a.slice(9);
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (opts.input === null) opts.input = a;
  }
  return opts;
}

const opts = parse(process.argv.slice(2));
if (opts.help || !opts.input) {
  console.log('usage: node bin/tts.mjs "<text>|<file.txt>" --voice <kokoro-id|vb:profileId> [--speed n] --output out.wav');
  process.exit(opts.help ? 0 : 1);
}

if (isVoiceboxId(opts.voice)) {
  const text =
    fs.existsSync(opts.input) && fs.statSync(opts.input).isFile() ? fs.readFileSync(opts.input, 'utf8') : opts.input;
  try {
    await ensureVoicebox();
    let last = '';
    await synthesize({
      profileId: profileIdOf(opts.voice),
      text: text.trim(),
      output: opts.output,
      speed: Number.isFinite(opts.speed) && opts.speed > 0 ? opts.speed : 1,
      onStatus: (s) => {
        if (s !== last) console.error(`voicebox: ${(last = s)}`);
      },
    });
    console.log(`Generated speech (Voicebox ${opts.voice}) → ${opts.output}`);
  } catch (err) {
    console.error(`tts failed: ${err.message}`);
    process.exit(1);
  }
} else {
  const args = ['--yes', 'hyperframes', 'tts', opts.input, '--voice', opts.voice, '--output', opts.output];
  if (opts.speed && opts.speed !== 1) args.push('--speed', String(opts.speed));
  const child = spawn('npx', args, { stdio: 'inherit', env: process.env });
  child.on('close', (code) => process.exit(code ?? 1));
}
