import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface AudioPlayerProps {
  audioUrl: string;
  mp3Url?: string | null;
  itemName: string;
  onFinish?: () => void;
  autoPlay?: boolean;
}

export default function AudioPlayer({ audioUrl, mp3Url, itemName, onFinish, autoPlay = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize and load audio URL changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);

      if (autoPlay) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.log('Autoplay blocked:', err));
      }
    }
  }, [audioUrl, autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Playback integration failed:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (onFinish) onFinish();
  };

  const handleSeekChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const clickTime = parseFloat(e.target.value);
    audioRef.current.currentTime = clickTime;
    setCurrentTime(clickTime);
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(err => console.error(err));
  };

  const formatTime = (timeSecs: number) => {
    if (isNaN(timeSecs)) return '0:00';
    const mins = Math.floor(timeSecs / 60);
    const secs = Math.floor(timeSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const triggerDownloadWav = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${itemName.toLowerCase().replace(/\s+/g, '_')}_voiceover.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerDownloadMp3 = () => {
    const link = document.createElement('a');
    link.href = mp3Url || audioUrl;
    link.download = `${itemName.toLowerCase().replace(/\s+/g, '_')}_voiceover.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4 md:p-5 shadow-xl shadow-amber-500/5 backdrop-blur-md">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        {/* Playback Controls / Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all duration-200"
            title={isPlaying ? "Pause" : "Play Voiceover"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-slate-950" />
            ) : (
              <Play className="w-5 h-5 fill-slate-950 translate-x-[2px]" />
            )}
          </button>

          <div>
            <h4 className="text-sm font-medium font-display text-gray-200 line-clamp-1">{itemName}</h4>
            <span className="text-xs font-mono text-amber-500/80">
              {isPlaying ? 'Speaking...' : 'Ready to Cast'}
            </span>
          </div>
        </div>

        {/* Waves Animation (Only triggers when audio is actually playing) */}
        <div className="flex items-center gap-1.5 h-6 px-4">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-amber-500/80 rounded-full"
              initial={{ height: 4 }}
              animate={isPlaying ? {
                height: [4, i % 2 === 0 ? 20 : 14, 8, i % 2 === 0 ? 12 : 22, 4],
              } : { height: 4 }}
              transition={{
                duration: 0.8 + i * 0.1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Utility bar for volume, reload, download */}
        <div className="flex items-center gap-4">
          <button
            onClick={restartAudio}
            className="text-gray-400 hover:text-amber-500 transition-colors p-1.5 rounded-lg hover:bg-slate-800/60"
            title="Restart playback"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-gray-400 hover:text-amber-500 transition-colors p-1.5 rounded-lg hover:bg-slate-800/60"
              title="Toggle mute"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 md:w-20 accent-amber-500 cursor-pointer h-1 rounded-lg bg-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            {mp3Url && (
              <button
                onClick={triggerDownloadMp3}
                className="flex items-center gap-1 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-semibold px-2.5 py-1.5 rounded-lg hover:brightness-110 active:scale-95 shadow-md shadow-orange-500/10 transition-all duration-200"
                title="Download MP3 voiceover"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export MP3</span>
              </button>
            )}
            <button
              onClick={triggerDownloadWav}
              className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all duration-200"
              title="Download original WAV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export WAV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Slider */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs font-mono text-gray-500 min-w-[30px]">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeekChange}
          className="flex-1 accent-amber-500 cursor-pointer h-1 rounded-lg bg-slate-800"
        />
        <span className="text-xs font-mono text-gray-500 min-w-[30px]">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
