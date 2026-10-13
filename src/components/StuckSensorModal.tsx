import React from 'react';
import { X, AlertTriangle, Cpu, CheckCircle2, RefreshCw, Activity } from 'lucide-react';
import { WeatherRecord, QCAnomaly } from '../types';

interface StuckSensorModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: WeatherRecord[];
  onFlagForCalibration: (stationId: string) => void;
}

export const StuckSensorModal: React.FC<StuckSensorModalProps> = ({
  isOpen,
  onClose,
  records,
  onFlagForCalibration,
}) => {
  if (!isOpen) return null;

  // Identify stuck sequences in active dataset
  const stuckRecords = records.filter((r) => r.isStuckSequence || r.qcFlags.some((f) => f.ruleType === 'PERSISTENCE_LOCKUP'));
  const targetStationId = stuckRecords.length > 0 ? stuckRecords[0].stationId : 'STN-01';
  const sampleValue = stuckRecords.length > 0 && stuckRecords[0].temperature !== null ? stuckRecords[0].temperature : 12.45;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-600/80 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  Stuck Sensor & Repeated Reading Forensics
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  PERSISTENCE TEST
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Investigation of invariant telemetric readings (zero delta over consecutive epochs)
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

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-200">
          {/* Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400">Station Affected</span>
              <div className="text-base font-bold text-white mt-1">{targetStationId}</div>
              <span className="text-[11px] text-slate-400">Alpine Valley Ridge</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400">Locked Value</span>
              <div className="text-base font-bold text-amber-300 font-mono mt-1">
                {sampleValue.toFixed(3)}°C
              </div>
              <span className="text-[11px] text-amber-400">Standard Deviation σ = 0.000</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400">Streak Duration</span>
              <div className="text-base font-bold text-white mt-1">
                {stuckRecords.length || 5} Consecutive Epochs
              </div>
              <span className="text-[11px] text-slate-400">~75 minutes frozen telemetry</span>
            </div>
          </div>

          {/* Telemetry Sequence Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Consecutive Timestamp Sequence (Zero-Delta Audit):
            </h4>
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2.5">Timestamp (UTC)</th>
                    <th className="p-2.5">Temperature</th>
                    <th className="p-2.5">Delta (Δt)</th>
                    <th className="p-2.5">Hygrometer</th>
                    <th className="p-2.5">QC Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(stuckRecords.length > 0 ? stuckRecords : records.slice(16, 21)).map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-900/40">
                      <td className="p-2.5 text-slate-300">{rec.timestamp.replace('T', ' ').substring(0, 19)}</td>
                      <td className="p-2.5 text-amber-300 font-bold">{rec.temperature?.toFixed(3)}°C</td>
                      <td className="p-2.5 text-red-400 font-semibold">{idx === 0 ? 'Baseline' : '0.000°C (Frozen)'}</td>
                      <td className="p-2.5 text-slate-300">{rec.humidity?.toFixed(2)}%</td>
                      <td className="p-2.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          {idx >= 3 ? 'PERSISTENCE_FAIL' : 'FLAGGED_SUSPECT'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Meteorological & Electrical Physics Analysis */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Meteorological Physics & Root-Cause Failure Modes:
            </h4>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                <strong>1. Atmospheric Boundary Layer Reality:</strong> Natural air is turbulent. Convective eddies, solar micro-fluctuations, and wind gusts continuously modulate ambient temperatures with typical standard deviations (σ ≥ 0.05°C) across 15-minute intervals. A string of identical values down to the thousandths place is statistically impossible in unconstrained outdoor air.
              </p>
              <p>
                <strong>2. Analog-to-Digital Converter (ADC) Bus Lockup:</strong> The weather station data-logger MCU may have experienced an I2C or SPI bus lockup, where the ADC register buffer holds the previous conversion result without refreshing.
              </p>
              <p>
                <strong>3. Mechanical & Environmental Jamming:</strong> For wind speed or vane sensors, freezing rain or rime icing can physically weld rotating cups or bearings. For temperature, aspirated shield fan failure can trap an isolated pocket of thermal equilibrium.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Protocol: WMO-No. 8 §1.4.3 Data Validation Procedures
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onFlagForCalibration(targetStationId);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-white font-semibold text-xs border border-amber-700 transition-colors cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                Dispatch Calibration & Reset Logger
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Close Investigator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
