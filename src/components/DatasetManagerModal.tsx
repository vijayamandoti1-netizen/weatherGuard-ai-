import React, { useState, useRef } from 'react';
import { X, Upload, Download, Database, Check, AlertTriangle, FileText, ArrowRight, Settings2 } from 'lucide-react';
import { WeatherRecord, DatasetOption, MissingValueStrategy } from '../types';
import { parseWeatherCSV, exportToCSV, downloadCSVFile } from '../utils/csvHandler';

interface DatasetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: DatasetOption[];
  activeDatasetId: string;
  onSelectDataset: (id: string) => void;
  currentRecords: WeatherRecord[];
  onUploadRecords: (records: WeatherRecord[], datasetTitle: string) => void;
  missingStrategy: MissingValueStrategy;
  onChangeMissingStrategy: (strategy: MissingValueStrategy) => void;
}

export const DatasetManagerModal: React.FC<DatasetManagerModalProps> = ({
  isOpen,
  onClose,
  datasets,
  activeDatasetId,
  onSelectDataset,
  currentRecords,
  onUploadRecords,
  missingStrategy,
  onChangeMissingStrategy,
}) => {
  const [activeTab, setActiveTab] = useState<'SWITCH' | 'UPLOAD' | 'DOWNLOAD' | 'MISSING_STRATEGY'>('SWITCH');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<WeatherRecord[] | null>(null);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseWeatherCSV(text);
        if (result.records.length === 0) {
          setUploadError('CSV contained no valid data rows.');
          return;
        }
        setParsedPreview(result.records);
        setPreviewColumns(result.detectedColumns);
        setUploadSuccess(`Successfully parsed ${result.records.length} records. Found columns: ${result.detectedColumns.join(', ')}`);
      } catch (err: any) {
        setUploadError(`Failed to parse CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUploaded = () => {
    if (parsedPreview && parsedPreview.length > 0) {
      onUploadRecords(parsedPreview, 'Custom User Uploaded Dataset');
      onClose();
    }
  };

  const handleDownload = (mode: 'clean' | 'audited') => {
    const csvContent = exportToCSV(currentRecords, mode);
    const filename = mode === 'clean' ? 'weatherguard_clean_telemetry.csv' : 'weatherguard_audited_qc_forensics.csv';
    downloadCSVFile(csvContent, filename);
  };

  const handleDownloadReport = () => {
    const criticals = currentRecords.filter((r) => r.qcStatus === 'CRITICAL_ANOMALY').length;
    const suspects = currentRecords.filter((r) => r.qcStatus === 'SUSPECT').length;
    const missings = currentRecords.filter((r) => r.qcStatus === 'MISSING').length;
    const reportText = `=====================================================
WEATHERGUARD AI - METEOROLOGICAL QA AUDIT REPORT
Standard: WMO-No. 8 Guide to Instruments and Methods of Observation
Generated At: ${new Date().toISOString()}
=====================================================

1. EXECUTIVE SUMMARY:
- Total Observations Monitored: ${currentRecords.length}
- WMO Quality Pass Rate: ${(((currentRecords.length - criticals - suspects - missings) / (currentRecords.length || 1)) * 100).toFixed(1)}%
- Critical Physical Limit Breaches: ${criticals}
- Suspect Sensor Anomaly Alerts: ${suspects}
- Missing Telemetry / Packet Drops: ${missings}

2. CRITICAL INCIDENTS FLAGGED:
${currentRecords
  .filter((r) => r.qcFlags.length > 0)
  .map(
    (r) =>
      `[${r.timestamp}] Station ${r.stationId}: ${r.qcFlags.map((f) => `${f.ruleType} -> Observed: ${f.observedValue} (${f.description})`).join(' | ')}`
  )
  .join('\n')}

=====================================================
DEMO DISCLOSURE: Simulated AWS Telemetry Benchmark Suite.
=====================================================`;

    downloadCSVFile(reportText, 'weatherguard_qa_incident_report.txt');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-600/80 text-cyan-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Dataset & CSV Forensics Lab</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  WORKSPACE DATA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Switch benchmark suites, upload external CSVs, configure missing value handling, and export audited telemetric logs
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-5 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('SWITCH')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'SWITCH'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Benchmark Suites
          </button>
          <button
            onClick={() => setActiveTab('UPLOAD')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'UPLOAD'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload CSV
          </button>
          <button
            onClick={() => setActiveTab('DOWNLOAD')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'DOWNLOAD'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Export Audited CSV
          </button>
          <button
            onClick={() => setActiveTab('MISSING_STRATEGY')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'MISSING_STRATEGY'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Missing Data Strategy
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 text-sm text-slate-200">
          {/* TAB 1: SWITCH PRESET DATASETS */}
          {activeTab === 'SWITCH' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Select a benchmark dataset to test various meteorological QA edge-cases:
              </div>
              <div className="grid grid-cols-1 gap-3">
                {datasets.map((d) => {
                  const isSelected = d.id === activeDatasetId;
                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        onSelectDataset(d.id);
                        onClose();
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{d.title}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                              {d.tag}
                            </span>
                            {d.contains95CSpike && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 border border-red-700 text-red-300 font-bold">
                                95°C SPIKE
                              </span>
                            )}
                            {d.containsStuckReadings && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300">
                                STUCK SENSOR
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {d.description}
                          </p>
                          <div className="text-[11px] text-slate-400 font-mono mt-2">
                            {d.recordCount} observations · Simulated WMO telemetry
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-1 rounded-full bg-cyan-500/20 text-cyan-400 shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD CSV */}
          {activeTab === 'UPLOAD' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Drop weather station CSV here, or click to browse
                  </div>
                  <p className="text-xs text-slate-400 max-w-md">
                    Accepts headers: timestamp/date, station_id, temperature/temp, humidity/rh, pressure/baro, wind_speed, solar_radiation. Auto-handles missing values (NA, NULL, empty).
                  </p>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {parsedPreview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Preview of First 5 Parsed Rows:
                    </span>
                    <button
                      onClick={handleApplyUploaded}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer shadow-md"
                    >
                      Apply Dataset to Workspace ({parsedPreview.length} records) →
                    </button>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto text-xs font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-2">Timestamp</th>
                          <th className="p-2">Station</th>
                          <th className="p-2">Temp (°C)</th>
                          <th className="p-2">RH (%)</th>
                          <th className="p-2">Pressure</th>
                          <th className="p-2">Wind</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {parsedPreview.slice(0, 5).map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 text-slate-300">{r.timestamp.substring(0, 19)}</td>
                            <td className="p-2 text-cyan-300">{r.stationId}</td>
                            <td className="p-2 text-white font-bold">
                              {r.temperature !== null ? `${r.temperature}°C` : 'NULL'}
                            </td>
                            <td className="p-2">{r.humidity !== null ? `${r.humidity}%` : 'NULL'}</td>
                            <td className="p-2">{r.pressure !== null ? `${r.pressure}` : 'NULL'}</td>
                            <td className="p-2">{r.windSpeed !== null ? `${r.windSpeed}` : 'NULL'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DOWNLOAD CSV */}
          {activeTab === 'DOWNLOAD' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Export datasets generated or audited by WeatherGuard AI for downstream meteorological models:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Download Clean */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-white text-sm">Clean Telemetry (RFC-4180)</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Validated dataset with missing data handled via active strategy. Suitable for ingestion into numerical weather prediction (NWP).
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload('clean')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Clean CSV
                  </button>
                </div>

                {/* Download Audited Forensics */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-white text-sm">Full Audited Forensics CSV</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Includes complete QA audit columns: QC Status, Triggered Rules, Severity, Investigation Status, and QA Engineer Notes.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload('audited')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Audited CSV
                  </button>
                </div>

                {/* Download QA Incident Report */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-white text-sm">QA Executive Report (.txt)</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Formatted ASCII meteorological QA audit summary with pass rates, rule breach counts, and flagged sensor incidents.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadReport}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download QA Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MISSING DATA STRATEGY */}
          {activeTab === 'MISSING_STRATEGY' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Configure how the quality control engine treats missing telemetric frames (nulls, NaNs, packet dropouts):
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'QUARANTINE_FLAG' as MissingValueStrategy,
                    title: 'Quarantine & Flag as Missing (WMO Strict)',
                    desc: 'Retain records as NULL and assign WMO QC Missing Flag. Does not synthesize values.',
                  },
                  {
                    id: 'LINEAR_INTERPOLATION' as MissingValueStrategy,
                    title: 'Linear Time-Series Interpolation',
                    desc: 'Calculates linear trajectory between preceding and succeeding valid samples for gaps <= 4 ticks.',
                  },
                  {
                    id: 'FORWARD_FILL' as MissingValueStrategy,
                    title: 'Forward Fill (Sample-and-Hold)',
                    desc: 'Carries last verified reading forward through the telemetry blackout period.',
                  },
                  {
                    id: 'EXCLUDE_DROP' as MissingValueStrategy,
                    title: 'Exclude / Drop Incomplete Rows',
                    desc: 'Removes records with missing values from analysis and statistical calculations.',
                  },
                ].map((strat) => {
                  const isSelected = missingStrategy === strat.id;
                  return (
                    <div
                      key={strat.id}
                      onClick={() => onChangeMissingStrategy(strat.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100 shadow-sm'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-white text-xs">{strat.title}</div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{strat.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
