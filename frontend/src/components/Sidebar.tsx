import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Cpu,
  Activity,
  AlertTriangle,
  LineChart,
  MapPin,
  Settings,
  ShieldAlert,
  UserCheck,
  X
} from 'lucide-react';
import { useSafety } from '../context/SafetyContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isConnected, summary, alerts } = useSafety();
  const activeAlertsCount = alerts.filter(a => a.status === 'ACTIVE').length;

  const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Workers', to: '/workers', icon: Users },
    { label: 'Jackets & Devices', to: '/devices', icon: Cpu },
    { label: 'Live Monitoring', to: '/live', icon: Activity, badge: 'LIVE' },
    { label: 'Alerts', to: '/alerts', icon: AlertTriangle, count: activeAlertsCount },
    { label: 'Analytics', to: '/analytics', icon: LineChart },
    { label: 'Locations', to: '/locations', icon: MapPin },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0d131f] border-r border-[#1e293b] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white flex items-center gap-1.5">
                SAFEGUARD
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Industrial Safety Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white lg:hidden rounded"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Main Navigation">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Platform Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-bounce">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom sidebar: System status & User Profile */}
        <div className="p-4 border-t border-[#1e293b] bg-[#090d16] space-y-4">
          {/* System Status Indicators */}
          <div className="bg-[#111827] p-3 rounded-lg border border-[#1f293d] space-y-2 text-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              System Gateway Status
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${summary?.systemStatus.backendOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
                Backend Service
              </span>
              <span className="font-mono text-[11px] text-emerald-400">ONLINE</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                IoT Socket Gateway
              </span>
              <span className={`font-mono text-[11px] ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isConnected ? 'STREAMING' : 'CONNECTING'}
              </span>
            </div>
          </div>

          {/* User profile */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <UserCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Supervisor Alpha</p>
              <p className="text-xs text-slate-400 truncate">Control Room Admin</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
