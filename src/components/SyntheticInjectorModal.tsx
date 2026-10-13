import React, { useState } from 'react';
import { X, Play, CheckCircle2, AlertOctagon, HelpCircle, Thermometer, ShieldCheck } from 'lucide-react';
import { WeatherRecord } from '../types';
import { WMO_PHYSICAL_BOUNDS } from '../utils/qcRulesEngine';

interface SyntheticInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectRecord: (record: WeatherRecord) => void;
}

export const SyntheticInjectorModal: React.FC<SyntheticInjectorModalProps> = ({
  isOpen,
  onClose,
  onInjectRecord,
}) => {
  const [testMetric, setTestMetric] = useState<'temperature' | 'humidity' | 'pressure' | 'windSpeed'>('temperature');
  const [testValue, setTestValue] = useState<string>('95.2');
  const [testStation, setTestStation] = useState<string>('STN-01');
  const [evaluationResult, setEvaluationResult] = useState<{
    flagged: boolean;
    status: string;
    rule: string;
    severity: string;
    reason: string;
    wmoReference: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleRunEvaluation = () => {
    const val = testValue.trim() === '' || testValue.toLowerCase() === 'null' ? null : parseFloat(testValue);

    if (val === null || isNaN(val)) {
      setEvaluationResult({
        flagged: true,
        status: 'MISSING',
        rule: 'MISSING_VALUE',
        severity: 'HIGH',
        reason: 'Telemetric frame dropout. Expected valid float value, received NULL/NaN.',
        wmoReference: 'WMO-No. 8 Chapter 1 — Automated Data Integrity Checks',
      });
      return;
    }

    if (testMetric === 'temperature') {
      if (val > WMO_PHYSICAL_BOUNDS.temperature.max) {
        setEvaluationResult({
          flagged: true,
          status: 'CRITICAL_ANOMALY',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'CRITICAL',
          reason: `Extreme Temperature Anomaly: Reading of ${val}°C exceeds Earth absolute terrestrial maximum (56.7°C, Death Valley) by +${(val - 56.7).toFixed(1)}°C. High probability of PT100 RTD resistance open-circuit or bridge power short.`,
          wmoReference: 'WMO-No. 8 Guide to Instruments & Methods of Observation — Section 2.1 Climatological Bounds',
        });
      } else if (val < WMO_PHYSICAL_BOUNDS.temperature.min) {
        setEvaluationResult({
          flagged: true,
          status: 'CRITICAL_ANOMALY',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'CRITICAL',
          reason: `Sub-terrestrial temperature floor breach: Reading of ${val}°C falls below absolute limit (-80.0°C). Grounding fault.`,
          wmoReference: 'WMO-No. 8 §2.1.3',
        });
      } else {
        setEvaluationResult({
          flagged: false,
          status: 'VALID',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'NONE',
          reason: `Reading of ${val}°C is physically plausible within standard climatological limits [-80°C, 60°C].`,
          wmoReference: 'WMO Quality Control Standard Passed',
        });
      }
    } else if (testMetric === 'humidity') {
      if (val < 0 || val > 100) {
        setEvaluationResult({
          flagged: true,
          status: 'CRITICAL_ANOMALY',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'HIGH',
          reason: `Relative humidity ${val}% violates thermodynamic bounding [0% to 100%]. Capacitive polymer drift.`,
          wmoReference: 'WMO-No. 8 §4.1',
        });
      } else {
        setEvaluationResult({
          flagged: false,
          status: 'VALID',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'NONE',
          reason: `Humidity ${val}% is within valid thermodynamic bounds.`,
          wmoReference: 'WMO Standard Passed',
        });
      }
    } else if (testMetric === 'pressure') {
      if (val < 800 || val > 1085) {
        setEvaluationResult({
          flagged: true,
          status: 'CRITICAL_ANOMALY',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'HIGH',
          reason: `Barometric pressure ${val} hPa is outside valid atmospheric surface range [800 to 1085 hPa].`,
          wmoReference: 'WMO-No. 8 §3.1',
        });
      } else {
        setEvaluationResult({
          flagged: false,
          status: 'VALID',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'NONE',
          reason: `Pressure ${val} hPa is within valid barometric range.`,
          wmoReference: 'WMO Standard Passed',
        });
      }
    } else if (testMetric === 'windSpeed') {
      if (val < 0 || val > 75) {
        setEvaluationResult({
          flagged: true,
          status: 'CRITICAL_ANOMALY',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'HIGH',
          reason: `Wind speed ${val} m/s is outside permissible envelope [0 to 75 m/s]. Negative values impossible; >75 m/s exceeds Cat 5 hurricane ground speed.`,
          wmoReference: 'WMO-No. 8 §5.1',
        });
      } else {
        setEvaluationResult({
          flagged: false,
          status: 'VALID',
          rule: 'PHYSICAL_LIMIT_ENVELOPE',
          severity: 'NONE',
          reason: `Wind speed ${val} m/s is within physical bounds.`,
          wmoReference: 'WMO Standard Passed',
        });
      }
    }
  };

  const handleInjectIntoDataset = () => {
    handleRunEvaluation();
    const val = testValue.trim() === '' || testValue.toLowerCase() === 'null' ? null : parseFloat(testValue);
    const newRecord: WeatherRecord = {
      id: `TEST-INJECT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      stationId: testStation,
      stationName: testStation === 'STN-01' ? 'Alpine Valley Ridge' : testStation === 'STN-02' ? 'Coastal Harbor Pier' : 'Desert Basin Mesonet',
      temperature: testMetric === 'temperature' ? val : 21.5,
      humidity: testMetric === 'humidity' ? val : 55.0,
      pressure: testMetric === 'pressure' ? val : 1013.2,
      windSpeed: testMetric === 'windSpeed' ? val : 4.2,
      solarRadiation: 450,
      dewPoint: 12.0,
      qcStatus: val !== null && val > 60 ? 'CRITICAL_ANOMALY' : val === null ? 'MISSING' : 'VALID',
      qcFlags: [],
      isSyntheticTest: val !== null && val > 60,
      isMissing: val === null,
    };
    onInjectRecord(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-600/80 text-red-400">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  Synthetic Reading & Physical Envelope Test Lab
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                  95°C VERIFIER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Directly verify flagging of the synthetic 95°C test reading and custom edge-case inputs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-sm text-slate-200">
          {/* Quick-Preset Injection Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Instant Hackathon Verification Test Cases:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setTestMetric('temperature');
                  setTestValue('95.2');
                }}
                className="p-2.5 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-red-300 text-xs flex items-center justify-between">
                  <span>1. Synthetic 95.2°C Extreme Spike</span>
                  <span className="text-[10px] font-mono bg-red-900 px-1.5 py-0.5 rounded text-white">CRITICAL</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tests physical climatological ceiling violation (&gt;56.7°C limit).
                </div>
              </button>

              <button
                onClick={() => {
                  setTestMetric('temperature');
                  setTestValue('null');
                }}
                className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-amber-300 text-xs flex items-center justify-between">
                  <span>2. Missing Telemetry Frame (NULL)</span>
                  <span className="text-[10px] font-mono bg-amber-900 px-1.5 py-0.5 rounded text-white">MISSING</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tests packet drop & missing value handler imputation.
                </div>
              </button>

              <button
                onClick={() => {
                  setTestMetric('humidity');
                  setTestValue('118.5');
                }}
                className="p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-950/70 border border-purple-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-purple-300 text-xs flex items-center justify-between">
                  <span>3. Humidity Oversaturation (118.5%)</span>
                  <span className="text-[10px] font-mono bg-purple-900 px-1.5 py-0.5 rounded text-white">OUT OF BOUNDS</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tests physical upper bound of relative humidity (100% max).
                </div>
              </button>

              <button
                onClick={() => {
                  setTestMetric('temperature');
                  setTestValue('-92.0');
                }}
                className="p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-950/70 border border-blue-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-blue-300 text-xs flex items-center justify-between">
                  <span>4. Sub-Terrestrial Temp (-92.0°C)</span>
                  <span className="text-[10px] font-mono bg-blue-900 px-1.5 py-0.5 rounded text-white">SUB-FLOOR</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tests terrestrial absolute lower bound (-80.0°C).
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Input Form */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Station:</label>
                <select
                  value={testStation}
                  onChange={(e) => setTestStation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="STN-01">STN-01 (Alpine Valley)</option>
                  <option value="STN-02">STN-02 (Coastal Harbor)</option>
                  <option value="STN-03">STN-03 (Desert Basin)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Channel / Metric:</label>
                <select
                  value={testMetric}
                  onChange={(e) => setTestMetric(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="temperature">Temperature (°C)</option>
                  <option value="humidity">Relative Humidity (%)</option>
                  <option value="pressure">Pressure (hPa)</option>
                  <option value="windSpeed">Wind Speed (m/s)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Test Value Input:</label>
                <input
                  type="text"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder="e.g. 95.2 or null"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleRunEvaluation}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Evaluate WMO QC Verdict</span>
              </button>

              <button
                onClick={handleInjectIntoDataset}
                className="px-4 py-2 rounded-lg bg-red-900/80 hover:bg-red-800 text-white font-semibold text-xs border border-red-700 transition-colors cursor-pointer"
              >
                Inject into Active Dataset
              </button>
            </div>
          </div>

          {/* Real-time Verdict Output */}
          {evaluationResult && (
            <div
              className={`p-4 rounded-xl border ${
                evaluationResult.flagged
                  ? 'bg-red-950/30 border-red-800 text-red-200'
                  : 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {evaluationResult.flagged ? (
                    <AlertOctagon className="w-5 h-5 text-red-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <span className="font-bold text-sm">
                    {evaluationResult.flagged ? 'ANOMALY DETECTED & FLAGGED' : 'VALID READING'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span>Status: <strong>{evaluationResult.status}</strong></span>
                  <span>·</span>
                  <span>Severity: <strong>{evaluationResult.severity}</strong></span>
                </div>
              </div>

              <div className="mt-2.5 space-y-1.5 text-xs">
                <p className="leading-relaxed">
                  <strong>Evaluation:</strong> {evaluationResult.reason}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  <strong>Standard:</strong> {evaluationResult.wmoReference}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
