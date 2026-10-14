import { getJob } from '../../../../../lib/store.js';
import { canResume, isBusy, resumeJob } from '../../../../../lib/jobs.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Start a stopped job again from the beginning (or re-run the interrupted edit).
export async function POST(_request, { params }) {
  const rec = getJob(params.id);
  if (!rec) return Response.json({ error: 'not found' }, { status: 404 });
  if (isBusy(rec)) return Response.json({ error: 'This job is already queued or running' }, { status: 409 });
  if (!canResume(rec)) return Response.json({ error: 'This job has nothing to resume' }, { status: 400 });
  resumeJob(params.id);
  return Response.json({ ok: true });
}
