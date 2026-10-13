import { getJob } from '../../../../../lib/store.js';
import { canFinishRender, isRunning, startFinishRender } from '../../../../../lib/jobs.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Render a job whose composition was built but whose final render never finished.
export async function POST(_request, { params }) {
  const rec = getJob(params.id);
  if (!rec) return Response.json({ error: 'not found' }, { status: 404 });
  if (isRunning(params.id) || rec.status === 'running' || rec.status === 'queued') {
    return Response.json({ error: 'A build is already in progress for this job' }, { status: 409 });
  }
  if (!canFinishRender(rec)) {
    return Response.json({ error: 'Nothing to finish — no built composition without a video.' }, { status: 400 });
  }
  startFinishRender(rec);
  return Response.json({ ok: true });
}
