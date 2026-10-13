// Client for a locally installed Voicebox (https://github.com/jamiepine/voicebox).
// Voicebox runs its own server on 127.0.0.1 and does voice cloning + synthesis
// on this machine (Qwen TTS via MLX on Apple Silicon) — nothing leaves the box.
// Shared by the Next server and bin/tts.mjs, hence plain ESM (.mjs).
//
// Targets the Voicebox v0.5 API: async POST /generate → poll /history/{id}
// → GET /audio/{id}. Cloned voices are Voicebox "profiles"; we address them in
// the app as `vb:<profileId>`.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const VOICEBOX_URL = (process.env.VOICEBOX_URL || 'http://127.0.0.1:17493').replace(/\/$/, '');
const APP_PATH = process.env.VOICEBOX_APP || '/Applications/Voicebox.app';

export const VB_PREFIX = 'vb:';
export const isVoiceboxId = (id) => typeof id === 'string' && id.startsWith(VB_PREFIX);
export const profileIdOf = (id) => id.slice(VB_PREFIX.length);

// Voicebox reference clips must be 2–30s (backend validation).
export const SAMPLE_MIN_SECONDS = 2;
export const SAMPLE_MAX_SECONDS = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function vb(pathname, { method = 'GET', json, body, timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(VOICEBOX_URL + pathname, {
      method,
      signal: ctrl.signal,
      // Next.js caches server-side fetch() by default; Voicebox state (profiles,
      // generation status) is live, so every call must hit the server.
      cache: 'no-store',
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(json) : body,
    });
    if (!res.ok) {
      let detail = '';
      try {
        const j = await res.json();
        detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail ?? j);
      } catch {
        /* non-JSON error body */
      }
      throw new Error(`Voicebox ${method} ${pathname} → ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export function voiceboxInstalled() {
  return fs.existsSync(APP_PATH);
}

export async function voiceboxHealth() {
  try {
    const res = await vb('/health', { timeout: 2500 });
    return { running: true, installed: true, ...(await res.json()) };
  } catch {
    return { running: false, installed: voiceboxInstalled() };
  }
}

// Make sure the local Voicebox server is up, launching the app in the
// background (macOS) if needed. Throws an actionable message otherwise.
export async function ensureVoicebox({ waitMs = 90000 } = {}) {
  let health = await voiceboxHealth();
  if (health.running) return health;
  if (!voiceboxInstalled()) {
    throw new Error(
      `Voicebox isn't installed (expected ${APP_PATH}). Install it from https://github.com/jamiepine/voicebox/releases to use cloned voices.`,
    );
  }
  if (os.platform() === 'darwin') {
    spawn('open', ['-g', '-a', APP_PATH], { detached: true, stdio: 'ignore' }).unref();
  }
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    await sleep(1500);
    health = await voiceboxHealth();
    if (health.running) return health;
  }
  throw new Error('Voicebox did not start in time. Open the Voicebox app and try again.');
}

export async function listProfiles() {
  return (await vb('/profiles')).json();
}

export async function getProfile(profileId) {
  try {
    return await (await vb(`/profiles/${encodeURIComponent(profileId)}`)).json();
  } catch {
    return null;
  }
}

export async function deleteProfile(profileId) {
  await vb(`/profiles/${encodeURIComponent(profileId)}`, { method: 'DELETE' });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${cmd} failed: ${out.trim().slice(-300)}`)),
    );
  });
}

// Normalize any browser recording / upload (webm, m4a, mp3, …) to mono 24 kHz WAV.
export async function toWav(inputPath, outputPath) {
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', inputPath, '-ac', '1', '-ar', '24000', outputPath]);
}

export async function audioSeconds(file) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(out.trim());
}

// Create a cloned voice from one reference clip + its exact transcript.
// Rolls back the profile if the sample is rejected.
export async function createClonedVoice({ name, language = 'en', wavPath, referenceText }) {
  const profile = await (
    await vb('/profiles', { method: 'POST', json: { name, language, voice_type: 'cloned' } })
  ).json();
  try {
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync(wavPath)], { type: 'audio/wav' }), 'sample.wav');
    fd.append('reference_text', referenceText);
    await vb(`/profiles/${profile.id}/samples`, { method: 'POST', body: fd, timeout: 120000 });
  } catch (err) {
    await deleteProfile(profile.id).catch(() => {});
    throw err;
  }
  return profile;
}

// Speak `text` in a Voicebox voice and write a WAV to `output`.
// v0.5 has no speed control, so speed is applied afterwards with ffmpeg atempo.
export async function synthesize({ profileId, text, output, speed = 1, timeoutMs = 15 * 60 * 1000, onStatus }) {
  const profile = await getProfile(profileId);
  if (!profile) throw new Error(`Voicebox voice ${profileId} no longer exists.`);
  const engine = profile.default_engine || profile.preset_engine || undefined;

  const gen = await (
    await vb('/generate', {
      method: 'POST',
      json: { profile_id: profileId, text, language: profile.language || 'en', ...(engine ? { engine } : {}) },
      timeout: 120000,
    })
  ).json();

  // /history is the source of truth for status; the first load of the model
  // can take a while, later generations are quick.
  const until = Date.now() + timeoutMs;
  for (;;) {
    const h = await (await vb(`/history/${gen.id}`)).json();
    onStatus?.(h.status);
    if (h.status === 'completed') break;
    if (['failed', 'error', 'cancelled'].includes(h.status)) {
      throw new Error(`Voicebox generation ${h.status}${h.error ? `: ${h.error}` : ''}`);
    }
    if (Date.now() > until) {
      throw new Error('Voicebox generation timed out — it may be stuck. Restart the Voicebox app and try again.');
    }
    await sleep(1000);
  }

  const audio = Buffer.from(await (await vb(`/audio/${gen.id}`, { timeout: 120000 })).arrayBuffer());
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  if (!speed || Math.abs(speed - 1) < 0.001) {
    fs.writeFileSync(output, audio);
    return;
  }
  const raw = `${output}.raw.wav`;
  fs.writeFileSync(raw, audio);
  try {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-filter:a', `atempo=${speed}`, output]);
  } finally {
    fs.rmSync(raw, { force: true });
  }
}
