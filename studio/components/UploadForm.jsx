'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { previewVoice } from './voicePreview.js';
import VoiceSelect from './VoiceSelect.jsx';
import { SPEED } from '../lib/voices.js';

const TONES = [
  'polished',
  'app-store',
  'default',
  'cinematic',
  'deadpan',
  'chaotic',
  'yc-parody',
];
const FORMATS = ['landscape', 'vertical', 'square'];
const ACCEPT = '.pdf,.pptx,.key,.png,.jpg,.jpeg,.webp,.svg,.gif';
const ASSET_ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,.gif,.mp4,.webm,.mov';
const PROMPT_EXAMPLE =
  'e.g. A browser extension that turns any recipe into a grocery list in one click. For busy home cooks. Free, launching next week at listly.app.';

export default function UploadForm({ mode = 'document' }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const assetsRef = useRef(null);
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [assets, setAssets] = useState([]);
  const [drag, setDrag] = useState(false);
  const [tone, setTone] = useState('polished');
  const [format, setFormat] = useState('landscape');
  const [narration, setNarration] = useState(false);
  const [music, setMusic] = useState(true);
  const [sfx, setSfx] = useState(true);
  const [voice, setVoice] = useState('af_heart');
  const [speed, setSpeed] = useState(SPEED.default);
  const [voices, setVoices] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  function preview() {
    setVoiceError('');
    setPreviewing(true);
    previewVoice(voice, {
      onEnd: () => setPreviewing(false),
      onError: (msg) => {
        setPreviewing(false);
        setVoiceError(msg);
      },
    });
  }

  function pick(f) {
    if (f) setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!ready || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('mode', mode);
      if (mode === 'prompt') {
        fd.append('prompt', prompt);
        for (const a of assets) fd.append('assets', a);
      } else {
        fd.append('file', file);
      }
      fd.append('tone', tone);
      fd.append('format', format);
      fd.append('narration', narration ? 'on' : 'off');
      fd.append('music', music ? 'on' : 'off');
      fd.append('sfx', sfx ? 'on' : 'off');
      fd.append('voice', voice);
      fd.append('speed', String(speed));
      const res = await fetch('/api/jobs', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start the job');
      router.push(`/jobs/${data.id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setSubmitting(false);
    }
  }

  const ready = mode === 'prompt' ? prompt.trim().length > 0 : !!file;

  return (
    <form className="card" onSubmit={submit}>
      {mode === 'prompt' ? (
        <div className="promptbox">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PROMPT_EXAMPLE}
            rows={6}
            autoFocus
            maxLength={8000}
          />
          <div className="hint">
            Describe the idea, who it&apos;s for, and what you want viewers to do. Specific
            details (names, numbers, a URL or date) make a much better video.
          </div>
          <div className="assetrow">
            <button type="button" className="iconbtn" onClick={() => assetsRef.current?.click()}>
              + Brand assets (optional)
            </button>
            <input
              ref={assetsRef}
              type="file"
              accept={ASSET_ACCEPT}
              multiple
              hidden
              onChange={(e) => setAssets(Array.from(e.target.files || []).slice(0, 10))}
            />
            {assets.length > 0 ? (
              <>
                {assets.map((a) => (
                  <span className="filepill" key={a.name}>
                    {a.name}
                  </span>
                ))}
                <button type="button" className="linkbtn" onClick={() => setAssets([])}>
                  clear
                </button>
              </>
            ) : (
              <span className="hint">Logo, product shots, or footage — otherwise visuals are designed from the idea.</span>
            )}
          </div>
        </div>
      ) : (
      <div
        className={'dropzone' + (drag ? ' drag' : '')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        <div>
          <strong>Choose a document</strong> or drop it here
        </div>
        <div className="hint">PDF · PowerPoint / Keynote · infographic image</div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {file && <div className="filepill">📄 {file.name}</div>}
      </div>
      )}

      <div className="options">
        <div className="field">
          <label>Tone</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="audiorow">
        <span className="audiolabel">Audio</span>
        <label className={'toggle' + (music ? ' on' : '')}>
          <input type="checkbox" checked={music} onChange={(e) => setMusic(e.target.checked)} />
          Music
        </label>
        <label className={'toggle' + (sfx ? ' on' : '')}>
          <input type="checkbox" checked={sfx} onChange={(e) => setSfx(e.target.checked)} />
          Sound effects
        </label>
        <label className={'toggle' + (narration ? ' on' : '')}>
          <input type="checkbox" checked={narration} onChange={(e) => setNarration(e.target.checked)} />
          Narration
        </label>
        <span className="hint">
          {!music && !sfx && !narration
            ? 'Silent video.'
            : `These override any audio instructions in your ${mode === 'prompt' ? 'prompt' : 'document'}.`}
        </span>
      </div>

      {narration && (
        <>
          <div className="voicerow">
            <div className="field">
              <label>Voice ({voices.length} available)</label>
              <VoiceSelect voices={voices} value={voice} onChange={(e) => setVoice(e.target.value)} />
            </div>
            <button type="button" className="iconbtn" onClick={preview} disabled={previewing}>
              {previewing ? <span className="spinner" /> : '▶'} Preview
            </button>
          </div>
          <div className="field" style={{ marginTop: 14, maxWidth: 320 }}>
            <label>Speed — {speed.toFixed(2)}×</label>
            <input
              type="range"
              min={SPEED.min}
              max={SPEED.max}
              step={SPEED.step}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </div>
          {voiceError && <div className="err">{voiceError}</div>}
        </>
      )}

      <div className="actions">
        <button className="btn" type="submit" disabled={!ready || submitting}>
          {submitting ? 'Starting…' : mode === 'prompt' ? 'Generate promo' : 'Generate video'}
        </button>
        <span className="hint" style={{ color: 'var(--muted)' }}>
          Generation runs the {mode === 'prompt' ? 'brag-idea' : 'brag-docs'} agent locally — this can take a few minutes.
        </span>
      </div>
      {error && <div className="err">{error}</div>}
    </form>
  );
}
