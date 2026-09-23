'use client';

import { useEffect, useState } from 'react';
import { previewVoice } from './voicePreview.js';

export default function VoiceGallery() {
  const [voices, setVoices] = useState([]);
  const [active, setActive] = useState(null); // id currently loading/playing

  useEffect(() => {
    let alive = true;
    fetch('/api/voices')
      .then((r) => r.json())
      .then((d) => alive && setVoices(d.voices || []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function play(id) {
    setActive(id);
    previewVoice(id, {
      onEnd: () => setActive((a) => (a === id ? null : a)),
      onError: () => setActive((a) => (a === id ? null : a)),
    });
  }

  if (voices.length === 0) return null;

  return (
    <div className="voicegrid">
      {voices.map((v) => (
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
          <span className="vmeta">
            {v.lang} · {v.gender}
          </span>
        </button>
      ))}
    </div>
  );
}
