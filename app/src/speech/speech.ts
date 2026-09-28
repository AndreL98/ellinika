/**
 * Read-aloud with fallbacks (APP.md): 1. audio file, 2. Web Speech API, 3. "no voice".
 */
export type SpeechResult = 'audio' | 'tts' | 'none';

export interface SpeechEnvironment {
  synth?: SpeechSynthesis | undefined;
  createAudio?: ((src: string) => HTMLAudioElement) | undefined;
  createUtterance?: ((text: string) => SpeechSynthesisUtterance) | undefined;
}

function browserEnvironment(): SpeechEnvironment {
  return {
    synth: typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis,
    createAudio: typeof Audio === 'undefined' ? undefined : (src) => new Audio(src),
    createUtterance:
      typeof SpeechSynthesisUtterance === 'undefined' ? undefined : (text) => new SpeechSynthesisUtterance(text),
  };
}

const primary = (lang: string) => lang.toLowerCase().split('-')[0] ?? '';

/** Finds a voice for the language, preferring an exact match (e.g. el-GR for el-GR). */
export function findVoice(voices: readonly SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const wanted = lang.toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === wanted) ??
    voices.find((voice) => primary(voice.lang) === primary(lang))
  );
}

/** Voices load asynchronously in some browsers; wait briefly for them. */
export function loadVoices(synth: SpeechSynthesis | undefined, timeoutMs = 1000): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([]);
  const now = synth.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener('voiceschanged', done);
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    synth.addEventListener('voiceschanged', done);
  });
}

export class Speaker {
  private voices: SpeechSynthesisVoice[] = [];

  constructor(private readonly env: SpeechEnvironment = browserEnvironment()) {}

  async init(): Promise<void> {
    this.voices = await loadVoices(this.env.synth);
  }

  /** True if text in this language can be spoken by a voice (audio files are checked per item). */
  hasVoice(lang: string): boolean {
    return !!this.env.createUtterance && findVoice(this.voices, lang) !== undefined;
  }

  canSpeak(lang: string, audio: string | null): boolean {
    return (!!audio && !!this.env.createAudio) || this.hasVoice(lang);
  }

  speak(text: string, lang: string, audio: string | null, rate = 1): SpeechResult {
    if (audio && this.env.createAudio) {
      void this.env.createAudio(audio).play().catch(() => undefined);
      return 'audio';
    }
    const voice = findVoice(this.voices, lang);
    if (voice && this.env.synth && this.env.createUtterance) {
      const utterance = this.env.createUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rate;
      this.env.synth.cancel();
      this.env.synth.speak(utterance);
      return 'tts';
    }
    return 'none';
  }
}
