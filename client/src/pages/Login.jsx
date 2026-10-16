import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Lock, User, AlertCircle, ArrowRight, Tv, ShieldCheck, HeartPulse, Bed, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(username, password);
      redirectByRole(user.role);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role) => {
    if (role === 'RECEPTIONIST') navigate('/receptionist');
    else if (role === 'DOCTOR') navigate('/doctor');
    else if (role === 'WARD_ADMIN') navigate('/beds');
    else navigate('/analytics');
  };

  const handleQuickDemo = async (demoUser) => {
    setError('');
    setLoading(true);
    try {
      const user = await login(demoUser, 'hospital123');
      redirectByRole(user.role);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      username: 'reception',
      role: 'Receptionist',
      name: 'Sarah Jenkins',
      desc: 'Register patients & issue OPD tokens',
      icon: User,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400'
    },
    {
      username: 'dr.sharma',
      role: 'Doctor (Cardiology)',
      name: 'Dr. Rajesh Sharma',
      desc: 'Room 101: Call next patient & consultations',
      icon: HeartPulse,
      color: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400'
    },
    {
      username: 'dr.patel',
      role: 'Doctor (Pediatrics)',
      name: 'Dr. Ananya Patel',
      desc: 'Room 104: Pediatric consultation queue',
      icon: Stethoscope,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400'
    },
    {
      username: 'wardadmin',
      role: 'Ward Staff',
      name: 'Marcus Vance',
      desc: 'Live bed tracker, admit & discharge patients',
      icon: Bed,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'
    },
    {
      username: 'admin',
      role: 'Hospital Admin',
      name: 'Director Clara Reed',
      desc: 'System analytics, occupancy charts & CSV export',
      icon: ShieldCheck,
      color: 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-4xl w-full grid md:grid-cols-5 gap-8 bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Left Side: Login Form */}
        <div className="md:col-span-3 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-hospital-700 to-hospital-500 flex items-center justify-center text-white shadow-md shadow-hospital-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-xl text-slate-800 leading-tight">
                  Care<span className="text-hospital-600">Sync</span> Ops
                </h1>
                <p className="text-xs text-slate-400 font-medium">Hospital Operations & Bed System</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Portal Sign In</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter your hospital credentials or select a quick demo role on the right.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. reception or dr.sharma"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-hospital-600 hover:bg-hospital-700 shadow-md shadow-hospital-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Operations'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Public Hall link */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Waiting hall display?</span>
            <Link
              to="/display"
              className="font-bold text-hospital-600 hover:text-hospital-700 flex items-center gap-1.5 hover:underline"
            >
              <Tv className="w-3.5 h-3.5" />
              Open Live Waiting Screen (No Login) &rarr;
            </Link>
          </div>
        </div>

        {/* Right Side: 1-Click Demo Logins */}
        <div className="md:col-span-2 bg-slate-50/80 p-8 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                1-Click Demo Access
              </span>
              <span className="text-[10px] font-mono bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full">
                Pass: hospital123
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Click any role card below to test the workflow instantly:
            </p>

            <div className="space-y-2.5">
              {demoAccounts.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickDemo(acc.username)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-start gap-3 bg-white shadow-xs hover:shadow-sm ${acc.color}`}
                  >
                    <div className="p-2 rounded-lg bg-white/80 shadow-xs mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{acc.role}</span>
                        <span className="text-[10px] opacity-75 font-mono">@{acc.username}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-800">{acc.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{acc.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 text-[11px] text-slate-400 text-center">
            CareSync v1.0 &bull; Real-time Socket.IO Enabled
          </div>
        </div>
      </div>
    </div>
  );
}
