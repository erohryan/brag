import { getJob } from '../../../../../lib/store.js';
import { isBusy, startRevise } from '../../../../../lib/jobs.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FEEDBACK = 4000;

// Edit a finished video from written feedback, keeping the current one as a version.
export async function POST(request, { params }) {
  const rec = getJob(params.id);
  if (!rec) return Response.json({ error: 'not found' }, { status: 404 });
  if (!rec.video) return Response.json({ error: 'There is no finished video to revise yet' }, { status: 400 });
  if (isBusy(rec)) return Response.json({ error: 'This job is already queued or running' }, { status: 409 });
  const body = await request.json().catch(() => ({}));
  const feedback = String(body.feedback || '').trim();
  if (!feedback) return Response.json({ error: 'Describe what should change' }, { status: 400 });
  if (feedback.length > MAX_FEEDBACK) return Response.json({ error: `Keep feedback under ${MAX_FEEDBACK} characters` }, { status: 400 });
  startRevise(rec, feedback);
  return Response.json({ ok: true });
}
