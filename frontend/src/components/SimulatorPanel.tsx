import React, { useState, useEffect } from 'react';
import { useSafety } from '../context/SafetyContext';
import { SimulationScenario, PlantScenario, ManualSensorOverride } from '../types';
import {
  Flame,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Zap,
  BatteryWarning,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Cpu,
  Radio,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Layers,
  Wind
} from 'lucide-react';

export const SimulatorPanel: React.FC = () => {
  const {
    workers,
    liveSensors,
    simulatorStatus,
    setWorkerScenario,
    setPlantScenario,
    setManualOverride,
    clearWorkerOverride,
    configureSimulator,
    resetAllSimulator,
    targetWorkerId
  } = useSafety();

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'MANUAL_LAB' | 'PLANT_DRILLS' | 'ENGINE'>('PRESETS');
  const [selectedWorker, setSelectedWorker] = useState<string>(targetWorkerId || 'W001');

  // Manual override local form state
  const [overrideTemp, setOverrideTemp] = useState<number>(28.5);
  const [overrideHum, setOverrideHum] = useState<number>(55);
  const [overrideGas, setOverrideGas] = useState<number>(110);
  const [overrideAir, setOverrideAir] = useState<number>(75);
  const [overrideBattery, setOverrideBattery] = useState<number>(92);
  const [overrideRssi, setOverrideRssi] = useState<number>(-58);
  const [overrideFlame, setOverrideFlame] = useState<boolean>(false);
  const [overrideFall, setOverrideFall] = useState<boolean>(false);
  const [overrideSos, setOverrideSos] = useState<boolean>(false);

  // Sync sliders when selected worker changes
  useEffect(() => {
    const worker = workers.find(w => w.workerId === selectedWorker);
    if (worker && worker.deviceId && liveSensors[worker.deviceId]) {
      const s = liveSensors[worker.deviceId];
      setOverrideTemp(s.temperature);
      setOverrideHum(s.humidity);
      setOverrideGas(s.gasLevel);
      setOverrideAir(s.airQuality);
      setOverrideBattery(s.batteryPercentage);
      setOverrideFlame(s.flameDetected);
      setOverrideFall(s.fallDetected);
      setOverrideSos(s.sosPressed);
    }
  }, [selectedWorker, liveSensors, workers]);

  const currentWorkerState = simulatorStatus?.workerStates?.[selectedWorker];
  const activeScenario = currentWorkerState?.activeScenario || 'normal';
  const hasManualOverride = Boolean(currentWorkerState?.manualOverride);

  const presets: { id: SimulationScenario; label: string; icon: any; color: string; desc: string }[] = [
    {
      id: 'normal',
      label: 'Normal Safe',
      icon: ShieldCheck,
      color: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/80',
      desc: '27.5°C, Clean Air, MPU6050 stable'
    },
    {
      id: 'high_temp',
      label: 'Heat Stress',
      icon: Thermometer,
      color: 'bg-amber-950/80 text-amber-400 border-amber-500/40 hover:bg-amber-900/80',
      desc: 'DHT22 thermal climb > 45.8°C'
    },
    {
      id: 'gas_warning',
      label: 'Gas Leak',
      icon: AlertTriangle,
      color: 'bg-orange-950/80 text-orange-400 border-orange-500/40 hover:bg-orange-900/80',
      desc: 'MQ-2 surge > 520 ppm'
    },
    {
      id: 'flame',
      label: 'Flame Flash',
      icon: Flame,
      color: 'bg-red-950/90 text-red-400 border-red-500/50 hover:bg-red-900/90',
      desc: 'Optical IR flame photodiode trigger'
    },
    {
      id: 'fall',
      label: 'Fall Shock',
      icon: Zap,
      color: 'bg-red-950/90 text-red-400 border-red-500/50 hover:bg-red-900/90',
      desc: '6-Axis IMU > 3.5g impact + immobility'
    },
    {
      id: 'sos',
      label: 'SOS Button',
      icon: AlertTriangle,
      color: 'bg-rose-950/90 text-rose-400 border-rose-500/50 hover:bg-rose-900/90',
      desc: 'Hardware panic pushbutton latch'
    },
    {
      id: 'low_battery',
      label: 'Low Battery',
      icon: BatteryWarning,
      color: 'bg-yellow-950/80 text-yellow-400 border-yellow-500/40 hover:bg-yellow-900/80',
      desc: 'LiPo cell drop < 9.2%'
    },
    {
      id: 'offline',
      label: 'Radio Drop',
      icon: WifiOff,
      color: 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800',
      desc: 'Simulate RF packet timeout'
    }
  ];

  const plantDrills: { id: PlantScenario; label: string; desc: string; severity: string; badgeColor: string }[] = [
    {
      id: 'BASELINE_SAFE',
      label: 'Plant-Wide Safe Baseline',
      desc: 'Returns all jackets and workers to nominal safe status with no active alerts.',
      severity: 'NORMAL',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'CONFINED_SPACE_TOXIC_GAS',
      label: 'Confined Space Toxic Gas Surge',
      desc: 'W001 (Chemical Mixer) experiences sudden gas buildup > 520 ppm and poor air quality.',
      severity: 'CRITICAL',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    },
    {
      id: 'BOILER_ROOM_THERMAL_RUNAWAY',
      label: 'Boiler Thermal Runaway Event',
      desc: 'W002 (Boiler Technician) ambient temperature climbs past 46°C with heat stress alarm.',
      severity: 'CRITICAL',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      id: 'SCAFFOLDING_FALL_INCIDENT',
      label: 'Scaffolding Fall & Man-Down',
      desc: 'W003 (Welder) suffers free-fall drop followed by high-g impact and stationary tilt.',
      severity: 'CRITICAL',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    {
      id: 'DUAL_HAZARD_CRISIS',
      label: 'Dual Hazard Multi-Worker Crisis',
      desc: 'Simultaneous gas leak on W001 and fall incident on W002 testing multi-alarm handling.',
      severity: 'SEVERE',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    },
    {
      id: 'MASS_EVACUATION_DRILL',
      label: 'Facility Mass Evacuation Drill',
      desc: 'Coordinated plant-wide multi-hazard emergency triggering DEFCON Industrial Level 4.',
      severity: 'DEFCON 4',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    }
  ];

  const handleApplyManual = async () => {
    const override: ManualSensorOverride = {
      temperature: overrideTemp,
      humidity: overrideHum,
      gasLevel: overrideGas,
      airQuality: overrideAir,
      batteryPercentage: overrideBattery,
      wifiRssi: overrideRssi,
      flameDetected: overrideFlame,
      fallDetected: overrideFall,
      sosPressed: overrideSos
    };
    await setManualOverride(selectedWorker, override);
  };

  const handleClearManual = async () => {
    await clearWorkerOverride(selectedWorker);
  };

  return (
    <>
      {/* Floating Control Widget */}
      <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md w-full bg-[#0d131f]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Top Header */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 via-cyan-950/60 to-slate-900 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${simulatorStatus?.isRunning !== false ? 'bg-cyan-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${simulatorStatus?.isRunning !== false ? 'bg-cyan-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              PHYSICS IOT SIMULATOR
            </span>
            {simulatorStatus?.activePlantScenario && simulatorStatus.activePlantScenario !== 'BASELINE_SAFE' && (
              <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-300 px-1.5 py-0.2 rounded font-mono truncate max-w-[100px]">
                {simulatorStatus.activePlantScenario}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-slate-400 hover:text-cyan-300 p-1 rounded hover:bg-cyan-500/10 transition-colors"
              title="Open Full Telemetry Lab Modal"
              aria-label="Open Full Telemetry Lab"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              aria-label={isExpanded ? 'Collapse simulator panel' : 'Expand simulator panel'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Panel Body */}
        {isExpanded && (
          <div className="p-3.5 space-y-3">
            {/* Target Worker Selector & Active Status Pill */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="sim-quick-worker" className="text-slate-400 font-medium whitespace-nowrap flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Target Worker:
              </label>
              <select
                id="sim-quick-worker"
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="bg-[#111827] text-white text-xs border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500 flex-1 max-w-[210px]"
              >
                {workers.map(w => (
                  <option key={w.workerId} value={w.workerId}>
                    {w.workerId} - {w.name} ({w.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] font-medium">
              <button
                onClick={() => setActiveTab('PRESETS')}
                className={`py-1 rounded transition-colors ${activeTab === 'PRESETS' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
              >
                Presets
              </button>
              <button
                onClick={() => setActiveTab('MANUAL_LAB')}
                className={`py-1 rounded transition-colors ${activeTab === 'MANUAL_LAB' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
              >
                Manual Lab
              </button>
              <button
                onClick={() => setActiveTab('PLANT_DRILLS')}
                className={`py-1 rounded transition-colors ${activeTab === 'PLANT_DRILLS' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
              >
                Drills
              </button>
              <button
                onClick={() => setActiveTab('ENGINE')}
                className={`py-1 rounded transition-colors ${activeTab === 'ENGINE' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
              >
                Engine
              </button>
            </div>

            {/* TAB 1: PRESETS */}
            {activeTab === 'PRESETS' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {presets.map((s) => {
                    const Icon = s.icon;
                    const isActive = activeScenario === s.id && !hasManualOverride;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setWorkerScenario(selectedWorker, s.id)}
                        className={`flex flex-col text-left p-2 rounded-lg border text-xs font-medium transition-all ${
                          s.color
                        } ${
                          isActive
                            ? 'ring-2 ring-cyan-400 shadow-md shadow-cyan-950 scale-[1.01]'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="font-semibold">{s.label}</span>
                          </div>
                          {isActive && (
                            <span className="text-[9px] font-mono bg-white/20 px-1 py-0.2 rounded uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          {s.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {hasManualOverride && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-300">
                    <span>Manual slider override active for {selectedWorker}</span>
                    <button
                      onClick={handleClearManual}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 rounded text-[10px] font-mono font-bold"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MANUAL SENSOR LAB */}
            {activeTab === 'MANUAL_LAB' && (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 text-xs">
                {/* Temperature Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-amber-400" /> Temperature:</span>
                    <span className={`font-mono font-bold ${overrideTemp > 42 ? 'text-red-400' : 'text-cyan-300'}`}>{overrideTemp.toFixed(1)} °C</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="65"
                    step="0.5"
                    value={overrideTemp}
                    onChange={(e) => setOverrideTemp(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Combustible Gas (MQ-2) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-400" /> MQ-2 Gas:</span>
                    <span className={`font-mono font-bold ${overrideGas > 450 ? 'text-red-400' : 'text-cyan-300'}`}>{overrideGas} ppm</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="800"
                    step="10"
                    value={overrideGas}
                    onChange={(e) => setOverrideGas(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-400"
                  />
                </div>

                {/* Air Quality (MQ-135) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-cyan-400" /> Air Quality (AQI):</span>
                    <span className={`font-mono font-bold ${overrideAir > 250 ? 'text-amber-400' : 'text-cyan-300'}`}>{overrideAir} ppm</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="5"
                    value={overrideAir}
                    onChange={(e) => setOverrideAir(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Battery % */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1"><BatteryWarning className="w-3 h-3 text-yellow-400" /> LiPo Battery:</span>
                    <span className={`font-mono font-bold ${overrideBattery < 15 ? 'text-red-400' : 'text-cyan-300'}`}>{overrideBattery}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={overrideBattery}
                    onChange={(e) => setOverrideBattery(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                  />
                </div>

                {/* Boolean Toggles */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => setOverrideFall(!overrideFall)}
                    className={`py-1.5 px-1 rounded border text-[10px] font-semibold text-center transition-colors ${overrideFall ? 'bg-red-950 text-red-300 border-red-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                  >
                    Fall Shock: {overrideFall ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => setOverrideFlame(!overrideFlame)}
                    className={`py-1.5 px-1 rounded border text-[10px] font-semibold text-center transition-colors ${overrideFlame ? 'bg-red-950 text-red-300 border-red-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                  >
                    Flame IR: {overrideFlame ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => setOverrideSos(!overrideSos)}
                    className={`py-1.5 px-1 rounded border text-[10px] font-semibold text-center transition-colors ${overrideSos ? 'bg-rose-950 text-rose-300 border-rose-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                  >
                    SOS Push: {overrideSos ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Override Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleApplyManual}
                    className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Apply Overrides
                  </button>
                  <button
                    onClick={handleClearManual}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PLANT-WIDE DRILLS */}
            {activeTab === 'PLANT_DRILLS' && (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {plantDrills.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setPlantScenario(d.id)}
                    className="w-full text-left p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{d.label}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${d.badgeColor}`}>
                        {d.severity}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-snug">
                      {d.desc}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 4: ENGINE TUNING */}
            {activeTab === 'ENGINE' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1.5 font-medium">Tick Interval (Heartbeat Frequency):</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { ms: 1000, label: '1.0s (Turbo)' },
                      { ms: 2000, label: '2.0s (Fast)' },
                      { ms: 3000, label: '3.0s (Std)' },
                      { ms: 5000, label: '5.0s (Eco)' }
                    ].map(opt => (
                      <button
                        key={opt.ms}
                        onClick={() => configureSimulator(opt.ms)}
                        className={`py-1.5 rounded-lg border font-mono text-[11px] transition-colors ${
                          simulatorStatus?.intervalMs === opt.ms
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200">Simulation Pulse</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {simulatorStatus?.tickCount || 0} ticks generated
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => configureSimulator(undefined, !(simulatorStatus?.isRunning !== false))}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      simulatorStatus?.isRunning !== false
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    }`}
                  >
                    {simulatorStatus?.isRunning !== false ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {simulatorStatus?.isRunning !== false ? 'Pause Engine' : 'Resume Engine'}
                  </button>
                </div>

                <button
                  onClick={resetAllSimulator}
                  className="w-full py-2 bg-gradient-to-r from-emerald-950 to-slate-900 hover:from-emerald-900 hover:to-slate-800 border border-emerald-500/40 text-emerald-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All Workers to Safe Baseline
                </button>
              </div>
            )}

            {/* Footer Notice */}
            <div className="text-[10px] text-slate-500 font-mono text-center pt-1 border-t border-slate-800/80 flex items-center justify-between">
              <span>Status: {simulatorStatus?.isRunning !== false ? 'ACTIVE SIM' : 'PAUSED'}</span>
              <span>Rate: {(simulatorStatus?.intervalMs || 3000) / 1000}s</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-cyan-400 hover:underline flex items-center gap-0.5"
              >
                Expand Lab <Maximize2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Telemetry Lab Modal (Deep Engineering Inspector) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b101b] border border-cyan-500/40 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Industrial IoT Telemetry & Physics Simulation Lab
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                      Phase 5 Advanced Engine
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time physics modeling: thermal inertia curves, gas diffusion kinetics, and 6-axis MPU6050 fall kinematics.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close Telemetry Lab"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Workforce Simulation Matrix */}
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Live Multi-Worker Simulation Matrix
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {workers.map(w => {
                    const st = simulatorStatus?.workerStates?.[w.workerId];
                    const reading = w.deviceId ? liveSensors[w.deviceId] : null;
                    const isTarget = w.workerId === selectedWorker;

                    return (
                      <div
                        key={w.workerId}
                        onClick={() => setSelectedWorker(w.workerId)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isTarget
                            ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/50'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-white text-sm">{w.name}</span>
                            <div className="text-[10px] text-slate-400 font-mono">{w.workerId} • {w.department}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            w.status === 'SAFE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : w.status === 'WARNING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : w.status === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {w.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 mb-2">
                          <div>Temp: <span className="text-cyan-300">{reading ? `${reading.temperature}°C` : '--'}</span></div>
                          <div>Gas: <span className="text-orange-300">{reading ? `${reading.gasLevel} ppm` : '--'}</span></div>
                          <div>AQI: <span className="text-amber-300">{reading ? `${reading.airQuality}` : '--'}</span></div>
                          <div>Batt: <span className="text-yellow-300">{reading ? `${reading.batteryPercentage}%` : '--'}</span></div>
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">
                            Scenario: <span className="text-white font-mono font-bold uppercase">{st?.activeScenario || 'normal'}</span>
                          </span>
                          {st?.manualOverride && (
                            <span className="text-amber-400 font-mono font-semibold">OVERRIDE ACTIVE</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions & Plant Drills in Modal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Selected Worker Manual Telemetry Lab ({selectedWorker})
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Temperature (°C):</span>
                        <span className="font-mono text-cyan-300 font-bold">{overrideTemp.toFixed(1)} °C</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="65"
                        step="0.5"
                        value={overrideTemp}
                        onChange={(e) => setOverrideTemp(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>MQ-2 Combustible Gas (ppm):</span>
                        <span className="font-mono text-orange-400 font-bold">{overrideGas} ppm</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="800"
                        step="10"
                        value={overrideGas}
                        onChange={(e) => setOverrideGas(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-400"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setOverrideFall(!overrideFall)}
                        className={`p-2 rounded-lg border font-semibold text-center transition-colors ${overrideFall ? 'bg-red-950 text-red-300 border-red-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                      >
                        Fall Shock: {overrideFall ? 'ACTIVE' : 'OFF'}
                      </button>
                      <button
                        onClick={() => setOverrideFlame(!overrideFlame)}
                        className={`p-2 rounded-lg border font-semibold text-center transition-colors ${overrideFlame ? 'bg-red-950 text-red-300 border-red-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                      >
                        Flame IR: {overrideFlame ? 'ACTIVE' : 'OFF'}
                      </button>
                      <button
                        onClick={() => setOverrideSos(!overrideSos)}
                        className={`p-2 rounded-lg border font-semibold text-center transition-colors ${overrideSos ? 'bg-rose-950 text-rose-300 border-rose-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                      >
                        SOS Panic: {overrideSos ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleApplyManual}
                        className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition-colors"
                      >
                        Inject Sensor Values into {selectedWorker}
                      </button>
                      <button
                        onClick={handleClearManual}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
                      >
                        Clear Override
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Plant Emergency Drills & Disasters
                  </h4>
                  <div className="space-y-2">
                    {plantDrills.map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setPlantScenario(d.id);
                        }}
                        className="w-full text-left p-2.5 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{d.label}</div>
                          <div className="text-[10px] text-slate-400">{d.desc}</div>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ml-2 ${d.badgeColor}`}>
                          {d.severity}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#070b12] flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Physics Oscillating Engine Active
                </span>
                <span>Ticks: <strong className="text-white font-mono">{simulatorStatus?.tickCount || 0}</strong></span>
                <span>Interval: <strong className="text-white font-mono">{(simulatorStatus?.intervalMs || 3000) / 1000}s</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAllSimulator}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All to Safe
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Close Lab
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
