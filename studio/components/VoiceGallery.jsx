'use client';

import { useEffect, useState } from 'react';
import { previewVoice } from './voicePreview.js';
import CreateVoice from './CreateVoice.jsx';
import useVoices from './useVoices.js';

const VOICEBOX_RELEASES = 'https://github.com/jamiepine/voicebox/releases';

export default function VoiceGallery() {
  const { voices, voicebox, reload } = useVoices();
  const [active, setActive] = useState(null); // id currently loading/playing
  const [health, setHealth] = useState(null); // Kokoro {ok, reason}
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/voices/health')
      .then((r) => r.json())
      .then((d) => alive && setHealth(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function play(id) {
    setError('');
    setActive(id);
    previewVoice(id, {
      onEnd: () => setActive((a) => (a === id ? null : a)),
      onError: (msg) => {
        setActive((a) => (a === id ? null : a));
        setError(msg);
      },
    });
  }

  async function remove(v) {
    if (!window.confirm(`Delete the cloned voice "${v.name}"? Videos already made keep their audio.`)) return;
    setError('');
    const res = await fetch(`/api/voicebox/voices/${encodeURIComponent(v.id)}`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Could not delete that voice');
    reload();
  }

  if (voices.length === 0) return null;

  const cloned = voices.filter((v) => v.provider === 'voicebox');
  const order = [];
  const byLang = new Map();
  for (const v of voices) {
    if (v.provider === 'voicebox') continue;
    if (!byLang.has(v.lang)) {
      byLang.set(v.lang, []);
      order.push({ lang: v.lang, order: v.langOrder ?? 99 });
    }
    byLang.get(v.lang).push(v);
  }
  order.sort((a, b) => a.order - b.order);

  const card = (v) => (
    <div key={v.id} className="voicecard-wrap">
      <button type="button" className="voicecard" onClick={() => play(v.id)} aria-label={`Preview ${v.name}`}>
        <span className="vname">
          {active === v.id ? <span className="spinner" /> : <span className="play">▶</span>}
          {v.name}
        </span>
        <span className="vmeta">{v.provider === 'voicebox' ? `cloned · ${v.language}` : v.gender}</span>
      </button>
      {v.provider === 'voicebox' && (
        <button type="button" className="voicedel" title={`Delete ${v.name}`} aria-label={`Delete ${v.name}`} onClick={() => remove(v)}>
          ×
        </button>
      )}
    </div>
  );

  let vbStatus = null;
  if (voicebox && !voicebox.installed) {
    vbStatus = (
      <>
        Cloned voices need the free Voicebox app (runs locally).{' '}
        <a className="inline-link" href={VOICEBOX_RELEASES} target="_blank" rel="noreferrer">
          Install Voicebox
        </a>
      </>
    );
  } else if (voicebox && !voicebox.running) {
    vbStatus = 'Voicebox is installed but not running — it starts automatically when you create, preview, or use a cloned voice.';
  }

  return (
    <div>
      {health && !health.ok && (
        <div className="notice">
          <strong>Built-in voices aren&apos;t available yet.</strong> {health.reason}
        </div>
      )}

      <div className="voicelang">
        <div className="voicelang-label">Your voices · cloned locally with Voicebox</div>
        {vbStatus && <div className="hint vbstatus">{vbStatus}</div>}
        <div className="voicegrid">
          {cloned.map(card)}
          <button type="button" className="voicecard create" onClick={() => setCreating(true)}>
            <span className="vname">
              <span className="play">+</span>Create your voice
            </span>
            <span className="vmeta">record ~20 seconds</span>
          </button>
        </div>
      </div>

      {order.map((g) => (
        <div key={g.lang} className="voicelang">
          <div className="voicelang-label">{g.lang}</div>
          <div className="voicegrid">{byLang.get(g.lang).map(card)}</div>
        </div>
      ))}
      {error && <div className="err">{error}</div>}

      <CreateVoice
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(v) => {
          reload();
          play(v.id);
        }}
      />
    </div>
  );
}
