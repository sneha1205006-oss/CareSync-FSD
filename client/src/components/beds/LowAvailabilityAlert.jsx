import React from 'react';
import { AlertTriangle, Bed } from 'lucide-react';

export function LowAvailabilityAlert({ wards }) {
  if (!wards || wards.length === 0) return null;

  const criticalWards = wards.filter(w => w.is_low_availability);

  if (criticalWards.length === 0) return null;

  return (
    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl shadow-sm mb-6 animate-urgent-pulse">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-rose-900">
            Critical Bed Shortage Alert ({criticalWards.length} {criticalWards.length === 1 ? 'Ward' : 'Wards'})
          </h4>
          <p className="text-xs text-rose-700 mt-0.5">
            The following inpatient areas have dropped below their minimum safety threshold:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {criticalWards.map(w => (
              <span
                key={w.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-200/80 text-rose-900"
              >
                <Bed className="w-3.5 h-3.5" />
                {w.name}: only {w.available_beds} {w.available_beds === 1 ? 'bed' : 'beds'} available (Safety limit: {w.low_bed_threshold})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
