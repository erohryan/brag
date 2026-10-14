import { startFix } from '../../../../lib/doctor.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { id } = await request.json().catch(() => ({}));
  const r = startFix(String(id || ''));
  return r.error ? Response.json(r, { status: 400 }) : Response.json(r);
}
