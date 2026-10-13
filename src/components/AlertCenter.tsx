import React, { useState } from 'react';
import { QCAnomaly, AlertStatus, AlertSeverity, RuleType } from '../types';
import { AlertOctagon, CheckCircle2, Clock, Wrench, Search, Filter, Sparkles, MessageSquare, ShieldAlert } from 'lucide-react';

interface AlertCenterProps {
  anomalies: QCAnomaly[];
  onUpdateStatus: (anomalyId: string, newStatus: AlertStatus, notes?: string) => void;
  onRequestGeminiDiagnosis: (anomaly: QCAnomaly) => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  anomalies,
  onUpdateStatus,
  onRequestGeminiDiagnosis,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRule, setFilterRule] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>('');

  // Filter anomalies
  const filteredAnomalies = anomalies.filter((a) => {
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (filterRule !== 'ALL' && a.ruleType !== filterRule) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        a.stationId.toLowerCase().includes(q) ||
        a.stationName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        String(a.observedValue).toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleStartEditNotes = (a: QCAnomaly) => {
    setEditingNotesId(a.id);
    setTempNotes(a.investigationNotes || '');
  };

  const handleSaveNotes = (a: QCAnomaly) => {
    onUpdateStatus(a.id, a.status, tempNotes);
    setEditingNotesId(null);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Alert Center Header & Filtering */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-white">
              Automated QC Alert Dispatch & Incident Manager
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {filteredAnomalies.length} of {anomalies.length} incidents
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time automated incident queue with WMO violation forensics, status triage, and field dispatch workflows.
          </p>
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              anomalies.forEach((a) => {
                if (a.status === 'OPEN') {
                  onUpdateStatus(a.id, 'ACKNOWLEDGED');
                }
              });
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer"
          >
            Acknowledge All Open
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          <input
            type="text"
            placeholder="Search station, reading, or rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-400"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs">
          <span className="text-slate-400">Severity:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none w-full cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical (e.g. 95°C)</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs">
          <span className="text-slate-400">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none w-full cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open (Requires Action)</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="CALIBRATION_REQUIRED">Calibration Required</option>
            <option value="RESOLVED">Resolved / Cleared</option>
          </select>
        </div>

        {/* Rule Type Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs">
          <span className="text-slate-400">Rule:</span>
          <select
            value={filterRule}
            onChange={(e) => setFilterRule(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none w-full cursor-pointer"
          >
            <option value="ALL">All Rule Violations</option>
            <option value="PHYSICAL_LIMIT">Physical Limit (WMO Bounds)</option>
            <option value="PERSISTENCE_LOCKUP">Persistence (Stuck Sensor)</option>
            <option value="STEP_RATE">Step-Rate Jump</option>
            <option value="MISSING_VALUE">Missing Value</option>
            <option value="THERMODYNAMIC_CONSISTENCY">Thermodynamic Inversion</option>
          </select>
        </div>
      </div>

      {/* Incident List */}
      {filteredAnomalies.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-slate-400 text-xs">
          No anomalies matching current filter criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnomalies.map((anomaly) => {
            const isCritical = anomaly.severity === 'CRITICAL';
            const isStuck = anomaly.ruleType === 'PERSISTENCE_LOCKUP';

            return (
              <div
                key={anomaly.id}
                className={`border rounded-xl p-3.5 sm:p-4 transition-all ${
                  isCritical
                    ? 'bg-red-950/20 border-red-800/80'
                    : isStuck
                    ? 'bg-amber-950/20 border-amber-800/70'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Incident Info */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          anomaly.severity === 'CRITICAL'
                            ? 'bg-red-900 text-red-200 border border-red-700'
                            : anomaly.severity === 'HIGH'
                            ? 'bg-orange-950 text-orange-300 border border-orange-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {anomaly.severity}
                      </span>

                      <span className="text-[11px] font-mono text-cyan-300 font-semibold">
                        {anomaly.stationName} ({anomaly.stationId})
                      </span>

                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-xs font-mono text-slate-400">
                        {anomaly.timestamp.replace('T', ' ').substring(0, 16)} UTC
                      </span>

                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-[11px] font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        Rule: {anomaly.ruleType}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-white">
                      {anomaly.description}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {anomaly.scientificExplanation}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                      <span>
                        Observed: <strong className="text-white">{anomaly.observedValue}</strong>
                      </span>
                      <span>
                        Expected: <strong className="text-slate-300">{anomaly.expectedRange}</strong>
                      </span>
                      <span>
                        Deviation: <strong className="text-red-400">{anomaly.deviation}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                      <span className="text-slate-400 font-medium">Status:</span>
                      <select
                        value={anomaly.status}
                        onChange={(e) => onUpdateStatus(anomaly.id, e.target.value as AlertStatus)}
                        className={`bg-transparent font-bold focus:outline-none cursor-pointer ${
                          anomaly.status === 'OPEN'
                            ? 'text-red-400'
                            : anomaly.status === 'UNDER_INVESTIGATION'
                            ? 'text-amber-400'
                            : anomaly.status === 'ACKNOWLEDGED'
                            ? 'text-blue-400'
                            : anomaly.status === 'CALIBRATION_REQUIRED'
                            ? 'text-purple-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        <option value="OPEN" className="bg-slate-900 text-red-400">
                          OPEN
                        </option>
                        <option value="UNDER_INVESTIGATION" className="bg-slate-900 text-amber-400">
                          UNDER INVESTIGATION
                        </option>
                        <option value="ACKNOWLEDGED" className="bg-slate-900 text-blue-400">
                          ACKNOWLEDGED
                        </option>
                        <option value="CALIBRATION_REQUIRED" className="bg-slate-900 text-purple-400">
                          CALIBRATION REQUIRED
                        </option>
                        <option value="RESOLVED" className="bg-slate-900 text-emerald-400">
                          RESOLVED
                        </option>
                      </select>
                    </div>

                    {/* Gemini AI Root-Cause Diagnostic Button */}
                    <button
                      onClick={() => onRequestGeminiDiagnosis(anomaly)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Gemini Root-Cause</span>
                    </button>
                  </div>
                </div>

                {/* Engineer QA Investigation Notes Section */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  {editingNotesId === anomaly.id ? (
                    <div className="w-full flex items-center gap-2">
                      <input
                        type="text"
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        placeholder="Add engineer QA notes (e.g., dispatched tech for RTD calibration)..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handleSaveNotes(anomaly)}
                        className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 font-medium cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNotesId(null)}
                        className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-slate-400">QA Notes:</span>
                        <span className="text-slate-300 italic">
                          {anomaly.investigationNotes || 'No notes added yet.'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleStartEditNotes(anomaly)}
                        className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                      >
                        {anomaly.investigationNotes ? 'Edit Notes' : '+ Add Engineer Notes'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
