'use client';

import { useEffect, useState } from 'react';

// One shared voice list for every picker on the page (cloned Voicebox voices
// first, then Kokoro) plus Voicebox status. A voice created or deleted in one
// component shows up in all of them; the list also refreshes when the tab
// regains focus (e.g. after creating a voice in the Voicebox app).
let snapshot = { voices: [], voicebox: null };
let inflight = null;
const listeners = new Set();

export async function reloadVoices() {
  if (!inflight) {
    inflight = (async () => {
      try {
        const d = await (await fetch('/api/voices', { cache: 'no-store' })).json();
        snapshot = { voices: d.voices || [], voicebox: d.voicebox || null };
        listeners.forEach((fn) => fn(snapshot));
      } catch {
        /* keep the last good list */
      } finally {
        inflight = null;
      }
      return snapshot;
    })();
  }
  return inflight;
}

export default function useVoices() {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    listeners.add(setState);
    setState(snapshot);
    reloadVoices();
    const onFocus = () => document.visibilityState === 'visible' && reloadVoices();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      listeners.delete(setState);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  return { voices: state.voices, voicebox: state.voicebox, reload: reloadVoices };
}
