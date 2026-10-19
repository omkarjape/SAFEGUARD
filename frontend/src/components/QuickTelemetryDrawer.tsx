import React, { useState, useEffect } from 'react';
import { Worker, SensorReading } from '../types';
import { StatusBadge } from './StatusBadge';
import { subscribeWorker, unsubscribeWorker, dispatchEmergencyBuzzer } from '../services/socket';
import {
  X,
  ExternalLink,
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Zap,
  Battery,
  AlertOctagon,
  Send,
  CheckCircle2,
  Phone,
  Shield,
  Volume2
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickTelemetryDrawerProps {
  worker: Worker | null;
  sensor?: SensorReading;
  onClose: () => void;
}

export const QuickTelemetryDrawer: React.FC<QuickTelemetryDrawerProps> = ({
  worker,
  sensor,
  onClose
}) => {
  const [dispatchSent, setDispatchSent] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  useEffect(() => {
    if (worker?.workerId) {
      subscribeWorker(worker.workerId);
      return () => {
        unsubscribeWorker(worker.workerId);
      };
    }
  }, [worker?.workerId]);

  if (!worker) return null;

  const handleDispatch = async () => {
    if (!worker.deviceId) return;
    setIsDispatching(true);
    try {
      await dispatchEmergencyBuzzer(worker.deviceId, worker.workerId, 'Quick Drawer Emergency Actuation');
      setDispatchSent(true);
      setTimeout(() => setDispatchSent(false), 4000);
    } catch (err) {
      console.error('Buzzer dispatch failed:', err);
    } finally {
      setIsDispatching(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0e1524] border-l border-[#1f293d] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#1f293d] flex items-center justify-between bg-[#111827]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold">
                {worker.workerId}
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">{worker.name}</h3>
                <p className="text-xs text-slate-400">{worker.designation}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* Current Status Pill */}
            <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#1f293d] flex items-center justify-between">
              <span className="text-slate-400 font-medium">Wearable Health Status:</span>
              <StatusBadge status={worker.status} size="md" />
            </div>

            {dispatchSent && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Emergency audio buzzer dispatch command transmitted to vest!</span>
              </div>
            )}

            {/* Live Wearable Sensors */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Live Sensor Telemetry
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Temp */}
                <div className="p-3 rounded-xl bg-[#111827] border border-[#1f293d] space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Temp (DHT22)</span>
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {sensor ? `${sensor.temperature.toFixed(1)}°C` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-500">Max limit: 38.0°C</span>
                </div>

                {/* Humidity */}
                <div className="p-3 rounded-xl bg-[#111827] border border-[#1f293d] space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Humidity</span>
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {sensor ? `${sensor.humidity.toFixed(0)}%` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-500">Relative Humidity</span>
                </div>

                {/* Gas */}
                <div className="p-3 rounded-xl bg-[#111827] border border-[#1f293d] space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>MQ-2 Gas</span>
                    <Wind className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {sensor ? `${sensor.gasLevel} ppm` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-500">Threshold: 280 ppm</span>
                </div>

                {/* Battery */}
                <div className="p-3 rounded-xl bg-[#111827] border border-[#1f293d] space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Vest Battery</span>
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {sensor ? `${sensor.batteryPercentage.toFixed(0)}%` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-500">Li-Ion 3.7V Node</span>
                </div>
              </div>

              {/* Binary Triggers */}
              <div className="p-3 rounded-xl bg-[#111827] border border-[#1f293d] space-y-2">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Impact / Fall (MPU6050):
                  </span>
                  {sensor?.fallDetected ? (
                    <span className="font-mono font-bold text-red-400 animate-pulse">DETECTED</span>
                  ) : (
                    <span className="font-mono text-emerald-400">NORMAL</span>
                  )}
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-400" /> Optical Flame Sensor:
                  </span>
                  {sensor?.flameDetected ? (
                    <span className="font-mono font-bold text-red-400 animate-pulse">FIRE DETECTED</span>
                  ) : (
                    <span className="font-mono text-slate-400">STANDBY</span>
                  )}
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-red-400" /> Emergency SOS Button:
                  </span>
                  {sensor?.sosPressed ? (
                    <span className="font-mono font-bold text-red-400 animate-pulse">PRESSED</span>
                  ) : (
                    <span className="font-mono text-slate-400">READY</span>
                  )}
                </div>
              </div>
            </div>

            {/* Hardware & Location Info */}
            <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#1f293d] space-y-2">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Assigned Vest:</span>
                <span className="font-mono text-cyan-400">{worker.jacketId || 'Unlinked'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Microcontroller:</span>
                <span className="font-mono text-slate-300">{worker.deviceId || 'ESP32_001'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Emergency Phone:</span>
                <span className="font-mono text-slate-300">{worker.phone}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">GPS Position:</span>
                <span className="font-mono text-slate-400">
                  {sensor ? `${sensor.latitude.toFixed(4)}, ${sensor.longitude.toFixed(4)}` : '19.7660, 74.4770'}
                </span>
              </div>
            </div>

            {/* Emergency Audio Buzzer Dispatch */}
            <div className="pt-2">
              <button
                onClick={handleDispatch}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs shadow-lg transition"
              >
                <Send className="w-4 h-4" />
                Dispatch Audio Warning / Buzzer to Vest
              </button>
            </div>
          </div>

          {/* Footer Link */}
          <div className="p-4 border-t border-[#1f293d] bg-[#111827] flex items-center justify-between">
            <span className="text-slate-400 text-xs">Looking for historical charts?</span>
            <Link
              to={`/workers/${worker.workerId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition"
            >
              Full Profile
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
