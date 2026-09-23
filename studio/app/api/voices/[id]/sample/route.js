import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { DATA_DIR } from '../../../../../lib/paths.js';
import { voiceById, sampleTextFor } from '../../../../../lib/voices.js';
import { runTts } from '../../../../../lib/tts.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serialize sample generation so a burst of clicks doesn't launch N Kokoro
// processes for the same (or different) voices at once.
let chain = Promise.resolve();

export async function GET(_request, { params }) {
  const v = voiceById(params.id);
  if (!v) return new Response('Unknown voice', { status: 404 });

  const dir = path.join(DATA_DIR, 'voice-samples');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${v.id}.wav`);

  if (!fs.existsSync(out)) {
    const job = chain.then(() =>
      fs.existsSync(out)
        ? null
        : runTts({ text: sampleTextFor(v), voice: v.id, output: out }),
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
