import { listAllVoices } from '../../../lib/voiceCatalog.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await listAllVoices());
}
