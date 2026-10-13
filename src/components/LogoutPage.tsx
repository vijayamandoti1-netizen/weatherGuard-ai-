import React from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Lock, 
  FileText, 
  Download,
  Activity
} from 'lucide-react';
import { SessionSummary, UserSession } from '../types';

interface LogoutPageProps {
  summary: SessionSummary | null;
  onReturnToLogin: () => void;
  onReturnToWorkspace: () => void;
}

export const LogoutPage: React.FC<LogoutPageProps> = ({
  summary,
  onReturnToLogin,
  onReturnToWorkspace,
}) => {
  const defaultUser: UserSession = {
    id: 'usr_default',
    name: 'Dr. Elena Vance',
    email: 'elena.vance@weatherguard.gov',
    role: 'LEAD_QA_ENGINEER',
    roleTitle: 'Lead Meteorological QA Engineer',
    stationClearance: ['STN-01', 'STN-02', 'STN-03'],
    loginTimestamp: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    sessionActions: [
      'Authenticated via WeatherGuard Security Gateway',
      'Evaluated WMO-No. 8 Physical Climatological Limits',
      'Flagged synthetic 95.2°C temperature spike at STN-01',
      'Investigated 5-epoch repeated reading persistence sequence',
      'Synchronized telemetry pass rates across AWS array',
    ],
  };

  const currentSummary: SessionSummary = summary || {
    user: defaultUser,
    durationMinutes: 24,
    actionsPerformed: defaultUser.sessionActions,
    logoutTimestamp: new Date().toISOString(),
  };

  const handleDownloadAuditReceipt = () => {
    const receiptText = `=====================================================
WEATHERGUARD AI - SESSION AUDIT LOG & SIGNOFF RECEIPT
Standard: WMO-No. 8 Guide to Instruments & Methods of Observation
Timestamp: ${currentSummary.logoutTimestamp}
=====================================================

USER IDENTITY:
- Name: ${currentSummary.user.name}
- Email: ${currentSummary.user.email}
- Clearance: ${currentSummary.user.roleTitle} (${currentSummary.user.role})
- Stations Monitored: ${currentSummary.user.stationClearance?.join(', ') || 'STN-01, STN-02, STN-03'}

SESSION METRICS:
- Session Duration: ${currentSummary.durationMinutes} minutes
- Security Status: Token revoked, telemetry bus disconnected

AUDIT TRAIL ACTIONS EXECUTED:
${currentSummary.actionsPerformed.map((act, i) => `${i + 1}. ${act}`).join('\n')}

=====================================================
DISCLOSURE: National Hackathon QA Telemetry Environment.
=====================================================`;

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weatherguard_session_signoff_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-950/20 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Brand Icon Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 shadow-xl shadow-emerald-950/40 mb-2">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Session Securely Terminated
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            You have safely signed out of the WeatherGuard AI Quality Control Gateway.
          </p>
        </div>

        {/* Debrief Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 backdrop-blur-md space-y-6">
          {/* User Sign-out Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm">
                {currentSummary.user.name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-sm text-white">{currentSummary.user.name}</div>
                <div className="text-xs text-slate-400">{currentSummary.user.roleTitle}</div>
                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                  {currentSummary.user.email}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold uppercase">
                SIGNED OUT
              </span>
              <div className="text-xs text-slate-400 font-mono mt-1 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{currentSummary.durationMinutes} min active</span>
              </div>
            </div>
          </div>

          {/* Audit Trail List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">
                Session Audit Trail & Actions Executed:
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {currentSummary.actionsPerformed.length} actions logged
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 max-h-48 overflow-y-auto">
              {currentSummary.actionsPerformed.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="leading-tight">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onReturnToLogin}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md shadow-cyan-900/30"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Log Back In</span>
              </button>

              <button
                type="button"
                onClick={onReturnToWorkspace}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer border border-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>Guest Workspace</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadAuditReceipt}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Signed Session Audit Log (.txt)</span>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Security Protocol: Token authentication cache cleared. Telemetry data feeds returned to read-only demonstration mode.
        </p>
      </div>
    </div>
  );
};
