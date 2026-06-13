export type VoiceName = 'Fenrir' | 'Charon' | 'Kore' | 'Puck' | 'Zephyr';

export interface VoiceProfile {
  name: VoiceName;
  gender: 'Male' | 'Female';
  styleDescription: string;
  recommendedTone: string;
  avatarSymbol: string;
  colorScheme: string; // Tailwind glow class definition
}

export interface VoiceOverSegment {
  id: string;
  originalText: string;
  text: string;
  voice: VoiceName;
  style: string;
  audioUrl: string | null;
  mp3Url: string | null;
  duration: number | null;
  isGenerating: boolean;
  error: string | null;
  fallback?: boolean;
  fallbackReason?: string;
}

export const PREBUILT_VOICES: VoiceProfile[] = [
  {
    name: 'Fenrir',
    gender: 'Male',
    styleDescription: 'Deep, commanding, and ancient.',
    recommendedTone: 'The Keeper - cold, authoritative, and epic.',
    avatarSymbol: '🐺',
    colorScheme: 'from-amber-600/20 to-orange-500/20 shadow-amber-500/10 border-orange-500/30'
  },
  {
    name: 'Charon',
    gender: 'Male',
    styleDescription: 'Grave, mechanical, and mysterious.',
    recommendedTone: 'The Observer - eerily quiet, dark, and remote.',
    avatarSymbol: '🌌',
    colorScheme: 'from-purple-600/20 to-slate-500/20 shadow-purple-500/10 border-purple-500/30'
  },
  {
    name: 'Kore',
    gender: 'Female',
    styleDescription: 'Ethereal, sweet, and radiant.',
    recommendedTone: 'The Ancient Sun - stardust whispers, hope, and balance.',
    avatarSymbol: '✨',
    colorScheme: 'from-yellow-600/20 to-amber-500/20 shadow-yellow-500/10 border-yellow-500/30'
  },
  {
    name: 'Puck',
    gender: 'Male',
    styleDescription: 'Warm, theatrical, and storytelling.',
    recommendedTone: 'The Scribe - rich, immersive, and historical.',
    avatarSymbol: '📜',
    colorScheme: 'from-emerald-600/20 to-teal-500/20 shadow-emerald-500/10 border-emerald-500/30'
  },
  {
    name: 'Zephyr',
    gender: 'Female',
    styleDescription: 'Dynamic, airy, and rhythmic.',
    recommendedTone: 'The Solar Wind - fast, sweeping, and modern.',
    avatarSymbol: '💨',
    colorScheme: 'from-cyan-600/20 to-blue-500/20 shadow-cyan-500/10 border-cyan-500/30'
  }
];

export const DEFAULT_SCRIPT_SEGMENTS = [
  {
    id: 'seg-1',
    originalText: 'The longest day of the year is drawing to its close... and the world is running out of time.',
    text: 'The longest day of the year is drawing to its close... and the world is running out of time.',
    voice: 'Fenrir' as VoiceName,
    style: 'Whispering, deep echo, dramatic',
    audioUrl: null,
    mp3Url: null,
    duration: null,
    isGenerating: false,
    error: null,
  },
  {
    id: 'seg-2',
    originalText: "As the Keeper, your flame is your life—and every action drains its energy. But you hold the ancient power to bend the solar cycle... the Time Flip.",
    text: "As the Keeper, your flame is your life—and every action drains its energy. But you hold the ancient power to bend the solar cycle... the Time Flip.",
    voice: 'Fenrir' as VoiceName,
    style: 'Grave, solemn narrative pace',
    audioUrl: null,
    mp3Url: null,
    duration: null,
    isGenerating: false,
    error: null,
  },
  {
    id: 'seg-3',
    originalText: "Behold. Day turns to Night. Obstacles that block your path in the light... dissolve into stardust under the silver moon.",
    text: "Behold. Day turns to Night. Obstacles that block your path in the light... dissolve into stardust under the silver moon.",
    voice: 'Kore' as VoiceName,
    style: 'Ethereal whisper, slow celestial tone',
    audioUrl: null,
    mp3Url: null,
    duration: null,
    isGenerating: false,
    error: null,
  },
  {
    id: 'seg-4',
    originalText: "Collect the sleeping sun fragments of the ancients to feed your flame. The longer you tarry, the faster the frost takes hold...",
    text: "Collect the sleeping sun fragments of the ancients to feed your flame. The longer you tarry, the faster the frost takes hold...",
    voice: 'Puck' as VoiceName,
    style: 'Urgent narrative shift, warnings',
    audioUrl: null,
    mp3Url: null,
    duration: null,
    isGenerating: false,
    error: null,
  },
  {
    id: 'seg-5',
    originalText: "Touch the solar beacon at the end of the threshold... and keep the cyclical balance alive. Run, Keeper... before the light fades forever.",
    text: "Touch the solar beacon at the end of the threshold... and keep the cyclical balance alive. Run, Keeper... before the light fades forever.",
    voice: 'Fenrir' as VoiceName,
    style: 'Deep echo, powerful commanding crescendo',
    audioUrl: null,
    mp3Url: null,
    duration: null,
    isGenerating: false,
    error: null,
  }
];
