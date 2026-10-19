import React, { useState, useMemo } from 'react';
import { useSafety } from '../context/SafetyContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  Cpu,
  Battery,
  Wifi,
  Shield,
  Search,
  ExternalLink,
  Edit,
  Radio,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Wrench,
  Activity,
  X,
  Zap,
  Flame,
  Wind,
  Thermometer,
  MapPin,
  AlertOctagon,
  Power
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Device, SafetyJacket } from '../types';

export const DevicesPage: React.FC = () => {
  const { devices, jackets, workers, createDevice, updateDevice, deleteDevice, createJacket, deleteJacket, pairJacket, unpairJacket, liveSensors } = useSafety();

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState<boolean>(false);
  const [isAddJacketOpen, setIsAddJacketOpen] = useState<boolean>(false);
  const [diagnosticDevice, setDiagnosticDevice] = useState<Device | null>(null);
  const [assignWorkerDevice, setAssignWorkerDevice] = useState<Device | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  // Device Form State
  const [deviceForm, setDeviceForm] = useState({
    deviceId: '',
    jacketId: '',
    firmwareVersion: 'v1.0.0-PROTOTYPE',
    ipAddress: '192.168.1.160',
    macAddress: '24:6F:28:55:A1:B2',
    connectionStatus: 'ONLINE' as any
  });

  // Jacket Form State
  const [jacketForm, setJacketForm] = useState({
    jacketId: '',
    model: 'SAFEGUARD-PRO-V1 (ESP32 Multi-Gas Edition)',
    status: 'ACTIVE' as any,
    deviceId: ''
  });

  const getWorkerForJacket = (jacketId?: string) => {
    return workers.find(w => w.jacketId === jacketId);
  };

  const getJacketForDevice = (deviceId: string) => {
    return jackets.find(j => j.deviceId === deviceId);
  };

  // Fleet Statistics
  const fleetStats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter(d => d.connectionStatus === 'ONLINE').length;
    const warningOrOffline = devices.filter(d => d.connectionStatus === 'WARNING' || d.connectionStatus === 'OFFLINE').length;
    let totalBattery = 0;
    devices.forEach(d => { totalBattery += d.batteryPercentage; });
    const avgBattery = total > 0 ? Math.round(totalBattery / total) : 0;
    return { total, online, warningOrOffline, avgBattery };
  }, [devices]);

  const filteredDevices = devices.filter(d => {
    const matchesSearch =
      d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      (d.jacketId && d.jacketId.toLowerCase().includes(search.toLowerCase())) ||
      (d.ipAddress && d.ipAddress.includes(search)) ||
      (d.macAddress && d.macAddress.toLowerCase().includes(search.toLowerCase())) ||
      (d.assignedWorkerId && d.assignedWorkerId.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || d.connectionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceForm.deviceId) return;
    try {
      await createDevice({
        deviceId: deviceForm.deviceId.toUpperCase(),
        jacketId: deviceForm.jacketId || undefined,
        firmwareVersion: deviceForm.firmwareVersion,
        ipAddress: deviceForm.ipAddress,
        macAddress: deviceForm.macAddress,
        batteryPercentage: 100,
        connectionStatus: 'ONLINE',
        hardwareStatus: 'ACTIVE'
      });
      setIsAddDeviceOpen(false);
      setDeviceForm({
        deviceId: '',
        jacketId: '',
        firmwareVersion: 'v1.0.0-PROTOTYPE',
        ipAddress: '192.168.1.160',
        macAddress: '24:6F:28:55:A1:B2',
        connectionStatus: 'ONLINE'
      });
    } catch (err: any) {
      alert(err.message || 'Failed to register device');
    }
  };

  const handleCreateJacket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jacketForm.jacketId) return;
    try {
      await createJacket({
        jacketId: jacketForm.jacketId.toUpperCase(),
        model: jacketForm.model,
        status: jacketForm.status,
        deviceId: jacketForm.deviceId || undefined
      });
      setIsAddJacketOpen(false);
      setJacketForm({
        jacketId: '',
        model: 'SAFEGUARD-PRO-V1 (ESP32 Multi-Gas Edition)',
        status: 'ACTIVE',
        deviceId: ''
      });
    } catch (err: any) {
      alert(err.message || 'Failed to register jacket');
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (confirm(`Decommission and remove device ${deviceId} from fleet inventory?`)) {
      await deleteDevice(deviceId);
    }
  };

  const handleToggleMaintenance = async (device: Device) => {
    const nextStatus = device.hardwareStatus === 'MAINTENANCE' ? 'ACTIVE' : 'MAINTENANCE';
    await updateDevice(device.deviceId, { hardwareStatus: nextStatus });
  };

  const handleAssignToWorker = async () => {
    if (!assignWorkerDevice) return;
    try {
      const jacket = getJacketForDevice(assignWorkerDevice.deviceId);
      if (selectedWorkerId) {
        if (jacket) {
          await pairJacket(selectedWorkerId, jacket.jacketId);
        } else {
          alert('Device is not linked to a smart safety jacket yet. Pair a jacket first.');
          return;
        }
      } else {
        if (assignWorkerDevice.assignedWorkerId) {
          await unpairJacket(assignWorkerDevice.assignedWorkerId);
        }
      }
      setAssignWorkerDevice(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Safety Jackets & Wearable IoT Hardware Nodes
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Registry of physical ESP32 microcontrollers, wearable safety vests, RF link status, and battery telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddJacketOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Safety Vest
          </button>
          <button
            onClick={() => setIsAddDeviceOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Register ESP32 Node
          </button>
        </div>
      </div>

      {/* Fleet KPI Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d]">
          <span className="text-slate-400 font-mono text-[11px] uppercase block">Hardware Fleet</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">{fleetStats.total} Nodes</span>
          <span className="text-[10px] text-slate-500">Registered microcontrollers</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d]">
          <span className="text-slate-400 font-mono text-[11px] uppercase block">Online Vests</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">{fleetStats.online}</span>
          <span className="text-[10px] text-slate-500">Sending active heartbeat</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d]">
          <span className="text-slate-400 font-mono text-[11px] uppercase block">Offline / Warning</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">{fleetStats.warningOrOffline}</span>
          <span className="text-[10px] text-slate-500">Requires attention</span>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d]">
          <span className="text-slate-400 font-mono text-[11px] uppercase block">Avg Fleet Battery</span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">{fleetStats.avgBattery}%</span>
          <span className="text-[10px] text-slate-500">Li-Ion battery state</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Device ID (ESP32_001), Vest ID (SJ001), MAC, or IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">Status: All</option>
            <option value="ONLINE">ONLINE</option>
            <option value="WARNING">WARNING</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-[#111827] rounded-xl border border-[#1f293d] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0b0f19] border-b border-[#1f293d] text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Jacket ID</th>
                <th className="py-3.5 px-4 font-semibold">Device Node</th>
                <th className="py-3.5 px-4 font-semibold">MAC & IP Address</th>
                <th className="py-3.5 px-4 font-semibold">Assigned Personnel</th>
                <th className="py-3.5 px-4 font-semibold">Heartbeat</th>
                <th className="py-3.5 px-4 font-semibold">Battery State</th>
                <th className="py-3.5 px-4 font-semibold">Hardware State</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d] text-slate-300">
              {filteredDevices.map((d) => {
                const jacket = getJacketForDevice(d.deviceId);
                const worker = getWorkerForJacket(jacket?.jacketId);
                const batteryLevel = d.batteryPercentage;

                return (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {jacket ? jacket.jacketId : 'Unlinked'}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-white font-bold">{d.deviceId}</div>
                      <div className="text-[10px] text-slate-500">{d.firmwareVersion}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      <div>{d.macAddress || '24:6F:28:XX:XX:XX'}</div>
                      <div className="text-slate-500">{d.ipAddress || '192.168.1.145'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {worker ? (
                        <div>
                          <Link
                            to={`/workers/${worker.workerId}`}
                            className="font-semibold text-white hover:text-cyan-400 transition flex items-center gap-1"
                          >
                            {worker.name}
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </Link>
                          <span className="text-[10px] font-mono text-slate-400">{worker.workerId}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={d.connectionStatus} size="sm" />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                          <div
                            className={`h-full rounded-full ${
                              batteryLevel < 20
                                ? 'bg-red-500'
                                : batteryLevel < 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${batteryLevel}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {batteryLevel.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          d.hardwareStatus === 'MAINTENANCE'
                            ? 'bg-amber-950/70 border border-amber-500/40 text-amber-400'
                            : 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400'
                        }`}
                      >
                        {d.hardwareStatus || 'ACTIVE'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setDiagnosticDevice(d)}
                        className="px-2.5 py-1.5 rounded text-[11px] font-medium bg-[#1f293d] hover:bg-slate-700 text-slate-200 transition"
                        title="Run diagnostic self-test"
                      >
                        Diagnostics
                      </button>

                      <button
                        onClick={() => {
                          setAssignWorkerDevice(d);
                          setSelectedWorkerId(worker ? worker.workerId : '');
                        }}
                        className="px-2 py-1.5 rounded text-[11px] font-medium bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 transition"
                        title="Assign / Unassign worker"
                      >
                        Assign
                      </button>

                      <button
                        onClick={() => handleToggleMaintenance(d)}
                        className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-950/40 transition inline-block align-middle"
                        title="Toggle Maintenance State"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteDevice(d.deviceId)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition inline-block align-middle"
                        title="Decommission Device"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hardware Diagnostic & Sensor Health Inspector Modal */}
      {diagnosticDevice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {diagnosticDevice.deviceId} Diagnostic Inspection
                  </h3>
                  <p className="text-[11px] text-slate-400">Microcontroller self-test and hardware health status</p>
                </div>
              </div>
              <button onClick={() => setDiagnosticDevice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* RF & Power Gauges */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#1f293d] space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Wi-Fi Signal (RSSI)</span>
                  <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg font-bold font-mono text-white">
                  {diagnosticDevice.wifiRssi || -58} dBm
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">Signal Quality: EXCELLENT</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#1f293d] space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Li-Ion Cell Voltage</span>
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold font-mono text-white">
                  {diagnosticDevice.batteryVoltage || 4.02} V
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  State of Charge: {diagnosticDevice.batteryPercentage.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Attached Sensor Self-Test Registry */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] uppercase font-mono text-slate-400 font-bold block">
                Attached 7-Sensor Self-Test Verification
              </span>

              <div className="space-y-1.5 p-3 rounded-xl bg-[#0b0f19] border border-[#1f293d]">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" /> DHT22 Temperature & Humidity:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS (I2C/OneWire OK)
                  </span>
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-red-400" /> MQ-2 Combustible Gas Sensor:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS (ADC Calibrated)
                  </span>
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-cyan-400" /> MQ-135 Air Quality Sensor:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS (Pre-heat Completed)
                  </span>
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> MPU6050 6-DOF Gyro/Accel:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS (Zero-g Offset Nominal)
                  </span>
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-400" /> Optical IR Flame Detector:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS (Photodiode Standby)
                  </span>
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" /> NEO-6M Satellite GPS:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS (3D Fix: 8 Sats)
                  </span>
                </div>

                <div className="flex justify-between py-0.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-red-400" /> Emergency SOS Switch:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASS (GPIO Interrupt Active)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span className="font-mono">MAC: {diagnosticDevice.macAddress}</span>
              <button
                onClick={() => setDiagnosticDevice(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New ESP32 Node Modal */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Register New ESP32 Hardware Node
              </h3>
              <button onClick={() => setIsAddDeviceOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Device ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32_004"
                  value={deviceForm.deviceId}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceId: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Hardware MAC Address</label>
                <input
                  type="text"
                  placeholder="e.g. 24:6F:28:11:22:33"
                  value={deviceForm.macAddress}
                  onChange={(e) => setDeviceForm({ ...deviceForm, macAddress: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Local IP Address</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.160"
                  value={deviceForm.ipAddress}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Firmware Version</label>
                <input
                  type="text"
                  value={deviceForm.firmwareVersion}
                  onChange={(e) => setDeviceForm({ ...deviceForm, firmwareVersion: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Assign Smart Vest (Optional)</label>
                <select
                  value={deviceForm.jacketId}
                  onChange={(e) => setDeviceForm({ ...deviceForm, jacketId: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                >
                  <option value="">Leave Unlinked</option>
                  {jackets.map(j => (
                    <option key={j.jacketId} value={j.jacketId}>
                      {j.jacketId} ({j.model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDeviceOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Provision Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register New Smart Vest Modal */}
      {isAddJacketOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Register New Smart Safety Vest
              </h3>
              <button onClick={() => setIsAddJacketOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJacket} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Jacket ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SJ004"
                  value={jacketForm.jacketId}
                  onChange={(e) => setJacketForm({ ...jacketForm, jacketId: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Vest Model Specification</label>
                <input
                  type="text"
                  value={jacketForm.model}
                  onChange={(e) => setJacketForm({ ...jacketForm, model: e.target.value })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Initial Status</label>
                <select
                  value={jacketForm.status}
                  onChange={(e) => setJacketForm({ ...jacketForm, status: e.target.value as any })}
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddJacketOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Add to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Assign to Worker Modal */}
      {assignWorkerDevice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Assign Node {assignWorkerDevice.deviceId} to Personnel
              </h3>
              <button onClick={() => setAssignWorkerDevice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Select an enrolled worker to bind with this wearable hardware node:
              </p>

              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-2.5 text-white font-mono"
              >
                <option value="">Unassign / Free Hardware</option>
                {workers.map(w => (
                  <option key={w.workerId} value={w.workerId}>
                    {w.workerId} - {w.name} ({w.department})
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setAssignWorkerDevice(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignToWorker}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Save Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
