import React, { useState, useEffect } from 'react';
import { 
  Activity, Bell, Volume2, VolumeX, Clock, Bed, AlertCircle, 
  MapPin, User, ChevronRight, Sparkles, ShieldAlert 
} from 'lucide-react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { PriorityBadge } from '../components/common/PriorityBadge';

export function PublicDisplayPage() {
  const { socket, audioEnabled, toggleAudio } = useSocket();

  const [activeTokens, setActiveTokens] = useState([]);
  const [waitingTokens, setWaitingTokens] = useState([]);
  const [departmentCounts, setDepartmentCounts] = useState([]);
  const [bedSummary, setBedSummary] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [flashingToken, setFlashingToken] = useState(null);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDisplayData = async () => {
    try {
      const [queueRes, bedRes] = await Promise.all([
        api.get('/queue/public-summary'),
        api.get('/beds/summary')
      ]);
      setActiveTokens(queueRes.activeTokens || []);
      setWaitingTokens(queueRes.waitingTokens || []);
      setDepartmentCounts(queueRes.departmentCounts || []);
      setBedSummary(bedRes);
    } catch (err) {
      console.error('Error fetching public display data:', err);
    }
  };

  useEffect(() => {
    loadDisplayData();
    // Poll every 15 seconds as a fallback safety
    const interval = setInterval(loadDisplayData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Listen to Socket.IO events for instant sound and highlight
  useEffect(() => {
    if (!socket) return;

    const handleTokenCalled = (data) => {
      setFlashingToken(data);
      loadDisplayData();
      // Remove flash effect after 8 seconds
      setTimeout(() => {
        setFlashingToken(prev => (prev?.tokenNumber === data.tokenNumber ? null : prev));
      }, 8000);
    };

    const handleQueueUpdated = () => {
      loadDisplayData();
    };

    const handleBedUpdated = () => {
      api.get('/beds/summary').then(res => setBedSummary(res)).catch(console.error);
    };

    socket.on('queue:token_called', handleTokenCalled);
    socket.on('queue:updated', handleQueueUpdated);
    socket.on('bed:updated', handleBedUpdated);

    return () => {
      socket.off('queue:token_called', handleTokenCalled);
      socket.off('queue:updated', handleQueueUpdated);
      socket.off('bed:updated', handleBedUpdated);
    };
  }, [socket]);

  // Primary active token (most recently called)
  const primaryToken = flashingToken || activeTokens[0] || null;

  return (
    <div className="min-h-screen display-gradient text-slate-100 flex flex-col justify-between selection:bg-hospital-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-hospital-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">
                Care<span className="text-hospital-400">Sync</span> Hospital
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-hospital-500/20 text-hospital-300 border border-hospital-500/30">
                LIVE WAITING HALL
              </span>
            </div>
            <p className="text-xs text-slate-400">Outpatient Queue Status & Inpatient Bed Availability</p>
          </div>
        </div>

        {/* Center: Department Waiting Counters */}
        <div className="hidden lg:flex items-center gap-2">
          {departmentCounts.map(d => (
            <div key={d.id} className="px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs flex items-center gap-2">
              <span className="font-semibold text-slate-300">{d.code}:</span>
              <span className="font-bold text-amber-400 font-mono">{d.waiting_count} waiting</span>
            </div>
          ))}
        </div>

        {/* Right: Clock & Audio Toggle */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              audioEnabled 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'Hall Audio Active' : 'Enable Chime'}</span>
          </button>

          <div className="text-right">
            <div className="text-xl font-extrabold font-mono text-white tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Body: Left 65% OPD Queue, Right 35% Bed Availability */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Section: Active Calling & Next In Line (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
          {/* NOW CALLING SPOTLIGHT CARD */}
          <div className="relative rounded-3xl overflow-hidden p-8 border-2 border-hospital-500/50 bg-gradient-to-br from-hospital-950/90 via-slate-900 to-slate-950 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                </span>
                <span className="text-xs uppercase font-black tracking-widest text-emerald-400">
                  {flashingToken ? 'JUST CALLED • PLEASE PROCEED' : 'NOW CALLING • ACTIVE CONSULTATION'}
                </span>
              </div>

              {primaryToken?.priority && (
                <PriorityBadge priority={primaryToken.priority} />
              )}
            </div>

            {primaryToken ? (
              <div className="grid sm:grid-cols-12 gap-6 items-center">
                {/* Big Token Number */}
                <div className="sm:col-span-6 text-center sm:text-left">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Token Number
                  </div>
                  <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white drop-shadow-md">
                    {primaryToken.tokenNumber || primaryToken.token_number}
                  </div>
                  <div className="text-xl font-bold text-slate-200 mt-2 truncate">
                    {primaryToken.patientName || primaryToken.patient_name}
                  </div>
                </div>

                {/* Destination Room & Doctor */}
                <div className="sm:col-span-6 bg-slate-800/60 rounded-2xl p-5 border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-hospital-500/20 text-hospital-300">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-hospital-300">Proceed to Room</div>
                      <div className="text-2xl font-black text-white font-mono">
                        {primaryToken.roomNumber || primaryToken.room_number || 'OPD Clinic'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-700/60">
                    <div className="p-2 rounded-xl bg-slate-700/40 text-slate-300">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Consulting Physician</div>
                      <div className="text-sm font-bold text-slate-200 truncate">
                        {primaryToken.doctorName || primaryToken.doctor_name || 'Attending Doctor'}
                      </div>
                      <div className="text-xs text-hospital-400">
                        {primaryToken.departmentName || primaryToken.department_name}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                <Bell className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-base font-semibold text-slate-400">Waiting for next patient call...</p>
                <p className="text-xs text-slate-600 mt-1">Please have your token slip ready.</p>
              </div>
            )}
          </div>

          {/* UPCOMING TOKENS IN QUEUE */}
          <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-hospital-400" />
                <h3 className="font-bold text-base text-white">Next Up in Queue</h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Estimated wait times are live-calculated
              </span>
            </div>

            {waitingTokens.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No patients currently waiting in line.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {waitingTokens.slice(0, 6).map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      item.priority === 'EMERGENCY'
                        ? 'border-rose-500/60 bg-rose-950/30'
                        : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-black text-lg text-white">
                        {item.token_number}
                      </span>
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <div className="text-xs font-semibold text-slate-300 truncate">{item.patient_name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1 pt-1 border-t border-slate-700/40">
                      <span>{item.department_name}</span>
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.wait_time?.label || '~15m'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Inpatient Ward Bed Availability (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Live Bed Availability</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {bedSummary?.totals?.available || 0} TOTAL AVAIL
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Real-time inpatient bed occupancy across hospital care units:
            </p>

            {/* Ward Cards List */}
            <div className="space-y-3">
              {bedSummary?.wards?.map((ward) => {
                const total = ward.total_beds_count || ward.total_beds;
                const available = ward.available_beds;
                const isCritical = ward.is_low_availability;

                return (
                  <div
                    key={ward.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCritical
                        ? 'border-rose-500/60 bg-rose-950/40'
                        : 'border-slate-800 bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200">{ward.name}</span>
                        {isCritical && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-400 bg-rose-900/60 px-1.5 py-0.5 rounded animate-pulse">
                            <ShieldAlert className="w-3 h-3" /> LOW
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">{ward.floor}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs my-2">
                      <span className="text-emerald-400 font-extrabold font-mono text-sm">
                        {available} Available
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {ward.occupied_beds} Occupied / {total} Total
                      </span>
                    </div>

                    {/* Occupancy Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isCritical
                            ? 'bg-rose-500'
                            : ward.occupancy_rate > 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ward.occupancy_rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Emergency Ticker */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> Emergency triage desk is open 24/7 on Ground Floor
            </span>
          </div>
        </div>
      </main>

      {/* Bottom Ticker */}
      <footer className="px-6 py-2.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>CareSync Hospital Real-Time Display &bull; Audio announcements active when tokens are summoned</span>
        </div>
        <div className="text-slate-500 text-[11px]">
          Please approach the nursing desk if your token is skipped
        </div>
      </footer>
    </div>
  );
}
