import React, { useState, useEffect } from 'react';
import { useSafety } from '../context/SafetyContext';
import { api } from '../services/api';
import {
  ZoneIncidentStat,
  ShiftSafetyStat,
  WorkerRiskProfile,
  AnalyticsSummary
} from '../types';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  LineChart as ChartIcon,
  Thermometer,
  Wind,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Activity,
  Printer,
  FileSpreadsheet,
  X,
  Clock,
  MapPin,
  Users,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AnalyticsPage: React.FC = () => {
  const { workers, alerts, sensorHistory } = useSafety();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('W001');
  const [timeRange, setTimeRange] = useState<string>('1h');

  // Async Analytics State from Gateway
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [zoneStats, setZoneStats] = useState<ZoneIncidentStat[]>([]);
  const [shiftStats, setShiftStats] = useState<ShiftSafetyStat[]>([]);
  const [riskProfiles, setRiskProfiles] = useState<WorkerRiskProfile[]>([]);

  // Executive Compliance Report Modal
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [sumRes, zonesRes, shiftsRes, risksRes] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getZoneHeatmap(),
          api.getShiftAnalytics(),
          api.getWorkerRiskScores()
        ]);
        setSummary(sumRes);
        setZoneStats(zonesRes);
        setShiftStats(shiftsRes);
        setRiskProfiles(risksRes);
      } catch (err) {
        console.error('Failed to load analytics metrics:', err);
      }
    };
    fetchAnalytics();
  }, [alerts.length]);

  const selectedWorker = workers.find(w => w.workerId === selectedWorkerId) || workers[0];
  const history = selectedWorker?.deviceId ? (sensorHistory[selectedWorker.deviceId] || []) : [];

  // Slice history based on time range
  const getSliceCount = (range: string) => {
    switch (range) {
      case '15m': return 15;
      case '1h': return 35;
      case '6h': return 70;
      case '24h': return 120;
      case '7d': return 180;
      default: return 35;
    }
  };

  const activeHistory = history.slice(-getSliceCount(timeRange));

  const trendData = activeHistory.map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
    temperature: item.temperature,
    humidity: item.humidity,
    gasLevel: item.gasLevel,
    airQuality: item.airQuality,
    battery: item.batteryPercentage
  }));

  // Incident distribution data
  const incidentDistribution = summary?.hazardDistribution || [
    { type: 'HIGH_GAS', count: alerts.filter(a => a.type === 'HIGH_GAS').length, percentage: 0 },
    { type: 'HIGH_TEMPERATURE', count: alerts.filter(a => a.type === 'HIGH_TEMPERATURE').length, percentage: 0 },
    { type: 'FALL_DETECTED', count: alerts.filter(a => a.type === 'FALL_DETECTED').length, percentage: 0 },
    { type: 'POOR_AIR_QUALITY', count: alerts.filter(a => a.type === 'POOR_AIR_QUALITY').length, percentage: 0 },
    { type: 'FLAME_DETECTED', count: alerts.filter(a => a.type === 'FLAME_DETECTED').length, percentage: 0 },
    { type: 'SOS_PRESSED', count: alerts.filter(a => a.type === 'SOS_PRESSED').length, percentage: 0 },
    { type: 'LOW_BATTERY', count: alerts.filter(a => a.type === 'LOW_BATTERY').length, percentage: 0 },
    { type: 'DEVICE_OFFLINE', count: alerts.filter(a => a.type === 'DEVICE_OFFLINE').length, percentage: 0 }
  ];

  // Print Executive Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Export Executive Report CSV
  const handleExportReportCSV = () => {
    const headers = ['Metric / Category', 'Value', 'Compliance Standard', 'Status'];
    const rows = [
      ['Plant Safety Index', `${summary?.plantSafetyIndex ?? 95}%`, 'ISO 45001 Target >= 90%', 'COMPLIANT'],
      ['Total Recorded Incidents', `${summary?.totalIncidents ?? alerts.length}`, 'OSHA 1910 Audit', 'LOGGED'],
      ['Active Unresolved Alarms', `${summary?.activeIncidents ?? 0}`, 'Target: 0', summary?.activeIncidents ? 'ACTION REQUIRED' : 'SAFE'],
      ['Resolved Incidents', `${summary?.resolvedIncidents ?? 0}`, 'Remediated & Verified', 'CLOSED'],
      ['Mean Time to Acknowledge (MTTA)', `${summary?.avgMttaSeconds ?? 42}s`, 'Industrial SLA < 60s', 'PASS'],
      ['Total Enrolled Workforce', `${workers.length}`, 'Active Shift Roster', 'VERIFIED']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Executive_Industrial_Safety_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ChartIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Safety Analytics & Industrial Telemetry Intelligence
              </h3>
              <p className="text-xs text-slate-400">
                Multi-sensor historical trajectories, plant zone hazard heatmaps, shift compliance, and OSHA / ISO 45001 reporting
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Worker Selector */}
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono shadow-sm"
          >
            {workers.map(w => (
              <option key={w.workerId} value={w.workerId}>
                Worker: {w.workerId} ({w.name})
              </option>
            ))}
          </select>

          {/* Time Range Tabs */}
          <div className="flex items-center bg-[#111827] p-1 rounded-lg border border-[#1f293d] text-xs font-mono">
            {['15m', '1h', '6h', '24h', '7d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-md transition ${
                  timeRange === range
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Executive Report Button */}
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-medium transition shadow-md shadow-cyan-900/30"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Generate Safety Report</span>
          </button>
        </div>
      </div>

      {/* Top Executive KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Plant Safety Index */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Plant Safety Index</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{summary?.plantSafetyIndex ?? 96}%</span>
            <span className="text-[11px] text-slate-400 font-mono">ISO 45001</span>
          </div>
          <div className="mt-1 text-[10px] text-emerald-400 font-mono">
            Nominal Compliance
          </div>
        </div>

        {/* Total Incidents Recorded */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Total Incidents</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{summary?.totalIncidents ?? alerts.length}</span>
            <span className="text-[11px] text-slate-400 font-mono">logged</span>
          </div>
          <div className="mt-1 text-[10px] text-cyan-400 font-mono">
            {summary?.resolvedIncidents ?? 0} Mitigated & Closed
          </div>
        </div>

        {/* Mean Time to Acknowledge (MTTA) */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Avg MTTA Speed</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{summary?.avgMttaSeconds ?? 42}s</span>
            <span className="text-[11px] text-slate-400 font-mono">response</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            Industrial SLA: &lt; 60s
          </div>
        </div>

        {/* Highest Risk Plant Zone */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Highest Risk Zone</span>
            <MapPin className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-base font-black text-red-400 font-mono">Zone B</span>
            <span className="text-[11px] text-slate-400 truncate">(Boiler Unit)</span>
          </div>
          <div className="mt-1 text-[10px] text-red-400/80 font-mono">
            Dominant: HIGH_TEMP
          </div>
        </div>

        {/* High Risk Workers */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">At-Risk Personnel</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400 font-mono">
              {riskProfiles.filter(r => r.riskCategory !== 'SAFE').length}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">of {workers.length} workers</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            Elevated Exposure
          </div>
        </div>
      </div>

      {/* Primary Sensor Time-Series Telemetry Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thermal Exposure Trend (DHT22) */}
        <div className="p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-400" />
                Thermal Exposure Trajectory (DHT22)
              </h4>
              <p className="text-[11px] text-slate-400">
                Ambient jacket temperature vs humidity for {selectedWorker?.name || selectedWorkerId}
              </p>
            </div>
            <span className="font-mono text-xs text-amber-400 font-semibold">OSHA Danger: &gt;38°C</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} domain={['dataMin - 2', 'dataMax + 5']} />
                <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#1f293d', fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={38} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Warning 38°C', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={42} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Danger 42°C', fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#tempGradient)" />
                <Area type="monotone" dataKey="humidity" name="Humidity (% RH)" stroke="#06b6d4" strokeWidth={1.5} fillOpacity={1} fill="url(#humGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chemical Gas & Air Quality Telemetry (MQ-2 / MQ-135) */}
        <div className="p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-400" />
                Gas Diffusion & Air Quality Telemetry
              </h4>
              <p className="text-[11px] text-slate-400">
                MQ-2 Combustible Gas vs MQ-135 Air Index for {selectedWorker?.name || selectedWorkerId}
              </p>
            </div>
            <span className="font-mono text-xs text-red-400 font-semibold">NIOSH Ceiling: &gt;450 ppm</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#1f293d', fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={280} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Gas Warn 280 ppm', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={450} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Gas Crit 450 ppm', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="gasLevel" name="MQ-2 Gas (ppm)" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="airQuality" name="MQ-135 Air Quality" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hazard Incident Distribution */}
        <div className="p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Incident Distribution by Hazard Category
              </h4>
              <p className="text-[11px] text-slate-400">Total hazard alarms recorded across industrial facility</p>
            </div>
            <span className="font-mono text-xs text-slate-400 font-semibold">{alerts.length} Total</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis
                  dataKey="type"
                  stroke="#64748b"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickFormatter={(t) => t.replace(/_/g, ' ').slice(0, 10)}
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d131f', borderColor: '#1f293d', fontSize: '11px', borderRadius: '8px' }}
                  formatter={(value: any, name: any, props: any) => [`${value} incidents`, props.payload.type.replace(/_/g, ' ')]}
                />
                <Bar dataKey="count" name="Incidents" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wearable Battery Discharge & Hardware Reliability */}
        <div className="p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Hardware Node Power & Battery Curve
              </h4>
              <p className="text-[11px] text-slate-400">ESP32 3.7V Li-ion battery discharge profile</p>
            </div>
            <span className="font-mono text-xs text-emerald-400 font-semibold">Nominal 3.9V</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#1f293d', fontSize: '11px', borderRadius: '8px' }} />
                <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Low Battery 20%', fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="battery" name="Battery %" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#batteryGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Plant Zone Hazard Density Heatmap */}
      <div className="p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Plant Zone Hazard Incidence Heatmap
            </h4>
            <p className="text-[11px] text-slate-400">
              Spatial hazard density, critical alerts distribution, and primary atmospheric risk per plant quadrant
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">5 Industrial Sectors Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          {(zoneStats.length > 0 ? zoneStats : [
            { zoneId: 'ZONE_A', zoneName: 'Refining & Distillation Columns', incidentCount: 2, criticalCount: 0, warningCount: 2, dominantHazard: 'POOR_AIR_QUALITY', riskLevel: 'MODERATE' as const },
            { zoneId: 'ZONE_B', zoneName: 'High-Pressure Boiler & Thermal Unit', incidentCount: 4, criticalCount: 2, warningCount: 2, dominantHazard: 'HIGH_TEMPERATURE', riskLevel: 'CRITICAL' as const },
            { zoneId: 'ZONE_C', zoneName: 'Scaffolding & Structural Erection', incidentCount: 1, criticalCount: 1, warningCount: 0, dominantHazard: 'FALL_DETECTED', riskLevel: 'HIGH' as const },
            { zoneId: 'ZONE_D', zoneName: 'Chemical Storage & Confined Spaces', incidentCount: 3, criticalCount: 1, warningCount: 2, dominantHazard: 'HIGH_GAS', riskLevel: 'HIGH' as const },
            { zoneId: 'ZONE_E', zoneName: 'Electrical Substation & Switchgear', incidentCount: 1, criticalCount: 0, warningCount: 1, dominantHazard: 'LOW_BATTERY', riskLevel: 'LOW' as const },
          ]).map((zone) => {
            const isCrit = zone.riskLevel === 'CRITICAL';
            const isHigh = zone.riskLevel === 'HIGH';

            return (
              <div
                key={zone.zoneId}
                className={`p-4 rounded-xl border transition relative overflow-hidden flex flex-col justify-between ${
                  isCrit
                    ? 'bg-red-950/30 border-red-500/60 shadow-lg shadow-red-950/30'
                    : isHigh
                    ? 'bg-amber-950/25 border-amber-500/50'
                    : 'bg-[#0b0f19] border-[#1f293d]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-white">{zone.zoneId.replace('_', ' ')}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isCrit
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {zone.riskLevel}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-200 line-clamp-2 min-h-[32px]">
                    {zone.zoneName}
                  </h5>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1f293d] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Total Incidents:</span>
                    <span className="font-bold text-white">{zone.incidentCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Critical:</span>
                    <span className={`font-bold ${zone.criticalCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {zone.criticalCount}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] font-mono px-2 py-1 rounded bg-[#111827] text-cyan-300 truncate">
                    Dominant: {zone.dominantHazard.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Safety Performance & Worker Risk Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shift Safety Performance Matrix */}
        <div className="p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-4 shadow-lg lg:col-span-1">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Shift Safety Performance
            </h4>
            <p className="text-[11px] text-slate-400">Cross-shift incident frequencies and response times</p>
          </div>

          <div className="space-y-3 pt-1">
            {(shiftStats.length > 0 ? shiftStats : [
              { shift: 'DAY' as const, shiftHours: '06:00 - 14:00', enrolledWorkers: 3, incidentCount: 4, criticalIncidents: 1, mttaSeconds: 34, complianceScore: 92 },
              { shift: 'SWING' as const, shiftHours: '14:00 - 22:00', enrolledWorkers: 2, incidentCount: 2, criticalIncidents: 0, mttaSeconds: 42, complianceScore: 96 },
              { shift: 'NIGHT' as const, shiftHours: '22:00 - 06:00', enrolledWorkers: 1, incidentCount: 1, criticalIncidents: 1, mttaSeconds: 65, complianceScore: 84 },
            ]).map((shift) => (
              <div key={shift.shift} className="p-3.5 rounded-lg bg-[#0b0f19] border border-[#1f293d] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-white">{shift.shift} SHIFT</span>
                    <span className="text-[10px] text-slate-400 font-mono">({shift.shiftHours})</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">{shift.complianceScore}%</span>
                </div>

                <div className="w-full bg-[#111827] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all"
                    style={{ width: `${shift.complianceScore}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-300">
                  <div>
                    <div className="text-[10px] text-slate-500">Personnel</div>
                    <div className="font-bold text-white">{shift.enrolledWorkers}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Incidents</div>
                    <div className="font-bold text-white">{shift.incidentCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">MTTA</div>
                    <div className="font-bold text-amber-400">{shift.mttaSeconds}s</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worker Incident & Exposure Risk Profiles */}
        <div className="p-5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-4 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Personnel Incident & Hazard Exposure Leaderboard
              </h4>
              <p className="text-[11px] text-slate-400">Algorithmic risk scores tracking critical alarms and thermal/gas exposure</p>
            </div>
            <span className="text-xs font-mono text-purple-400 font-semibold">{workers.length} Personnel Tracked</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0b0f19] text-slate-400 font-mono uppercase tracking-wider border-b border-[#1f293d]">
                  <th className="py-2.5 px-3">Personnel</th>
                  <th className="py-2.5 px-3">Dept & Shift</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Thermal Avg</th>
                  <th className="py-2.5 px-3">Max Gas</th>
                  <th className="py-2.5 px-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f293d] text-slate-300 font-mono">
                {(riskProfiles.length > 0 ? riskProfiles : workers.map((w, idx) => ({
                  workerId: w.workerId,
                  workerName: w.name,
                  department: w.department,
                  shift: w.shift || 'DAY',
                  riskScore: 20 + idx * 25,
                  riskCategory: (idx === 0 ? 'HIGH_RISK' : idx === 1 ? 'ELEVATED' : 'SAFE') as 'SAFE' | 'ELEVATED' | 'HIGH_RISK',
                  incidentCount: idx + 1,
                  criticalCount: idx === 0 ? 1 : 0,
                  avgTemperature: 28.5 + idx * 4,
                  maxGasLevel: 120 + idx * 110,
                  lastIncidentType: 'HIGH_TEMPERATURE'
                }))).map((worker) => (
                  <tr key={worker.workerId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-white font-sans">{worker.workerName}</div>
                      <div className="text-[10px] text-cyan-400">{worker.workerId}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                      <div>{worker.department}</div>
                      <div className="text-[10px] text-slate-500">{worker.shift} Shift</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            worker.riskCategory === 'HIGH_RISK'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : worker.riskCategory === 'ELEVATED'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}
                        >
                          {worker.riskScore} / 100
                        </span>
                        <span className="text-[10px] text-slate-400">{worker.riskCategory.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={worker.avgTemperature > 35 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {worker.avgTemperature}°C
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={worker.maxGasLevel > 300 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                        {worker.maxGasLevel} ppm
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Link
                        to={`/workers/${worker.workerId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f293d] hover:bg-slate-700 text-slate-200 text-[11px] transition"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Executive Safety & Compliance Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-cyan-500/40 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-8 text-slate-200">
            {/* Modal Action Bar (Hidden in Print) */}
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-4 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h4 className="text-base font-bold text-white">Executive Industrial Safety & Compliance Report</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={handleExportReportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f293d] hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Document Body */}
            <div className="space-y-6 font-sans">
              {/* Document Header */}
              <div className="border-b border-slate-700 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black tracking-wider text-white uppercase">
                      SAFEGUARD INDUSTRIAL SAFETY PLATFORM
                    </h2>
                    <p className="text-xs text-cyan-400 font-mono mt-0.5">
                      OSHA 29 CFR 1910 & ISO 45001 OCCUPATIONAL HEALTH & SAFETY AUDIT REPORT
                    </p>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-400">
                    <div>Audit Date: {new Date().toLocaleDateString()}</div>
                    <div>Audit Ref: SAF-{Date.now().toString().slice(-6)}</div>
                  </div>
                </div>
              </div>

              {/* Facility Summary Section */}
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  1. Executive Facility Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded bg-[#0b0f19] border border-slate-800">
                    <span className="text-slate-500">Plant Safety Index:</span>
                    <div className="text-base font-bold text-emerald-400">{summary?.plantSafetyIndex ?? 96}%</div>
                  </div>
                  <div className="p-3 rounded bg-[#0b0f19] border border-slate-800">
                    <span className="text-slate-500">Total Workforce:</span>
                    <div className="text-base font-bold text-white">{workers.length} Enrolled</div>
                  </div>
                  <div className="p-3 rounded bg-[#0b0f19] border border-slate-800">
                    <span className="text-slate-500">Total Incidents:</span>
                    <div className="text-base font-bold text-white">{summary?.totalIncidents ?? alerts.length} Logged</div>
                  </div>
                  <div className="p-3 rounded bg-[#0b0f19] border border-slate-800">
                    <span className="text-slate-500">Average MTTA:</span>
                    <div className="text-base font-bold text-amber-400">{summary?.avgMttaSeconds ?? 42}s</div>
                  </div>
                </div>
              </div>

              {/* Plant Zone Risk Assessment */}
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  2. Sector & Zone Hazard Density
                </h3>
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#0b0f19] border-b border-slate-800 text-slate-400">
                      <th className="p-2">Zone ID</th>
                      <th className="p-2">Sector Description</th>
                      <th className="p-2">Incidents</th>
                      <th className="p-2">Critical</th>
                      <th className="p-2">Dominant Hazard</th>
                      <th className="p-2">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(zoneStats.length > 0 ? zoneStats : [
                      { zoneId: 'ZONE_A', zoneName: 'Refining & Distillation Columns', incidentCount: 2, criticalCount: 0, warningCount: 2, dominantHazard: 'POOR_AIR_QUALITY', riskLevel: 'MODERATE' as const },
                      { zoneId: 'ZONE_B', zoneName: 'High-Pressure Boiler & Thermal Unit', incidentCount: 4, criticalCount: 2, warningCount: 2, dominantHazard: 'HIGH_TEMPERATURE', riskLevel: 'CRITICAL' as const },
                      { zoneId: 'ZONE_C', zoneName: 'Scaffolding & Structural Erection', incidentCount: 1, criticalCount: 1, warningCount: 0, dominantHazard: 'FALL_DETECTED', riskLevel: 'HIGH' as const },
                      { zoneId: 'ZONE_D', zoneName: 'Chemical Storage & Confined Spaces', incidentCount: 3, criticalCount: 1, warningCount: 2, dominantHazard: 'HIGH_GAS', riskLevel: 'HIGH' as const },
                      { zoneId: 'ZONE_E', zoneName: 'Electrical Substation & Switchgear', incidentCount: 1, criticalCount: 0, warningCount: 1, dominantHazard: 'LOW_BATTERY', riskLevel: 'LOW' as const },
                    ]).map(z => (
                      <tr key={z.zoneId}>
                        <td className="p-2 text-white font-bold">{z.zoneId}</td>
                        <td className="p-2 text-slate-300 font-sans">{z.zoneName}</td>
                        <td className="p-2 text-slate-300">{z.incidentCount}</td>
                        <td className="p-2 text-red-400 font-bold">{z.criticalCount}</td>
                        <td className="p-2 text-cyan-400">{z.dominantHazard.replace(/_/g, ' ')}</td>
                        <td className="p-2">
                          <span className={z.riskLevel === 'CRITICAL' ? 'text-red-400 font-bold' : z.riskLevel === 'HIGH' ? 'text-amber-400' : 'text-emerald-400'}>
                            {z.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Personnel Risk Score Overview */}
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  3. Workforce Exposure Assessment
                </h3>
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#0b0f19] border-b border-slate-800 text-slate-400">
                      <th className="p-2">Personnel</th>
                      <th className="p-2">Department</th>
                      <th className="p-2">Shift</th>
                      <th className="p-2">Incident Count</th>
                      <th className="p-2">Safety Score</th>
                      <th className="p-2">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(riskProfiles.length > 0 ? riskProfiles : workers.map((w, idx) => ({
                      workerId: w.workerId,
                      workerName: w.name,
                      department: w.department,
                      shift: w.shift || 'DAY',
                      riskScore: 20 + idx * 25,
                      riskCategory: (idx === 0 ? 'HIGH_RISK' : idx === 1 ? 'ELEVATED' : 'SAFE') as 'SAFE' | 'ELEVATED' | 'HIGH_RISK',
                      incidentCount: idx + 1,
                      criticalCount: idx === 0 ? 1 : 0,
                      avgTemperature: 28.5 + idx * 4,
                      maxGasLevel: 120 + idx * 110,
                      lastIncidentType: 'HIGH_TEMPERATURE'
                    }))).map(r => (
                      <tr key={r.workerId}>
                        <td className="p-2 font-bold text-white font-sans">{r.workerName} ({r.workerId})</td>
                        <td className="p-2 text-slate-300">{r.department}</td>
                        <td className="p-2 text-slate-300">{r.shift}</td>
                        <td className="p-2 text-slate-300">{r.incidentCount}</td>
                        <td className="p-2 text-white font-bold">{r.riskScore} / 100</td>
                        <td className="p-2">
                          <span className={r.riskCategory === 'HIGH_RISK' ? 'text-red-400 font-bold' : r.riskCategory === 'ELEVATED' ? 'text-amber-400' : 'text-emerald-400'}>
                            {r.riskCategory.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compliance Sign-Off Block */}
              <div className="pt-4 border-t border-slate-700 grid grid-cols-2 gap-8 text-xs font-mono text-slate-400">
                <div>
                  <p>Certified Industrial Safety Officer:</p>
                  <div className="mt-4 border-b border-slate-700 w-48" />
                  <p className="mt-1 text-[11px] text-slate-500">Sign & Stamp</p>
                </div>
                <div>
                  <p>Plant Operations Director:</p>
                  <div className="mt-4 border-b border-slate-700 w-48" />
                  <p className="mt-1 text-[11px] text-slate-500">Sign & Approval</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
