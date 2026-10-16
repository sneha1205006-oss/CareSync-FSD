import React from 'react';
import { Printer, X, CheckCircle, Clock, MapPin, User, Hash } from 'lucide-react';
import { PriorityBadge } from '../common/PriorityBadge';

export function TokenSlipModal({ token, onClose }) {
  if (!token) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-hospital-700 to-hospital-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Token Issued Successfully</h3>
              <p className="text-xs text-hospital-100">CareSync Hospital OPD Desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-hospital-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-6 bg-slate-50">
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-6 text-center shadow-sm relative">
            <div className="absolute top-2 right-2">
              <PriorityBadge priority={token.priority} />
            </div>

            <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">
              {token.department_name} Department
            </div>

            {/* Big Token Number */}
            <div className="text-5xl font-extrabold text-hospital-700 tracking-tight my-3 font-mono">
              {token.token_number}
            </div>

            <div className="space-y-2 text-sm text-slate-600 border-t border-b border-slate-100 py-3 my-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><User className="w-4 h-4" /> Patient:</span>
                <span className="font-semibold text-slate-800">{token.patient_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><Hash className="w-4 h-4" /> UHID:</span>
                <span className="font-mono text-xs font-semibold text-slate-700">{token.uhid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Location:</span>
                <span className="font-medium text-slate-700">{token.room_number || 'OPD Clinic'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Date & Time:</span>
                <span className="text-xs text-slate-600">{new Date(token.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Please watch the waiting room screen or listen for your token call.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-hospital-600 hover:bg-hospital-700 rounded-lg shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Print Slip
          </button>
        </div>
      </div>
    </div>
  );
}
