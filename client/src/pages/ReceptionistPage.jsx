import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, Clock, CheckCircle2, AlertCircle, RefreshCw, 
  Printer, Filter, Phone, User, Users, ChevronRight, Activity 
} from 'lucide-react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { TokenSlipModal } from '../components/queue/TokenSlipModal';

export function ReceptionistPage() {
  const { socket } = useSocket();

  // Registration Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    department_id: '',
    doctor_id: '',
    priority: 'NORMAL',
    notes: ''
  });

  // Data states
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [successToken, setSuccessToken] = useState(null);

  // Filters
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  const loadData = async () => {
    try {
      const [deptRes, docRes, queueRes] = await Promise.all([
        api.get('/departments'),
        api.get('/doctors'),
        api.get('/queue/today')
      ]);
      setDepartments(deptRes.departments || []);
      setDoctors(docRes.doctors || []);
      setQueue(queueRes.queue || []);

      // Default first department if not set
      if (!formData.department_id && deptRes.departments?.length > 0) {
        setFormData(prev => ({ ...prev, department_id: deptRes.departments[0].id }));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdate = () => {
      // Refresh queue data
      api.get('/queue/today').then(res => {
        setQueue(res.queue || []);
      }).catch(console.error);
    };

    socket.on('queue:updated', handleQueueUpdate);
    socket.on('queue:token_called', handleQueueUpdate);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
      socket.off('queue:token_called', handleQueueUpdate);
    };
  }, [socket]);

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.phone.trim() || !formData.age || !formData.department_id) {
      setError('Please fill in all required fields (Name, Age, Phone, Department).');
      return;
    }

    try {
      setRegistering(true);
      const res = await api.post('/queue/register', {
        ...formData,
        age: parseInt(formData.age, 10),
        doctor_id: formData.doctor_id ? parseInt(formData.doctor_id, 10) : null
      });

      setSuccessToken(res.token);

      // Reset form but retain department
      setFormData(prev => ({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        department_id: prev.department_id,
        doctor_id: '',
        priority: 'NORMAL',
        notes: ''
      }));

      // Refresh queue
      const qRes = await api.get('/queue/today');
      setQueue(qRes.queue || []);
    } catch (err) {
      setError(err.message || 'Failed to issue token');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelToken = async (tokenId) => {
    if (!window.confirm('Are you sure you want to cancel this token?')) return;
    try {
      await api.patch(`/queue/${tokenId}/status`, { status: 'CANCELLED' });
      const qRes = await api.get('/queue/today');
      setQueue(qRes.queue || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered queue items
  const filteredQueue = queue.filter(item => {
    const matchesDept = !selectedDeptFilter || String(item.department_id) === String(selectedDeptFilter);
    const matchesStatus = !selectedStatusFilter || item.status === selectedStatusFilter;
    const matchesSearch = !searchQuery || 
      item.token_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery);

    return matchesDept && matchesStatus && matchesSearch;
  });

  // Calculate live stats
  const totalWaiting = queue.filter(q => q.status === 'WAITING').length;
  const totalConsulting = queue.filter(q => q.status === 'IN_CONSULTATION').length;
  const totalCompleted = queue.filter(q => q.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header & Live Counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-hospital-600" />
            OPD Patient Intake & Token Issuance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Register arriving patients, assign priority triage tags, and monitor live waiting times.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-800">{totalWaiting} Waiting</span>
          </div>
          <div className="bg-sky-50 border border-sky-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-xs font-bold text-sky-800">{totalConsulting} With Doctor</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">{totalCompleted} Completed</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Fast Patient Intake Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-hospital-50 text-hospital-600">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">New Patient Registration</h2>
                <span className="text-xs text-slate-400">Issues sequential OPD token</span>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              Today: {new Date().toLocaleDateString()}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegisterPatient} className="space-y-4">
            {/* Priority Selection Pills */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Triage Priority Level *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'NORMAL', label: 'Normal', color: 'border-slate-300 hover:border-slate-400 text-slate-700' },
                  { value: 'SENIOR_CITIZEN', label: 'Senior (60+)', color: 'border-amber-300 bg-amber-50/50 text-amber-800' },
                  { value: 'PREGNANT', label: 'Maternity', color: 'border-purple-300 bg-purple-50/50 text-purple-800' },
                  { value: 'EMERGENCY', label: 'Emergency', color: 'border-rose-400 bg-rose-50 text-rose-800 font-extrabold' },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={`py-2 px-2 text-xs rounded-xl border text-center transition-all ${
                      formData.priority === p.value
                        ? 'ring-2 ring-hospital-600 font-bold shadow-xs'
                        : p.color
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {formData.priority === 'EMERGENCY' && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Emergency token will jump to head of waiting queue!
                </p>
              )}
            </div>

            {/* Department Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department *
              </label>
              <select
                required
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value, doctor_id: '' })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500 font-medium"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code}) &bull; Avg ~{d.avg_consultation_mins}m
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Specific Doctor */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Preferred Doctor (Optional)
              </label>
              <select
                value={formData.doctor_id}
                onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
              >
                <option value="">Any Available Doctor in Department</option>
                {doctors
                  .filter(doc => String(doc.department_id) === String(formData.department_id))
                  .map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.doctor_name} ({doc.room_number}) - {doc.status}
                    </option>
                  ))}
              </select>
            </div>

            {/* Patient Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
                />
              </div>
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age *</label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="e.g. 42"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1-555-0100"
                  className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
                />
              </div>
            </div>

            {/* Clinical Intake Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Complaint / Symptoms</label>
              <textarea
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Brief reason for consultation..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={registering}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-hospital-600 hover:bg-hospital-700 shadow-md shadow-hospital-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {registering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Token...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Issue OPD Token
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Queue Table & Department Filters (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Department Overview Badges */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDeptFilter('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                !selectedDeptFilter
                  ? 'bg-hospital-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Departments ({queue.length})
            </button>
            {departments.map(dept => {
              const count = queue.filter(q => q.department_id === dept.id && q.status === 'WAITING').length;
              const isSelected = String(selectedDeptFilter) === String(dept.id);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDeptFilter(isSelected ? '' : dept.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    isSelected
                      ? 'bg-hospital-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{dept.code}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20' : 'bg-slate-200 text-slate-800'}`}>
                    {count} waiting
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Status Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token, name, phone, UHID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="WAITING">Waiting</option>
                <option value="IN_CONSULTATION">In Consultation</option>
                <option value="COMPLETED">Completed</option>
                <option value="SKIPPED">Skipped</option>
              </select>

              <button
                type="button"
                onClick={loadData}
                title="Refresh Table"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Queue Items Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">Patient / UHID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Est. Wait</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-hospital-600" />
                        Loading queue...
                      </td>
                    </tr>
                  ) : filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-400">
                        No patient tokens found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          item.priority === 'EMERGENCY' && item.status === 'WAITING' ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        {/* Token Number */}
                        <td className="px-4 py-3 font-mono font-extrabold text-sm text-hospital-700">
                          {item.token_number}
                        </td>

                        {/* Patient info */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{item.patient_name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>{item.uhid}</span> &bull; <span>{item.gender}, {item.age}y</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-700 block">{item.department_name}</span>
                          <span className="text-[10px] text-slate-400">{item.room_number || 'Room TBD'}</span>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3">
                          <PriorityBadge priority={item.priority} />
                        </td>

                        {/* Estimated Wait */}
                        <td className="px-4 py-3">
                          {item.status === 'WAITING' && item.wait_time ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="w-3 h-3 text-hospital-500" />
                              {item.wait_time.label}
                            </span>
                          ) : item.status === 'IN_CONSULTATION' ? (
                            <span className="text-sky-700 font-bold flex items-center gap-1">
                              <Activity className="w-3 h-3 text-sky-500 animate-spin" /> In Room
                            </span>
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} type="queue" />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSuccessToken(item)}
                              title="Print Token Slip"
                              className="p-1 rounded text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {item.status === 'WAITING' && (
                              <button
                                type="button"
                                onClick={() => handleCancelToken(item.id)}
                                title="Cancel Token"
                                className="px-2 py-0.5 rounded text-[10px] font-semibold text-rose-600 hover:bg-rose-50 transition"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Token Slip Modal */}
      {successToken && (
        <TokenSlipModal
          token={successToken}
          onClose={() => setSuccessToken(null)}
        />
      )}
    </div>
  );
}
