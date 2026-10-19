import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, Radio, User, AlertOctagon, CheckCircle2, Volume2, VolumeX, Activity, Wifi } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useSafety } from '../context/SafetyContext';
import { audioAlerts } from '../utils/audioAlert';
import { measureLatency, getTransportType, getActiveSubscriptionsCount } from '../services/socket';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const { isConnected, alerts, acknowledgeAlert } = useSafety();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(audioAlerts.getIsMuted());
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [transport, setTransport] = useState<string>('WS');
  const [activeRooms, setActiveRooms] = useState<number>(0);

  useEffect(() => {
    const updateMetrics = async () => {
      if (isConnected) {
        const ms = await measureLatency();
        if (ms >= 0) setLatencyMs(ms);
        setTransport(getTransportType());
        setActiveRooms(getActiveSubscriptionsCount());
      }
    };
    updateMetrics();
    const interval = setInterval(updateMetrics, 4000);
    return () => clearInterval(interval);
  }, [isConnected]);


  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (path: string): { title: string; subtitle: string } => {
    switch (path) {
      case '/':
        return { title: 'Industrial Safety Dashboard', subtitle: 'Real-time telemetry and personnel health status' };
      case '/workers':
        return { title: 'Worker Personnel Directory', subtitle: 'Manage industrial staff and active equipment allocations' };
      case '/devices':
        return { title: 'Safety Jackets & Wearable Devices', subtitle: 'Hardware registry, ESP32 nodes, and telemetry gateways' };
      case '/live':
        return { title: 'Live Sensor Telemetry Monitor', subtitle: 'Real-time high frequency streaming from smart safety vests' };
      case '/alerts':
        return { title: 'Safety Alerts & Incidents Center', subtitle: 'Incident management, hazard logs, and emergency dispatch' };
      case '/analytics':
        return { title: 'Safety Analytics & Sensor Trends', subtitle: 'Historical environmental metrics and incident correlation' };
      case '/locations':
        return { title: 'Plant Facility Geolocation & Tracking', subtitle: 'Interactive GPS floor coordinates of plant personnel' };
      case '/settings':
        return { title: 'System Thresholds & Gateway Settings', subtitle: 'Configure alarm thresholds and heartbeat policies' };
      default:
        if (path.startsWith('/workers/')) {
          return { title: 'Worker Safety Profile & Live Diagnostics', subtitle: 'Individual wearable telemetry and sensor health' };
        }
        return { title: 'SAFEGUARD Platform', subtitle: 'Industrial Safety & Real-Time Monitoring' };
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');

  return (
    <header className="sticky top-0 z-30 h-20 bg-[#0d131f]/90 backdrop-blur-md border-b border-[#1e293b] px-6 flex items-center justify-between">
      {/* Left side: Hamburger button + Dynamic Titles */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg lg:hidden hover:bg-slate-800"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            {title}
          </h2>
          <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>
        </div>
      </div>

      {/* Right side: Search, Live Clock, Status, Notifications, Profile */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Real-time Clock */}
        <div className="hidden md:flex flex-col items-end border-r border-[#1e293b] pr-4">
          <span className="font-mono text-xs font-semibold text-emerald-400 tracking-wider">
            {currentTime} UTC
          </span>
          <span className="text-[11px] text-slate-400">{currentDate}</span>
        </div>

        {/* Real-time Connection & Latency Indicator */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827] border border-[#1f293d] text-xs font-medium cursor-help group relative"
          title={`Transport: ${transport} | Latency: ${latencyMs}ms | Active Targeted Rooms: ${activeRooms}`}
        >
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="text-slate-300 flex items-center gap-1.5 font-mono text-[11px]">
            <span className="font-bold text-cyan-400">{transport}</span>
            <span className="text-slate-600">•</span>
            <span className={latencyMs < 50 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {isConnected ? `${latencyMs}ms` : 'Connecting'}
            </span>
          </span>
          {activeRooms > 0 && (
            <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 rounded" title="Targeted Room Subscriptions Active">
              {activeRooms} sub
            </span>
          )}
        </div>


        {/* Audio Siren Toggle */}
        <button
          onClick={() => {
            const nextState = !isAudioMuted;
            setIsAudioMuted(nextState);
            audioAlerts.setMuted(nextState);
            if (!nextState) {
              audioAlerts.playWarningBeep(); // test confirmation tone
            }
          }}
          className={`p-2 rounded-lg transition ${
            isAudioMuted
              ? 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
              : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
          }`}
          title={isAudioMuted ? 'Hazard siren muted (Click to enable audio)' : 'Hazard siren active (Click to mute)'}
          aria-label={isAudioMuted ? 'Unmute siren' : 'Mute siren'}
        >
          {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {activeAlerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {activeAlerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#111827] border border-[#1f293d] rounded-xl shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-white">Active Safety Alerts</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{activeAlerts.length} Active</span>
              </div>

              <div className="max-h-64 overflow-y-auto py-2 space-y-2">
                {activeAlerts.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span>All personnel are currently safe. Zero active hazards.</span>
                  </div>
                ) : (
                  activeAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-red-400">{alert.type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{alert.message}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-slate-400">{alert.workerName || alert.workerId}</span>
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-[#1e293b] text-center">
                <Link
                  to="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
                >
                  View All Incidents in Alerts Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User profile avatar */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#1e293b]">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-semibold text-xs">
            OP
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-white">Supervisor</div>
            <div className="text-[10px] text-emerald-400 font-mono">AUTHORIZED</div>
          </div>
        </div>
      </div>
    </header>
  );
};
