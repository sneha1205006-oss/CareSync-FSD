import React, { useState } from 'react';
import { Bed, UserCheck, Sparkles, LogOut, MoreVertical, Clock, Stethoscope } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export function BedCard({ bed, onAdmit, onDischarge, onStatusChange }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Status visual styles
  const getCardStyle = () => {
    switch (bed.status) {
      case 'AVAILABLE':
        return 'border-emerald-300 bg-white hover:border-emerald-500 shadow-sm hover:shadow-emerald-100';
      case 'OCCUPIED':
        return 'border-rose-300 bg-rose-50/30 hover:border-rose-400 shadow-sm';
      case 'CLEANING':
        return 'border-amber-300 bg-amber-50/40 hover:border-amber-400 shadow-sm';
      case 'RESERVED':
        return 'border-sky-300 bg-sky-50/30 hover:border-sky-400 shadow-sm';
      case 'OUT_OF_SERVICE':
      default:
        return 'border-slate-300 bg-slate-50/60 opacity-80';
    }
  };

  const getBedIconColor = () => {
    switch (bed.status) {
      case 'AVAILABLE': return 'text-emerald-600 bg-emerald-100';
      case 'OCCUPIED': return 'text-rose-600 bg-rose-100';
      case 'CLEANING': return 'text-amber-600 bg-amber-100';
      case 'RESERVED': return 'text-sky-600 bg-sky-100';
      default: return 'text-slate-500 bg-slate-200';
    }
  };

  return (
    <div className={`relative rounded-xl border-2 p-4 transition-all duration-200 flex flex-col justify-between ${getCardStyle()}`}>
      {/* Top row: Bed Number and Status */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${getBedIconColor()}`}>
              <Bed className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-base font-mono">{bed.bed_number}</span>
              <span className="text-[10px] text-slate-500 block leading-tight">{bed.ward_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <StatusBadge status={bed.status} type="bed" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-6 z-20 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 text-xs text-slate-700"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="px-3 py-1 font-semibold text-slate-400 uppercase text-[10px]">Change Status</div>
                  {bed.status !== 'AVAILABLE' && (
                    <button
                      onClick={() => onStatusChange(bed.id, 'AVAILABLE')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-emerald-700 font-medium"
                    >
                      Mark Available
                    </button>
                  )}
                  {bed.status !== 'CLEANING' && (
                    <button
                      onClick={() => onStatusChange(bed.id, 'CLEANING')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-amber-700 font-medium"
                    >
                      Mark for Cleaning
                    </button>
                  )}
                  {bed.status !== 'RESERVED' && (
                    <button
                      onClick={() => onStatusChange(bed.id, 'RESERVED')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-sky-700 font-medium"
                    >
                      Mark Reserved
                    </button>
                  )}
                  {bed.status !== 'OUT_OF_SERVICE' && (
                    <button
                      onClick={() => onStatusChange(bed.id, 'OUT_OF_SERVICE')}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-500"
                    >
                      Mark Out of Service
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Body: Patient info or Empty status */}
        <div className="my-2 min-h-[58px]">
          {bed.status === 'OCCUPIED' && bed.patient_name ? (
            <div className="space-y-1 bg-white/80 p-2 rounded-lg border border-rose-100 text-xs">
              <div className="font-semibold text-slate-800 flex items-center justify-between">
                <span>{bed.patient_name}</span>
                <span className="text-[10px] text-slate-400 font-normal">({bed.patient_gender}, {bed.patient_age}y)</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">{bed.patient_uhid}</span>
              </div>
              {bed.diagnosis && (
                <div className="text-[11px] text-slate-600 truncate flex items-center gap-1" title={bed.diagnosis}>
                  <Stethoscope className="w-3 h-3 text-hospital-600 flex-shrink-0" />
                  <span className="truncate">{bed.diagnosis}</span>
                </div>
              )}
            </div>
          ) : bed.status === 'CLEANING' ? (
            <div className="bg-amber-100/50 p-2 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
              <div>
                <span className="font-semibold block text-[11px]">Sanitization Pending</span>
                <span className="text-[10px] text-amber-700">Awaiting housekeeping clearance</span>
              </div>
            </div>
          ) : bed.status === 'AVAILABLE' ? (
            <div className="p-2 text-xs text-emerald-700 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Ready for patient admission</span>
            </div>
          ) : (
            <div className="p-2 text-xs text-slate-500">
              {bed.notes || 'Bed unavailable'}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-end">
        {bed.status === 'AVAILABLE' && (
          <button
            type="button"
            onClick={() => onAdmit(bed)}
            className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            Admit Patient
          </button>
        )}

        {bed.status === 'OCCUPIED' && (
          <button
            type="button"
            onClick={() => onDischarge(bed.id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Discharge Patient
          </button>
        )}

        {bed.status === 'CLEANING' && (
          <button
            type="button"
            onClick={() => onStatusChange(bed.id, 'AVAILABLE')}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Mark Cleaned
          </button>
        )}

        {(bed.status === 'RESERVED' || bed.status === 'OUT_OF_SERVICE') && (
          <button
            type="button"
            onClick={() => onStatusChange(bed.id, 'AVAILABLE')}
            className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            Make Available
          </button>
        )}
      </div>
    </div>
  );
}
