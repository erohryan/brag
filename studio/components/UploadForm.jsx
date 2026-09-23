'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [tone, setTone] = useState('polished');
  const [format, setFormat] = useState('landscape');
  const [narration, setNarration] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function pick(f) {
    if (f) setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!file || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tone', tone);
      fd.append('format', format);
      fd.append('narration', narration ? 'on' : 'off');
      const res = await fetch('/api/jobs', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      router.push(`/jobs/${data.id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
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
        <div className="field check">
          <input
            id="narration"
            type="checkbox"
            checked={narration}
            onChange={(e) => setNarration(e.target.checked)}
          />
          <label htmlFor="narration" style={{ textTransform: 'none', margin: 0 }}>
            Add narration (voiceover)
          </label>
        </div>
      </div>

      <div className="actions">
        <button className="btn" type="submit" disabled={!file || submitting}>
          {submitting ? 'Starting…' : 'Generate video'}
        </button>
        <span className="hint" style={{ color: 'var(--muted)' }}>
          Generation runs the brag-docs agent locally — this can take a few minutes.
        </span>
      </div>
      {error && <div className="err">{error}</div>}
    </form>
  );
}
