import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { voiceSampleFile } from '../../../../../lib/paths.js';
import { sampleTextFor } from '../../../../../lib/voices.js';
import { pickVoice } from '../../../../../lib/voiceCatalog.js';
import { runTts } from '../../../../../lib/tts.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serialize sample generation so a burst of clicks doesn't launch N Kokoro
// processes for the same (or different) voices at once.
let chain = Promise.resolve();

export async function GET(_request, { params }) {
  const id = decodeURIComponent(params.id);
  // For cloned voices this starts Voicebox if needed, then checks the voice exists.
  const picked = await pickVoice(id);
  if (picked.error) return new Response(picked.error, { status: picked.status === 400 ? 404 : picked.status });
  const v = picked.voice;

  const out = voiceSampleFile(v.id);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  if (!fs.existsSync(out)) {
    const job = chain.then(() =>
      fs.existsSync(out)
        ? null
        : runTts({ text: sampleTextFor(v), voice: v.id, output: out, timeoutMs: 3 * 60 * 1000 }),
    );
    chain = job.catch(() => {});
    try {
      await job;
    } catch (err) {
      return new Response(err?.message || 'Speech synthesis failed', { status: 503 });
    }
  }

  let stat;
  try {
    stat = fs.statSync(out);
  } catch {
    return new Response('Sample not found', { status: 500 });
  }
  return new Response(Readable.toWeb(fs.createReadStream(out)), {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
