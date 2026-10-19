import React, { useState, useMemo } from 'react';
import { useSafety } from '../context/SafetyContext';
import { StatusBadge } from '../components/StatusBadge';
import { MicroSparkline } from '../components/MicroSparkline';
import { QuickTelemetryDrawer } from '../components/QuickTelemetryDrawer';
import { ComponentHealthCard } from '../components/ComponentHealthCard';
import { Link } from 'react-router-dom';
import { Worker } from '../types';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Radio,
  WifiOff,
  Thermometer,
  Activity,
  ArrowUpRight,
  ExternalLink,
  Flame,
  Zap,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  AlertOctagon,
  Battery,
  Wind,
  ShieldAlert,
  Send
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { workers, devices, summary, liveSensors, sensorHistory, alerts } = useSafety();

  // Table filtering & sorting state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'status' | 'temp' | 'gas' | 'name'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick slide-over telemetry drawer target
  const [inspectWorker, setInspectWorker] = useState<Worker | null>(null);

  const primaryWorker = workers[0];
  const primaryDevice = devices.find(d => d.deviceId === primaryWorker?.deviceId) || devices[0];
  const primarySensor = primaryDevice?.deviceId ? liveSensors[primaryDevice.deviceId] : undefined;

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');

  // Compute Plant Overall Situational Condition (DEFCON-style Industrial Safety Level)
  const safetyCondition = useMemo(() => {
    const hasEmergency = activeAlerts.some(a =>
      a.type === 'FLAME_DETECTED' || a.type === 'FALL_DETECTED' || a.type === 'SOS_PRESSED'
    );
    const hasCritical = activeAlerts.some(a => a.severity === 'CRITICAL');
    const hasWarning = activeAlerts.some(a => a.severity === 'WARNING');

    if (hasEmergency) {
      return {
        level: 4,
        title: 'CONDITION RED: EMERGENCY HAZARD ACTIVE',
        subtitle: 'Flame, fall impact, or emergency SOS hardware button triggered. Immediate dispatch required.',
        bg: 'bg-red-950/90 border-red-500/80 text-white shadow-red-950 ring-2 ring-red-500/50 animate-pulse',
        badge: 'LEVEL 4 - EMERGENCY',
        badgeColor: 'bg-red-500 text-white animate-ping'
      };
    }
    if (hasCritical) {
      return {
        level: 3,
        title: 'CONDITION ORANGE: HIGH HAZARD THRESHOLD EXCEEDED',
        subtitle: 'Combustible gas or ambient heat has exceeded critical containment limits.',
        bg: 'bg-orange-950/90 border-orange-500/70 text-white shadow-orange-950',
        badge: 'LEVEL 3 - HAZARD',
        badgeColor: 'bg-orange-500 text-black'
      };
    }
    if (hasWarning) {
      return {
        level: 2,
        title: 'CONDITION YELLOW: ELEVATED ENVIRONMENTAL ADVISORY',
        subtitle: 'One or more wearable nodes report thermal or gas values above workplace comfort baselines.',
        bg: 'bg-amber-950/80 border-amber-500/60 text-white',
        badge: 'LEVEL 2 - ADVISORY',
        badgeColor: 'bg-amber-500 text-black'
      };
    }
    return {
      level: 1,
      title: 'CONDITION GREEN: NORMAL INDUSTRIAL OPERATIONS',
      subtitle: 'All wearable safety jackets, gas detectors, and worker vital signs are strictly nominal.',
      bg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100',
      badge: 'LEVEL 1 - NORMAL',
      badgeColor: 'bg-emerald-500 text-black font-bold'
    };
  }, [activeAlerts]);

  // Secondary telemetry aggregate computations
  const telemetryMetrics = useMemo(() => {
    let totalTemp = 0;
    let maxTemp = 0;
    let maxGas = 0;
    let minBattery = 100;
    let validSensorCount = 0;

    workers.forEach(w => {
      if (w.deviceId && liveSensors[w.deviceId]) {
        const s = liveSensors[w.deviceId];
        totalTemp += s.temperature;
        if (s.temperature > maxTemp) maxTemp = s.temperature;
        if (s.gasLevel > maxGas) maxGas = s.gasLevel;
        if (s.batteryPercentage < minBattery) minBattery = s.batteryPercentage;
        validSensorCount++;
      }
    });

    const avgTemp = validSensorCount > 0 ? (totalTemp / validSensorCount).toFixed(1) : '--';
    return {
      avgTemp,
      maxTemp: maxTemp > 0 ? maxTemp.toFixed(1) : '--',
      maxGas: maxGas > 0 ? String(maxGas) : '--',
      minBattery: minBattery < 100 ? minBattery.toFixed(0) : '--'
    };
  }, [workers, liveSensors]);

  // Departments list for filtering
  const departments = ['ALL', ...Array.from(new Set(workers.map(w => w.department)))];

  // Filtered & Sorted worker rows
  const displayedWorkers = useMemo(() => {
    return workers
      .filter(w => {
        const matchesSearch =
          w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.workerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === 'ALL' || w.department === selectedDept;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        const sensorA = a.deviceId ? liveSensors[a.deviceId] : undefined;
        const sensorB = b.deviceId ? liveSensors[b.deviceId] : undefined;

        if (sortBy === 'status') {
          const score = (s: string) => (s === 'CRITICAL' ? 3 : s === 'WARNING' ? 2 : s === 'SAFE' ? 1 : 0);
          const diff = score(a.status) - score(b.status);
          return sortOrder === 'desc' ? -diff : diff;
        }
        if (sortBy === 'temp') {
          const tA = sensorA?.temperature || 0;
          const tB = sensorB?.temperature || 0;
          return sortOrder === 'desc' ? tB - tA : tA - tB;
        }
        if (sortBy === 'gas') {
          const gA = sensorA?.gasLevel || 0;
          const gB = sensorB?.gasLevel || 0;
          return sortOrder === 'desc' ? gB - gA : gA - gB;
        }
        if (sortBy === 'name') {
          return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [workers, liveSensors, searchQuery, selectedDept, sortBy, sortOrder]);

  // Export Telemetry Snapshot to CSV
  const exportTelemetryReport = () => {
    const headers = ['Timestamp', 'Worker ID', 'Name', 'Department', 'Jacket ID', 'Device ID', 'Status', 'Temperature (C)', 'Humidity (%)', 'Gas MQ-2 (ppm)', 'Air Quality', 'Fall Detected', 'SOS Triggered', 'Battery (%)'];
    const rows = workers.map(w => {
      const s = w.deviceId ? liveSensors[w.deviceId] : undefined;
      return [
        new Date().toISOString(),
        w.workerId,
        `"${w.name}"`,
        `"${w.department}"`,
        w.jacketId || 'N/A',
        w.deviceId || 'N/A',
        w.status,
        s ? s.temperature.toFixed(1) : 'N/A',
        s ? s.humidity.toFixed(0) : 'N/A',
        s ? s.gasLevel : 'N/A',
        s ? s.airQuality : 'N/A',
        s?.fallDetected ? 'YES' : 'NO',
        s?.sosPressed ? 'YES' : 'NO',
        s ? s.batteryPercentage.toFixed(0) : 'N/A'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SAFEGUARD-Telemetry-Report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statCards = [
    {
      title: 'TOTAL WORKERS',
      value: summary?.totalWorkers ?? workers.length,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/40 border-blue-500/30',
      subtext: `${summary?.activeWorkers ?? workers.length} Active in Facility`
    },
    {
      title: 'SAFE PERSONNEL',
      value: summary?.safeWorkers ?? workers.filter(w => w.status === 'SAFE').length,
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
      subtext: 'Within standard thresholds'
    },
    {
      title: 'ACTIVE HAZARD ALERTS',
      value: activeAlerts.length,
      icon: AlertTriangle,
      color: activeAlerts.length > 0 ? 'text-red-400' : 'text-slate-400',
      bgColor: activeAlerts.length > 0 ? 'bg-red-950/50 border-red-500/50 animate-pulse' : 'bg-slate-900/60 border-slate-700/50',
      subtext: activeAlerts.length > 0 ? 'Immediate action required' : 'Zero active alerts'
    },
    {
      title: 'FACILITY THERMAL INDEX',
      value: telemetryMetrics.avgTemp !== '--' ? `${telemetryMetrics.avgTemp}°C` : 'OFFLINE',
      icon: Thermometer,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
      subtext: telemetryMetrics.maxTemp !== '--' ? `Peak vest heat: ${telemetryMetrics.maxTemp}°C` : 'Awaiting sensor stream'
    },
    {
      title: 'PEAK GAS EXPOSURE',
      value: telemetryMetrics.maxGas !== '--' ? `${telemetryMetrics.maxGas} ppm` : 'OFFLINE',
      icon: Wind,
      color: telemetryMetrics.maxGas !== '--' && Number(telemetryMetrics.maxGas) > 280 ? 'text-red-400' : 'text-cyan-400',
      bgColor: telemetryMetrics.maxGas !== '--' && Number(telemetryMetrics.maxGas) > 280 ? 'bg-red-950/40 border-red-500/40' : 'bg-cyan-950/40 border-cyan-500/30',
      subtext: 'MQ-2 Combustible sensor'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Plant Safety Condition (DEFCON Industrial Safety Level Indicator) */}
      <div className={`p-5 rounded-2xl border ${safetyCondition.bg} backdrop-blur-md transition-all shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            {safetyCondition.level >= 3 ? (
              <AlertOctagon className="w-8 h-8 text-red-400" />
            ) : safetyCondition.level === 2 ? (
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${safetyCondition.badgeColor}`}>
                {safetyCondition.badge}
              </span>
              <h3 className="text-base font-black tracking-wide text-white">
                {safetyCondition.title}
              </h3>
            </div>
            <p className="text-xs text-slate-200 mt-1 font-medium">
              {safetyCondition.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            onClick={exportTelemetryReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-600 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Telemetry CSV
          </button>
        </div>
      </div>

      {/* Top Stat KPI Cards */}
      <section aria-label="System Overview Statistics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${card.bgColor} backdrop-blur-sm transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold font-mono tracking-wider uppercase text-slate-300">
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded-lg bg-black/30 border border-white/5 ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                    {card.value}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 truncate">
                  {card.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Real-time Hardware Component Health & Disconnection Diagnostics */}
      <ComponentHealthCard
        worker={primaryWorker}
        device={primaryDevice}
        liveSensor={primarySensor}
      />

      {/* Main Section: Live Worker Monitoring Table with MicroSparklines & Filters */}
      <section className="bg-[#111827] rounded-xl border border-[#1f293d] overflow-hidden shadow-xl">
        {/* Table Header Bar with Search & Sort */}
        <div className="p-5 border-b border-[#1f293d] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  LIVE WORKER TELEMETRY STREAM
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Continuous biometric & environmental data points streaming from wearable safety jackets
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/live"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/60 transition"
              >
                <Activity className="w-3.5 h-3.5" />
                Live Telemetry Stream
              </Link>
              <Link
                to="/workers"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
              >
                All Workers
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Search, Department, and Sorting Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by worker ID, name, or work unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    Dept: {dept}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="status">Sort: Safety Status</option>
                <option value="temp">Sort: Temperature</option>
                <option value="gas">Sort: Gas Concentration</option>
                <option value="name">Sort: Worker Name</option>
              </select>

              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="p-1.5 rounded-lg bg-[#0b0f19] border border-slate-700 text-slate-300 hover:text-white"
                title={`Sort ${sortOrder === 'desc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Worker Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0b0f19]/80 border-b border-[#1f293d] text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Worker ID</th>
                <th className="py-3.5 px-4 font-semibold">Worker</th>
                <th className="py-3.5 px-4 font-semibold">Jacket & Node</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Temperature & Trend</th>
                <th className="py-3.5 px-4 font-semibold">Gas & Trend</th>
                <th className="py-3.5 px-4 font-semibold">Impact</th>
                <th className="py-3.5 px-4 font-semibold">SOS</th>
                <th className="py-3.5 px-4 font-semibold">Battery</th>
                <th className="py-3.5 px-4 font-semibold text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d] text-slate-300">
              {displayedWorkers.map((worker) => {
                const sensor = worker.deviceId ? liveSensors[worker.deviceId] : undefined;
                const history = worker.deviceId ? (sensorHistory[worker.deviceId] || []) : [];
                const tempHistory = history.slice(-10).map(h => h.temperature);
                const gasHistory = history.slice(-10).map(h => h.gasLevel);

                const isTempHigh = sensor && sensor.temperature > 35;
                const isGasHigh = sensor && sensor.gasLevel > 280;

                return (
                  <tr
                    key={worker.id}
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => setInspectWorker(worker)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {worker.workerId}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white group-hover:text-cyan-400 transition">
                        {worker.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {worker.department}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="text-cyan-400 font-medium">{worker.jacketId || '—'}</span>
                      <span className="text-[10px] text-slate-500 block">{worker.deviceId || '—'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={worker.status} size="sm" />
                    </td>

                    {/* Temperature with Sparkline */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-semibold ${isTempHigh ? 'text-amber-400 font-bold' : 'text-slate-200'}`}>
                          {sensor && sensor.temperature > 0 ? `${sensor.temperature.toFixed(1)}°C` : '—'}
                        </span>
                        <MicroSparkline
                          data={tempHistory}
                          color={isTempHigh ? '#f59e0b' : '#38bdf8'}
                          width={54}
                          height={18}
                        />
                      </div>
                    </td>

                    {/* Gas Level with Sparkline */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-semibold ${isGasHigh ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                          {sensor && sensor.gasLevel > 0 ? `${sensor.gasLevel} ppm` : '—'}
                        </span>
                        <MicroSparkline
                          data={gasHistory}
                          color={isGasHigh ? '#ef4444' : '#10b981'}
                          width={54}
                          height={18}
                        />
                      </div>
                    </td>

                    {/* Fall detection */}
                    <td className="py-3.5 px-4">
                      {sensor?.fallDetected ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/40 animate-pulse">
                          <Zap className="w-3 h-3" /> YES
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">Normal</span>
                      )}
                    </td>

                    {/* SOS button */}
                    <td className="py-3.5 px-4">
                      {sensor?.sosPressed ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/40 animate-pulse">
                          <Flame className="w-3 h-3" /> YES
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">Ready</span>
                      )}
                    </td>

                    {/* Battery */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      {sensor ? (
                        <div className="flex items-center gap-1.5">
                          <Battery className="w-3 h-3 text-emerald-400" />
                          <span>{sensor.batteryPercentage.toFixed(0)}%</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Quick action button */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setInspectWorker(worker)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded bg-[#1f293d] hover:bg-cyan-600 hover:text-white text-slate-200 transition"
                      >
                        Inspect
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Industrial Plant Quick Status & Recent Alerts Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prototype Jacket Hardware Node Info */}
        <div className="p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Active Physical Prototype
            </h4>
            <span className="font-mono text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              PROTOTYPE #1
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
              <span className="text-slate-400">Assigned Worker:</span>
              <span className="font-semibold text-white">Worker 01 (W001)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
              <span className="text-slate-400">Jacket Model:</span>
              <span className="font-mono text-cyan-300">SJ001 (SAFEGUARD-PRO-V1)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
              <span className="text-slate-400">Controller:</span>
              <span className="font-mono text-slate-200">ESP32 DevKit V1</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
              <span className="text-slate-400">Integrated Sensors:</span>
              <span className="text-slate-300 text-right">DHT22, MQ-2, MQ-135, MPU6050, Flame, GPS</span>
            </div>
            <div className="flex justify-between py-1 text-slate-300">
              <span className="text-slate-400">Telemetry Rate:</span>
              <span className="font-mono text-emerald-400 font-semibold">1 reading / 3.0s</span>
            </div>
          </div>
        </div>

        {/* Recent Incidents Feed */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Recent Industrial Safety Incidents
            </h4>
            <Link to="/alerts" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
              View Log →
            </Link>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No safety incidents logged.</p>
            ) : (
              alerts.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg bg-[#0b0f19] border border-[#1f293d] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={a.severity} size="sm" />
                    <div>
                      <div className="font-semibold text-white">{a.type.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-slate-400">{a.message}</div>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-mono text-[10px] text-slate-400">
                      {new Date(a.createdAt).toLocaleTimeString()}
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {a.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Slide-Over Telemetry Drawer */}
      <QuickTelemetryDrawer
        worker={inspectWorker}
        sensor={inspectWorker?.deviceId ? liveSensors[inspectWorker.deviceId] : undefined}
        onClose={() => setInspectWorker(null)}
      />
    </div>
  );
};
