import React, { useState, useRef, useEffect } from 'react';
import { X, Volume2, Play, Pause, RotateCcw, Sparkles, Activity, AlertCircle } from 'lucide-react';
import { DatasetStats } from '../types';

interface AudioBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DatasetStats;
  criticalCount: number;
  anomalyCount: number;
}

export const AudioBriefingModal: React.FC<AudioBriefingModalProps> = ({
  isOpen,
  onClose,
  stats,
  criticalCount,
  anomalyCount,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const defaultBriefText = `WeatherGuard automated meteorological quality assurance debrief.
Total observations evaluated: ${stats.totalRecords}.
Quality control pass rate is currently ${stats.qcPassRate} percent.
We have identified ${anomalyCount} total telemetry anomalies, including ${criticalCount} critical physical boundary breaches.
${(stats.metrics.temperature.max ?? 0) >= 90 ? `Warning: Synthetic reading of ${stats.metrics.temperature.max} degrees Celsius flagged at station Alpha, indicating thermal sensor open circuit.` : ''}
${stats.anomalyBreakdown.persistenceLockup > 0 ? `Additionally, ${stats.anomalyBreakdown.persistenceLockup} repeated readings indicate analog to digital converter lockup.` : ''}
Immediate telemetry quarantine and field calibration recommended under WMO Guide to Instruments standards.`;

  const handleGenerateAndPlay = async () => {
    setLoadingAudio(true);
    setNotice(null);

    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: defaultBriefText,
          voice: selectedVoice,
        }),
      });
      const data = await res.json();

      if (data.success && data.audioData) {
        setAudioSource(data.audioData);
        setNotice('Generated via Gemini 3.8 Flash TTS.');
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }, 100);
      } else {
        // Fallback to client Web Speech API
        playWebSpeech(defaultBriefText);
      }
    } catch (err: any) {
      console.warn('Backend TTS error, falling back to Web Speech synthesis:', err);
      playWebSpeech(defaultBriefText);
    } finally {
      setLoadingAudio(false);
    }
  };

  const playWebSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setNotice('Synthesized via Browser Speech Engine (Gemini fallback mode).');
    } else {
      setNotice('Audio synthesis not supported in this browser window.');
    }
  };

  const handleTogglePlay = () => {
    if (audioSource && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      if (isPlaying && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      } else {
        handleGenerateAndPlay();
      }
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Hidden Audio element for server-generated audio */}
        {audioSource && (
          <audio
            ref={audioRef}
            src={audioSource}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-600/80 text-cyan-400">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">WeatherGuard Audio Debrief</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  gemini-3.8-flash-tts
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Spoken meteorological incident brief & QA station pass-rate summary
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-200">
          {/* Waveform / Visualizer simulation */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs">
              {[40, 75, 95, 60, 30, 85, 100, 65, 45, 90, 70, 50, 80, 60, 40].map((h, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(15, Math.round(h * Math.random()))}%` : '20%',
                  }}
                />
              ))}
            </div>

            <div className="text-xs font-mono text-slate-400">
              {isPlaying ? '● Broadcasting Meteorological Briefing' : 'Audio Debrief Ready'}
            </div>
          </div>

          {/* Voice Selector */}
          <div className="flex items-center justify-between text-xs bg-slate-950 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-400 font-medium">TTS Voice Persona:</span>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="Kore">Kore (Authoritative Meteorologist)</option>
              <option value="Fenrir">Fenrir (Deep Technical Lead)</option>
              <option value="Puck">Puck (Crisp Analytical Host)</option>
              <option value="Zephyr">Zephyr (Clear Observability Anchor)</option>
            </select>
          </div>

          {/* Transcript Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Incident Debrief Script:
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-sans leading-relaxed">
              {defaultBriefText}
            </div>
          </div>

          {notice && (
            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Audio Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-400 font-mono">
              Model: gemini-3.8-flash-tts
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStop}
                disabled={!isPlaying}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleTogglePlay}
                disabled={loadingAudio}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                {loadingAudio ? (
                  <span>Generating Audio...</span>
                ) : isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Debrief</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Audio Debrief</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
