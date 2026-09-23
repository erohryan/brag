'use client';

// One shared audio element so a new preview stops the previous one.
let current = null;

export function previewVoice(id, { onPlaying, onEnd, onError } = {}) {
  if (current) {
    current.pause();
    current = null;
  }
  const audio = new Audio(`/api/voices/${id}/sample`);
  current = audio;
  const clear = () => {
    if (current === audio) current = null;
  };
  audio.addEventListener('playing', () => onPlaying && onPlaying());
  audio.addEventListener('ended', () => {
    clear();
    onEnd && onEnd();
  });
  audio.addEventListener('error', () => {
    clear();
    onError && onError();
  });
  audio.play().catch(() => {
    clear();
    onError && onError();
  });
  return audio;
}
