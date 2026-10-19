import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Radio,
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  Cpu,
  RotateCcw,
  Volume2,
  VolumeX,
  Wind,
  Flame,
  Thermometer,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { audioAlerts } from '../utils/audioAlert';
import { SafetyThresholds } from '../types';

const DEFAULT_SETTINGS: SafetyThresholds = {
  tempWarning: 35.0,
  tempCritical: 42.0,
  gasWarning: 280,
  gasCritical: 450,
  airQualityWarning: 200,
  heartbeatWarningSec: 30,
  heartbeatOfflineSec: 15,
  iotGatewayUrl: 'http://localhost:5000',
  audioAlerts: true
};

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<SafetyThresholds>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const data = await api.getSettings();
        if (data) {
          setConfig(data);
          audioAlerts.setMuted(!data.audioAlerts);
        }
      } catch (err: any) {
        console.warn('[SettingsPage] Could not load saved thresholds from server, using defaults:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      const updated = await api.updateSettings(config);
      setConfig(updated);
      audioAlerts.setMuted(!updated.audioAlerts);
      setSavedMessage('Safety thresholds successfully updated and applied across live IoT gateway.');
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setConfig(DEFAULT_SETTINGS);
    try {
      setIsSaving(true);
      const updated = await api.updateSettings(DEFAULT_SETTINGS);
      setConfig(updated);
      audioAlerts.setMuted(!updated.audioAlerts);
      setSavedMessage('Thresholds restored to industrial standard baselines.');
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-xs font-mono">Fetching active safety thresholds from gateway...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          System Thresholds & Safety Gateway Configuration
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Define real-time safety alarm trip points, sensor thresholds, offline watchdog policies, and audio sirens.
        </p>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Environmental Hazard Alarm Limits */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f293d] space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Environmental Hazard Alarm Limits
            </h4>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded">
              Active Evaluation: Real Sensor Telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 flex items-center gap-1.5 mb-1 font-medium">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                Temperature Warning Trip (°C)
              </label>
              <input
                type="number"
                step="0.5"
                value={config.tempWarning}
                onChange={(e) => setConfig({ ...config, tempWarning: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0b0f19] border border-slate-700 focus:border-cyan-500 rounded-lg p-2.5 text-white font-mono transition"
                required
              />
              <span className="text-[10px] text-slate-500">Normal ambient workplace comfort limit (Default: 35.0°C)</span>
            </div>

            <div>
              <label className="text-slate-300 flex items-center gap-1.5 mb-1 font-medium">
                <Thermometer className="w-3.5 h-3.5 text-red-400" />
                Temperature Critical Trip (°C)
              </label>
              <input
                type="number"
                step="0.5"
                value={config.tempCritical}
                onChange={(e) => setConfig({ ...config, tempCritical: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0b0f19] border border-slate-700 focus:border-red-500 rounded-lg p-2.5 text-white font-mono transition"
                required
              />
              <span className="text-[10px] text-slate-500">Immediate heat exhaustion evacuation alarm (Default: 42.0°C)</span>
            </div>

            <div>
              <label className="text-slate-300 flex items-center gap-1.5 mb-1 font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                MQ-2 Combustible Gas Warning (ppm)
              </label>
              <input
                type="number"
                value={config.gasWarning}
                onChange={(e) => setConfig({ ...config, gasWarning: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0b0f19] border border-slate-700 focus:border-cyan-500 rounded-lg p-2.5 text-white font-mono transition"
                required
              />
              <span className="text-[10px] text-slate-500">Early chemical vapor detection threshold (Default: 280 ppm)</span>
            </div>

            <div>
              <label className="text-slate-300 flex items-center gap-1.5 mb-1 font-medium">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                MQ-2 Combustible Gas Critical (ppm)
              </label>
              <input
                type="number"
                value={config.gasCritical}
                onChange={(e) => setConfig({ ...config, gasCritical: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0b0f19] border border-slate-700 focus:border-red-500 rounded-lg p-2.5 text-white font-mono transition"
                required
              />
              <span className="text-[10px] text-slate-500">Explosive/toxic vapor concentration alarm (Default: 450 ppm)</span>
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-300 flex items-center gap-1.5 mb-1 font-medium">
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                MQ-135 Air Quality Warning (AQI / ppm)
              </label>
              <input
                type="number"
                value={config.airQualityWarning}
                onChange={(e) => setConfig({ ...config, airQualityWarning: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0b0f19] border border-slate-700 focus:border-cyan-500 rounded-lg p-2.5 text-white font-mono transition"
                required
              />
              <span className="text-[10px] text-slate-500">Poor breathable air quality threshold (Default: 200 AQI)</span>
            </div>
          </div>
        </div>

        {/* Audio Alerts & Node Heartbeat */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f293d] space-y-5 shadow-lg">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1f293d] pb-3">
            <Radio className="w-4 h-4 text-cyan-400" />
            ESP32 Node Heartbeat & Disconnect Watchdog
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Heartbeat Warning Interval (seconds)</label>
              <input
                type="number"
                value={config.heartbeatWarningSec}
                onChange={(e) => setConfig({ ...config, heartbeatWarningSec: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                required
              />
              <span className="text-[10px] text-slate-500">Advisory interval if packet delayed (Default: 30s)</span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium">Heartbeat Offline Timeout (seconds)</label>
              <input
                type="number"
                value={config.heartbeatOfflineSec}
                onChange={(e) => setConfig({ ...config, heartbeatOfflineSec: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                required
              />
              <span className="text-[10px] text-slate-500">Marks jacket as OFFLINE when powered off (Default: 15s)</span>
            </div>
          </div>

          {/* Audio Siren Toggle */}
          <div className="pt-2 border-t border-[#1f293d] flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                {config.audioAlerts ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                Web Hazard Siren & Beep Alarms
              </label>
              <p className="text-[10px] text-slate-400">
                Play synthetic audio tones in the web console when critical life-safety hazards occur.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextAudio = !config.audioAlerts;
                setConfig({ ...config, audioAlerts: nextAudio });
                audioAlerts.setMuted(!nextAudio);
                if (nextAudio) audioAlerts.playWarningBeep();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                config.audioAlerts
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {config.audioAlerts ? 'Audio Enabled' : 'Audio Muted'}
            </button>
          </div>
        </div>

        {/* ESP32 Gateway Network Settings */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1f293d] space-y-4 shadow-lg">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1f293d] pb-3">
            <Cpu className="w-4 h-4 text-emerald-400" />
            IoT REST Gateway Ingestion Endpoint
          </h4>

          <div className="text-xs space-y-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Target Ingestion URL for Microcontroller Firmware</label>
              <input
                type="text"
                value={`${config.iotGatewayUrl}/api/sensor-data`}
                readOnly
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-cyan-300 font-mono text-xs"
              />
              <span className="text-[10px] text-slate-500">
                ESP32 hardware submits live JSON telemetry packets directly to this gateway route.
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reset to Standard Defaults
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg transition"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
