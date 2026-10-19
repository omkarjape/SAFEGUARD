import React from 'react';
import { SafetyStatus, DeviceStatus, AlertSeverity } from '../types';
import { ShieldCheck, AlertTriangle, AlertOctagon, WifiOff, Activity } from 'lucide-react';

interface StatusBadgeProps {
  status: SafetyStatus | DeviceStatus | AlertSeverity | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const normalized = status.toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'SAFE':
      case 'ONLINE':
      case 'ACTIVE':
      case 'INFO':
        return {
          bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: ShieldCheck,
          label: normalized
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-950/70 border-amber-500/50 text-amber-400 animate-pulse',
          dot: 'bg-amber-400',
          icon: AlertTriangle,
          label: normalized
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/80 border-red-500/60 text-red-400 animate-pulse shadow-sm shadow-red-900/50',
          dot: 'bg-red-500 animate-ping',
          icon: AlertOctagon,
          label: normalized
        };
      case 'OFFLINE':
      case 'INACTIVE':
        return {
          bg: 'bg-slate-800/80 border-slate-600/50 text-slate-400',
          dot: 'bg-slate-500',
          icon: WifiOff,
          label: normalized
        };
      default:
        return {
          bg: 'bg-blue-950/70 border-blue-500/50 text-blue-400',
          dot: 'bg-blue-400',
          icon: Activity,
          label: normalized
        };
    }
  };

  const config = getStyle();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2 font-medium tracking-wide',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold tracking-wider'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${sizeClasses[size]} select-none`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </span>
  );
};
