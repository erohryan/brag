'use client';

// One shared audio element so a new preview stops the previous one.
let current = null;

// Fetches the sample first so a failed synthesis surfaces a real message
// instead of a silent <audio> error. onError receives a human-readable string.
export async function previewVoice(id, { onPlaying, onEnd, onError } = {}) {
  if (current) {
    current.pause();
    current = null;
  }
  try {
    const res = await fetch(`/api/voices/${id}/sample`);
    if (!res.ok) {
      const msg = (await res.text().catch(() => '')) || `Preview failed (${res.status})`;
      onError && onError(msg);
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    current = audio;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (current === audio) current = null;
    };
    audio.addEventListener('playing', () => onPlaying && onPlaying());
    audio.addEventListener('ended', () => {
      cleanup();
      onEnd && onEnd();
    });
    audio.addEventListener('error', () => {
      cleanup();
      onError && onError('Could not play the audio sample.');
    });
    await audio.play().catch(() => {
      cleanup();
      onError && onError('Playback was blocked by the browser.');
    });
  } catch (e) {
    onError && onError(e?.message || 'Preview failed');
  }
}
