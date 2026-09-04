"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isSentByMe: boolean;
}

const formatAudioTime = (seconds?: number) => {
  if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration: initialDuration, isSentByMe }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => {
    return initialDuration && isFinite(initialDuration) && initialDuration > 0 ? initialDuration : 0;
  });
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);

  // Sync initialDuration if passed later
  useEffect(() => {
    if (initialDuration && isFinite(initialDuration) && initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (initialDuration && isFinite(initialDuration) && initialDuration > 0) {
        setDuration(initialDuration);
      } else {
        // Workaround for WebM blobs in Chromium where audio.duration evaluates to Infinity
        audio.currentTime = 1e101;
        const onSeeked = () => {
          if (isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          } else if (isFinite(audio.currentTime) && audio.currentTime > 0) {
            setDuration(audio.currentTime);
          }
          audio.currentTime = 0;
          audio.removeEventListener('timeupdate', onSeeked);
        };
        audio.addEventListener('timeupdate', onSeeked, { once: true });
      }
    };

    const handleTimeUpdate = () => {
      if (isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
        if ((!duration || !isFinite(duration) || duration <= 0) && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        } else if (audio.currentTime > duration && (!initialDuration || initialDuration <= 0)) {
          setDuration(Math.ceil(audio.currentTime));
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio.currentTime > duration) {
        setDuration(Math.ceil(audio.currentTime));
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [src, initialDuration, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Audio play error:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const seekTime = Number(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const effectiveDuration = duration > 0 ? duration : (currentTime > 0 ? currentTime : 1);
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[240px] sm:min-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-md bg-[#03cafc] hover:bg-[#029ecc] text-[#0b141a] shadow-[#03cafc]/20 font-bold"
        title={isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Waveform / Scrubber Progress Bar */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={effectiveDuration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-600/70 rounded-lg appearance-none cursor-pointer accent-[#03cafc] focus:outline-none"
            style={{
              background: `linear-gradient(to right, #03cafc 0%, #03cafc ${progressPercent}%, rgba(75, 85, 99, 0.7) ${progressPercent}%, rgba(75, 85, 99, 0.7) 100%)`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-300 select-none">
          <span suppressHydrationWarning>
            {formatAudioTime(isPlaying || currentTime > 0 ? currentTime : duration)}
          </span>
          <div className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-[#03cafc] inline" />
            <button
              type="button"
              onClick={toggleSpeed}
              className="px-1.5 py-0.5 rounded-full bg-black/30 hover:bg-black/50 text-[10px] font-semibold text-[#03cafc] transition-colors cursor-pointer"
              title="Change playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
