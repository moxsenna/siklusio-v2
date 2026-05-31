export interface TwwSanctuaryResult {
  title?: string;
  opening?: string;
  validation?: string;
  grounding?: string;
  affirmation?: string;
  reassurance: string;
  breathingTip: string;
  closing?: string;
}

export interface TwwLetterSection {
  key: 'opening' | 'validation' | 'grounding' | 'affirmation' | 'breathingTip' | 'closing';
  label?: string;
  body: string;
  variant: 'letter' | 'card' | 'quote' | 'breath' | 'closing';
}

function cleanText(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function splitLegacyReassurance(reassurance: string) {
  const sentences = reassurance
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 2) {
    return [reassurance.trim()];
  }

  return [
    sentences.slice(0, 2).join(' '),
    sentences.slice(2).join(' '),
  ].filter(Boolean);
}

export function getTwwLetterSections(result: TwwSanctuaryResult): TwwLetterSection[] {
  const opening = cleanText(result.opening);
  const validation = cleanText(result.validation);
  const grounding = cleanText(result.grounding);
  const affirmation = cleanText(result.affirmation);
  const breathingTip = cleanText(result.breathingTip);
  const closing = cleanText(result.closing);

  if (opening || validation || grounding || affirmation || closing) {
    return [
      opening && {
        key: 'opening' as const,
        body: opening,
        variant: 'letter' as const,
      },
      validation && {
        key: 'validation' as const,
        label: 'Perasaanmu valid',
        body: validation,
        variant: 'card' as const,
      },
      grounding && {
        key: 'grounding' as const,
        label: 'Saat ini saja',
        body: grounding,
        variant: 'card' as const,
      },
      affirmation && {
        key: 'affirmation' as const,
        body: affirmation,
        variant: 'quote' as const,
      },
      breathingTip && {
        key: 'breathingTip' as const,
        label: 'Tarik napas dulu',
        body: breathingTip,
        variant: 'breath' as const,
      },
      closing && {
        key: 'closing' as const,
        body: closing,
        variant: 'closing' as const,
      },
    ].filter(Boolean) as TwwLetterSection[];
  }

  const legacySections = splitLegacyReassurance(cleanText(result.reassurance));
  return [
    ...legacySections.map((body, index) => ({
      key: index === 0 ? ('opening' as const) : ('validation' as const),
      label: index === 0 ? undefined : 'Perasaanmu valid',
      body,
      variant: index === 0 ? ('letter' as const) : ('card' as const),
    })),
    breathingTip && {
      key: 'breathingTip' as const,
      label: 'Tarik napas dulu',
      body: breathingTip,
      variant: 'breath' as const,
    },
  ].filter(Boolean) as TwwLetterSection[];
}

export function getTwwTitle(result: TwwSanctuaryResult) {
  const title = cleanText(result.title).replace(/^[\s:\uFF1A\-\u2013\u2014]+/, '').trim();
  return title || 'Kamu tidak sendirian';
}

export type TwwMusicMood = 'nature' | 'deep_meditation' | 'lofi' | 'lullaby';

export interface TwwMusicItem {
  id: TwwMusicMood;
  label: string;
  emoji: string;
  desc: string;
  asset: any;
}

function loadSoundAsset(mood: TwwMusicMood) {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 0;
  }
  switch (mood) {
    case 'nature':
      return require('../../assets/sounds/tww_acoustic_nature.mp3');
    case 'deep_meditation':
      return require('../../assets/sounds/tww_deep_healing.mp3');
    case 'lofi':
      return require('../../assets/sounds/tww_lofi_chill.mp3');
    case 'lullaby':
      return require('../../assets/sounds/tww_cinematic_lullaby.mp3');
    default:
      return 0;
  }
}

export const TWW_MUSIC_MAP: Record<TwwMusicMood, TwwMusicItem> = {
  nature: {
    id: 'nature',
    label: 'Suara Alam',
    emoji: '🍃',
    desc: 'Forest Stream',
    get asset() {
      return loadSoundAsset('nature');
    },
  },
  deep_meditation: {
    id: 'deep_meditation',
    label: 'Meditasi',
    emoji: '🧘‍♀️',
    desc: 'Ocean Waves',
    get asset() {
      return loadSoundAsset('deep_meditation');
    },
  },
  lofi: {
    id: 'lofi',
    label: 'Santai',
    emoji: '☕',
    desc: 'Soft Piano',
    get asset() {
      return loadSoundAsset('lofi');
    },
  },
  lullaby: {
    id: 'lullaby',
    label: 'Tidur',
    emoji: '✨',
    desc: 'Starlight',
    get asset() {
      return loadSoundAsset('lullaby');
    },
  },
};


