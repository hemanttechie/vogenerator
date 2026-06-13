import { useState, ChangeEvent } from 'react';
import { 
  Flame, 
  Sun, 
  Moon, 
  RefreshCw, 
  Play, 
  Sparkles, 
  Plus, 
  Trash2, 
  HelpCircle, 
  Settings, 
  Layers, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Music, 
  Volume2, 
  ChevronRight,
  Info,
  Video,
  FileVideo,
  Upload,
  Film,
  Sliders,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  VoiceOverSegment, 
  PREBUILT_VOICES, 
  DEFAULT_SCRIPT_SEGMENTS, 
  VoiceName 
} from './types';
import AudioPlayer from './components/AudioPlayer';

export default function App() {
  const [segments, setSegments] = useState<VoiceOverSegment[]>(DEFAULT_SCRIPT_SEGMENTS);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Fenrir');
  const [pauseDuration, setPauseDuration] = useState<number>(1.2);
  
  // High-level states for merging and stitching
  const [mergedAudioUrl, setMergedAudioUrl] = useState<string | null>(null);
  const [mergedMp3Url, setMergedMp3Url] = useState<string | null>(null);
  const [mergedDuration, setMergedDuration] = useState<number | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Active scene mode for background immersion ('twilight' | 'fire' | 'night' | 'frost' | 'beacon')
  const [activeScene, setActiveScene] = useState<'twilight' | 'fire' | 'night' | 'frost' | 'beacon'>('twilight');

  // New State variables for Video Voiceover Overlay Workshop
  const [videoData, setVideoData] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [videoFormat, setVideoFormat] = useState<'mov' | 'mp4'>('mov');
  const [mixAudio, setMixAudio] = useState<boolean>(false);
  const [isCombiningVideo, setIsCombiningVideo] = useState(false);
  const [combiningError, setCombiningError] = useState<string | null>(null);
  const [combinedVideoDownloadUrl, setCombinedVideoDownloadUrl] = useState<string | null>(null);

  // File selection processor
  const handleVideoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setVideoName(file.name);
    setCombinedVideoDownloadUrl(null);
    setCombiningError(null);

    // Keep UI highly responsive by loading base64 data stream
    const reader = new FileReader();
    reader.onload = (event) => {
      setVideoData(event.target?.result as string);
    };
    reader.onerror = () => {
      setCombiningError("Could not parse the uploaded video file.");
    };
    reader.readAsDataURL(file);
  };

  // Triggers server-side stitching of current continuous soundtrack overlayed onto target video
  const handleBurnVoiceover = async () => {
    if (!videoData) {
      setCombiningError("Please upload some source video before burning!");
      return;
    }
    if (!mergedAudioUrl) {
      setCombiningError("Please stitch your narrative sequence into an active script assembly first!");
      return;
    }

    setIsCombiningVideo(true);
    setCombiningError(null);
    setCombinedVideoDownloadUrl(null);

    try {
      const response = await fetch('/api/combine-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoData: videoData,
          audioData: mergedAudioUrl, // WAV base64 string
          format: videoFormat,
          mixAudio: mixAudio
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Video overlay operation failed on render engine.");
      }

      setCombinedVideoDownloadUrl(data.downloadUrl);
    } catch (err: any) {
      setCombiningError(err.message || "Failed to finalize video render. Please check connection.");
    } finally {
      setIsCombiningVideo(false);
    }
  };

  // Modify individual segment attributes
  const updateSegmentText = (id: string, text: string) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, text } : seg));
  };

  const updateSegmentVoice = (id: string, voice: VoiceName) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, voice } : seg));
  };

  const updateSegmentStyle = (id: string, style: string) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, style } : seg));
  };

  // Generate Voiceover for a single slot
  const generateVoiceover = async (id: string) => {
    const segment = segments.find(s => s.id === id);
    if (!segment) return;

    // Trigger state changes
    setSegments(prev => prev.map(seg => seg.id === id ? { 
      ...seg, 
      isGenerating: true, 
      error: null, 
      audioUrl: null,
      mp3Url: null,
      duration: null 
    } : seg));

    try {
      const response = await fetch('/api/voiceovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: segment.text,
          voice: segment.voice,
          style: segment.style,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server returned an error generating speech.');
      }

      setSegments(prev => prev.map(seg => seg.id === id ? { 
        ...seg, 
        audioUrl: data.audioUrl, 
        mp3Url: data.mp3Url,
        duration: data.duration,
        fallback: data.fallback,
        fallbackReason: data.fallbackReason,
        isGenerating: false 
      } : seg));

      // Auto trigger scene change to fit segment topic
      if (id === 'seg-1') setActiveScene('twilight');
      if (id === 'seg-2') setActiveScene('fire');
      if (id === 'seg-3') setActiveScene('night');
      if (id === 'seg-4') setActiveScene('frost');
      if (id === 'seg-5') setActiveScene('beacon');

    } catch (err: any) {
      setSegments(prev => prev.map(seg => seg.id === id ? { 
        ...seg, 
        error: err.message || 'Network connection failed.', 
        isGenerating: false 
      } : seg));
    }
  };

  // Add a brand new segment to the sequence line
  const addNewSegment = () => {
    const newId = `seg-${Date.now()}`;
    const newSeg: VoiceOverSegment = {
      id: newId,
      originalText: '',
      text: 'Keeper, bend the cycle of life...',
      voice: selectedVoice,
      style: 'Whispering, mysterious',
      audioUrl: null,
      mp3Url: null,
      duration: null,
      isGenerating: false,
      error: null,
    };
    setSegments(prev => [...prev, newSeg]);
  };

  // Remove segment
  const removeSegment = (id: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  };

  // Merge all prepared sequence segments into one single audio composition (supports both MP3 & WAV output!)
  const handleStitchSequence = async () => {
    const validAudioSegments = segments.map(s => s.audioUrl).filter(Boolean);
    if (validAudioSegments.length === 0) {
      setMergeError('Please generate at least one voice segment before stitching!');
      return;
    }

    setIsMerging(true);
    setMergeError(null);
    setMergedAudioUrl(null);
    setMergedMp3Url(null);

    try {
      const response = await fetch('/api/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: validAudioSegments,
          pauseDuration: pauseDuration
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Composition failed on backend server.');
      }

      setMergedAudioUrl(data.audioUrl);
      setMergedMp3Url(data.mp3Url);
      setMergedDuration(data.duration);
    } catch (err: any) {
      setMergeError(err.message || 'Stitching operation failed. Please check network status.');
    } finally {
      setIsMerging(false);
    }
  };

  // Auto trigger the generation of ALL segments that don't have audio yet
  const generateAllOutstanding = async () => {
    for (const segment of segments) {
      if (!segment.audioUrl && !segment.isGenerating) {
        await generateVoiceover(segment.id);
      }
    }
  };

  // Scene details matching the Keeper's lore
  const getSceneDetails = () => {
    switch (activeScene) {
      case 'twilight':
        return {
          bgClass: 'from-[#0d1527] via-[#1a121e] to-[#070b14]',
          bannerText: 'THE SUNLIGHT WANES',
          borderColor: 'border-orange-500/20',
          glowEffect: 'bg-orange-500/5',
          description: 'The longest day is drawing to its close. The hearth grows cold, and time itself is stretching.'
        };
      case 'fire':
        return {
          bgClass: 'from-[#1a1111] via-[#2d1612] to-[#0f0909]',
          bannerText: "KEEPER'S FLAME STATE",
          borderColor: 'border-amber-500/20',
          glowEffect: 'bg-amber-500/5',
          description: 'Every action drains the eternal fire. Guard your heat, for the frost begins to whisper.'
        };
      case 'night':
        return {
          bgClass: 'from-[#050914] via-[#0b132b] to-[#010204]',
          bannerText: 'THE TIME FLIP RITUAL',
          borderColor: 'border-purple-500/20',
          glowEffect: 'bg-purple-500/5',
          description: 'Obstacles block in light, but dissolve into stardust under the silver lunar cycle.'
        };
      case 'frost':
        return {
          bgClass: 'from-[#081b29] via-[#05111d] to-[#020509]',
          bannerText: 'THE INCOMING FROST',
          borderColor: 'border-cyan-500/20',
          glowEffect: 'bg-cyan-500/5',
          description: 'Sun fragments of the ancients are sleeping. Scurry, or the frost will claim your light.'
        };
      case 'beacon':
        return {
          bgClass: 'from-[#19190d] via-[#1e1e12] to-[#080803]',
          bannerText: 'THE SOLAR BEACON',
          borderColor: 'border-yellow-500/20',
          glowEffect: 'bg-yellow-500/5',
          description: 'You touch the solar spark at the threshold. A cyclical balance is preserved.'
        };
    }
  };

  const activeSceneInfo = getSceneDetails();

  return (
    <div className={`min-h-screen bg-gradient-to-b ${activeSceneInfo.bgClass} text-slate-100 font-sans transition-all duration-700 relative overflow-hidden flex flex-col`}>
      
      {/* Decorative starry cosmos particles */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
      
      {/* Dynamic ambient heat glows */}
      <div className={`absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full filter blur-[120px] transition-all duration-700 ${activeSceneInfo.glowEffect}`}></div>

      {/* Main Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-5 h-5 text-slate-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                KEEPER'S CRUCIBLE
              </h1>
              <p className="text-xs text-gray-400 font-mono">Game Script Voice Over Center</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Quick API Key Status Monitor */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-gray-400">Gemini TTS API</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Column: Script Editor & Configuration (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Active Audio State Summary Banner */}
          <section className={`rounded-2xl border p-4 backdrop-blur-md transition-all duration-500 ${activeSceneInfo.borderColor} bg-slate-950/60`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
                {activeSceneInfo.bannerText}
              </span>
              <div className="flex gap-1.5">
                {(['twilight', 'fire', 'night', 'frost', 'beacon'] as const).map(sc => (
                  <button
                    key={sc}
                    onClick={() => setActiveScene(sc)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      activeScene === sc ? 'bg-amber-500 scale-125' : 'bg-slate-700 hover:bg-slate-500'
                    }`}
                    title={`Preview atmosphere: ${sc}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm font-display text-gray-200">{activeSceneInfo.description}</p>
          </section>

          {/* Core Scripts List */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-md">
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/40">
              <div>
                <h3 className="text-base font-semibold font-display text-gray-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Script Narrative Segments
                </h3>
                <p className="text-xs text-gray-400 mt-1">Configure narrative delivery tone & speaker profile for each script slide.</p>
              </div>
              
              <button 
                onClick={generateAllOutstanding}
                className="text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-all duration-200 flex items-center gap-1.5"
              >
                Generate All Missing
              </button>
            </div>

            {/* Render Story Segments */}
            <div className="flex flex-col gap-5">
              <AnimatePresence initial={false}>
                {segments.map((segment, index) => {
                  const activeVoiceProfile = PREBUILT_VOICES.find(v => v.name === segment.voice) || PREBUILT_VOICES[0];
                  
                  return (
                    <motion.div
                      key={segment.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/80 transition-all duration-200 relative group"
                    >
                      {/* Left vertical timeline line */}
                      <span className="absolute left-[-17px] top-[26px] bottom-[-26px] w-[1px] bg-slate-800 group-last:hidden" />

                      {/* Timeline Dot with sequence index */}
                      <div className="absolute -left-6 top-[15px] w-[11px] h-[11px] rounded-full border-2 border-slate-800 bg-slate-950 flex items-center justify-center">
                        <span className="hidden group-hover:block w-1.5 h-1.5 rounded-full bg-amber-500" />
                      </div>

                      {/* Segment Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-gray-500 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-md">
                            Segment #{index + 1}
                          </span>
                          
                          {/* Segment voice summary tag */}
                          <div className="flex items-center gap-1 text-slate-400 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/60 text-xs">
                            <span className="text-xs">{activeVoiceProfile.avatarSymbol}</span>
                            <span className="font-medium text-amber-500/90 font-mono">{activeVoiceProfile.name}</span>
                          </div>
                        </div>

                        {/* Fast Quick Settings bar */}
                        <div className="flex items-center gap-2">
                          
                          {/* Voice Actor Selector */}
                          <select
                            value={segment.voice}
                            onChange={(e) => updateSegmentVoice(segment.id, e.target.value as VoiceName)}
                            className="bg-slate-950 border border-slate-800 text-xs text-gray-300 font-mono rounded px-2 py-1 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                          >
                            {PREBUILT_VOICES.map(v => (
                              <option key={v.name} value={v.name}>
                                {v.avatarSymbol} {v.name} ({v.gender})
                              </option>
                            ))}
                          </select>

                          {/* Delete Slot Button */}
                          <button
                            onClick={() => removeSegment(segment.id)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded-md hover:bg-slate-850/60 transition-colors"
                            title="Remove script segment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Text Edit Entry Area */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-[10px] font-mono text-gray-500 mb-1">NARRATIVE SCRIPT TEXT</label>
                          <textarea
                            value={segment.text}
                            onChange={(e) => updateSegmentText(segment.id, e.target.value)}
                            placeholder="Enter script text for this slot..."
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800/80 text-sm text-gray-200 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none transition-all duration-200"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-mono text-gray-500 mb-1">VOICE TONE / STYLE DESCRIPTION (GUIDES THE NARRATION)</label>
                          <textarea
                            value={segment.style}
                            onChange={(e) => updateSegmentStyle(segment.id, e.target.value)}
                            placeholder="e.g. Whispering, ancient, dramatic cold whisper..."
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800/80 text-sm text-gray-200 rounded-lg p-2.5 focus:border-amber-500 focus:outline-none transition-all duration-200 text-amber-500/90 font-mono italic"
                          />
                          <p className="text-[10px] text-gray-500 mt-1">This context instructs the Gemini model to tune speech parameters.</p>
                        </div>
                      </div>

                      {/* Action Bar for Audio Retrieval */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2.5 border-t border-slate-800/40">
                        <div className="flex items-center gap-3">
                          {segment.audioUrl ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Synced, {segment.duration?.toFixed(1)}s
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-mono">
                              <Info className="w-3.5 h-3.5" />
                              Narrator segment silent
                            </span>
                          )}

                          {segment.error && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3 h-3" />
                              {segment.text ? segment.error : "Slide error"}
                            </span>
                          )}

                          {segment.fallback && (
                            <span 
                              className="inline-flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-md cursor-help font-mono"
                              title={segment.fallbackReason || "Active atmospheric fallback synthesized due to Gemini free tier rate limit constraints."}
                            >
                              <Sparkles className="w-3 h-3 animate-pulse text-amber-500" />
                              <span>Sound: Atmospheric Drone Fallback</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <button
                            onClick={() => generateVoiceover(segment.id)}
                            disabled={segment.isGenerating}
                            className={`w-full sm:w-auto text-xs font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ${
                              segment.isGenerating 
                                ? 'bg-slate-850 border border-slate-800 text-gray-500 cursor-not-allowed'
                                : segment.audioUrl
                                  ? 'bg-slate-800 text-amber-500 border border-amber-500/30 hover:bg-slate-700/80'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-semibold hover:brightness-110 active:scale-95'
                            }`}
                          >
                            {segment.isGenerating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Casting Voice...</span>
                              </>
                            ) : segment.audioUrl ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Regenerate Audio</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-slate-950" />
                                <span>Generate Segment Voice</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Embedded Slide Player */}
                      {segment.audioUrl && (
                        <div className="mt-4">
                          <AudioPlayer 
                            audioUrl={segment.audioUrl || ''} 
                            mp3Url={segment.mp3Url || null}
                            itemName={`Segment ${index + 1} (${segment.voice})`} 
                          />
                        </div>
                      )}

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Interactive Add Slot Section */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Default voice for new slots:</span>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
                  className="bg-slate-950 border border-slate-800 text-xs text-amber-500 font-mono rounded px-2.5 py-1"
                >
                  {PREBUILT_VOICES.map(v => (
                    <option key={v.name} value={v.name}>{v.avatarSymbol} {v.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={addNewSegment}
                className="w-full sm:w-auto text-xs bg-slate-800 hover:bg-slate-700 text-gray-200 px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-700 duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Append Story Segment</span>
              </button>
            </div>

          </div>

          {/* Video Voiceover Overlay Workshop */}
          <section className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold font-display text-gray-100 flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-500 animate-pulse" />
                Keeper's Movie Voiceover Workshop
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Upload your video, choose soundtrack mixing preferences, and burn your generated story narration directly into a synchronized cinematic file.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box A: Upload or Preview Video */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono font-bold text-gray-400">SOURCE VIDEO SELECTION</span>
                
                {!videoData ? (
                  <label className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-900/10 hover:bg-slate-900/30 transition-all duration-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px]">
                    <input 
                      type="file" 
                      accept="video/*" 
                      onChange={handleVideoFileChange} 
                      className="hidden" 
                    />
                    <Upload className="w-10 h-10 text-gray-500 mb-3" />
                    <span className="text-xs font-bold text-gray-300 block mb-1">Drag & Drop or Click to Upload Video</span>
                    <p className="text-[10px] text-gray-500 max-w-[220px]">Supports standard format video clips (.mp4, .mov, .webm)</p>
                  </label>
                ) : (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-500 font-mono truncate max-w-[200px]" title={videoName || ''}>
                        🎥 {videoName}
                      </span>
                      <button 
                        onClick={() => { setVideoData(null); setVideoName(null); setCombinedVideoDownloadUrl(null); }}
                        className="text-[10px] bg-red-950/30 text-red-400 hover:bg-red-900 hover:text-white px-2 py-0.5 rounded font-mono transition-colors"
                      >
                        Reset Video
                      </button>
                    </div>

                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-slate-800">
                      <video 
                        src={videoData} 
                        controls 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Box B: Render Controls */}
              <div className="flex flex-col gap-4 justify-between">
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-mono font-bold text-gray-400">SOUNDTRACK BURNING ENGINE</span>

                  {/* Mixing Options */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-3">
                    <span className="text-[11px] font-mono text-amber-500/90 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      Soundtrack Integration Mode
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setMixAudio(false)}
                        className={`text-xs p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                          !mixAudio 
                            ? 'bg-amber-500/10 border-amber-500/50 text-gray-100' 
                            : 'bg-slate-950/40 border-slate-800 text-gray-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-semibold text-xs text-amber-400">Pure Voiceover</span>
                        <span className="text-[9px] leading-tight text-gray-400">Completely replaces original video soundtrack</span>
                      </button>

                      <button
                        onClick={() => setMixAudio(true)}
                        className={`text-xs p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                          mixAudio 
                            ? 'bg-amber-500/10 border-amber-500/50 text-gray-100' 
                            : 'bg-slate-950/40 border-slate-800 text-gray-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-semibold text-xs text-amber-400">Ambient Mix</span>
                        <span className="text-[9px] leading-tight text-gray-400">Mixes voice-over with 30% background sound</span>
                      </button>
                    </div>
                  </div>

                  {/* Format selectors */}
                  <div className="flex items-center justify-between text-xs bg-slate-900/20 border border-slate-800/60 p-3 rounded-xl">
                    <span className="text-gray-400">Target Output Container:</span>
                    <div className="flex gap-1">
                      {(['mov', 'mp4'] as const).map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setVideoFormat(fmt)}
                          className={`px-3 py-1 rounded font-mono uppercase text-xs border transition-all duration-150 ${
                            videoFormat === fmt 
                              ? 'bg-slate-850 border-amber-500 text-amber-400' 
                              : 'bg-slate-950/60 border-slate-800 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          .{fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Action Trigger */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleBurnVoiceover}
                    disabled={isCombiningVideo || !videoData || !mergedAudioUrl}
                    className="w-full bg-gradient-to-r from-amber-550 to-orange-550 bg-amber-500 text-slate-950 disabled:bg-slate-800 disabled:text-gray-500 hover:brightness-110 active:scale-98 disabled:opacity-30 disabled:pointer-events-none font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                  >
                    {isCombiningVideo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Rendering Cinematic Movie...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-4.5 h-4.5" />
                        <span>Burn Voiceover Into Video</span>
                      </>
                    )}
                  </button>

                  {!mergedAudioUrl && (
                    <span className="text-[10px] text-orange-400/80 text-center block leading-normal">
                      ⚠️ Note: Please render the <strong>Full Assembly Sequence</strong> on the right sidebar before burning.
                    </span>
                  )}
                </div>

              </div>

            </div>

            {/* Error or Success Alert feedback panel */}
            {combiningError && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{combiningError}</span>
              </div>
            )}

            {combinedVideoDownloadUrl && (
              <div className="bg-emerald-950/45 border border-emerald-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-bold text-gray-100 block">Cinematic Render Complete!</span>
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      Your high-fidelity voice-over movie has been compiled successfully.
                    </span>
                  </div>
                </div>

                <a 
                  href={combinedVideoDownloadUrl}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold px-5 py-2.5 rounded-lg hover:brightness-110 active:scale-95 text-xs text-center transition-all inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .{videoFormat} video</span>
                </a>
              </div>
            )}

          </section>

        </div>

        {/* Right Column: Narrators & Sequencer (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Narrators Reference Panel */}
          <section className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-base font-semibold font-display text-gray-100 flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/40">
              <Volume2 className="w-4.5 h-4.5 text-amber-500" />
              Prebuilt Voice Narrators
            </h3>

            <div className="flex flex-col gap-4">
              {PREBUILT_VOICES.map(v => (
                <div 
                  key={v.name}
                  className="bg-slate-900/60 border border-slate-800/65 rounded-xl p-3 flex items-start gap-3 hover:border-amber-500/25 transition-all duration-200"
                >
                  <span className="text-2xl mt-0.5">{v.avatarSymbol}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-100 font-display">{v.name}</span>
                      <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                        v.gender === 'Male' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'
                      }`}>
                        {v.gender}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">{v.styleDescription}</p>
                    <span className="inline-block mt-1 text-[10px] text-amber-500/80 font-mono">
                      Recommended: {v.recommendedTone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sequence Assembler Section */}
          <section className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md sticky top-28">
            <h3 className="text-base font-semibold font-display text-gray-100 flex items-center gap-2 mb-4">
              <Layers className="w-4.5 h-4.5 text-amber-500" />
              Full Assembly Sequence
            </h3>

            {/* Assemble Controls */}
            <div className="flex flex-col gap-4 bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl mb-4">
              
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5 flex items-center justify-between">
                  <span>SILENCE GAPS SEPARATOR</span>
                  <span className="text-amber-500">{pauseDuration.toFixed(1)}s</span>
                </label>
                <input 
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.2"
                  value={pauseDuration}
                  onChange={(e) => setPauseDuration(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1 rounded-lg bg-slate-800"
                />
                <span className="text-[10px] text-gray-500 block mt-1">Inserts high-quality silence pauses between narrator slides.</span>
              </div>

              {/* Composition Stitch trigger */}
              <button
                onClick={handleStitchSequence}
                disabled={isMerging}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-98 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/15"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering Voiceover...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Assemble Narrative Script</span>
                  </>
                )}
              </button>

              {mergeError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mergeError}</span>
                </div>
              )}
            </div>

            {/* Render Full Combined Player */}
            {mergedAudioUrl ? (
              <div className="bg-slate-900/70 border border-emerald-500/20 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-mono font-bold uppercase mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Script Assembly Ready</span>
                </div>
                
                <AudioPlayer 
                  audioUrl={mergedAudioUrl} 
                  mp3Url={mergedMp3Url}
                  itemName="Full Composition: Keeper of the Solar Circle" 
                />

                <p className="text-[10px] text-gray-400 mt-2 text-center line-clamp-2">
                  Stitched from {segments.filter(s => s.audioUrl).length} sequence components. Total duration is ~{mergedDuration?.toFixed(1)} seconds.
                </p>
              </div>
            ) : (
              <div className="border border-dashed border-slate-800/80 p-6 rounded-xl flex flex-col items-center justify-center text-center">
                <Music className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
                <span className="text-xs font-semibold text-gray-400">No active script render found</span>
                <p className="text-[10px] text-gray-500 mt-1 max-w-[200px]">Generate speech for individual slots above, then stitch them here.</p>
              </div>
            )}

            {/* Quick Helper Lore tip */}
            <div className="mt-5 text-gray-400 bg-slate-900/30 border border-slate-800/60 p-3 rounded-xl flex gap-2">
              <Info className="w-4 h-4 text-amber-500/90 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong className="text-amber-500">Lore Creator Hint:</strong> For Segments #{1}, #{2}, and #{5}, using the deep narrator <span className="font-mono text-gray-100">Fenrir</span> creates a rich, cold cinematic prologue sequence.
              </p>
            </div>

          </section>

        </div>

      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2580 Keeper Cycle Universe. Synthesized safely with Gemini TTS Engine.</p>
          <div className="flex gap-4 font-mono text-[10px]">
            <span className="text-amber-500/70">Day-To-Night Time Flip Ritual System</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
