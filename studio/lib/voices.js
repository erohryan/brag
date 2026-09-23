// The full Kokoro-82M voice set (voices-v1.0.bin). Metadata is derived from the
// id convention: <lang><gender>_<name>, e.g. af_heart = American-English female.
//
// NOTE (future): a more natural cloud provider (ElevenLabs) is the planned next
// step. The seam is lib/tts.js `runTts` — add a provider branch there and tag
// voices with a `provider` field; the rest of the app is already voice-agnostic.

const RAW_IDS = [
  'af_alloy', 'af_aoede', 'af_bella', 'af_heart', 'af_jessica', 'af_kore',
  'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky',
  'am_adam', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_michael',
  'am_onyx', 'am_puck', 'am_santa',
  'bf_alice', 'bf_emma', 'bf_isabella', 'bf_lily',
  'bm_daniel', 'bm_fable', 'bm_george', 'bm_lewis',
  'ef_dora', 'em_alex', 'em_santa',
  'ff_siwis',
  'hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi',
  'if_sara', 'im_nicola',
  'jf_alpha', 'jf_gongitsune', 'jf_nezumi', 'jf_tebukuro', 'jm_kumo',
  'pf_dora', 'pm_alex', 'pm_santa',
  'zf_xiaobei', 'zf_xiaoni', 'zf_xiaoxiao', 'zf_xiaoyi',
  'zm_yunjian', 'zm_yunxi', 'zm_yunxia', 'zm_yunyang',
];

const LANGS = {
  a: { lang: 'English (US)', langCode: 'en-us', order: 0 },
  b: { lang: 'English (UK)', langCode: 'en-gb', order: 1 },
  e: { lang: 'Spanish', langCode: 'es', order: 2 },
  f: { lang: 'French', langCode: 'fr-fr', order: 3 },
  i: { lang: 'Italian', langCode: 'it', order: 4 },
  p: { lang: 'Portuguese (BR)', langCode: 'pt-br', order: 5 },
  h: { lang: 'Hindi', langCode: 'hi', order: 6 },
  j: { lang: 'Japanese', langCode: 'ja', order: 7 },
  z: { lang: 'Chinese', langCode: 'zh', order: 8 },
};

function build(id) {
  const meta = LANGS[id[0]] || { lang: 'Unknown', langCode: 'en-us', order: 99 };
  const raw = id.slice(3);
  return {
    id,
    name: raw.charAt(0).toUpperCase() + raw.slice(1),
    lang: meta.lang,
    langCode: meta.langCode,
    langOrder: meta.order,
    gender: id[1] === 'f' ? 'female' : 'male',
  };
}

export const VOICES = RAW_IDS.map(build);

export const DEFAULT_VOICE = 'af_heart';

export const SPEED = { min: 0.7, max: 1.4, step: 0.05, default: 1.0 };

export function clampSpeed(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return SPEED.default;
  return Math.min(SPEED.max, Math.max(SPEED.min, n));
}

// Language-appropriate preview lines so samples demonstrate real timbre.
const SAMPLE_TEXT = {
  'en-us': 'Hi — this is how your narration will sound in a brag studio video.',
  'en-gb': 'Hello — this is how your narration will sound in a brag studio video.',
  es: 'Hola, así sonará la narración de tu vídeo en brag studio.',
  'fr-fr': 'Bonjour, voici à quoi ressemblera la narration de votre vidéo.',
  it: 'Ciao, ecco come suonerà la narrazione del tuo video.',
  'pt-br': 'Olá, é assim que vai soar a narração do seu vídeo.',
  hi: 'नमस्ते, आपके वीडियो की आवाज़ ऐसी सुनाई देगी।',
  ja: 'こんにちは。これがナレーションの声になります。',
  zh: '你好，这就是你视频旁白的声音。',
};

export function voiceById(id) {
  return VOICES.find((v) => v.id === id) || null;
}

export function sampleTextFor(voice) {
  return SAMPLE_TEXT[voice?.langCode] || SAMPLE_TEXT['en-us'];
}
