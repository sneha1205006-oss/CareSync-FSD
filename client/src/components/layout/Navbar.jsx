import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, Users, Bed, BarChart2, Tv, Volume2, VolumeX, 
  LogOut, Shield, ChevronDown, UserCheck 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';

export function Navbar() {
  const { user, logout, login } = useAuth();
  const { connected, audioEnabled, toggleAudio } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  // If on public display, hide main nav bar or show minimal header
  if (location.pathname === '/display') {
    return null;
  }

  const navLinks = [
    { to: '/receptionist', label: 'Reception & Queue', icon: Users, roles: ['RECEPTIONIST', 'ADMIN'] },
    { to: '/doctor', label: 'Doctor Station', icon: Activity, roles: ['DOCTOR', 'ADMIN'] },
    { to: '/beds', label: 'Bed Management', icon: Bed, roles: ['WARD_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart2, roles: ['ADMIN', 'WARD_ADMIN', 'RECEPTIONIST', 'DOCTOR'] },
  ];

  const handleDemoSwitch = async (username) => {
    try {
      await login(username, 'hospital123');
      setRoleMenuOpen(false);
      // Auto route to relevant page
      if (username === 'reception') navigate('/receptionist');
      else if (username.startsWith('dr.')) navigate('/doctor');
      else if (username === 'wardadmin') navigate('/beds');
      else if (username === 'admin') navigate('/analytics');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDoctorStatusToggle = async (newStatus) => {
    if (!user || !user.doctor) return;
    try {
      await api.patch(`/doctors/${user.doctor.id}/status`, { status: newStatus });
      user.doctor.status = newStatus;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-hospital-700 to-hospital-500 flex items-center justify-center text-white shadow-md shadow-hospital-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-800 tracking-tight block leading-tight">
                  Care<span className="text-hospital-600">Sync</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  OPD Queue & Bed Tracker
                </span>
              </div>
            </Link>

            {/* Socket connection indicator */}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                connected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
              title={connected ? 'Connected to live hospital updates' : 'Reconnecting to live server...'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {connected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              const isAllowed = user && (user.role === 'ADMIN' || link.roles.includes(user.role));

              if (!isAllowed) return null;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-hospital-50 text-hospital-700 border border-hospital-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-hospital-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Audio chime toggle */}
            <button
              type="button"
              onClick={toggleAudio}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                audioEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
              title={audioEnabled ? 'Audio Chime Enabled' : 'Click to enable Audio Chime'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span className="hidden sm:inline">{audioEnabled ? 'Chime Active' : 'Enable Chime'}</span>
            </button>

            {/* Public Display Screen shortcut */}
            <Link
              to="/display"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition"
              title="Open Public Waiting-Hall Screen"
            >
              <Tv className="w-3.5 h-3.5 text-hospital-600" />
              <span>Public Display</span>
            </Link>

            {/* User Profile / Quick Role Switcher */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-hospital-600 text-white flex items-center justify-center text-xs font-bold">
                    {user.full_name ? user.full_name[0] : 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">{user.full_name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{user.role}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {roleMenuOpen && (
                  <div 
                    className="absolute right-0 top-12 z-50 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 text-xs"
                    onClick={() => setRoleMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <div className="font-bold text-slate-800">{user.full_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">@{user.username} &bull; {user.role}</div>
                    </div>

                    {/* If logged in as Doctor, availability toggle */}
                    {user.doctor && (
                      <div className="px-3 py-2 bg-slate-50 rounded-lg mb-2">
                        <div className="font-semibold text-slate-700 mb-1.5">Consultation Status:</div>
                        <div className="grid grid-cols-3 gap-1">
                          {['AVAILABLE', 'ON_BREAK', 'OFF_DUTY'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDoctorStatusToggle(st);
                              }}
                              className={`py-1 text-[10px] font-bold rounded ${
                                user.doctor.status === st
                                  ? 'bg-hospital-600 text-white shadow-xs'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {st === 'AVAILABLE' ? 'Avail' : st === 'ON_BREAK' ? 'Break' : 'Off'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="px-3 py-1 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                      Switch Demo Role
                    </div>
                    <button
                      onClick={() => handleDemoSwitch('reception')}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Reception Desk</span>
                      <span className="text-[10px] text-slate-400">Sarah</span>
                    </button>
                    <button
                      onClick={() => handleDemoSwitch('dr.sharma')}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Dr. Sharma (Cardiology)</span>
                      <span className="text-[10px] text-slate-400">Rm 101</span>
                    </button>
                    <button
                      onClick={() => handleDemoSwitch('dr.patel')}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Dr. Patel (Pediatrics)</span>
                      <span className="text-[10px] text-slate-400">Rm 104</span>
                    </button>
                    <button
                      onClick={() => handleDemoSwitch('wardadmin')}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Ward Staff (Beds)</span>
                      <span className="text-[10px] text-slate-400">Marcus</span>
                    </button>
                    <button
                      onClick={() => handleDemoSwitch('admin')}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>Hospital Admin</span>
                      <span className="text-[10px] text-slate-400">Full Access</span>
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={logout}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-bold text-white bg-hospital-600 hover:bg-hospital-700 rounded-lg shadow-sm transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
