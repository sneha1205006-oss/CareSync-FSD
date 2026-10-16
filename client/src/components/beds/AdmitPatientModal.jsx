import React, { useState } from 'react';
import { X, UserPlus, Bed, Stethoscope, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

export function AdmitPatientModal({ bed, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    admitting_doctor: '',
    diagnosis: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!bed) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Patient name and phone number are required');
      return;
    }

    try {
      setLoading(true);
      await api.post('/beds/admit', {
        bed_id: bed.id,
        ...formData,
        age: parseInt(formData.age, 10) || 30
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to admit patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-hospital-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-emerald-300" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Admit Patient to Bed</h3>
              <p className="text-xs text-hospital-100">
                {bed.bed_number} &bull; {bed.ward_name} ({bed.ward_floor})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-hospital-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Maria Gonzalez"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Age *</label>
              <input
                type="number"
                min="0"
                max="125"
                required
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="35"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-555-0199"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admitting Physician / Surgeon</label>
              <input
                type="text"
                value={formData.admitting_doctor}
                onChange={(e) => setFormData({ ...formData, admitting_doctor: e.target.value })}
                placeholder="Dr. Rajesh Sharma"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Clinical Diagnosis</label>
              <input
                type="text"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="e.g. Acute Appendicitis / Post-op observation"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-hospital-600 hover:bg-hospital-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Admitting...' : 'Confirm Admission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
