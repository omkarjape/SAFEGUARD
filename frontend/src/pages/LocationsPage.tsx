import React, { useState, useEffect, useMemo } from 'react';
import { useSafety } from '../context/SafetyContext';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { GeoFence, TrajectoryPoint } from '../types';
import {
  MapPin,
  Compass,
  Navigation,
  Radio,
  ExternalLink,
  Shield,
  Layers,
  AlertTriangle,
  Flame,
  Zap,
  Crosshair,
  CheckCircle2,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  ShieldAlert,
  ChevronRight,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LocationsPage: React.FC = () => {
  const { workers, locations, liveSensors, alerts, acknowledgeAlert } = useSafety();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('W001');
  const [activeTab, setActiveTab] = useState<'INSPECTOR' | 'GEOFENCES' | 'DRILL'>('INSPECTOR');
  const [geofences, setGeofences] = useState<GeoFence[]>([]);
  const [trajectories, setTrajectories] = useState<Record<string, TrajectoryPoint[]>>({});
  const [drillTargetWorker, setDrillTargetWorker] = useState<string>('W001');
  const [drillTargetGeofence, setDrillTargetGeofence] = useState<string>('GF_001');
  const [isExecutingDrill, setIsExecutingDrill] = useState<boolean>(false);
  const [drillFeedback, setDrillFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Layer visibility toggles
  const [showGeofences, setShowGeofences] = useState<boolean>(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);

  // Sector focus filter
  const [sectorFocus, setSectorFocus] = useState<'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'ZONE_D'>('ALL');

  // Load geofences and trajectories on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gfList, trajMap] = await Promise.all([
          api.getGeofences(),
          api.getTrajectories()
        ]);
        setGeofences(gfList);
        setTrajectories(trajMap);
      } catch (err) {
        console.error('Failed to fetch geofences or trajectories:', err);
      }
    };
    fetchData();

    // Periodic refresh for trajectory breadcrumbs
    const interval = setInterval(async () => {
      try {
        const trajMap = await api.getTrajectories();
        setTrajectories(trajMap);
      } catch {
        // quiet ignore
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Selected worker details
  const selectedLoc = locations.find(l => l.workerId === selectedWorkerId) || locations[0];
  const selectedWorker = workers.find(w => w.workerId === selectedWorkerId);
  const sensor = selectedWorker?.deviceId ? liveSensors[selectedWorker.deviceId] : undefined;

  // Active Geofence Breach Alerts
  const activeBreachAlerts = useMemo(() => {
    return alerts.filter(a => a.type === 'GEOFENCE_BREACH' && a.status !== 'RESOLVED');
  }, [alerts]);

  // Coordinate Conversion: GPS to 600x460 Canvas Space
  // Plant bounding coordinates:
  // Lat: 19.7640 to 19.7680
  // Lon: 74.4750 to 74.4790
  const latMin = 19.7640;
  const latMax = 19.7680;
  const lonMin = 74.4750;
  const lonMax = 74.4790;

  const gpsToCanvas = (lat: number, lon: number) => {
    const normX = (lon - lonMin) / (lonMax - lonMin);
    const normY = (latMax - lat) / (latMax - latMin);
    const x = Math.max(30, Math.min(570, normX * 600));
    const y = Math.max(30, Math.min(430, normY * 460));
    return { x, y };
  };

  // Distance calculation to nearest geofence boundary in meters
  const proximityInfo = useMemo<{
    distanceMeters: number;
    closestGf: GeoFence | null;
    isCurrentlyInside: boolean;
  }>(() => {
    const lat = sensor?.latitude ?? selectedLoc?.latitude ?? 19.7660;
    const lon = sensor?.longitude ?? selectedLoc?.longitude ?? 74.4770;

    let minDistanceMeters = Infinity;
    let closestGf: GeoFence | null = null;
    let isCurrentlyInside = false;

    for (const gf of geofences) {
      if (!gf.active) continue;

      const inside = lat >= gf.minLat && lat <= gf.maxLat && lon >= gf.minLon && lon <= gf.maxLon;
      if (inside) {
        isCurrentlyInside = true;
        closestGf = gf;
        minDistanceMeters = 0;
        break;
      }

      // Delta to boundary box
      let dLat = 0;
      if (lat < gf.minLat) dLat = gf.minLat - lat;
      else if (lat > gf.maxLat) dLat = lat - gf.maxLat;

      let dLon = 0;
      if (lon < gf.minLon) dLon = gf.minLon - lon;
      else if (lon > gf.maxLon) dLon = lon - gf.maxLon;

      const distMeters = Math.hypot(dLat * 111320, dLon * 104750);
      if (distMeters < minDistanceMeters) {
        minDistanceMeters = distMeters;
        closestGf = gf;
      }
    }

    return {
      distanceMeters: minDistanceMeters === Infinity ? 0 : Math.round(minDistanceMeters),
      closestGf,
      isCurrentlyInside
    };
  }, [sensor, selectedLoc, geofences]);

  // Handler for Breach Drill Simulation
  const handleSimulateBreach = async () => {
    try {
      setIsExecutingDrill(true);
      setDrillFeedback(null);
      const res = await api.simulateGeofenceBreach(drillTargetWorker, drillTargetGeofence);
      setDrillFeedback({
        type: 'success',
        message: `Breach triggered: ${res.worker.name} penetrated ${res.geofence.name}!`
      });
      setSelectedWorkerId(drillTargetWorker);
      // Refresh trajectories
      const trajMap = await api.getTrajectories();
      setTrajectories(trajMap);
    } catch (err: any) {
      setDrillFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to simulate breach drill'
      });
    } finally {
      setIsExecutingDrill(false);
    }
  };

  // Trajectory points for selected worker
  const selectedWorkerTrajectory = trajectories[selectedWorkerId] || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Plant Facility Geolocation & GPS Floor Tracker
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time differential GPS positioning, continuous trajectory breadcrumbs & dynamic geo-fence security
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1f293d] font-mono text-xs text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>NEO-6M: 3D DGPS Fix (11 Sats, HDOP 0.85m)</span>
          </div>
          <button
            onClick={() => setActiveTab('DRILL')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-mono text-xs transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>Perimeter Drill Lab</span>
          </button>
        </div>
      </div>

      {/* Active Breach Alert Banner (if any) */}
      {activeBreachAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-red-950/40 border-2 border-red-500/60 shadow-lg shadow-red-950/50 animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-red-600 font-mono text-[10px] font-bold text-white uppercase tracking-wider">
                    CRITICAL PERIMETER BREACH
                  </span>
                  <span className="text-xs font-mono text-red-300">
                    {activeBreachAlerts.length} Active Incident{activeBreachAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {activeBreachAlerts[0].message}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => acknowledgeAlert(activeBreachAlerts[0].id, 'Safety Operator')}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition shadow"
              >
                Acknowledge Breach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Map & Detail Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive SVG Plant Floor Canvas */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#111827] border border-[#1f293d] shadow-2xl space-y-4">
          {/* Canvas Toolbar & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f293d] pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Industrial Facility Floorplan & Exclusion Perimeter Grid
              </span>
            </div>

            {/* Layer Visibility Toggles */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <button
                onClick={() => setShowGeofences(!showGeofences)}
                className={`px-2 py-1 rounded border transition flex items-center gap-1 ${
                  showGeofences
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-800/40 border-slate-700 text-slate-500'
                }`}
                title="Toggle Geofence Boundaries"
              >
                <Shield className="w-3 h-3" />
                <span>Geofences</span>
              </button>
              <button
                onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
                className={`px-2 py-1 rounded border transition flex items-center gap-1 ${
                  showBreadcrumbs
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/40 border-slate-700 text-slate-500'
                }`}
                title="Toggle Footstep Trajectories"
              >
                <Activity className="w-3 h-3" />
                <span>Breadcrumbs</span>
              </button>
              <button
                onClick={() => setShowCorridors(!showCorridors)}
                className={`px-2 py-1 rounded border transition flex items-center gap-1 ${
                  showCorridors
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-slate-800/40 border-slate-700 text-slate-500'
                }`}
                title="Toggle Safe Corridors"
              >
                <Layers className="w-3 h-3" />
                <span>Corridors</span>
              </button>
            </div>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full h-[480px] bg-[#070b14] border border-[#1e293b] rounded-xl overflow-hidden select-none">
            <svg
              viewBox="0 0 600 460"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Diagonal Hazard Stripe Pattern - Red / Critical */}
                <pattern
                  id="hazardStripe-red"
                  width="16"
                  height="16"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(239, 68, 68, 0.28)" strokeWidth="8" />
                </pattern>

                {/* Diagonal Hazard Stripe Pattern - Amber / Warning */}
                <pattern
                  id="hazardStripe-amber"
                  width="16"
                  height="16"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(245, 158, 11, 0.24)" strokeWidth="8" />
                </pattern>

                {/* Blueprint Grid Pattern */}
                <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(56, 189, 248, 0.07)" strokeWidth="1" />
                </pattern>

                {/* Radial Glow Gradient */}
                <radialGradient id="safeCorridorGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.15)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0.0)" />
                </radialGradient>
              </defs>

              {/* Grid Background */}
              {showGrid && <rect width="600" height="460" fill="url(#grid)" />}

              {/* Structural Building Boundary Outline */}
              <rect
                x="20"
                y="20"
                width="560"
                height="420"
                rx="8"
                fill="none"
                stroke="#1e293b"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Safe Corridors (Cross Pathways) */}
              {showCorridors && (
                <g opacity="0.7">
                  {/* Central Horizontal Walkway */}
                  <rect x="25" y="215" width="550" height="30" fill="url(#safeCorridorGlow)" stroke="rgba(6, 182, 212, 0.3)" strokeDasharray="3 3" />
                  {/* Central Vertical Walkway */}
                  <rect x="270" y="25" width="60" height="410" fill="url(#safeCorridorGlow)" stroke="rgba(6, 182, 212, 0.3)" strokeDasharray="3 3" />
                  <text x="300" y="233" fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.8">
                    PRIMARY EVACUATION CORRIDOR
                  </text>
                </g>
              )}

              {/* Render Geofences */}
              {showGeofences && geofences.map(gf => {
                const p1 = gpsToCanvas(gf.maxLat, gf.minLon);
                const p2 = gpsToCanvas(gf.minLat, gf.maxLon);
                const x = p1.x;
                const y = p1.y;
                const width = Math.max(80, p2.x - p1.x);
                const height = Math.max(60, p2.y - p1.y);

                const isExclusion = gf.zoneType === 'EXCLUSION';
                const isCritical = gf.severity === 'CRITICAL';
                const strokeColor = isExclusion || isCritical ? '#ef4444' : '#f59e0b';
                const patternId = isExclusion || isCritical ? 'url(#hazardStripe-red)' : 'url(#hazardStripe-amber)';

                // Check if any worker is currently inside this geofence
                const workerInside = workers.some(w => {
                  const loc = locations.find(l => l.workerId === w.workerId);
                  if (!loc) return false;
                  return loc.latitude >= gf.minLat && loc.latitude <= gf.maxLat && loc.longitude >= gf.minLon && loc.longitude <= gf.maxLon;
                });

                return (
                  <g key={gf.id} className="transition-all duration-300">
                    {/* Zone Fill Pattern */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx="6"
                      fill={patternId}
                      stroke={strokeColor}
                      strokeWidth={workerInside ? '2.5' : '1.5'}
                      strokeDasharray={isExclusion ? '6 4' : 'none'}
                      className={workerInside ? 'animate-pulse' : ''}
                    />

                    {/* Corner Target Brackets */}
                    <path
                      d={`M ${x + 8} ${y} L ${x} ${y} L ${x} ${y + 8}
                          M ${x + width - 8} ${y} L ${x + width} ${y} L ${x + width} ${y + 8}
                          M ${x} ${y + height - 8} L ${x} ${y + height} L ${x + 8} ${y + height}
                          M ${x + width - 8} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - 8}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                    />

                    {/* Header Zone Badge */}
                    <g transform={`translate(${x + 8}, ${y + 16})`}>
                      <rect
                        x="-4"
                        y="-11"
                        width={Math.min(width - 12, 195)}
                        height="16"
                        rx="3"
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke={strokeColor}
                        strokeWidth="0.8"
                      />
                      <text
                        x="2"
                        y="0"
                        fill="#f8fafc"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {gf.id}: {gf.name.slice(0, 20)}
                      </text>
                    </g>

                    {/* Zone Hazard Sub-Badge */}
                    <text
                      x={x + 10}
                      y={y + 32}
                      fill={isCritical ? '#fca5a5' : '#fde68a'}
                      fontSize="8"
                      fontFamily="monospace"
                      opacity="0.9"
                    >
                      [{gf.zoneType}] {gf.hazardDescription.slice(0, 32)}...
                    </text>

                    {/* Worker Breached Warning Indicator */}
                    {workerInside && (
                      <g transform={`translate(${x + width / 2}, ${y + height / 2})`}>
                        <circle r="14" fill="rgba(239, 68, 68, 0.3)" className="animate-ping" />
                        <circle r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                        <text x="0" y="3" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">!</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Render Real-Time Trajectory Breadcrumbs */}
              {showBreadcrumbs && selectedWorkerTrajectory.length > 1 && (
                <g>
                  {/* Polyline Path */}
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="4 3"
                    opacity="0.75"
                    points={selectedWorkerTrajectory
                      .map(pt => {
                        const { x, y } = gpsToCanvas(pt.latitude, pt.longitude);
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* Footstep Dots with Fading Opacity */}
                  {selectedWorkerTrajectory.map((pt, idx) => {
                    const { x, y } = gpsToCanvas(pt.latitude, pt.longitude);
                    const isLatest = idx === selectedWorkerTrajectory.length - 1;
                    const opacity = 0.2 + (idx / selectedWorkerTrajectory.length) * 0.8;
                    const r = isLatest ? 4 : 2.5;

                    return (
                      <circle
                        key={`crumb-${idx}`}
                        cx={x}
                        cy={y}
                        r={r}
                        fill={pt.status === 'CRITICAL' ? '#ef4444' : '#06b6d4'}
                        opacity={opacity}
                      >
                        <title>{`Time: ${new Date(pt.timestamp).toLocaleTimeString()} (${pt.latitude.toFixed(6)}, ${pt.longitude.toFixed(6)})`}</title>
                      </circle>
                    );
                  })}
                </g>
              )}

              {/* Render Live Worker Marker Pins */}
              {workers.map(worker => {
                const loc = locations.find(l => l.workerId === worker.workerId);
                const lat = loc ? loc.latitude : 19.766;
                const lon = loc ? loc.longitude : 74.477;
                const { x, y } = gpsToCanvas(lat, lon);
                const isSelected = selectedWorkerId === worker.workerId;
                const isCritical = worker.status === 'CRITICAL';
                const isWarning = worker.status === 'WARNING';

                const markerColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

                return (
                  <g
                    key={worker.id}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => setSelectedWorkerId(worker.workerId)}
                    className="cursor-pointer"
                  >
                    {/* Animated Pulsing Ring */}
                    <circle
                      r="16"
                      fill="none"
                      stroke={markerColor}
                      strokeWidth="1.5"
                      opacity="0.6"
                      className="animate-ping"
                    />

                    {/* Outer Glow Halo for Selected Worker */}
                    {isSelected && (
                      <circle
                        r="20"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        className="animate-spin"
                        style={{ animationDuration: '6s' }}
                      />
                    )}

                    {/* Main Worker Pin Body */}
                    <circle
                      r="12"
                      fill={markerColor}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="shadow-lg transition-transform hover:scale-125"
                    />

                    {/* Worker Number Label */}
                    <text
                      x="0"
                      y="3.5"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {worker.workerId.replace('W', '')}
                    </text>

                    {/* Floating Tooltip Label */}
                    <g transform="translate(0, 24)">
                      <rect
                        x="-38"
                        y="-10"
                        width="76"
                        height="16"
                        rx="4"
                        fill="rgba(0, 0, 0, 0.85)"
                        stroke="#334155"
                        strokeWidth="0.8"
                      />
                      <text
                        x="0"
                        y="1.5"
                        fill="#ffffff"
                        fontSize="8"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {worker.workerId} • {worker.name.split(' ')[0]}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Map Footer Legend & Instructions */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Safe Personnel
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Restricted Zone
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-ping" /> Exclusion Breach
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-4 h-0.5 border-t border-dashed border-cyan-400 inline-block" /> Breadcrumb Trail
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Click a personnel marker to inspect live coordinates & breadcrumbs
            </span>
          </div>
        </div>

        {/* Right Column: Telemetry Inspector & Geo-Fence Management Sidebar */}
        <div className="space-y-4">
          {/* Tab Selector */}
          <div className="flex rounded-xl bg-[#111827] border border-[#1f293d] p-1">
            <button
              onClick={() => setActiveTab('INSPECTOR')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'INSPECTOR'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Personnel Fix
            </button>
            <button
              onClick={() => setActiveTab('GEOFENCES')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'GEOFENCES'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Exclusion Zones ({geofences.length})
            </button>
            <button
              onClick={() => setActiveTab('DRILL')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'DRILL'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Drill Lab
            </button>
          </div>

          {/* TAB 1: PERSONNEL INSPECTOR */}
          {activeTab === 'INSPECTOR' && (
            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f293d] shadow-xl space-y-4">
              <div className="border-b border-[#1f293d] pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    Target Telemetry Inspector
                  </h4>
                  <p className="text-[11px] text-slate-400">Differential GPS positioning & boundary proximity</p>
                </div>
                {selectedWorker && <StatusBadge status={selectedWorker.status} size="sm" />}
              </div>

              {selectedWorker ? (
                <div className="space-y-4 text-xs">
                  {/* Worker Quick Identity */}
                  <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#1f293d] flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-white">{selectedWorker.name}</div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        {selectedWorker.workerId} • {selectedWorker.department} ({selectedWorker.designation})
                      </div>
                    </div>
                  </div>

                  {/* NEO-6M DGPS Positioning Box */}
                  <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-cyan-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        NEO-6M SATELLITE FIX
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                        3D CARRIER PHASE FIX
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Latitude (WGS84)</span>
                        <span className="font-bold text-white text-sm">
                          {(sensor?.latitude ?? selectedLoc?.latitude ?? 19.766020).toFixed(6)}° N
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Longitude (WGS84)</span>
                        <span className="font-bold text-white text-sm">
                          {(sensor?.longitude ?? selectedLoc?.longitude ?? 74.477040).toFixed(6)}° E
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      <div>HDOP: <span className="text-white font-bold">0.85 m</span></div>
                      <div>Satellites: <span className="text-white font-bold">11 (GPS/GLO)</span></div>
                      <div>Speed: <span className="text-white font-bold">1.2 km/h</span></div>
                    </div>
                  </div>

                  {/* Geofence Boundary Proximity Status */}
                  <div className={`p-3.5 rounded-xl border space-y-2 ${
                    proximityInfo.isCurrentlyInside
                      ? 'bg-red-950/30 border-red-500/50'
                      : proximityInfo.distanceMeters < 15
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-[#0b0f19] border-[#1f293d]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono font-bold flex items-center gap-1.5 text-slate-300">
                        <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                        Boundary Proximity Analysis
                      </span>
                      {proximityInfo.isCurrentlyInside ? (
                        <span className="px-2 py-0.5 rounded bg-red-600 font-mono text-[9px] font-bold text-white">
                          PENETRATED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[9px] text-slate-300">
                          {proximityInfo.distanceMeters}m to perimeter
                        </span>
                      )}
                    </div>

                    {proximityInfo.isCurrentlyInside ? (
                      <div className="p-2 rounded-lg bg-red-900/30 border border-red-500/40 text-[11px] text-red-200">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          INSIDE {proximityInfo.closestGf?.name}
                        </div>
                        <p className="text-[10px] text-red-300 mt-1">
                          {proximityInfo.closestGf?.hazardDescription}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div>Nearest Hazard: <span className="text-white font-semibold">{proximityInfo.closestGf?.name || 'None'}</span></div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full transition-all duration-500 ${
                              proximityInfo.distanceMeters < 15 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(10, 100 - proximityInfo.distanceMeters * 2))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hardware & Breadcrumb Summary */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#0b0f19] border border-[#1f293d] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Safety Jacket ID:</span>
                      <span className="font-mono text-cyan-400">{selectedWorker.jacketId || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ESP32 Fleet Node:</span>
                      <span className="font-mono text-slate-200">{selectedWorker.deviceId || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Battery Capacity:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {sensor ? `${sensor.batteryPercentage.toFixed(0)}%` : '94%'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Breadcrumb History:</span>
                      <span className="font-mono text-slate-300">
                        {selectedWorkerTrajectory.length} footstep waypoints
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/workers/${selectedWorker.workerId}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg transition"
                  >
                    Inspect Worker Profile & Full Sensor Telemetry
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Select a worker marker on the plant canvas.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GEOFENCE DIRECTORY */}
          {activeTab === 'GEOFENCES' && (
            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f293d] shadow-xl space-y-4">
              <div className="border-b border-[#1f293d] pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Facility Exclusion Perimeters
                </h4>
                <p className="text-[11px] text-slate-400">
                  {geofences.filter(g => g.active).length} active hazard zones monitored by GPS boundary checks
                </p>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {geofences.map(gf => {
                  const isCritical = gf.severity === 'CRITICAL';
                  const isExclusion = gf.zoneType === 'EXCLUSION';

                  return (
                    <div
                      key={gf.id}
                      className="p-3 rounded-xl bg-[#0b0f19] border border-[#1f293d] space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="font-bold text-white text-xs">{gf.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                          isExclusion
                            ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                        }`}>
                          {gf.zoneType}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {gf.hazardDescription}
                      </p>

                      <div className="text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-1.5 flex justify-between">
                        <span>Lat: {gf.minLat.toFixed(4)} - {gf.maxLat.toFixed(4)}</span>
                        <span>Lon: {gf.minLon.toFixed(4)} - {gf.maxLon.toFixed(4)}</span>
                      </div>

                      {gf.allowedRoles && gf.allowedRoles.length > 0 && (
                        <div className="text-[10px] text-slate-400 flex flex-wrap gap-1 pt-1">
                          <span className="text-slate-500">Authorized:</span>
                          {gf.allowedRoles.map((r, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SIMULATE BREACH DRILL LAB */}
          {activeTab === 'DRILL' && (
            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1f293d] shadow-xl space-y-4">
              <div className="border-b border-[#1f293d] pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Perimeter Breach Drill Simulator
                </h4>
                <p className="text-[11px] text-slate-400">
                  Trigger synthetic GPS penetration into high-hazard zones to test automated alarms
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Target Worker Select */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Target Personnel</label>
                  <select
                    value={drillTargetWorker}
                    onChange={(e) => setDrillTargetWorker(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  >
                    {workers.map(w => (
                      <option key={w.workerId} value={w.workerId}>
                        {w.workerId} - {w.name} ({w.designation})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Hazard Zone Select */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Target Exclusion Geofence</label>
                  <select
                    value={drillTargetGeofence}
                    onChange={(e) => setDrillTargetGeofence(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  >
                    {geofences.map(gf => (
                      <option key={gf.id} value={gf.id}>
                        [{gf.zoneType}] {gf.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info Callout */}
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-[11px] text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-200">
                    <Info className="w-3.5 h-3.5" />
                    Automated OSHA Protocol:
                  </div>
                  <p>
                    When triggered, the worker's coordinate will update inside the hazard zone. The engine evaluates boundary rules, dispatches a CRITICAL GEOFENCE_BREACH alert, updates trajectory breadcrumbs, and broadcasts siren telemetry.
                  </p>
                </div>

                {/* Trigger Button */}
                <button
                  onClick={handleSimulateBreach}
                  disabled={isExecutingDrill}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
                >
                  {isExecutingDrill ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Injecting Coordinates...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Trigger Perimeter Breach Drill</span>
                    </>
                  )}
                </button>

                {/* Feedback Toast */}
                {drillFeedback && (
                  <div className={`p-3 rounded-lg text-xs font-mono border ${
                    drillFeedback.type === 'success'
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/50 text-red-300'
                  }`}>
                    {drillFeedback.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
