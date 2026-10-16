import React, { useState, useEffect } from 'react';
import { 
  Activity, Bell, CheckCircle2, Clock, SkipForward, User, AlertCircle, 
  Coffee, UserCheck, ShieldAlert, FileText, HeartPulse, Stethoscope, RefreshCw 
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export function DoctorPage() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(user?.doctor?.id || null);
  const [currentDoctor, setCurrentDoctor] = useState(null);

  const [activeToken, setActiveToken] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consultationTimer, setConsultationTimer] = useState(0);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [callMessage, setCallMessage] = useState('');

  // Fetch initial doctor data
  const loadDoctorsAndQueue = async () => {
    try {
      const docRes = await api.get('/doctors');
      const docs = docRes.doctors || [];
      setDoctorsList(docs);

      let doc = null;
      if (selectedDoctorId) {
        doc = docs.find(d => d.id === selectedDoctorId) || docs[0];
      } else if (user?.doctor) {
        doc = docs.find(d => d.id === user.doctor.id) || docs[0];
      } else if (docs.length > 0) {
        doc = docs[0];
      }

      if (doc) {
        setCurrentDoctor(doc);
        setSelectedDoctorId(doc.id);
        await loadDoctorQueue(doc);
      }
    } catch (err) {
      console.error('Error loading doctor view:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorQueue = async (doc) => {
    if (!doc) return;
    try {
      const res = await api.get(`/queue/today?department_id=${doc.department_id}`);
      const q = res.queue || [];
      setQueue(q);

      // Find token currently IN_CONSULTATION
      const inConsult = q.find(item => item.status === 'IN_CONSULTATION');
      setActiveToken(inConsult || null);
      if (inConsult) {
        setClinicalNotes(inConsult.notes || '');
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  useEffect(() => {
    loadDoctorsAndQueue();
  }, [selectedDoctorId]);

  // Consultation elapsed timer
  useEffect(() => {
    let interval = null;
    if (activeToken) {
      interval = setInterval(() => {
        setConsultationTimer(prev => prev + 1);
      }, 1000);
    } else {
      setConsultationTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeToken]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket || !currentDoctor) return;

    const handleQueueUpdate = () => {
      loadDoctorQueue(currentDoctor);
    };

    socket.on('queue:updated', handleQueueUpdate);
    socket.on('queue:token_called', handleQueueUpdate);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
      socket.off('queue:token_called', handleQueueUpdate);
    };
  }, [socket, currentDoctor]);

  // Doctor status toggle (Available / On Break / Off Duty)
  const handleStatusToggle = async (newStatus) => {
    if (!currentDoctor) return;
    try {
      await api.patch(`/doctors/${currentDoctor.id}/status`, { status: newStatus });
      setCurrentDoctor(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error(err);
    }
  };

  // Call Next Patient
  const handleCallNext = async () => {
    if (!currentDoctor) return;
    setActionLoading(true);
    setCallMessage('');
    try {
      const res = await api.post('/queue/call-next', {
        department_id: currentDoctor.department_id,
        doctor_id: currentDoctor.id,
        previous_token_id: activeToken ? activeToken.id : null,
        previous_action: 'COMPLETED'
      });

      if (res.token) {
        setActiveToken(res.token);
        setCallMessage(`Called ${res.token.token_number} - ${res.token.patient_name}`);
        setClinicalNotes('');
        setConsultationTimer(0);
      } else {
        setCallMessage('No waiting patients currently in queue.');
        setActiveToken(null);
      }
      await loadDoctorQueue(currentDoctor);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Re-call Token (Chime again)
  const handleRecall = async () => {
    if (!activeToken) return;
    try {
      await api.post(`/queue/${activeToken.id}/recall`);
      setCallMessage(`Chime alert sent for token ${activeToken.token_number}!`);
    } catch (err) {
      console.error(err);
    }
  };

  // Mark Consultation Complete
  const handleCompleteConsultation = async () => {
    if (!activeToken) return;
    setActionLoading(true);
    try {
      await api.patch(`/queue/${activeToken.id}/status`, {
        status: 'COMPLETED',
        notes: clinicalNotes
      });
      setActiveToken(null);
      setClinicalNotes('');
      setCallMessage(`Consultation completed for ${activeToken.token_number}`);
      await loadDoctorQueue(currentDoctor);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Skip / No Show
  const handleSkipPatient = async () => {
    if (!activeToken) return;
    if (!window.confirm('Mark this patient as Skipped / No Show?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/queue/${activeToken.id}/status`, {
        status: 'SKIPPED',
        notes: clinicalNotes ? `${clinicalNotes} (Patient did not respond to calls)` : 'No Show'
      });
      setActiveToken(null);
      setClinicalNotes('');
      setCallMessage(`Patient ${activeToken.token_number} marked as Skipped`);
      await loadDoctorQueue(currentDoctor);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const waitingQueue = queue.filter(q => q.status === 'WAITING');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner: Doctor Selection & Status Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-hospital-50 border border-hospital-200 flex items-center justify-center text-hospital-600 shadow-sm">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">
                {currentDoctor ? currentDoctor.doctor_name : 'Doctor Consultation Station'}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {currentDoctor?.room_number || 'Room TBD'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentDoctor?.specialization || 'Clinical Specialist'} &bull; {currentDoctor?.department_name} Department
            </p>
          </div>
        </div>

        {/* Doctor Switcher & Availability Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Change Doctor Dropdown for testing */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Active Physician:</span>
            <select
              value={selectedDoctorId || ''}
              onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none"
            >
              {doctorsList.map(d => (
                <option key={d.id} value={d.id}>
                  {d.doctor_name} ({d.department_code} - {d.room_number})
                </option>
              ))}
            </select>
          </div>

          {/* Availability Pills */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
            {[
              { status: 'AVAILABLE', label: 'Available', icon: UserCheck, color: 'text-emerald-700 bg-white shadow-xs' },
              { status: 'ON_BREAK', label: 'On Break', icon: Coffee, color: 'text-amber-700 bg-white shadow-xs' },
              { status: 'OFF_DUTY', label: 'Off Duty', icon: ShieldAlert, color: 'text-slate-600 bg-white shadow-xs' }
            ].map(pill => {
              const Icon = pill.icon;
              const isSelected = currentDoctor?.status === pill.status;
              return (
                <button
                  key={pill.status}
                  type="button"
                  onClick={() => handleStatusToggle(pill.status)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected ? pill.color : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {callMessage && (
        <div className="p-3 bg-hospital-50 border border-hospital-200 rounded-xl text-hospital-800 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-hospital-600 animate-bounce" />
            <span>{callMessage}</span>
          </div>
          <button onClick={() => setCallMessage('')} className="text-hospital-400 hover:text-hospital-700 text-xs">Dismiss</button>
        </div>
      )}

      {/* Main Grid: Active Consultation & Call Next on Left (7 cols), Queue on Right (5 cols) */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Patient Consultation Hub (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prominent Hero "Call Next Patient" Banner */}
          <div className="bg-gradient-to-r from-hospital-700 via-hospital-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-hospital-200 block mb-1">
                Queue Dispatcher
              </span>
              <h2 className="text-2xl font-bold tracking-tight">Ready for Next Consultation?</h2>
              <p className="text-xs text-hospital-100/80 mt-1">
                {waitingQueue.length} {waitingQueue.length === 1 ? 'patient' : 'patients'} waiting in {currentDoctor?.department_name}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCallNext}
              disabled={actionLoading || currentDoctor?.status === 'OFF_DUTY' || waitingQueue.length === 0}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-extrabold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95"
            >
              <Bell className="w-5 h-5" />
              <span>Call Next Patient</span>
            </button>
          </div>

          {/* Active Patient In Room Card */}
          {activeToken ? (
            <div className="bg-white rounded-2xl shadow-md border-2 border-hospital-200 overflow-hidden animate-call-pulse">
              <div className="bg-hospital-50 p-4 border-b border-hospital-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-hospital-800 uppercase tracking-wider">
                    Currently in {currentDoctor?.room_number?.startsWith('Room') ? currentDoctor?.room_number : `Room ${currentDoctor?.room_number || 'TBD'}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-hospital-700 bg-white px-2.5 py-1 rounded-lg border border-hospital-200">
                  <Clock className="w-3.5 h-3.5 text-hospital-600" />
                  <span>Elapsed: {formatTimer(consultationTimer)}</span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-3xl font-extrabold font-mono text-hospital-700">
                        {activeToken.token_number}
                      </span>
                      <PriorityBadge priority={activeToken.priority} />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{activeToken.patient_name}</div>
                    <div className="text-xs text-slate-500">
                      UHID: <span className="font-mono font-semibold">{activeToken.uhid}</span> &bull; {activeToken.gender}, {activeToken.age} years &bull; Tel: {activeToken.phone}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecall}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-hospital-700 bg-hospital-100 hover:bg-hospital-200 transition"
                    title="Play chime sound again on waiting hall display"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Ring Again</span>
                  </button>
                </div>

                {/* Patient Complaint / Chief Reason */}
                {activeToken.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Triage Intake Note:</span>
                    <span className="text-slate-600">{activeToken.notes}</span>
                  </div>
                )}

                {/* Clinical Notes Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-hospital-600" />
                    Consultation Summary & Prescription Notes
                  </label>
                  <textarea
                    rows="3"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Enter diagnosis, prescription, or follow-up instructions..."
                    className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500 bg-slate-50/50"
                  />
                </div>

                {/* Doctor Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleSkipPatient}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Skip / No Show</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteConsultation}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Complete & Close</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-300 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-base">Consultation Desk Empty</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Click &ldquo;Call Next Patient&rdquo; above to summon the next patient in line. The waiting hall screen will chime instantly.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Queue in this Department (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Upcoming Waiting Queue</h3>
                <p className="text-[11px] text-slate-400">Sorted by Priority & Arrival Time</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {waitingQueue.length} in line
              </span>
            </div>

            {waitingQueue.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All patient consultations in this department are currently complete!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {waitingQueue.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      item.priority === 'EMERGENCY'
                        ? 'border-rose-300 bg-rose-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-400 w-4">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-hospital-700">
                            {item.token_number}
                          </span>
                          <PriorityBadge priority={item.priority} />
                        </div>
                        <div className="font-semibold text-xs text-slate-800">{item.patient_name}</div>
                        <div className="text-[10px] text-slate-400">{item.uhid} &bull; {item.age}y</div>
                      </div>
                    </div>

                    <div className="text-right">
                      {item.wait_time && (
                        <span className="text-[11px] font-semibold text-slate-600 block">
                          {item.wait_time.label}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
