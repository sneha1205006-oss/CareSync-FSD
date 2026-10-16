import React from 'react';
import { AlertCircle, Heart, UserCheck, Clock } from 'lucide-react';

export function PriorityBadge({ priority, className = '' }) {
  const norm = (priority || 'NORMAL').toUpperCase();

  switch (norm) {
    case 'EMERGENCY':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-urgent-pulse ${className}`}>
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>EMERGENCY</span>
        </span>
      );
    case 'PREGNANT':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 ${className}`}>
          <Heart className="w-3.5 h-3.5 text-purple-600" />
          <span>Maternity / Pregnant</span>
        </span>
      );
    case 'SENIOR_CITIZEN':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}>
          <UserCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Senior Citizen</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Normal</span>
        </span>
      );
  }
}
