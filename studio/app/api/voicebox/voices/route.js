import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  SAMPLE_MAX_SECONDS,
  SAMPLE_MIN_SECONDS,
  audioSeconds,
  createClonedVoice,
  ensureVoicebox,
  toWav,
} from '../../../../lib/voicebox.mjs';
import { profileToVoice } from '../../../../lib/voiceCatalog.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Languages Voicebox accepts for a profile (subset surfaced in the UI).
const LANGUAGES = new Set(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko', 'hi', 'nl', 'ru']);
const MAX_UPLOAD = 50 * 1024 * 1024;

// Create a cloned voice: a recording (or uploaded clip) + its exact transcript
// → a Voicebox profile, stored by Voicebox for every future job.
export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const name = (form.get('name') || '').toString().trim();
  const language = (form.get('language') || 'en').toString();
  const referenceText = (form.get('referenceText') || '').toString().trim();
  const consent = (form.get('consent') || '').toString() === 'yes';
  const audio = form.get('audio');

  if (!name || name.length > 100) return Response.json({ error: 'Give the voice a name (up to 100 characters).' }, { status: 400 });
  if (!LANGUAGES.has(language)) return Response.json({ error: 'Unsupported language.' }, { status: 400 });
  if (!referenceText || referenceText.length > 1000) {
    return Response.json({ error: 'Add the exact words spoken in the clip (up to 1000 characters).' }, { status: 400 });
  }
  if (!consent) {
    return Response.json({ error: 'Confirm this is your voice or that you have permission to clone it.' }, { status: 400 });
  }
  if (!audio || typeof audio === 'string') return Response.json({ error: 'Record or upload a voice clip.' }, { status: 400 });
  if (audio.size > MAX_UPLOAD) return Response.json({ error: 'Clip is too large (max 50 MB).' }, { status: 413 });

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'brag-voice-'));
  try {
    const ext = path.extname(audio.name || '').toLowerCase() || '.webm';
    const raw = path.join(work, `upload${ext}`);
    const wav = path.join(work, 'sample.wav');
    fs.writeFileSync(raw, Buffer.from(await audio.arrayBuffer()));

    try {
      await toWav(raw, wav);
    } catch {
      return Response.json({ error: "Couldn't read that audio file. Try a WAV, MP3, M4A or a fresh recording." }, { status: 400 });
    }
    const seconds = await audioSeconds(wav);
    if (!(seconds >= SAMPLE_MIN_SECONDS && seconds <= SAMPLE_MAX_SECONDS)) {
      return Response.json(
        { error: `The clip is ${seconds.toFixed(1)}s — it needs to be between ${SAMPLE_MIN_SECONDS} and ${SAMPLE_MAX_SECONDS} seconds.` },
        { status: 400 },
      );
    }

    try {
      await ensureVoicebox();
    } catch (err) {
      return Response.json({ error: err.message }, { status: 503 });
    }
    const profile = await createClonedVoice({ name, language, wavPath: wav, referenceText });
    return Response.json({ voice: profileToVoice(profile), seconds });
  } catch (err) {
    return Response.json({ error: err.message || 'Voice cloning failed' }, { status: 500 });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
