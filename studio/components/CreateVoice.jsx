'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PASSAGE =
  "Hi, this is my voice for brag studio. I'm reading this short passage so the app can learn how I sound — " +
  'the way I pace a sentence, the words I lean on, and the tone I use when I explain something I care about. ' +
  'Every video I make from now on can be narrated in this voice.';

const LANGUAGES = [
  ['en', 'English'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['nl', 'Dutch'],
  ['ru', 'Russian'],
  ['hi', 'Hindi'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['zh', 'Chinese'],
];

const MAX_SECONDS = 30;
const MIN_SECONDS = 3;

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

// Modal: record (or upload) a short clip and clone it into a local Voicebox voice.
export default function CreateVoice({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [source, setSource] = useState('record'); // record | upload
  const [transcript, setTranscript] = useState(PASSAGE);
  const [clip, setClip] = useState(null); // { blob, filename, seconds? }
  const [clipUrl, setClipUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startRef = useRef(0);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    clearInterval(timerRef.current);
  }

  useEffect(() => () => stopStream(), []);

  useEffect(() => {
    if (!clip) {
      setClipUrl('');
      return;
    }
    const url = URL.createObjectURL(clip.blob);
    setClipUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [clip]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !busy && !recording && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, recording, onClose]);

  if (!open) return null;

  async function startRecording() {
    setError('');
    setClip(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;
      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const seconds = (Date.now() - startRef.current) / 1000;
        const type = rec.mimeType || mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : 'webm';
        setClip({ blob: new Blob(chunks, { type }), filename: `recording.${ext}`, seconds });
        setRecording(false);
        stopStream();
      };
      recRef.current = rec;
      startRef.current = Date.now();
      setElapsed(0);
      rec.start();
      setRecording(true);
      timerRef.current = setInterval(() => {
        const s = (Date.now() - startRef.current) / 1000;
        setElapsed(s);
        if (s >= MAX_SECONDS) rec.state === 'recording' && rec.stop();
      }, 200);
    } catch (err) {
      stopStream();
      setError(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it for this site, or upload a clip instead.'
          : `Couldn't start recording: ${err?.message || err}`,
      );
    }
  }

  function stopRecording() {
    if (recRef.current?.state === 'recording') recRef.current.stop();
  }

  function switchSource(next) {
    if (recording) return;
    setSource(next);
    setClip(null);
    setError('');
    if (next === 'upload' && transcript === PASSAGE) setTranscript('');
    if (next === 'record' && !transcript.trim() && language === 'en') setTranscript(PASSAGE);
  }

  const tooShort = clip?.seconds != null && clip.seconds < MIN_SECONDS;
  const ready = name.trim() && transcript.trim() && clip && !tooShort && consent && !busy && !recording;

  async function create() {
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('language', language);
      fd.append('referenceText', transcript.trim());
      fd.append('consent', consent ? 'yes' : 'no');
      fd.append('audio', clip.blob, clip.filename);
      const res = await fetch('/api/voicebox/voices', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voice cloning failed');
      onCreated?.(data.voice);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Portal to <body> so the modal isn't inside a parent <form> (Enter in a
  // field here must not submit the job form).
  return createPortal(
    <div className="modal-backdrop" onClick={() => !busy && !recording && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cv-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="cv-title">Create your voice</h2>
          <button type="button" className="linkbtn" onClick={onClose} disabled={busy || recording}>
            close
          </button>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          Cloned and stored on this Mac by Voicebox — nothing is uploaded anywhere. Once created, it&apos;s in
          every voice picker for future videos.
        </p>

        <div className="options" style={{ marginTop: 8 }}>
          <div className="field">
            <label htmlFor="cv-name">Voice name</label>
            <input id="cv-name" type="text" value={name} maxLength={100} placeholder="e.g. Ryan" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cv-lang">Language</label>
            <select
              id="cv-lang"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                if (e.target.value !== 'en' && transcript === PASSAGE) setTranscript('');
                if (e.target.value === 'en' && !transcript.trim() && source === 'record') setTranscript(PASSAGE);
              }}
            >
              {LANGUAGES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modetabs" role="tablist" style={{ marginTop: 18 }}>
          <button type="button" role="tab" aria-selected={source === 'record'} className={source === 'record' ? 'active' : ''} onClick={() => switchSource('record')}>
            🎙 Record now
          </button>
          <button type="button" role="tab" aria-selected={source === 'upload'} className={source === 'upload' ? 'active' : ''} onClick={() => switchSource('upload')}>
            ⬆ Upload a clip
          </button>
        </div>

        <div className="field">
          <label htmlFor="cv-text">
            {source === 'record' ? 'Read this aloud — edit it if you like, it must match what you say' : 'Exactly what is said in your clip'}
          </label>
          <textarea
            id="cv-text"
            className="transcript"
            rows={4}
            maxLength={1000}
            value={transcript}
            placeholder={source === 'record' ? 'Type a passage of 10–25 seconds to read aloud…' : 'Type the words spoken in the clip, word for word…'}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </div>

        {source === 'record' ? (
          <div className="recorder">
            {recording ? (
              <button type="button" className="btn rec on" onClick={stopRecording}>
                ■ Stop · {elapsed.toFixed(0)}s / {MAX_SECONDS}s
              </button>
            ) : (
              <button type="button" className="btn rec" onClick={startRecording} disabled={busy}>
                ● {clip ? 'Record again' : 'Start recording'}
              </button>
            )}
            <span className="hint">Quiet room, normal speaking voice, 10–25 seconds works best.</span>
          </div>
        ) : (
          <div className="recorder">
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setClip(f ? { blob: f, filename: f.name } : null);
              }}
            />
            <span className="hint">2–30 seconds of just your voice, no music.</span>
          </div>
        )}

        {clipUrl && (
          <div className="clip">
            <audio controls src={clipUrl} />
            {clip?.seconds != null && <span className="hint">{clip.seconds.toFixed(1)}s</span>}
            {tooShort && <span className="err" style={{ marginTop: 0 }}>Too short — record at least {MIN_SECONDS} seconds.</span>}
          </div>
        )}

        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          This is my voice, or I have the speaker&apos;s permission to clone it.
        </label>

        {error && <div className="err">{error}</div>}

        <div className="actions">
          <button type="button" className="btn" onClick={create} disabled={!ready}>
            {busy ? 'Cloning…' : 'Create voice'}
          </button>
          {busy && <span className="hint">Starting Voicebox if needed and processing your clip…</span>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
