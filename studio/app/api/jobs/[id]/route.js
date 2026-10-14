import { getJob, upsertJob } from '../../../../lib/store.js';
import { bootEngine, canFinishRender, canResume, deleteJob, isRunning, queuePosition, readProgress } from '../../../../lib/jobs.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  bootEngine();
  const rec = getJob(params.id);
  if (!rec) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json({
    ...rec,
    running: isRunning(params.id),
    queuePosition: queuePosition(params.id),
    canFinish: canFinishRender(rec),
    canResume: canResume(rec),
    progress: readProgress(params.id),
  });
}

// Rename.
export async function PATCH(request, { params }) {
  const rec = getJob(params.id);
  if (!rec) return Response.json({ error: 'not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim().slice(0, 120);
  if (!title) return Response.json({ error: 'Title cannot be empty' }, { status: 400 });
  upsertJob({ ...rec, title });
  return Response.json({ ok: true, title });
}

// Delete the job, its files, and cancel it if it's running.
export async function DELETE(_request, { params }) {
  if (!getJob(params.id)) return Response.json({ error: 'not found' }, { status: 404 });
  deleteJob(params.id);
  return Response.json({ ok: true });
}
