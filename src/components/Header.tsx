import React from 'react';
import { ShieldCheck, AlertTriangle, Database, Info, Volume2, Sparkles, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { DatasetOption, UserSession } from '../types';
import { User, LogIn, LogOut } from 'lucide-react';

interface HeaderProps {
  activeDatasetId: string;
  datasets: DatasetOption[];
  onSelectDataset: (id: string) => void;
  openDatasetModal: () => void;
  openInjectorModal: () => void;
  openAudioModal: () => void;
  openTestSuiteModal: () => void;
  anomalyCount: number;
  criticalCount: number;
  currentUser: UserSession | null;
  onNavigateToLogin: () => void;
  onNavigateToLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeDatasetId,
  datasets,
  onSelectDataset,
  openDatasetModal,
  openInjectorModal,
  openAudioModal,
  openTestSuiteModal,
  anomalyCount,
  criticalCount,
  currentUser,
  onNavigateToLogin,
  onNavigateToLogout,
}) => {
  const currentDataset = datasets.find((d) => d.id === activeDatasetId) || datasets[0];

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100 sticky top-0 z-30 shadow-md">
      {/* Hackathon Demo Notice Banner */}
      <div className="bg-amber-950/40 border-b border-amber-900/60 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>
            <strong className="font-semibold text-amber-200">National Hackathon QA Demo:</strong> Operating on simulated WMO-No. 8 Automated Weather Station telemetry. Algorithmic physics rules & Gemini diagnostic engine (no live hardware connection claimed).
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-amber-400/90 font-mono">Dataset: {currentDataset.tag}</span>
          <button
            onClick={openTestSuiteModal}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Run QA Regression Tests
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">WeatherGuard AI</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  WMO-No. 8 QA/QC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated Weather Station Quality Assurance & Sensor Anomaly Engine
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active Dataset Picker */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 hidden sm:inline">Suite:</span>
              <select
                value={activeDatasetId}
                onChange={(e) => onSelectDataset(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none font-medium cursor-pointer"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Manage Datasets / CSV Lab Button */}
            <button
              onClick={openDatasetModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV & Datasets</span>
            </button>

            {/* Synthetic Injector Button (95C spike verification) */}
            <button
              onClick={openInjectorModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/80 text-xs font-medium text-amber-300 transition-colors cursor-pointer"
              title="Test & inject synthetic 95°C or frozen sensor reading"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Test 95°C / Stuck Reading</span>
            </button>

            {/* Audio Debrief (TTS) */}
            <button
              onClick={openAudioModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-700/80 text-xs font-medium text-cyan-300 transition-colors cursor-pointer"
              title="Listen to QA Meteorological Audio Briefing"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audio QA Debrief</span>
            </button>

            {/* Authentication Session / User Profile */}
            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                  <div className="w-5 h-5 rounded-full bg-cyan-900 text-cyan-200 border border-cyan-700 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-white font-bold text-[11px] leading-tight truncate max-w-[110px]">
                      {currentUser.name}
                    </div>
                    <div className="text-cyan-400 font-mono text-[9px] leading-tight">
                      {currentUser.role === 'LEAD_QA_ENGINEER' ? 'LEAD QA' : currentUser.role === 'FIELD_TECHNICIAN' ? 'FIELD TECH' : 'JUDGE'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onNavigateToLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-xs font-medium text-red-300 transition-colors cursor-pointer"
                  title="Sign out of WeatherGuard QA Gateway"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onNavigateToLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-md shadow-cyan-950"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
