import React from 'react';
import { useSafety } from '../context/SafetyContext';
import { AlertOctagon, AlertTriangle, X, Eye, MapPin, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AlertBannerToast: React.FC = () => {
  const { activeAlertToast, dismissAlertToast, acknowledgeAlert } = useSafety();
  const navigate = useNavigate();

  if (!activeAlertToast) return null;

  const isCritical = activeAlertToast.severity === 'CRITICAL';

  return (
    <aside
      className={`fixed top-24 right-6 z-50 max-w-md w-full rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
        isCritical
          ? 'bg-red-950/90 border-red-500 text-white shadow-red-950/80 ring-2 ring-red-500/50'
          : 'bg-amber-950/90 border-amber-500 text-white shadow-amber-950/80'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'} animate-pulse`}>
          {isCritical ? <AlertOctagon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
              {activeAlertToast.severity} ALERT
            </span>
            <span className="text-xs text-slate-300 font-mono">
              {new Date(activeAlertToast.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <h4 className="text-sm font-bold mt-1.5 text-white flex items-center gap-2">
            <span>{activeAlertToast.type.replace(/_/g, ' ')}</span>
            <span className="text-xs font-normal text-slate-300 font-mono">
              ({activeAlertToast.workerName || activeAlertToast.workerId})
            </span>
          </h4>

          <p className="text-xs text-slate-200 mt-1 leading-relaxed">
            {activeAlertToast.message}
          </p>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
            {activeAlertToast.workerId && (
              <button
                onClick={() => {
                  dismissAlertToast();
                  navigate(`/workers/${activeAlertToast.workerId}`);
                }}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
              >
                <Eye className="w-3.5 h-3.5" />
                View Worker
              </button>
            )}

            <button
              onClick={() => {
                dismissAlertToast();
                navigate('/locations');
              }}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
            >
              <MapPin className="w-3.5 h-3.5" />
              View Location
            </button>

            <button
              onClick={() => acknowledgeAlert(activeAlertToast.id)}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white ml-auto"
            >
              <Check className="w-3.5 h-3.5" />
              Ack
            </button>
          </div>
        </div>

        <button
          onClick={dismissAlertToast}
          className="text-slate-400 hover:text-white p-1 rounded-md"
          aria-label="Dismiss alert toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
