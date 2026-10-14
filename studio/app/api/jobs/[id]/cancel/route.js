import { getJob } from '../../../../../lib/store.js';
import { cancelJob } from '../../../../../lib/jobs.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request, { params }) {
  if (!getJob(params.id)) return Response.json({ error: 'not found' }, { status: 404 });
  const ok = cancelJob(params.id);
  return ok ? Response.json({ ok: true }) : Response.json({ error: 'Nothing is running for this job' }, { status: 409 });
}
