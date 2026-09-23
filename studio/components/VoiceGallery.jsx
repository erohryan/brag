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

  return (
    <div>
      {health && !health.ok && (
        <div className="notice">
          <strong>Voice narration isn&apos;t available yet.</strong> {health.reason}
        </div>
      )}
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
      {error && <div className="err">{error}</div>}
    </div>
  );
}
