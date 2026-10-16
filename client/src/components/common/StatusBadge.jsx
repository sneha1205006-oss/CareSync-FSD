import React from 'react';

export function StatusBadge({ status, type = 'queue', className = '' }) {
  if (type === 'queue') {
    switch (status) {
      case 'WAITING':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
            Waiting
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 animate-pulse ${className}`}>
            In Consultation
          </span>
        );
      case 'COMPLETED':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            Completed
          </span>
        );
      case 'SKIPPED':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200 ${className}`}>
            Skipped
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
            {status}
          </span>
        );
    }
  }

  // Bed Status
  switch (status) {
    case 'AVAILABLE':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 ${className}`}>
          Available
        </span>
      );
    case 'OCCUPIED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 ${className}`}>
          Occupied
        </span>
      );
    case 'CLEANING':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 ${className}`}>
          Cleaning / Sanitizing
        </span>
      );
    case 'RESERVED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300 ${className}`}>
          Reserved
        </span>
      );
    case 'OUT_OF_SERVICE':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300 ${className}`}>
          Out of Service
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
          {status}
        </span>
      );
  }
}
