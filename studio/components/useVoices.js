'use client';

import { useCallback, useEffect, useState } from 'react';

// All selectable voices (cloned Voicebox voices first, then Kokoro) plus
// Voicebox status. `reload` refetches — call it after creating/deleting a voice.
export default function useVoices() {
  const [voices, setVoices] = useState([]);
  const [voicebox, setVoicebox] = useState(null);

  const reload = useCallback(async () => {
    try {
      const d = await (await fetch('/api/voices', { cache: 'no-store' })).json();
      setVoices(d.voices || []);
      setVoicebox(d.voicebox || null);
      return d;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { voices, voicebox, reload };
}
