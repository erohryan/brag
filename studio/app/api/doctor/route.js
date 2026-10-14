import { runChecks } from '../../../lib/doctor.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ?quick=1 skips the slower probes (Claude sign-in, Hyperframes doctor) and
// reuses their last results — for the nav indicator.
export async function GET(request) {
  const quick = new URL(request.url).searchParams.get('quick') === '1';
  return Response.json(await runChecks({ quick }));
}
