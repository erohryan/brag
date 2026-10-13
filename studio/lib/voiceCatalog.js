// The voices the app can use: the bundled Kokoro set plus any cloned voices
// stored in the local Voicebox install (server-only).
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './paths.js';
import { VOICES, voiceById } from './voices.js';
import {
  VB_PREFIX,
  ensureVoicebox,
  getProfile,
  isVoiceboxId,
  listProfiles,
  profileIdOf,
  voiceboxHealth,
} from './voicebox.mjs';

// Voicebox language codes → the preview-text keys used in voices.js.
const LANG_TO_SAMPLE = { en: 'en-us', fr: 'fr-fr', pt: 'pt-br', es: 'es', it: 'it', ja: 'ja', zh: 'zh', hi: 'hi' };

export function profileToVoice(p) {
  return {
    id: VB_PREFIX + p.id,
    name: p.name,
    lang: 'Your voices',
    langCode: LANG_TO_SAMPLE[p.language] || 'en-us',
    language: p.language,
    langOrder: -1,
    gender: p.voice_type === 'cloned' || !p.voice_type ? 'cloned' : p.voice_type,
    provider: 'voicebox',
  };
}

// Last-known cloned voices, so they stay in every picker even while Voicebox
// is stopped (using one starts Voicebox automatically).
const KNOWN_FILE = path.join(DATA_DIR, 'voicebox-voices.json');

function readKnown() {
  try {
    return JSON.parse(fs.readFileSync(KNOWN_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeKnown(list) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(KNOWN_FILE, JSON.stringify(list, null, 2));
  } catch {
    /* best-effort cache */
  }
}

export async function listAllVoices() {
  const health = await voiceboxHealth();
  let cloned = [];
  let error = '';
  let live = false;
  if (health.running) {
    try {
      cloned = (await listProfiles()).map(profileToVoice);
      writeKnown(cloned);
      live = true;
    } catch (err) {
      error = err.message;
    }
  }
  if (!live) cloned = readKnown();
  return {
    voices: [...cloned, ...VOICES],
    voicebox: { running: health.running, installed: health.installed, count: cloned.length, live, error },
  };
}

// Resolve a voice id from either provider. Cloned voices need Voicebox running.
export async function resolveVoice(id) {
  if (isVoiceboxId(id)) {
    const p = await getProfile(profileIdOf(id));
    return p ? profileToVoice(p) : null;
  }
  return voiceById(id);
}

// Validate a voice the user picked for a job. Returns { voice } or { error, status }.
export async function pickVoice(id) {
  if (isVoiceboxId(id)) {
    try {
      await ensureVoicebox();
    } catch (err) {
      return { error: err.message, status: 503 };
    }
    const v = await resolveVoice(id);
    return v ? { voice: v } : { error: 'That cloned voice no longer exists in Voicebox.', status: 400 };
  }
  const v = voiceById(id);
  return v ? { voice: v } : { error: 'Unknown voice', status: 400 };
}
