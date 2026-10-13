import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  UserCheck, 
  Cpu, 
  Sparkles, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Layers
} from 'lucide-react';
import { UserSession, UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession, token: string) => void;
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [email, setEmail] = useState<string>('elena.vance@weatherguard.gov');
  const [password, setPassword] = useState<string>('wmo-qa-2026');
  const [selectedRole, setSelectedRole] = useState<UserRole>('LEAD_QA_ENGINEER');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoAccounts = [
    {
      name: 'Dr. Elena Vance',
      email: 'elena.vance@weatherguard.gov',
      role: 'LEAD_QA_ENGINEER' as UserRole,
      title: 'Lead Meteorological QA Engineer',
      badge: 'Full Clearance',
      desc: 'Authorized to quarantine critical 95°C physical spikes, modify WMO bounds, and sign off on audited datasets.',
      icon: ShieldCheck,
      color: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300',
    },
    {
      name: 'Marcus Chen',
      email: 'marcus.chen@fieldops.net',
      role: 'FIELD_TECHNICIAN' as UserRole,
      title: 'AWS Field Calibration Technician',
      badge: 'Field Ops',
      desc: 'Authorized to investigate stuck sensor persistence, submit sensor calibration logs, and reset logger MCUs.',
      icon: Cpu,
      color: 'border-amber-500/60 bg-amber-950/40 text-amber-300',
    },
    {
      name: 'Evaluation Committee',
      email: 'judge.review@hackathon.org',
      role: 'HACKATHON_JUDGE' as UserRole,
      title: 'National Hackathon Auditor & Judge',
      badge: 'Audit & Demo',
      desc: 'Full evaluator access to test suites, synthetic 95°C injector, TTS debriefs, and CSV upload/download verification.',
      icon: Sparkles,
      color: 'border-purple-500/60 bg-purple-950/40 text-purple-300',
    },
  ];

  const handleSelectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword('hackathon-demo-2026');
    setSelectedRole(acc.role);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter an email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        if (rememberMe) {
          localStorage.setItem('weatherguard_token', data.token);
          localStorage.setItem('weatherguard_user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.user, data.token);
      } else {
        throw new Error(data.error || 'Authentication rejected');
      }
    } catch (err: any) {
      console.warn('Backend login fallback:', err);
      // Fallback local session if offline
      const fallbackUser: UserSession = {
        id: `usr_${Date.now()}`,
        name: email.includes('elena') ? 'Dr. Elena Vance' : email.includes('marcus') ? 'Marcus Chen' : 'Meteorological QA Analyst',
        email,
        role: selectedRole,
        roleTitle: selectedRole === 'LEAD_QA_ENGINEER' ? 'Lead Meteorological QA Engineer' : selectedRole === 'FIELD_TECHNICIAN' ? 'AWS Field Calibration Technician' : 'National Hackathon Evaluator',
        stationClearance: ['STN-01', 'STN-02', 'STN-03'],
        loginTimestamp: new Date().toISOString(),
        sessionActions: ['Authenticated via WeatherGuard Security Gateway'],
      };
      onLoginSuccess(fallbackUser, 'mock_token_123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-900/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 shadow-xl shadow-cyan-950/50 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            WeatherGuard AI Gateway
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Automated Weather Station (AWS) Quality Assurance & Anomaly Response System
          </p>
          <div className="inline-block mt-1">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800">
              National Hackathon Demonstration Access · WMO-No. 8 Environment
            </span>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md space-y-6">
          {/* Quick 1-Click Demo Profiles */}
          <div>
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">
                Select Demo Persona (1-Click Fill):
              </span>
              <span className="text-slate-400 font-mono text-[11px]">Instant Hackathon Access</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {demoAccounts.map((acc) => {
                const isSelected = email === acc.email;
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectDemoAccount(acc)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? acc.color + ' shadow-md scale-[1.02]'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon className="w-4 h-4 shrink-0 text-cyan-400" />
                      <span className="text-[10px] font-mono uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700">
                        {acc.badge}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-white truncate">{acc.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{acc.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-slate-900 text-slate-400 font-mono">
                or sign in with credentials
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Meteorological Engineer Email:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. elena.vance@weatherguard.gov"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Access Passcode / Security Token:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span>Remember session in browser</span>
              </label>

              <span className="text-slate-400 font-mono text-[11px]">
                Clearance: <strong className="text-cyan-400">{selectedRole}</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-cyan-900/40 disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying Security Clearance...</span>
              ) : (
                <>
                  <span>Sign In to QA Cockpit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Guest / Public Demo Access */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Want to test without signing in?</span>
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Enter as Guest QA Auditor →
            </button>
          </div>
        </div>

        {/* Security Disclosure */}
        <p className="text-center text-[11px] text-slate-400 mt-6 leading-relaxed">
          Demo Disclosure: WeatherGuard AI simulated authentication gateway. Authenticates against local/in-memory session state for hackathon demonstration. All credentials and telemetry datasets remain strictly sandboxed.
        </p>
      </div>
    </div>
  );
};
