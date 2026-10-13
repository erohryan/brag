import fs from 'node:fs';
import { voiceSampleFile } from '../../../../../lib/paths.js';
import { deleteProfile, ensureVoicebox, isVoiceboxId, profileIdOf } from '../../../../../lib/voicebox.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Remove a cloned voice from Voicebox (and its cached preview clip).
export async function DELETE(_request, { params }) {
  const id = decodeURIComponent(params.id);
  if (!isVoiceboxId(id)) return Response.json({ error: 'Only cloned voices can be deleted.' }, { status: 400 });
  try {
    await ensureVoicebox();
    await deleteProfile(profileIdOf(id));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
  fs.rmSync(voiceSampleFile(id), { force: true });
  return Response.json({ ok: true });
}
