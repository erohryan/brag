import { checkTts } from '../../../../lib/tts.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await checkTts();
  return Response.json(result);
}
