import { getJob } from '../../../../lib/store.js';
import { readProgress, isRunning } from '../../../../lib/jobs.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const rec = getJob(params.id);
  if (!rec) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json({
    ...rec,
    running: isRunning(params.id),
    progress: readProgress(params.id),
  });
}
