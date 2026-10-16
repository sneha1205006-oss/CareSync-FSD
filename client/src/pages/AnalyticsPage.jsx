import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Download, TrendingUp, Users, Clock, Bed, 
  Activity, CheckCircle2, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';
import { api } from '../api/client';

export function AnalyticsPage() {
  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadAnalytics = async () => {
    try {
      const [kpiRes, chartsRes] = await Promise.all([
        api.get('/reports/today-kpis'),
        api.get('/reports/charts')
      ]);
      setKpis(kpiRes.kpis);
      setCharts(chartsRes);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const today = new Date().toISOString().split('T')[0];
      await api.downloadCsv('/reports/export-csv', `CareSync_Hospital_Report_${today}.csv`);
    } catch (err) {
      alert('Failed to download CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const WARD_COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-hospital-600" />
            Hospital Operations Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time outpatient throughput, consultation cycle times, and ward utilization metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAnalytics}
            className="p-2.5 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-hospital-600 hover:bg-hospital-700 shadow-md shadow-hospital-600/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Generating CSV...' : 'Export Daily CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Patients Today</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 font-mono">
            {kpis?.total_patients_today ?? '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{kpis?.completed_consultations ?? 0} consultations finished</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Waiting Time</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 font-mono">
            ~{kpis?.avg_wait_minutes ?? '--'} <span className="text-lg font-normal text-slate-500">mins</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">From token issue to consultation</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Busiest Department</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-3 truncate">
            {kpis?.busiest_department ?? '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Highest patient registration volume</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bed Occupancy Rate</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3 font-mono">
            {kpis?.bed_occupancy_rate ?? '--'}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {kpis?.occupied_beds} occupied of {kpis?.total_beds} total beds
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Department Volume Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Department Patient Volume</h3>
              <p className="text-xs text-slate-400">Total tokens issued vs completed per specialty</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {charts?.departmentBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.departmentBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="code" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="total_tokens" name="Total Patients" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No department data available
              </div>
            )}
          </div>
        </div>

        {/* Ward Bed Utilization Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Ward Bed Occupancy Distribution</h3>
              <p className="text-xs text-slate-400">Inpatient bed allocation across active wards</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {charts?.wardOccupancy?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.wardOccupancy}
                    dataKey="occupied"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {charts.wardOccupancy.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={WARD_COLORS[index % WARD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    formatter={(val, name, item) => [`${val} beds occupied`, item.payload.name]}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No ward data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ward Occupancy Progress Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">Inpatient Ward Capacity Summary</h3>
          <p className="text-xs text-slate-400">Detailed breakdown of total, occupied, available and sanitizing beds</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Ward Name</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Total Beds</th>
                <th className="px-5 py-3">Occupied</th>
                <th className="px-5 py-3">Available</th>
                <th className="px-5 py-3">Sanitizing</th>
                <th className="px-5 py-3">Occupancy %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {charts?.wardOccupancy?.map((w) => {
                const total = w.total_beds;
                const occ = total > 0 ? Math.round((w.occupied / total) * 100) : 0;
                return (
                  <tr key={w.code} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3 font-bold text-slate-800">{w.name}</td>
                    <td className="px-5 py-3 font-mono text-slate-500">{w.code}</td>
                    <td className="px-5 py-3 font-mono">{w.total_beds}</td>
                    <td className="px-5 py-3 font-mono text-rose-600 font-bold">{w.occupied}</td>
                    <td className="px-5 py-3 font-mono text-emerald-600 font-bold">{w.available}</td>
                    <td className="px-5 py-3 font-mono text-amber-600">{w.cleaning}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{occ}%</span>
                        <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full ${occ > 80 ? 'bg-rose-500' : occ > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${occ}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
