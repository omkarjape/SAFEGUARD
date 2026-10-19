import React, { useState, useEffect } from 'react';
import { useSafety } from '../context/SafetyContext';
import { StatusBadge } from '../components/StatusBadge';
import { Alert, AlertType } from '../types';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Search,
  Check,
  ShieldAlert,
  Clock,
  MapPin,
  ExternalLink,
  FileSpreadsheet,
  FileJson,
  Timer,
  ChevronDown,
  ChevronUp,
  X,
  UserCheck,
  Activity,
  FileText,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ROOT_CAUSE_OPTIONS = [
  { value: 'EQUIPMENT_MALFUNCTION', label: 'Equipment / Wearable Sensor Malfunction' },
  { value: 'CONFINED_SPACE_HAZARD', label: 'Confined Space Gas Buildup / Toxic Atmosphere' },
  { value: 'PHYSICAL_INJURY_OR_FALL', label: 'Physical Injury / Slip, Trip or Fall Incident' },
  { value: 'THERMAL_STRESS', label: 'Thermal Heat Exhaustion or Boiler Fire Proximity' },
  { value: 'FALSE_ALARM_TEST', label: 'False Alarm / Safety Training Drill / Routine Calibration' },
  { value: 'ENVIRONMENTAL_VENTILATION', label: 'Ventilation Scrubber / Exhaust Air System Failure' },
  { value: 'OTHER', label: 'Other Industrial Safety Cause' }
];

const HAZARD_TYPES: AlertType[] = [
  'FALL_DETECTED',
  'SOS_PRESSED',
  'HIGH_TEMPERATURE',
  'HIGH_GAS',
  'POOR_AIR_QUALITY',
  'FLAME_DETECTED',
  'LOW_BATTERY',
  'DEVICE_OFFLINE'
];

export const AlertsPage: React.FC = () => {
  const { alerts, acknowledgeAlert, resolveAlert, clearAllAlerts } = useSafety();

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [hazardFilter, setHazardFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [slaBreachedOnly, setSlaBreachedOnly] = useState<boolean>(false);

  // Live timer tick for real-time SLA calculations
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal State for Incident Resolution
  const [selectedAlertForResolve, setSelectedAlertForResolve] = useState<Alert | null>(null);
  const [resolveOperatorName, setResolveOperatorName] = useState<string>('Shift Supervisor Ops');
  const [resolveRootCause, setResolveRootCause] = useState<string>('EQUIPMENT_MALFUNCTION');
  const [resolveNotes, setResolveNotes] = useState<string>('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState<boolean>(false);

  // Expanded Row for Audited Incident Inspection
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  // SLA duration helper
  const getElapsedSeconds = (createdAt: string) => {
    return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // KPI Calculations
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const criticalActiveAlerts = alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'ACTIVE');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'ACKNOWLEDGED');
  const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED');

  // SLA Breached alerts: active > 120s (2 minutes)
  const slaBreachedAlerts = activeAlerts.filter(a => getElapsedSeconds(a.createdAt) >= 120);

  // Mean Time to Acknowledge (MTTA)
  const computeMTTA = () => {
    const acked = alerts.filter(a => a.acknowledgedAt && a.createdAt);
    if (acked.length === 0) return 'N/A';
    const totalSeconds = acked.reduce((acc, a) => {
      const diff = (new Date(a.acknowledgedAt!).getTime() - new Date(a.createdAt).getTime()) / 1000;
      return acc + Math.max(0, diff);
    }, 0);
    const avg = Math.round(totalSeconds / acked.length);
    if (avg < 60) return `${avg}s`;
    return `${Math.floor(avg / 60)}m ${avg % 60}s`;
  };

  // Filter pipeline
  const filteredAlerts = alerts.filter(a => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchesHazard = hazardFilter === 'ALL' || a.type === hazardFilter;
    const matchesSla = !slaBreachedOnly || (a.status === 'ACTIVE' && getElapsedSeconds(a.createdAt) >= 120);

    const matchesSearch =
      a.message.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase()) ||
      (a.workerName && a.workerName.toLowerCase().includes(search.toLowerCase())) ||
      (a.workerId && a.workerId.toLowerCase().includes(search.toLowerCase())) ||
      (a.jacketId && a.jacketId.toLowerCase().includes(search.toLowerCase())) ||
      (a.deviceId && a.deviceId.toLowerCase().includes(search.toLowerCase())) ||
      (a.rootCause && a.rootCause.toLowerCase().includes(search.toLowerCase())) ||
      a.id.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSeverity && matchesHazard && matchesSla && matchesSearch;
  });

  // Action Handlers
  const handleQuickAck = async (alertId: string) => {
    await acknowledgeAlert(alertId, 'Shift Supervisor Ops');
  };

  const handleOpenResolveModal = (alert: Alert) => {
    setSelectedAlertForResolve(alert);
    setResolveOperatorName('Shift Supervisor Ops');
    setResolveRootCause('EQUIPMENT_MALFUNCTION');
    setResolveNotes('');
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForResolve) return;

    setIsSubmittingResolution(true);
    try {
      await resolveAlert(selectedAlertForResolve.id, {
        operatorName: resolveOperatorName.trim() || 'Shift Supervisor Ops',
        rootCause: resolveRootCause,
        resolutionNotes: resolveNotes.trim() || 'Incident resolved and verified safe by shift supervisor.'
      });
      setSelectedAlertForResolve(null);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  // Export OSHA / ISO 45001 Compliant Incident CSV
  const handleExportCSV = () => {
    const headers = [
      'Incident ID',
      'Worker ID',
      'Worker Name',
      'Jacket ID',
      'Device ID',
      'Hazard Type',
      'Severity',
      'Status',
      'Incident Message',
      'Latitude',
      'Longitude',
      'Trigger Timestamp (ISO)',
      'Acknowledged Timestamp (ISO)',
      'Acknowledged By',
      'Resolved Timestamp (ISO)',
      'Resolved By',
      'Root Cause Category',
      'Supervisor Resolution Notes'
    ];

    const rows = filteredAlerts.map(a => [
      `"${a.id}"`,
      `"${a.workerId || ''}"`,
      `"${(a.workerName || '').replace(/"/g, '""')}"`,
      `"${a.jacketId || ''}"`,
      `"${a.deviceId || ''}"`,
      `"${a.type}"`,
      `"${a.severity}"`,
      `"${a.status}"`,
      `"${(a.message || '').replace(/"/g, '""')}"`,
      `"${a.latitude ?? ''}"`,
      `"${a.longitude ?? ''}"`,
      `"${a.createdAt}"`,
      `"${a.acknowledgedAt || ''}"`,
      `"${(a.acknowledgedBy || '').replace(/"/g, '""')}"`,
      `"${a.resolvedAt || ''}"`,
      `"${(a.resolvedBy || '').replace(/"/g, '""')}"`,
      `"${(a.rootCause || '').replace(/"/g, '""')}"`,
      `"${(a.resolutionNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OSHA_ISO45001_Safety_Incidents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Audit Log
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredAlerts, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `incident_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Safety Alerts & Incident Operations Center
              </h3>
              <p className="text-xs text-slate-400">
                Multi-worker hazard triage, industrial SLA escalation tracking, and OSHA / ISO 45001 audited incident resolution
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Audited CSV & JSON Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition shadow-sm"
            title="Download audited OSHA / ISO 45001 incident log CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition shadow-sm"
            title="Download complete incident audit trail JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all active alerts and reset the system safety status to SAFE?')) {
                clearAllAlerts();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 hover:text-white text-xs font-medium transition shadow-sm"
            title="Clear all alerts and reset safety status"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Clear All Alerts</span>
          </button>
        </div>
      </div>

      {/* Incident Triage KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Active Unacknowledged */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Active Alarms</span>
            <span className={`w-2 h-2 rounded-full ${activeAlerts.length > 0 ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{activeAlerts.length}</span>
            <span className="text-[11px] text-slate-400 font-mono">unresolved</span>
          </div>
          <div className="mt-1 text-[10px] text-red-400 font-mono flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" />
            <span>{criticalActiveAlerts.length} Critical Immediate</span>
          </div>
        </div>

        {/* SLA Breached Incidents */}
        <div className={`p-4 rounded-xl border shadow-lg transition ${
          slaBreachedAlerts.length > 0
            ? 'bg-red-950/40 border-red-500/50'
            : 'bg-[#111827] border-[#1f293d]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">SLA Breaches</span>
            <Timer className={`w-3.5 h-3.5 ${slaBreachedAlerts.length > 0 ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${slaBreachedAlerts.length > 0 ? 'text-red-400' : 'text-white'}`}>
              {slaBreachedAlerts.length}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">&gt; 2 min response</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            {slaBreachedAlerts.length > 0 ? (
              <span className="text-red-300 font-bold">ESCALATION LEVEL 1</span>
            ) : (
              <span className="text-emerald-400">All responses on target</span>
            )}
          </div>
        </div>

        {/* In-Progress / Acknowledged */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">In Progress</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{acknowledgedAlerts.length}</span>
            <span className="text-[11px] text-slate-400 font-mono">acknowledged</span>
          </div>
          <div className="mt-1 text-[10px] text-amber-400/80 font-mono">
            Response teams deployed
          </div>
        </div>

        {/* Resolved */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Resolved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{resolvedAlerts.length}</span>
            <span className="text-[11px] text-slate-400 font-mono">mitigated</span>
          </div>
          <div className="mt-1 text-[10px] text-emerald-400/80 font-mono">
            Audited & closed
          </div>
        </div>

        {/* MTTA */}
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Mean Time to Ack</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400 font-mono">{computeMTTA()}</span>
            <span className="text-[11px] text-slate-400 font-mono">MTTA</span>
          </div>
          <div className="mt-1 text-[10px] text-cyan-400/80 font-mono">
            Target: &lt; 60 seconds
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incident ID, hazard, worker name, jacket, device, root cause notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">Status: All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">Severity: All</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="WARNING">WARNING</option>
            <option value="INFO">INFO</option>
          </select>

          {/* Hazard Type Filter */}
          <select
            value={hazardFilter}
            onChange={(e) => setHazardFilter(e.target.value)}
            className="bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">Hazard: All Types</option>
            {HAZARD_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* SLA Breach Quick Filter Toggle */}
          <button
            onClick={() => setSlaBreachedOnly(!slaBreachedOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition border ${
              slaBreachedOnly
                ? 'bg-red-950 border-red-500 text-red-300'
                : 'bg-[#0b0f19] border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>SLA Breaches</span>
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#111827] rounded-xl border border-[#1f293d] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0b0f19] border-b border-[#1f293d] text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Incident ID</th>
                <th className="py-3.5 px-4 font-semibold">Worker & Hardware</th>
                <th className="py-3.5 px-4 font-semibold">Hazard & Severity</th>
                <th className="py-3.5 px-4 font-semibold">Incident Description</th>
                <th className="py-3.5 px-4 font-semibold">SLA & Response Time</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions & Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d] text-slate-300">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                    No safety alerts matching your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((a) => {
                  const isCritical = a.severity === 'CRITICAL';
                  const isActive = a.status === 'ACTIVE';
                  const elapsedSec = getElapsedSeconds(a.createdAt);
                  const isBreached = isActive && elapsedSec >= 120;
                  const isExpanded = expandedAlertId === a.id;

                  return (
                    <React.Fragment key={a.id}>
                      <tr
                        className={`transition ${
                          isBreached
                            ? 'bg-red-950/30 hover:bg-red-950/40 border-l-4 border-l-red-500'
                            : isCritical && isActive
                            ? 'bg-red-950/20 hover:bg-red-950/30 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Incident ID */}
                        <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white">{a.id}</span>
                            {isBreached && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" title="SLA Breached" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(a.createdAt).toLocaleTimeString()}
                          </div>
                        </td>

                        {/* Worker & Hardware */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">
                            {a.workerName || a.workerId || 'Unassigned'}
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400">
                            {a.jacketId} • {a.deviceId}
                          </div>
                          {a.latitude && a.longitude && (
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-600" />
                              <span>{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</span>
                            </div>
                          )}
                        </td>

                        {/* Hazard & Severity */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-200">
                            {a.type.replace(/_/g, ' ')}
                          </div>
                          <div className="mt-1">
                            <StatusBadge status={a.severity} size="sm" />
                          </div>
                        </td>

                        {/* Incident Description */}
                        <td className="py-3.5 px-4 max-w-xs text-slate-200">
                          <p className="line-clamp-2">{a.message}</p>
                          {a.rootCause && (
                            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                              Cause: {a.rootCause.replace(/_/g, ' ')}
                            </span>
                          )}
                        </td>

                        {/* SLA & Response Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isActive ? (
                            isBreached ? (
                              <div className="flex flex-col gap-1">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-red-300 text-[10px] font-mono font-bold animate-pulse">
                                  <AlertOctagon className="w-3 h-3 text-red-400" />
                                  SLA BREACH: +{formatDuration(elapsedSec)}
                                </div>
                                <span className="text-[10px] text-red-400/80 font-mono">Response overdue (&gt;2m)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
                                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Elapsed: {formatDuration(elapsedSec)}</span>
                              </div>
                            )
                          ) : a.status === 'ACKNOWLEDGED' ? (
                            <div className="text-[11px] font-mono text-amber-400 flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-amber-400" />
                                <span>Acked by {a.acknowledgedBy || 'Supervisor'}</span>
                              </div>
                              {a.acknowledgedAt && (
                                <span className="text-[10px] text-slate-500">
                                  Response time: {formatDuration(Math.max(0, Math.floor((new Date(a.acknowledgedAt).getTime() - new Date(a.createdAt).getTime()) / 1000)))}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] font-mono text-emerald-400 flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Resolved by {a.resolvedBy || 'Supervisor'}</span>
                              </div>
                              {a.resolvedAt && (
                                <span className="text-[10px] text-slate-500">
                                  Total time: {formatDuration(Math.max(0, Math.floor((new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000)))}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                              a.status === 'ACTIVE'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                                : a.status === 'ACKNOWLEDGED'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>

                        {/* Actions & Audit Details Toggle */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                          {a.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleQuickAck(a.id)}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-amber-950 text-amber-300 border border-amber-500/40 hover:bg-amber-900 transition shadow-sm"
                              title="Acknowledge alert as shift supervisor"
                            >
                              Ack
                            </button>
                          )}

                          {a.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleOpenResolveModal(a)}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                              title="Open incident resolution & root cause modal"
                            >
                              Resolve
                            </button>
                          )}

                          {a.workerId && (
                            <Link
                              to={`/workers/${a.workerId}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#1f293d] hover:bg-slate-700 text-slate-300 transition"
                              title="View worker profile and telemetry timeline"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}

                          <button
                            onClick={() => setExpandedAlertId(isExpanded ? null : a.id)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-medium bg-[#0b0f19] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition"
                            title="Toggle audited incident details"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Audit Log Details Row */}
                      {isExpanded && (
                        <tr className="bg-[#0b0f19]/90 border-b border-[#1f293d]">
                          <td colSpan={7} className="p-4 text-xs font-mono">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#111827] p-3.5 rounded-lg border border-[#1f293d]">
                              <div>
                                <div className="text-slate-400 font-bold mb-1.5 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Incident Timeline</span>
                                </div>
                                <div className="space-y-1 text-slate-300 text-[11px]">
                                  <div>Triggered: <span className="text-white">{new Date(a.createdAt).toLocaleString()}</span></div>
                                  <div>
                                    Acknowledged: {a.acknowledgedAt ? (
                                      <span className="text-amber-300">{new Date(a.acknowledgedAt).toLocaleString()} ({a.acknowledgedBy || 'Supervisor'})</span>
                                    ) : (
                                      <span className="text-slate-500">Pending</span>
                                    )}
                                  </div>
                                  <div>
                                    Resolved: {a.resolvedAt ? (
                                      <span className="text-emerald-300">{new Date(a.resolvedAt).toLocaleString()} ({a.resolvedBy || 'Supervisor'})</span>
                                    ) : (
                                      <span className="text-slate-500">Unresolved</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <div className="text-slate-400 font-bold mb-1.5 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Hardware & Coordinates</span>
                                </div>
                                <div className="space-y-1 text-slate-300 text-[11px]">
                                  <div>Worker ID: <span className="text-white">{a.workerId}</span></div>
                                  <div>Jacket ID: <span className="text-cyan-400">{a.jacketId}</span></div>
                                  <div>Device ID: <span className="text-cyan-400">{a.deviceId}</span></div>
                                  <div>GPS: {a.latitude ? `${a.latitude.toFixed(6)}, ${a.longitude?.toFixed(6)}` : 'Plant Zone A (Default)'}</div>
                                </div>
                              </div>

                              <div>
                                <div className="text-slate-400 font-bold mb-1.5 flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Audit & Root Cause Notes</span>
                                </div>
                                <div className="space-y-1 text-slate-300 text-[11px]">
                                  <div>Root Cause: <span className="text-emerald-400">{a.rootCause || 'Unassigned'}</span></div>
                                  <div>Notes: <span className="text-slate-200 italic">{a.resolutionNotes || 'No operator notes recorded yet.'}</span></div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator Incident Resolution Modal */}
      {selectedAlertForResolve && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-cyan-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Operator Incident Resolution</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Incident ID: <span className="text-cyan-400">{selectedAlertForResolve.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertForResolve(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alert Context Pill */}
            <div className="my-4 p-3 rounded-lg bg-[#0b0f19] border border-[#1f293d] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  {selectedAlertForResolve.workerName || selectedAlertForResolve.workerId}
                </span>
                <span className="font-mono text-cyan-400">{selectedAlertForResolve.type.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-xs text-slate-300">{selectedAlertForResolve.message}</p>
            </div>

            {/* Resolution Form */}
            <form onSubmit={handleConfirmResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                  Shift Supervisor / Operator Name:
                </label>
                <input
                  type="text"
                  required
                  value={resolveOperatorName}
                  onChange={(e) => setResolveOperatorName(e.target.value)}
                  placeholder="e.g. Shift Supervisor Ops"
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                  Root Cause Category (OSHA / ISO 45001):
                </label>
                <select
                  value={resolveRootCause}
                  onChange={(e) => setResolveRootCause(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {ROOT_CAUSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                  Corrective Actions & Supervisor Notes:
                </label>
                <textarea
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g., Emergency response team dispatched to Zone B. Worker evacuated to safety station. Equipment inspected and reset. All sensors verified normal."
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1f293d]">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForResolve(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolution}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingResolution ? 'Saving...' : 'Confirm Resolution & Close Incident'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
