// The curated Kokoro-82M voices exposed by `hyperframes tts`. Any Kokoro voice
// id works with --voice; these are the ones we surface in the UI.
export const VOICES = [
  { id: 'af_heart', name: 'Heart', lang: 'English (US)', langCode: 'en-us', gender: 'female' },
  { id: 'af_nova', name: 'Nova', lang: 'English (US)', langCode: 'en-us', gender: 'female' },
  { id: 'af_sky', name: 'Sky', lang: 'English (US)', langCode: 'en-us', gender: 'female' },
  { id: 'am_adam', name: 'Adam', lang: 'English (US)', langCode: 'en-us', gender: 'male' },
  { id: 'am_michael', name: 'Michael', lang: 'English (US)', langCode: 'en-us', gender: 'male' },
  { id: 'bf_emma', name: 'Emma', lang: 'English (UK)', langCode: 'en-gb', gender: 'female' },
  { id: 'bf_isabella', name: 'Isabella', lang: 'English (UK)', langCode: 'en-gb', gender: 'female' },
  { id: 'bm_george', name: 'George', lang: 'English (UK)', langCode: 'en-gb', gender: 'male' },
  { id: 'ef_dora', name: 'Dora', lang: 'Spanish', langCode: 'es', gender: 'female' },
  { id: 'ff_siwis', name: 'Siwis', lang: 'French', langCode: 'fr-fr', gender: 'female' },
  { id: 'jf_alpha', name: 'Alpha', lang: 'Japanese', langCode: 'ja', gender: 'female' },
  { id: 'zf_xiaobei', name: 'Xiaobei', lang: 'Chinese', langCode: 'zh', gender: 'female' },
];

export const DEFAULT_VOICE = 'af_heart';

// A short language-appropriate line so previews demonstrate real timbre.
const SAMPLE_TEXT = {
  'en-us': 'Hi — this is how your narration will sound in a brag studio video.',
  'en-gb': 'Hello — this is how your narration will sound in a brag studio video.',
  es: 'Hola, así sonará la narración de tu vídeo en brag studio.',
  'fr-fr': 'Bonjour, voici à quoi ressemblera la narration de votre vidéo.',
  ja: 'こんにちは。これがナレーションの声になります。',
  zh: '你好，这就是你视频旁白的声音。',
};

export function voiceById(id) {
  return VOICES.find((v) => v.id === id) || null;
}

export function sampleTextFor(voice) {
  return SAMPLE_TEXT[voice?.langCode] || SAMPLE_TEXT['en-us'];
}
