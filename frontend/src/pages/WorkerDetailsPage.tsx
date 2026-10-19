import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSafety } from '../context/SafetyContext';
import { StatusBadge } from '../components/StatusBadge';
import { subscribeWorker, unsubscribeWorker, dispatchEmergencyBuzzer } from '../services/socket';

import {
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Zap,
  Radio,
  Battery,
  Phone,
  Building,
  Briefcase,
  AlertOctagon,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Clock,
  MapPin,
  RefreshCw,
  Edit2,
  HeartPulse,
  Calendar,
  History,
  CheckCircle2,
  Volume2,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const WorkerDetailsPage: React.FC = () => {
  const { workerId } = useParams<{ workerId: string }>();
  const { workers, devices, liveSensors, sensorHistory, alerts, refreshData, updateWorker } = useSafety();
  const [activeChartTab, setActiveChartTab] = useState<'temp' | 'humidity' | 'gas' | 'air'>('temp');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const worker = workers.find(w => w.workerId === workerId) || workers[0];
  const device = worker?.deviceId ? devices.find(d => d.deviceId === worker.deviceId) : undefined;
  const sensor = worker?.deviceId ? liveSensors[worker.deviceId] : undefined;
  const history = worker?.deviceId ? (sensorHistory[worker.deviceId] || []) : [];

  // Worker specific alert history
  const workerAlerts = alerts.filter(a => a.workerId === worker?.workerId);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: worker?.name || '',
    department: worker?.department || '',
    designation: worker?.designation || '',
    phone: worker?.phone || '',
    email: worker?.email || '',
    emergencyContact: worker?.emergencyContact || '',
    shift: (worker?.shift || 'DAY') as 'DAY' | 'NIGHT' | 'SWING',
    bloodGroup: worker?.bloodGroup || 'O+',
    medicalNotes: worker?.medicalNotes || '',
    safetyTrainingDate: worker?.safetyTrainingDate || new Date().toISOString().slice(0, 10)
  });

  const [isBuzzerSending, setIsBuzzerSending] = useState<boolean>(false);
  const [buzzerAck, setBuzzerAck] = useState<string | null>(null);

  useEffect(() => {
    if (worker?.workerId) {
      subscribeWorker(worker.workerId);
      return () => {
        unsubscribeWorker(worker.workerId);
      };
    }
  }, [worker?.workerId]);

  const handleBuzzerDispatch = async () => {
    if (!device?.deviceId) return;
    setIsBuzzerSending(true);
    try {
      const res = await dispatchEmergencyBuzzer(device.deviceId, worker?.workerId, 'Supervisor Emergency Siren Trigger');
      setBuzzerAck(res.message);
      setTimeout(() => setBuzzerAck(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch buzzer');
    } finally {
      setIsBuzzerSending(false);
    }
  };

  if (!worker) {

    return (
      <div className="p-12 text-center text-slate-400">
        <p className="text-lg">Worker not found.</p>
        <Link to="/workers" className="mt-4 inline-block text-cyan-400 hover:underline">
          Return to worker list
        </Link>
      </div>
    );
  }

  // Format history for Recharts
  const chartData = history.map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
    temperature: item.temperature,
    humidity: item.humidity,
    gasLevel: item.gasLevel,
    airQuality: item.airQuality,
  }));

  // Safety Banner Configuration
  const getBannerDetails = () => {
    switch (worker.status) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/90 border-red-500/70 text-red-100 shadow-red-950/80 ring-2 ring-red-500/50',
          icon: AlertOctagon,
          title: 'CRITICAL HAZARD DETECTED',
          message: 'One or more wearable sensors have breached emergency thresholds. Immediate intervention or evacuation recommended.'
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-950/90 border-amber-500/70 text-amber-100 shadow-amber-950/80',
          icon: AlertTriangle,
          title: 'ENVIRONMENTAL WARNING THRESHOLD REACHED',
          message: 'Elevated temperature, gas, or low battery detected on wearable jacket. Maintain supervisory observation.'
        };
      case 'OFFLINE':
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          icon: Radio,
          title: 'WEARABLE HARDWARE OFFLINE',
          message: 'No packet heartbeat received from the wearable ESP32 device within the safety timeout interval.'
        };
      case 'SAFE':
      default:
        return {
          bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50',
          icon: ShieldCheck,
          title: 'WORKER SAFE',
          message: 'All monitored biological and environmental parameters are within configured regulatory safety limits.'
        };
    }
  };

  const banner = getBannerDetails();
  const BannerIcon = banner.icon;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateWorker(worker.workerId, editFormData);
    setIsEditModalOpen(false);
  };

  const sensorCards = [
    {
      title: 'Ambient Temperature',
      sensorType: 'DHT22 Sensor',
      value: sensor ? `${sensor.temperature.toFixed(1)} °C` : '28.0 °C',
      status: sensor && sensor.temperature > 40 ? 'CRITICAL' : sensor && sensor.temperature > 35 ? 'WARNING' : 'SAFE',
      icon: Thermometer,
      normalRange: '20.0 - 35.0 °C'
    },
    {
      title: 'Relative Humidity',
      sensorType: 'DHT22 Sensor',
      value: sensor ? `${sensor.humidity.toFixed(1)} %` : '60.0 %',
      status: 'SAFE',
      icon: Droplets,
      normalRange: '30 - 75 %'
    },
    {
      title: 'Combustible Gas (MQ-2)',
      sensorType: 'MQ-2 Gas Probe',
      value: sensor ? `${sensor.gasLevel} ppm` : '120 ppm',
      status: sensor && sensor.gasLevel > 450 ? 'CRITICAL' : sensor && sensor.gasLevel > 280 ? 'WARNING' : 'SAFE',
      icon: Wind,
      normalRange: '< 250 ppm'
    },
    {
      title: 'Air Quality (MQ-135)',
      sensorType: 'MQ-135 Sensor',
      value: sensor ? `${sensor.airQuality} AQI` : '75 AQI',
      status: sensor && sensor.airQuality > 200 ? 'WARNING' : 'SAFE',
      icon: Wind,
      normalRange: '< 150 AQI'
    },
    {
      title: 'Flame Detector',
      sensorType: 'Optical IR Flame',
      value: sensor?.flameDetected ? 'FLAME DETECTED' : 'No Flame',
      status: sensor?.flameDetected ? 'CRITICAL' : 'SAFE',
      icon: Flame,
      normalRange: 'Normal (No Flame)'
    },
    {
      title: 'Impact / Fall Detection',
      sensorType: 'MPU6050 6-DOF',
      value: sensor?.fallDetected ? 'FALL DETECTED' : 'Stable Posture',
      status: sensor?.fallDetected ? 'CRITICAL' : 'SAFE',
      icon: Zap,
      normalRange: 'Normal Posture'
    },
    {
      title: 'Emergency SOS Switch',
      sensorType: 'Tactile Pushbutton',
      value: sensor?.sosPressed ? 'EMERGENCY PRESSED' : 'Not Triggered',
      status: sensor?.sosPressed ? 'CRITICAL' : 'SAFE',
      icon: AlertOctagon,
      normalRange: 'Standby'
    },
    {
      title: 'Jacket Battery',
      sensorType: 'Li-Ion BMS',
      value: sensor ? `${sensor.batteryPercentage.toFixed(0)} %` : '92 %',
      status: sensor && sensor.batteryPercentage < 15 ? 'WARNING' : 'SAFE',
      icon: Battery,
      normalRange: '> 20 %'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Top Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/workers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workers Directory
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditFormData({
                name: worker.name,
                department: worker.department,
                designation: worker.designation,
                phone: worker.phone,
                email: worker.email || '',
                emergencyContact: worker.emergencyContact,
                shift: worker.shift || 'DAY',
                bloodGroup: worker.bloodGroup || 'O+',
                medicalNotes: worker.medicalNotes || '',
                safetyTrainingDate: worker.safetyTrainingDate || new Date().toISOString().slice(0, 10)
              });
              setIsEditModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
            Edit Profile
          </button>
          {device && (
            <button
              onClick={handleBuzzerDispatch}
              disabled={isBuzzerSending}
              className="inline-flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/80 hover:bg-rose-900 px-3 py-1.5 rounded-lg border border-rose-500/40 transition disabled:opacity-50"
              title="Remotely actuate hardware buzzer on this worker's safety jacket"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              {isBuzzerSending ? 'Dispatching...' : 'Sound Jacket Siren'}
            </button>
          )}
          <button
            onClick={() => refreshData()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-[#111827] px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Buzzer Acknowledgment Toast / Banner */}
      {buzzerAck && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fadeIn">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {buzzerAck}
          </span>
          <button onClick={() => setBuzzerAck(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Prominent Large Safety Status Banner */}

      <div className={`p-5 rounded-xl border ${banner.bg} backdrop-blur-sm transition-all shadow-xl`}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-black/30 border border-white/10">
            <BannerIcon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black tracking-wide">
                {banner.title}
              </h2>
              <StatusBadge status={worker.status} size="md" />
            </div>
            <p className="mt-1.5 text-xs text-slate-200 leading-relaxed font-medium">
              {banner.message}
            </p>
          </div>
        </div>
      </div>

      {/* Worker Profile Header Card */}
      <div className="p-6 rounded-xl bg-[#111827] border border-[#1f293d] shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#1f293d]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-xl text-cyan-400 font-mono">
              {worker.workerId}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-white">{worker.name}</h3>
                <StatusBadge status={worker.status} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                {worker.designation}
                <span className="text-slate-600">•</span>
                <Building className="w-3.5 h-3.5" />
                {worker.department}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#0b0f19] p-3 rounded-lg border border-[#1f293d]">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Vest</span>
              <span className="font-bold text-cyan-400 font-mono mt-0.5 block">{worker.jacketId || 'None'}</span>
            </div>
            <div className="bg-[#0b0f19] p-3 rounded-lg border border-[#1f293d]">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Hardware Node</span>
              <span className="font-bold text-slate-200 font-mono mt-0.5 block">{worker.deviceId || 'None'}</span>
            </div>
            <div className="bg-[#0b0f19] p-3 rounded-lg border border-[#1f293d]">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Work Shift</span>
              <span className="font-bold text-emerald-400 font-mono mt-0.5 block">{worker.shift || 'DAY'}</span>
            </div>
            <div className="bg-[#0b0f19] p-3 rounded-lg border border-[#1f293d]">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Blood Group</span>
              <span className="font-bold text-red-400 font-mono mt-0.5 block">{worker.bloodGroup || 'O+'}</span>
            </div>
          </div>
        </div>

        {/* Emergency & Medical Responder Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#1f293d] space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-300">Next-of-Kin Emergency Contact:</span>
            </div>
            <p className="text-white font-medium pl-5">{worker.emergencyContact}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#1f293d] space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <HeartPulse className="w-3.5 h-3.5 text-red-400" />
              <span className="font-semibold text-slate-300">Medical Notes & Warnings:</span>
            </div>
            <p className="text-slate-300 pl-5">{worker.medicalNotes || 'No known chronic medical restrictions.'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#1f293d] space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-300">Safety Training Certified:</span>
            </div>
            <p className="text-emerald-400 font-mono pl-5">{worker.safetyTrainingDate || 'Current / Valid'}</p>
          </div>
        </div>
      </div>

      {/* Live Sensor Status Gauges (8 Sensors) */}
      <section aria-label="Live Sensor Readings">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          Live Wearable Sensor Telemetry
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sensorCards.map((sc, idx) => {
            const Icon = sc.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] space-y-3 hover:border-slate-600 transition"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold text-slate-300">{sc.title}</span>
                  <StatusBadge status={sc.status} size="sm" showIcon={false} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0b0f19] border border-slate-800 text-cyan-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-white tracking-tight">
                      {sc.value}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Normal: {sc.normalRange}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Real-time Telemetry Charts (Recharts) */}
      <section className="p-6 rounded-xl bg-[#111827] border border-[#1f293d] space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f293d] pb-4">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              Live Telemetry Stream Charts (Latest 40 Data Points)
            </h4>
            <p className="text-xs text-slate-400">
              Live updates arriving automatically every 3 seconds via Socket.IO
            </p>
          </div>

          {/* Chart Sensor Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0b0f19] rounded-lg border border-[#1f293d] text-xs">
            <button
              onClick={() => setActiveChartTab('temp')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeChartTab === 'temp'
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Temperature (°C)
            </button>
            <button
              onClick={() => setActiveChartTab('humidity')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeChartTab === 'humidity'
                  ? 'bg-cyan-500 text-black font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Humidity (%)
            </button>
            <button
              onClick={() => setActiveChartTab('gas')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeChartTab === 'gas'
                  ? 'bg-red-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gas MQ-2 (ppm)
            </button>
            <button
              onClick={() => setActiveChartTab('air')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeChartTab === 'air'
                  ? 'bg-emerald-500 text-black font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Air Quality (MQ-135)
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-72 w-full pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Waiting for telemetry data stream...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d131f', borderColor: '#1f293d', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                {activeChartTab === 'temp' && (
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature (°C)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {activeChartTab === 'humidity' && (
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity (% RH)"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {activeChartTab === 'gas' && (
                  <Line
                    type="monotone"
                    dataKey="gasLevel"
                    name="Gas Level (ppm)"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {activeChartTab === 'air' && (
                  <Line
                    type="monotone"
                    dataKey="airQuality"
                    name="Air Quality Index"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Worker Incident History Timeline */}
      <section className="p-6 rounded-xl bg-[#111827] border border-[#1f293d] space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Worker Safety Incident & Alarm History
          </h4>
          <span className="text-xs font-mono text-slate-400">
            {workerAlerts.length} Recorded Incidents
          </span>
        </div>

        <div className="space-y-3">
          {workerAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
              <span>Zero historical safety incident violations recorded for {worker.name}.</span>
            </div>
          ) : (
            workerAlerts.map(a => (
              <div
                key={a.id}
                className="p-4 rounded-xl bg-[#0b0f19] border border-[#1f293d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <StatusBadge status={a.severity} size="sm" />
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{a.type.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-slate-500 text-[10px]">[{a.id}]</span>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-0.5">{a.message}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
                      <span>Logged: {new Date(a.createdAt).toLocaleString()}</span>
                      {a.resolvedAt && (
                        <span className="text-emerald-400">Resolved: {new Date(a.resolvedAt).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold self-end sm:self-center ${
                  a.status === 'ACTIVE'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                    : a.status === 'ACKNOWLEDGED'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Edit Worker Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                Update Worker Profile: {worker.name}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Designation</label>
                  <input
                    type="text"
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Work Shift</label>
                  <select
                    value={editFormData.shift}
                    onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value as any })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  >
                    <option value="DAY">DAY (08:00 - 16:00)</option>
                    <option value="SWING">SWING (16:00 - 00:00)</option>
                    <option value="NIGHT">NIGHT (00:00 - 08:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Blood Group</label>
                  <select
                    value={editFormData.bloodGroup}
                    onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                    className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Next-of-Kin Emergency Contact</label>
                <input
                  type="text"
                  required
                  value={editFormData.emergencyContact}
                  onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Medical Notes & Warnings</label>
                <textarea
                  rows={2}
                  value={editFormData.medicalNotes}
                  onChange={(e) => setEditFormData({ ...editFormData, medicalNotes: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Save Profile Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
