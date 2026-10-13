import { getJob } from '../../../../../lib/store.js';
import { startRevoice, isRunning } from '../../../../../lib/jobs.js';
import { clampSpeed } from '../../../../../lib/voices.js';
import { pickVoice } from '../../../../../lib/voiceCatalog.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const rec = getJob(params.id);
  if (!rec) return Response.json({ error: 'not found' }, { status: 404 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* empty body */
  }
  if (isRunning(params.id) || rec.status === 'queued' || rec.status === 'running') {
    return Response.json({ error: 'A build is already in progress for this job' }, { status: 409 });
  }

  const picked = await pickVoice(String(body.voice || ''));
  if (picked.error) return Response.json({ error: picked.error }, { status: picked.status });
  const v = picked.voice;

  const speed = body.speed != null ? clampSpeed(body.speed) : rec.speed;
  startRevoice(rec, v, speed);
  return Response.json({ ok: true, voice: v.id, speed });
}
