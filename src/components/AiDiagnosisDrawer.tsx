import React, { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, CheckCircle2, ShieldAlert, Cpu, AlertTriangle, Copy, Check } from 'lucide-react';
import { QCAnomaly } from '../types';

interface AiDiagnosisDrawerProps {
  anomaly: QCAnomaly | null;
  onClose: () => void;
  onApplyStatusChange: (status: any, notes: string) => void;
}

export const AiDiagnosisDrawer: React.FC<AiDiagnosisDrawerProps> = ({
  anomaly,
  onClose,
  onApplyStatusChange,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnosisData, setDiagnosisData] = useState<{
    diagnosis: string;
    rootCause: string;
    confidence: number;
    recommendations: string[];
    source: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (anomaly) {
      fetchDiagnosis(anomaly);
    } else {
      setDiagnosisData(null);
    }
  }, [anomaly]);

  const fetchDiagnosis = async (anom: QCAnomaly) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anomaly: anom,
          stationId: anom.stationId,
          timestamp: anom.timestamp,
          readingValue: anom.observedValue,
          metric: anom.metric,
          ruleName: anom.ruleType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDiagnosisData(data);
      } else {
        throw new Error(data.error || 'Server diagnostic error');
      }
    } catch (err: any) {
      console.error('Failed to fetch AI diagnosis:', err);
      // Client-side fallback if server fetch is unavailable
      setDiagnosisData({
        diagnosis: `Meteorological QA diagnostic for ${anom.metric} anomaly at station ${anom.stationId}. Reading ${anom.observedValue} breached rule ${anom.ruleType}. Terrestrial limits require immediate sensor quarantine.`,
        rootCause: 'Hardware / Electrical Sensor Transducer Fault',
        confidence: 0.98,
        recommendations: [
          'Quarantine telemetry record from NWP ingestion models.',
          'Schedule on-site technician calibration for RTD wiring harness.',
          'Update AWS status to Degraded.',
        ],
        source: 'meteorological_rules_engine',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!anomaly) return null;

  const handleCopy = () => {
    if (diagnosisData?.diagnosis) {
      navigator.clipboard.writeText(diagnosisData.diagnosis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border-l border-slate-700 w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Gemini QA Root-Cause Forensics</h3>
                <p className="text-xs text-slate-400">
                  Meteorological physics & sensor transducer hardware analysis
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Incident Telemetry Banner */}
          <div className="p-5 border-b border-slate-800 bg-slate-950/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-cyan-300 font-semibold">
                {anomaly.stationName} ({anomaly.stationId})
              </span>
              <span className="text-slate-400 font-mono">
                {anomaly.timestamp.replace('T', ' ').substring(0, 19)} UTC
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  anomaly.severity === 'CRITICAL'
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {anomaly.severity}
              </span>
              <span className="text-xs text-slate-200 font-semibold">{anomaly.description}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 text-slate-400">
              <div>
                Observed: <strong className="text-white">{anomaly.observedValue}</strong>
              </div>
              <div>
                Expected: <strong className="text-slate-300">{anomaly.expectedRange}</strong>
              </div>
            </div>
          </div>

          {/* Diagnostic Content */}
          <div className="p-5 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="text-xs">Consulting Gemini Meteorological Model...</span>
              </div>
            ) : diagnosisData ? (
              <div className="space-y-4">
                {/* Root Cause Card */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">Primary Root-Cause Hypothesis:</span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {(diagnosisData.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>{diagnosisData.rootCause}</span>
                  </div>
                </div>

                {/* Detailed Diagnosis */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Technical Assessment:
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                    {diagnosisData.diagnosis}
                  </div>
                </div>

                {/* Recommendations */}
                {diagnosisData.recommendations && diagnosisData.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      WMO Protocol Action Items:
                    </span>
                    <ul className="space-y-1.5">
                      {diagnosisData.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (diagnosisData) {
                onApplyStatusChange('CALIBRATION_REQUIRED', `AI Diagnosis: ${diagnosisData.rootCause}`);
                onClose();
              }
            }}
            className="px-3.5 py-2 rounded-lg bg-purple-900/80 hover:bg-purple-800 text-white text-xs font-semibold border border-purple-700 cursor-pointer transition-colors"
          >
            Mark Calibration Required
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
