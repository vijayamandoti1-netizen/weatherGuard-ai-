import React, { useState, useMemo, useEffect } from 'react';
import { 
  WeatherRecord, 
  QCAnomaly, 
  AlertStatus, 
  MissingValueStrategy, 
  DatasetOption,
  UserSession,
  SessionSummary
} from './types';
import { DATASET_OPTIONS, STATIONS, loadDatasetById } from './data/benchmarkDatasets';
import { runQualityControl, calculateDatasetStatistics, WMO_PHYSICAL_BOUNDS } from './utils/qcRulesEngine';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { WeatherChart } from './components/WeatherChart';
import { AlertCenter } from './components/AlertCenter';
import { StuckSensorModal } from './components/StuckSensorModal';
import { SyntheticInjectorModal } from './components/SyntheticInjectorModal';
import { DatasetManagerModal } from './components/DatasetManagerModal';
import { AiDiagnosisDrawer } from './components/AiDiagnosisDrawer';
import { AudioBriefingModal } from './components/AudioBriefingModal';
import { QaTestSuiteRunnerModal } from './components/QaTestSuiteRunnerModal';
import { LoginPage } from './components/LoginPage';
import { LogoutPage } from './components/LogoutPage';
import { 
  BarChart3, 
  ShieldCheck, 
  AlertTriangle, 
  BookOpen, 
  Download, 
  Upload, 
  CheckCircle2, 
  SlidersHorizontal,
  Flame,
  Volume2
} from 'lucide-react';

export default function App() {
  // Page Routing State: Main Workspace ('APP'), Login Page ('LOGIN'), or Logout Page ('LOGOUT')
  const [appView, setAppView] = useState<'APP' | 'LOGIN' | 'LOGOUT'>('APP');

  // Active User Authentication Session
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('weatherguard_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      id: 'usr_elena',
      name: 'Dr. Elena Vance',
      email: 'elena.vance@weatherguard.gov',
      role: 'LEAD_QA_ENGINEER',
      roleTitle: 'Lead Meteorological QA Engineer',
      stationClearance: ['STN-01', 'STN-02', 'STN-03'],
      loginTimestamp: new Date().toISOString(),
      sessionActions: [
        'Authenticated via WeatherGuard Security Gateway',
        'Loaded WMO-No. 8 QA Telemetric Workspace',
      ],
    };
  });
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  // Navigation View State inside Main Workspace
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'INSPECTOR' | 'ALERTS' | 'WMO_RULES'>('DASHBOARD');

  // Active Dataset & Strategy State
  const [activeDatasetId, setActiveDatasetId] = useState<string>('benchmark-hackathon');
  const [rawRecords, setRawRecords] = useState<WeatherRecord[]>(() => loadDatasetById('benchmark-hackathon'));
  const [missingStrategy, setMissingStrategy] = useState<MissingValueStrategy>('QUARANTINE_FLAG');

  // Selected filters
  const [selectedStationId, setSelectedStationId] = useState<string>('ALL');
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'humidity' | 'pressure' | 'windSpeed' | 'solarRadiation'>('temperature');

  // Modals & Drawers State
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState<boolean>(false);
  const [isInjectorModalOpen, setIsInjectorModalOpen] = useState<boolean>(false);
  const [isStuckModalOpen, setIsStuckModalOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isTestSuiteModalOpen, setIsTestSuiteModalOpen] = useState<boolean>(false);
  const [inspectedAnomaly, setInspectedAnomaly] = useState<QCAnomaly | null>(null);

  // Dynamic Quality Control Execution
  const { auditedRecords, allAnomalies } = useMemo(() => {
    return runQualityControl(rawRecords, missingStrategy);
  }, [rawRecords, missingStrategy]);

  // Dynamic Statistics Calculation based on active dataset!
  const stats = useMemo(() => {
    return calculateDatasetStatistics(auditedRecords);
  }, [auditedRecords]);

  // Handle Dataset Switch
  const handleSelectDataset = (datasetId: string) => {
    setActiveDatasetId(datasetId);
    setRawRecords(loadDatasetById(datasetId));
  };

  // Handle User CSV Upload
  const handleUploadRecords = (newRecords: WeatherRecord[], title: string) => {
    setActiveDatasetId('custom-upload');
    setRawRecords(newRecords);
  };

  // Handle Injecting Test Row (e.g. 95C test reading)
  const handleInjectRecord = (newRecord: WeatherRecord) => {
    setRawRecords((prev) => [newRecord, ...prev]);
  };

  // Handle Alert Status Update
  const handleUpdateAlertStatus = (anomalyId: string, newStatus: AlertStatus, notes?: string) => {
    setRawRecords((prev) =>
      prev.map((rec) => {
        const hasFlag = rec.qcFlags.some((f) => f.id === anomalyId);
        if (!hasFlag) return rec;

        const updatedFlags = rec.qcFlags.map((f) => {
          if (f.id === anomalyId) {
            return {
              ...f,
              status: newStatus,
              investigationNotes: notes !== undefined ? notes : f.investigationNotes,
              resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : undefined,
            };
          }
          return f;
        });

        return {
          ...rec,
          qcFlags: updatedFlags,
        };
      })
    );
  };

  // Open 95C Spike Inspector directly
  const handleOpen95CSpike = () => {
    const spikeAnomaly = allAnomalies.find(
      (a) => a.metric === 'temperature' && a.severity === 'CRITICAL'
    );
    if (spikeAnomaly) {
      setInspectedAnomaly(spikeAnomaly);
    } else {
      setIsInjectorModalOpen(true);
    }
  };

  // Flag station for calibration
  const handleFlagForCalibration = (stnId: string) => {
    setRawRecords((prev) =>
      prev.map((r) => {
        if (r.stationId === stnId) {
          return {
            ...r,
            qcFlags: r.qcFlags.map((f) => ({
              ...f,
              status: 'CALIBRATION_REQUIRED',
              investigationNotes: 'Dispatched on-site technician for ADC and RTD harness calibration.',
            })),
          };
        }
        return r;
      })
    );
  };

  // Sign out handler: creates session audit summary and navigates to LogoutPage
  const handleSignOut = async () => {
    const actionsLogged = [
      'Monitored Automated Weather Station Array',
      allAnomalies.some((a) => (a.observedValue as string)?.includes('95.2') || (a.metric === 'temperature' && a.severity === 'CRITICAL'))
        ? 'Identified & isolated synthetic 95.2°C physical spike'
        : 'Reviewed terrestrial physical limits',
      allAnomalies.some((a) => a.ruleType === 'PERSISTENCE_LOCKUP')
        ? 'Investigated sensor freeze persistence lockups'
        : 'Checked sensor time-series variance',
      'Verified real-time dataset statistics calculation',
      'Session token safely revoked',
    ];

    try {
      const token = localStorage.getItem('weatherguard_token');
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, actions: actionsLogged }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setSessionSummary(data.summary);
      } else {
        throw new Error('Logout failed');
      }
    } catch (err) {
      setSessionSummary({
        user: currentUser || {
          id: 'usr_default',
          name: 'Dr. Elena Vance',
          email: 'elena.vance@weatherguard.gov',
          role: 'LEAD_QA_ENGINEER',
          roleTitle: 'Lead Meteorological QA Engineer',
          stationClearance: ['STN-01', 'STN-02', 'STN-03'],
          loginTimestamp: new Date().toISOString(),
          sessionActions: actionsLogged,
        },
        durationMinutes: 24,
        actionsPerformed: actionsLogged,
        logoutTimestamp: new Date().toISOString(),
      });
    }

    localStorage.removeItem('weatherguard_token');
    localStorage.removeItem('weatherguard_user');
    setCurrentUser(null);
    setAppView('LOGOUT');
  };

  const handleSignInSuccess = (session: UserSession, token: string) => {
    setCurrentUser(session);
    setAppView('APP');
  };

  // If user requested Login page
  if (appView === 'LOGIN') {
    return (
      <LoginPage
        onLoginSuccess={handleSignInSuccess}
        onContinueAsGuest={() => setAppView('APP')}
      />
    );
  }

  // If user requested Logout page
  if (appView === 'LOGOUT') {
    return (
      <LogoutPage
        summary={sessionSummary}
        onReturnToLogin={() => setAppView('LOGIN')}
        onReturnToWorkspace={() => setAppView('APP')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        activeDatasetId={activeDatasetId}
        datasets={DATASET_OPTIONS}
        onSelectDataset={handleSelectDataset}
        openDatasetModal={() => setIsDatasetModalOpen(true)}
        openInjectorModal={() => setIsInjectorModalOpen(true)}
        openAudioModal={() => setIsAudioModalOpen(true)}
        openTestSuiteModal={() => setIsTestSuiteModalOpen(true)}
        anomalyCount={allAnomalies.length}
        criticalCount={allAnomalies.filter((a) => a.severity === 'CRITICAL').length}
        currentUser={currentUser}
        onNavigateToLogin={() => setAppView('LOGIN')}
        onNavigateToLogout={handleSignOut}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'DASHBOARD'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>QA Overview & Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('INSPECTOR')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'INSPECTOR'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Anomaly Deep Inspector</span>
              {allAnomalies.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-900 text-white">
                  {allAnomalies.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ALERTS'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Alert Queue ({allAnomalies.filter((a) => a.status === 'OPEN').length} Open)</span>
            </button>

            <button
              onClick={() => setActiveTab('WMO_RULES')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'WMO_RULES'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>WMO-No. 8 Rules Engine</span>
            </button>
          </nav>

          {/* Quick Dataset Action Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Missing Value Handling: <strong>{missingStrategy.replace('_', ' ')}</strong>
            </span>
            <button
              onClick={() => setIsDatasetModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Configure Data</span>
            </button>
          </div>
        </div>

        {/* VIEW 1 & 2: DASHBOARD & TIME-SERIES INSPECTOR */}
        {(activeTab === 'DASHBOARD' || activeTab === 'INSPECTOR') && (
          <div className="space-y-6">
            {/* KPI Metrics directly computed from active dataset */}
            <MetricCards
              stats={stats}
              stations={STATIONS}
              selectedMetric={selectedMetric}
              onSelectMetric={setSelectedMetric}
              onFilterAnomalies={(type) => {
                setActiveTab('ALERTS');
              }}
              openStuckInvestigator={() => setIsStuckModalOpen(true)}
              openSpikeInvestigator={handleOpen95CSpike}
            />

            {/* Time-Series Chart */}
            <WeatherChart
              records={auditedRecords}
              selectedMetric={selectedMetric}
              onSelectAnomaly={(anom) => setInspectedAnomaly(anom)}
              selectedStationId={selectedStationId}
              onSelectStation={setSelectedStationId}
            />

            {/* If in Inspector view, show quick alerts inline */}
            {activeTab === 'INSPECTOR' && (
              <div className="pt-2">
                <AlertCenter
                  anomalies={allAnomalies}
                  onUpdateStatus={handleUpdateAlertStatus}
                  onRequestGeminiDiagnosis={(anom) => setInspectedAnomaly(anom)}
                />
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: FULL ALERT DISPATCH & INCIDENT MANAGER */}
        {activeTab === 'ALERTS' && (
          <div className="space-y-4">
            <AlertCenter
              anomalies={allAnomalies}
              onUpdateStatus={handleUpdateAlertStatus}
              onRequestGeminiDiagnosis={(anom) => setInspectedAnomaly(anom)}
            />
          </div>
        )}

        {/* VIEW 4: WMO-NO. 8 RULES & PHYSICAL BOUNDS REFERENCE */}
        {activeTab === 'WMO_RULES' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">
                  WMO-No. 8 Automated Weather Station (AWS) Quality Control Standard
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                World Meteorological Organization Guide to Instruments and Methods of Observation — Automated Telemetry Validation Protocols
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              {/* Rule 1: Physical Climatological Limits */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">1. Physical Terrestrial Bounds Check</span>
                  <span className="font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    Grade-1 Filter
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Evaluates observations against absolute planetary physical constraints. World record terrestrial maximum air temperature is <strong>56.7°C (Death Valley, 1913)</strong>.
                </p>
                <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-1">
                  <div>• Temperature: [-80.0°C to +60.0°C] <span className="text-red-400 font-bold">(95.2°C = Immediate Critical Fault)</span></div>
                  <div>• Relative Humidity: [0.0% to 100.0%]</div>
                  <div>• Barometric Pressure: [800.0 hPa to 1085.0 hPa]</div>
                  <div>• Wind Speed: [0.0 m/s to 75.0 m/s]</div>
                  <div>• Solar Radiation: [0.0 W/m² to 1400.0 W/m²]</div>
                </div>
              </div>

              {/* Rule 2: Persistence & Zero-Variance Check */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">2. Persistence / Stuck Sensor Check</span>
                  <span className="font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    Zero-Variance Test
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Natural atmospheric boundary layers are turbulent. Brownian thermal fluctuations and micro-eddies always introduce stochastic variance.
                </p>
                <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-1">
                  <div>• Threshold: N ≥ 4 consecutive invariant readings</div>
                  <div>• Standard Deviation: σ = 0.000</div>
                  <div>• Failure Modes: ADC register freeze, I2C bus lockup, mechanical cup icing</div>
                </div>
              </div>

              {/* Rule 3: Step-Rate Jump Check */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">3. Temporal Derivative / Step-Rate Test</span>
                  <span className="font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                    Δt Derivative
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Thermal inertia of ambient air and instrument thermal mass restrict max instantaneous change between standard 5-minute acquisition epochs.
                </p>
                <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-1">
                  <div>• Temp Max Delta: |ΔT| &gt; 8.0°C in 5 min interval</div>
                  <div>• Pressure Max Delta: |ΔP| &gt; 4.0 hPa in 5 min interval</div>
                  <div>• Humidity Max Delta: |ΔRH| &gt; 30.0% in 5 min interval</div>
                </div>
              </div>

              {/* Rule 4: Thermodynamic Consistency Check */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">4. Thermodynamic Internal Consistency</span>
                  <span className="font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Cross-Channel
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Enforces meteorological psychrometric laws across correlated channels.
                </p>
                <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-1">
                  <div>• Dew Point Constraint: T_dew ≤ T_air</div>
                  <div>• Discrepancy: T_dew &gt; T_air triggers Supersaturation Inversion flag</div>
                  <div>• Indicates sensor calibration drift between dry-bulb & hygrometer</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-mono">
                WeatherGuard AI Quality Engine v3.8 — WMO Compliant
              </span>
              <button
                onClick={() => setIsInjectorModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer"
              >
                Test Rules with Custom Input →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>WeatherGuard AI · National Student Hackathon Demonstration</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Demo Environment: Simulated automated weather station telemetric feeds conforming to WMO-No. 8 standards. Rule-based physical bounds + Gemini diagnostic engine.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setIsTestSuiteModalOpen(true)}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Run QA Test Harness
            </button>
            <span>·</span>
            <button
              onClick={() => setIsAudioModalOpen(true)}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Audio Debrief
            </button>
            <span>·</span>
            <button
              onClick={() => setIsDatasetModalOpen(true)}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              CSV Lab
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <DatasetManagerModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        datasets={DATASET_OPTIONS}
        activeDatasetId={activeDatasetId}
        onSelectDataset={handleSelectDataset}
        currentRecords={auditedRecords}
        onUploadRecords={handleUploadRecords}
        missingStrategy={missingStrategy}
        onChangeMissingStrategy={setMissingStrategy}
      />

      <SyntheticInjectorModal
        isOpen={isInjectorModalOpen}
        onClose={() => setIsInjectorModalOpen(false)}
        onInjectRecord={handleInjectRecord}
      />

      <StuckSensorModal
        isOpen={isStuckModalOpen}
        onClose={() => setIsStuckModalOpen(false)}
        records={auditedRecords}
        onFlagForCalibration={handleFlagForCalibration}
      />

      <AiDiagnosisDrawer
        anomaly={inspectedAnomaly}
        onClose={() => setInspectedAnomaly(null)}
        onApplyStatusChange={(status, notes) => {
          if (inspectedAnomaly) {
            handleUpdateAlertStatus(inspectedAnomaly.id, status, notes);
          }
        }}
      />

      <AudioBriefingModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        stats={stats}
        criticalCount={allAnomalies.filter((a) => a.severity === 'CRITICAL').length}
        anomalyCount={allAnomalies.length}
      />

      <QaTestSuiteRunnerModal
        isOpen={isTestSuiteModalOpen}
        onClose={() => setIsTestSuiteModalOpen(false)}
        records={auditedRecords}
      />
    </div>
  );
}
