import React, { useState, useEffect } from 'react';
import { 
  Bed, AlertTriangle, CheckCircle2, Sparkles, Filter, 
  RefreshCw, Plus, Users, ShieldAlert, Activity, ChevronRight 
} from 'lucide-react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { BedCard } from '../components/beds/BedCard';
import { AdmitPatientModal } from '../components/beds/AdmitPatientModal';
import { LowAvailabilityAlert } from '../components/beds/LowAvailabilityAlert';

export function BedManagementPage() {
  const { socket } = useSocket();

  const [wards, setWards] = useState([]);
  const [totals, setTotals] = useState({ total: 0, occupied: 0, available: 0, cleaning: 0, overall_occupancy: 0 });
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedWardFilter, setSelectedWardFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  // Modals
  const [admitBedTarget, setAdmitBedTarget] = useState(null);

  const loadBedData = async () => {
    try {
      const [summaryRes, gridRes] = await Promise.all([
        api.get('/beds/summary'),
        api.get('/beds/grid')
      ]);
      setWards(summaryRes.wards || []);
      setTotals(summaryRes.totals || {});
      setBeds(gridRes.beds || []);
    } catch (err) {
      console.error('Error fetching bed data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBedData();
  }, []);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleBedUpdate = () => {
      loadBedData();
    };

    socket.on('bed:updated', handleBedUpdate);

    return () => {
      socket.off('bed:updated', handleBedUpdate);
    };
  }, [socket]);

  // Handle direct discharge
  const handleDischarge = async (bedId) => {
    if (!window.confirm('Discharge this patient and transition bed to CLEANING?')) return;
    try {
      await api.post(`/beds/${bedId}/discharge`, {
        notes: 'Discharged via Ward Operations',
        next_status: 'CLEANING'
      });
      loadBedData();
    } catch (err) {
      alert(err.message || 'Discharge failed');
    }
  };

  // Handle status update
  const handleStatusChange = async (bedId, newStatus) => {
    try {
      await api.patch(`/beds/${bedId}/status`, { status: newStatus });
      loadBedData();
    } catch (err) {
      alert(err.message || 'Status update failed');
    }
  };

  // Filter beds
  const filteredBeds = beds.filter(b => {
    const matchesWard = !selectedWardFilter || String(b.ward_id) === String(selectedWardFilter);
    const matchesStatus = !selectedStatusFilter || b.status === selectedStatusFilter;
    return matchesWard && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bed className="w-6 h-6 text-hospital-600" />
            Inpatient Bed Tracker & Ward Allocation
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor real-time bed occupancy, admit emergency/elective patients, and track sanitization cycles.
          </p>
        </div>

        <button
          type="button"
          onClick={loadBedData}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Refresh Grid</span>
        </button>
      </div>

      {/* Critical Shortage Warning Banner */}
      <LowAvailabilityAlert wards={wards} />

      {/* Hospital Overall Bed Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Hospital Beds</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{totals.total || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across 5 specialized wards</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Available Beds</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-2 font-mono">{totals.available || 0}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Ready for immediate intake</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
            <span>Occupied Beds</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-rose-700 mt-2 font-mono">{totals.occupied || 0}</div>
          <div className="text-[11px] text-rose-600 mt-1">Active admitted patients</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
            <span>Cleaning / Sanitizing</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700 mt-2 font-mono">{totals.cleaning || 0}</div>
          <div className="text-[11px] text-amber-600 mt-1">Post-discharge clearance</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-hospital-200 shadow-xs bg-hospital-50/30">
          <div className="text-xs font-bold text-hospital-800 uppercase tracking-wider flex items-center justify-between">
            <span>Occupancy Rate</span>
            <Activity className="w-3.5 h-3.5 text-hospital-600" />
          </div>
          <div className="text-3xl font-extrabold text-hospital-800 mt-2 font-mono">{totals.overall_occupancy || 0}%</div>
          <div className="text-[11px] text-hospital-600 mt-1">Hospital-wide capacity</div>
        </div>
      </div>

      {/* Ward Tabs with Breakdown */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <button
            type="button"
            onClick={() => setSelectedWardFilter('')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              !selectedWardFilter
                ? 'bg-hospital-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Wards ({beds.length} beds)
          </button>

          {wards.map(ward => {
            const isSelected = String(selectedWardFilter) === String(ward.id);
            return (
              <button
                key={ward.id}
                type="button"
                onClick={() => setSelectedWardFilter(isSelected ? '' : ward.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                  isSelected
                    ? 'bg-hospital-600 text-white shadow-xs'
                    : ward.is_low_availability
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{ward.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : ward.is_low_availability 
                    ? 'bg-rose-200 text-rose-900 font-extrabold' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {ward.available_beds} avail ({ward.occupancy_rate}%)
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Filter & Color Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Filter Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="CLEANING">Cleaning</option>
              <option value="RESERVED">Reserved</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Available
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Occupied
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Cleaning
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded bg-sky-500 inline-block" /> Reserved
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded bg-slate-400 inline-block" /> Out of Service
            </span>
          </div>
        </div>
      </div>

      {/* Bed Grid View */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-hospital-600 mb-2" />
          <p className="text-sm text-slate-500">Loading live hospital bed allocation...</p>
        </div>
      ) : filteredBeds.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-200 text-slate-400">
          No beds found matching the chosen ward and status filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBeds.map(bed => (
            <BedCard
              key={bed.id}
              bed={bed}
              onAdmit={(target) => setAdmitBedTarget(target)}
              onDischarge={handleDischarge}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Admit Patient Modal */}
      {admitBedTarget && (
        <AdmitPatientModal
          bed={admitBedTarget}
          onClose={() => setAdmitBedTarget(null)}
          onSuccess={loadBedData}
        />
      )}
    </div>
  );
}
