'use client';

import { useEffect, useState } from 'react';
import { previewVoice } from './voicePreview.js';

export default function VoiceGallery() {
  const [voices, setVoices] = useState([]);
  const [active, setActive] = useState(null); // id currently loading/playing
  const [health, setHealth] = useState(null); // {ok, reason}
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/voices')
      .then((r) => r.json())
      .then((d) => alive && setVoices(d.voices || []))
      .catch(() => {});
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

  if (voices.length === 0) return null;

  // Group by language, preserving langOrder.
  const order = [];
  const byLang = new Map();
  for (const v of voices) {
    if (!byLang.has(v.lang)) {
      byLang.set(v.lang, []);
      order.push({ lang: v.lang, order: v.langOrder ?? 99 });
    }
    byLang.get(v.lang).push(v);
  }
  order.sort((a, b) => a.order - b.order);

  const card = (v) => (
    <button
      key={v.id}
      type="button"
      className="voicecard"
      onClick={() => play(v.id)}
      aria-label={`Preview ${v.name}`}
    >
      <span className="vname">
        {active === v.id ? <span className="spinner" /> : <span className="play">▶</span>}
        {v.name}
      </span>
      <span className="vmeta">{v.gender}</span>
    </button>
  );

  return (
    <div>
      {health && !health.ok && (
        <div className="notice">
          <strong>Voice narration isn&apos;t available yet.</strong> {health.reason}
        </div>
      )}
      {order.map((g) => (
        <div key={g.lang} className="voicelang">
          <div className="voicelang-label">{g.lang}</div>
          <div className="voicegrid">{byLang.get(g.lang).map(card)}</div>
        </div>
      ))}
      {error && <div className="err">{error}</div>}
    </div>
  );
}
