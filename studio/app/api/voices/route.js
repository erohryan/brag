import { VOICES } from '../../../lib/voices.js';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ voices: VOICES });
}
