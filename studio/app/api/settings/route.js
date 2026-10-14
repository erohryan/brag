import { getSettings, saveSettings } from '../../../lib/settings.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(getSettings());
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const allowed = ['model', 'maxConcurrent', 'maxBudgetUsd'];
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  return Response.json(saveSettings(patch));
}
