import { getJob } from '../../../../../lib/store.js';
import { startRevoice, isRunning } from '../../../../../lib/jobs.js';
import { voiceById } from '../../../../../lib/voices.js';

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
  const v = voiceById(body.voice);
  if (!v) return Response.json({ error: 'Unknown voice' }, { status: 400 });

  if (isRunning(params.id) || rec.status === 'queued' || rec.status === 'running') {
    return Response.json({ error: 'A build is already in progress for this job' }, { status: 409 });
  }

  startRevoice(rec, v.id);
  return Response.json({ ok: true, voice: v.id });
}
