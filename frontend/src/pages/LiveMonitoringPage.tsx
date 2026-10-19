import React from 'react';
import { useSafety } from '../context/SafetyContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  Activity,
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Zap,
  Battery,
  MapPin,
  Clock,
  Radio,
  ExternalLink,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LiveMonitoringPage: React.FC = () => {
  const { workers, liveSensors, isConnected } = useSafety();

  return (
    <div className="space-y-6">
      {/* Header with Live Pulsing Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <h3 className="text-xl font-bold text-white tracking-wide">
              Live Worker Monitoring
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              SOCKET.IO REAL-TIME
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric, chemical gas, and physical impact sensors updating live
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1f293d] flex items-center gap-2 text-xs font-mono">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-slate-300">
              {isConnected ? 'Stream Active (3.0s tick)' : 'Gateway Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Industrial Worker Live Telemetry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workers.map((w) => {
          const sensor = w.deviceId ? liveSensors[w.deviceId] : undefined;
          const isTempWarning = sensor && sensor.temperature > 35;
          const isGasWarning = sensor && sensor.gasLevel > 280;

          return (
            <div
              key={w.id}
              className={`p-6 rounded-2xl bg-[#111827] border transition-all shadow-xl hover:border-slate-600 ${
                w.status === 'CRITICAL'
                  ? 'border-red-500/60 ring-1 ring-red-500/30 bg-red-950/10'
                  : w.status === 'WARNING'
                  ? 'border-amber-500/50'
                  : 'border-[#1f293d]'
              }`}
            >
              {/* Card Top: Worker ID, Name, Status */}
              <div className="flex items-start justify-between pb-4 border-b border-[#1f293d]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0b0f19] border border-[#1f293d] flex items-center justify-center font-mono font-bold text-cyan-400 text-lg">
                    {w.workerId}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      {w.name}
                      <span className="text-xs text-slate-400 font-mono font-normal">
                        ({w.jacketId || 'No Vest'})
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">{w.department}</p>
                  </div>
                </div>

                <StatusBadge status={w.status} size="md" />
              </div>

              {/* Sensor Readings Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs">
                {/* Temperature */}
                <div className={`p-3 rounded-xl border ${isTempWarning ? 'bg-amber-950/40 border-amber-500/40' : 'bg-[#0b0f19] border-[#1f293d]'}`}>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-mono">Temp</span>
                    <Thermometer className={`w-3.5 h-3.5 ${isTempWarning ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
                  </div>
                  <div className={`text-base font-bold font-mono ${isTempWarning ? 'text-amber-300' : 'text-white'}`}>
                    {sensor ? `${sensor.temperature.toFixed(1)}°C` : '—'}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">DHT22</span>
                </div>

                {/* Humidity */}
                <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#1f293d]">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-mono">Humidity</span>
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white">
                    {sensor ? `${sensor.humidity.toFixed(0)}%` : '—'}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">DHT22</span>
                </div>

                {/* Gas MQ-2 */}
                <div className={`p-3 rounded-xl border ${isGasWarning ? 'bg-red-950/40 border-red-500/40' : 'bg-[#0b0f19] border-[#1f293d]'}`}>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-mono">Gas MQ-2</span>
                    <Wind className={`w-3.5 h-3.5 ${isGasWarning ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
                  </div>
                  <div className={`text-base font-bold font-mono ${isGasWarning ? 'text-red-300' : 'text-white'}`}>
                    {sensor ? `${sensor.gasLevel} ppm` : '—'}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Combustible</span>
                </div>

                {/* Air Quality MQ-135 */}
                <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#1f293d]">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-mono">Air MQ-135</span>
                    <Wind className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white">
                    {sensor ? `${sensor.airQuality}` : '—'}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">AQI Index</span>
                </div>
              </div>

              {/* Safety Triggers & Battery Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 text-xs border-t border-[#1f293d]">
                {/* Fall trigger */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0b0f19] border border-[#1f293d]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Fall:
                  </span>
                  {sensor?.fallDetected ? (
                    <span className="font-mono font-bold text-red-400 animate-pulse">DETECTED</span>
                  ) : (
                    <span className="font-mono text-emerald-400 font-semibold">SAFE</span>
                  )}
                </div>

                {/* SOS trigger */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0b0f19] border border-[#1f293d]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3 text-red-400" /> SOS:
                  </span>
                  {sensor?.sosPressed ? (
                    <span className="font-mono font-bold text-red-400 animate-pulse">PRESSED</span>
                  ) : (
                    <span className="font-mono text-slate-400">STANDBY</span>
                  )}
                </div>

                {/* Flame trigger */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0b0f19] border border-[#1f293d]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-red-400" /> Flame:
                  </span>
                  {sensor?.flameDetected ? (
                    <span className="font-mono font-bold text-red-400 animate-pulse">DETECTED</span>
                  ) : (
                    <span className="font-mono text-slate-400">NO FLAME</span>
                  )}
                </div>
              </div>

              {/* Card Footer: Battery, GPS, Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-[#1f293d] text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{sensor ? `${sensor.batteryPercentage.toFixed(0)}%` : '—'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    <span>
                      {sensor ? `${sensor.latitude.toFixed(4)}, ${sensor.longitude.toFixed(4)}` : 'GPS Acquired'}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/workers/${w.workerId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900 transition font-medium"
                >
                  Live Charts
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
