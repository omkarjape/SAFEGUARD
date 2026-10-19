import {
  Worker,
  SafetyJacket,
  Device,
  SensorReading,
  Alert,
  LocationReading,
  DashboardSummary,
  SafetyStatus,
  ZoneIncidentStat,
  ShiftSafetyStat,
  WorkerRiskProfile,
  AnalyticsSummary,
  GeoFence,
  TrajectoryPoint,
  GeoFenceZoneType,
  SafetyThresholds
} from '../types';
import { initialWorkers, initialJackets, initialDevices, initialAlerts } from '../utils/mockData';
import { getDbStatus } from '../db/prisma';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const DEFAULT_THRESHOLDS: SafetyThresholds = {
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




const initialGeoFences: GeoFence[] = [
  {
    id: 'GF_001',
    name: 'High-Voltage Transformer Yard',
    zoneType: 'EXCLUSION',
    severity: 'CRITICAL',
    minLat: 19.7663,
    maxLat: 19.7675,
    minLon: 74.4755,
    maxLon: 74.4769,
    plantBounds: { x: 40, y: 50, width: 220, height: 160 },
    hazardDescription: '400kV Step-up transformer arc-flash zone. Strict no-entry exclusion perimeter.',
    allowedRoles: [],
    allowedWorkerIds: [],
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'GF_002',
    name: 'Chemical Refining & Storage Basin',
    zoneType: 'RESTRICTED',
    severity: 'CRITICAL',
    minLat: 19.7663,
    maxLat: 19.7675,
    minLon: 74.4771,
    maxLon: 74.4785,
    plantBounds: { x: 290, y: 50, width: 240, height: 160 },
    hazardDescription: 'Corrosive acid leach tanks and toxic volatile vapors. Certified Hazmat gear mandatory.',
    allowedRoles: ['Safety Officer', 'Chemical Specialist', 'Hazmat Specialist'],
    allowedWorkerIds: ['W002'],
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'GF_003',
    name: 'Furnace & Thermal Core Complex',
    zoneType: 'RESTRICTED',
    severity: 'CRITICAL',
    minLat: 19.7645,
    maxLat: 19.7659,
    minLon: 74.4771,
    maxLon: 74.4785,
    plantBounds: { x: 340, y: 240, width: 190, height: 170 },
    hazardDescription: 'Smelting furnace exceeding 1200°C radiant heat. Thermal protection equipment required.',
    allowedRoles: ['Thermal Operator', 'Furnace Technician', 'Lead Metallurgist'],
    allowedWorkerIds: ['W003'],
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'GF_004',
    name: 'Scaffolding Assembly & Drop Zone',
    zoneType: 'EXCLUSION',
    severity: 'WARNING',
    minLat: 19.7645,
    maxLat: 19.7659,
    minLon: 74.4755,
    maxLon: 74.4769,
    plantBounds: { x: 40, y: 240, width: 270, height: 170 },
    hazardDescription: 'Overhead crane suspended cargo & structural erection. High impact dropped object risk.',
    allowedRoles: [],
    allowedWorkerIds: [],
    active: true,
    createdAt: new Date().toISOString()
  }
];

class TelemetryStore {
  private workers: Map<string, Worker> = new Map();
  private jackets: Map<string, SafetyJacket> = new Map();
  private devices: Map<string, Device> = new Map();
  private alerts: Alert[] = [];
  private geofences: Map<string, GeoFence> = new Map();
  private trajectories: Map<string, TrajectoryPoint[]> = new Map();
  // Buffer of historical sensor readings keyed by deviceId, holds up to 120 points
  private sensorHistory: Map<string, SensorReading[]> = new Map();
  // Latest reading per deviceId
  private latestReadings: Map<string, SensorReading> = new Map();
  private thresholds: SafetyThresholds = { ...DEFAULT_THRESHOLDS };
  private startTime: number = Date.now();


  constructor() {
    const isSimEnabled = process.env.SIMULATOR_ENABLED === 'true';
    if (isSimEnabled) {
      initialWorkers.forEach(w => this.workers.set(w.workerId, { ...w }));
      initialJackets.forEach(j => this.jackets.set(j.jacketId, { ...j }));
      initialDevices.forEach(d => this.devices.set(d.deviceId, { ...d }));
      this.alerts = [...initialAlerts];
      // Initialize 30 historical points for W001 / ESP32_001
      this.seedInitialSensorHistory('ESP32_001', 'SJ001', 'W001');
      this.seedInitialSensorHistory('ESP32_002', 'SJ002', 'W002');
      this.seedInitialSensorHistory('ESP32_003', 'SJ003', 'W003');
    } else {
      // Pure Hardware Mode: Only register W001 / SJ001 / ESP32_001
      const w1 = initialWorkers.find(w => w.workerId === 'W001');
      const j1 = initialJackets.find(j => j.jacketId === 'SJ001');
      const d1 = initialDevices.find(d => d.deviceId === 'ESP32_001');
      const epochPast = new Date(0).toISOString();
      if (w1) this.workers.set(w1.workerId, { ...w1, status: 'OFFLINE', lastSeen: epochPast });
      if (j1) this.jackets.set(j1.jacketId, { ...j1 });
      if (d1) this.devices.set(d1.deviceId, { ...d1, connectionStatus: 'OFFLINE', lastSeen: epochPast });
      this.alerts = [];
    }
    initialGeoFences.forEach(gf => this.geofences.set(gf.id, { ...gf }));
  }

  private seedInitialSensorHistory(deviceId: string, jacketId: string, workerId: string) {
    const history: SensorReading[] = [];
    const traj: TrajectoryPoint[] = [];
    const now = Date.now();
    for (let i = 40; i >= 0; i--) {
      const ts = new Date(now - i * 3000).toISOString();
      const baseTemp = 28.0 + (Math.sin(i / 5) * 1.8);
      const baseHum = 58.0 + (Math.cos(i / 6) * 4);
      const baseGas = 120 + Math.floor(Math.random() * 25);
      const baseAir = 75 + Math.floor(Math.random() * 15);
      const lat = 19.7660 + (Math.sin(i / 10) * 0.0003);
      const lon = 74.4770 + (Math.cos(i / 10) * 0.0003);

      const reading: SensorReading = {
        id: `sr-${deviceId}-${now - i * 3000}`,
        deviceId,
        jacketId,
        workerId,
        temperature: Number(baseTemp.toFixed(1)),
        humidity: Number(baseHum.toFixed(1)),
        gasLevel: baseGas,
        airQuality: baseAir,
        flameDetected: false,
        fallDetected: false,
        sosPressed: false,
        batteryPercentage: Number((94 - (i * 0.02)).toFixed(1)),
        latitude: lat,
        longitude: lon,
        timestamp: ts
      };
      history.push(reading);
      traj.push({
        latitude: lat,
        longitude: lon,
        timestamp: ts,
        status: 'SAFE'
      });
    }
    this.sensorHistory.set(deviceId, history);
    this.latestReadings.set(deviceId, history[history.length - 1]);
    this.trajectories.set(workerId, traj.slice(-25));
  }

  public getThresholds(): SafetyThresholds {
    return { ...this.thresholds };
  }

  public updateThresholds(updates: Partial<SafetyThresholds>): SafetyThresholds {
    this.thresholds = {
      ...this.thresholds,
      ...updates
    };
    return { ...this.thresholds };
  }

  public getWorkers(): Worker[] {

    return Array.from(this.workers.values());
  }

  public getWorkerById(workerId: string): Worker | undefined {
    return this.workers.get(workerId);
  }

  public addWorker(workerData: Omit<Worker, 'id' | 'createdAt' | 'updatedAt' | 'lastSeen'>): Worker {
    const id = `w-uuid-${Date.now()}`;
    const newWorker: Worker = {
      ...workerData,
      id,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workers.set(newWorker.workerId, newWorker);
    return newWorker;
  }

  public updateWorker(workerId: string, updates: Partial<Worker>): Worker | null {
    const existing = this.workers.get(workerId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.workers.set(workerId, updated);
    return updated;
  }

  public deleteWorker(workerId: string): boolean {
    const worker = this.workers.get(workerId);
    if (worker && worker.jacketId) {
      this.unpairJacketFromWorker(workerId);
    }
    return this.workers.delete(workerId);
  }

  public pairJacketToWorker(workerId: string, jacketId: string): { worker: Worker; jacket: SafetyJacket; device?: Device } | null {
    const worker = this.workers.get(workerId);
    const jacket = this.jackets.get(jacketId);
    if (!worker || !jacket) return null;

    // If jacket is assigned to another worker, unassign first
    if (jacket.workerId && jacket.workerId !== workerId) {
      const prevWorker = this.workers.get(jacket.workerId);
      if (prevWorker) {
        prevWorker.jacketId = undefined;
        prevWorker.deviceId = undefined;
        prevWorker.updatedAt = new Date().toISOString();
      }
    }

    // Find device for jacket (e.g. ESP32_001 for SJ001)
    let device = Array.from(this.devices.values()).find(d => d.jacketId === jacketId);
    if (!device) {
      // Auto-map by index if needed
      const devId = `ESP32_${jacketId.replace(/\D/g, '').padStart(3, '0')}`;
      device = this.devices.get(devId);
      if (device) {
        device.jacketId = jacketId;
      }
    }

    // Update Jacket
    jacket.workerId = workerId;
    jacket.status = 'ACTIVE';
    jacket.deviceId = device ? device.deviceId : undefined;
    jacket.updatedAt = new Date().toISOString();

    // Update Device
    if (device) {
      device.assignedWorkerId = workerId;
      device.jacketId = jacketId;
      device.updatedAt = new Date().toISOString();
    }

    // Update Worker
    worker.jacketId = jacketId;
    worker.deviceId = device ? device.deviceId : undefined;
    worker.updatedAt = new Date().toISOString();

    return { worker, jacket, device };
  }

  public unpairJacketFromWorker(workerId: string): Worker | null {
    const worker = this.workers.get(workerId);
    if (!worker) return null;

    if (worker.jacketId) {
      const jacket = this.jackets.get(worker.jacketId);
      if (jacket) {
        jacket.workerId = undefined;
        jacket.updatedAt = new Date().toISOString();
      }
    }

    if (worker.deviceId) {
      const device = this.devices.get(worker.deviceId);
      if (device) {
        device.assignedWorkerId = undefined;
        device.updatedAt = new Date().toISOString();
      }
    }

    worker.jacketId = undefined;
    worker.deviceId = undefined;
    worker.updatedAt = new Date().toISOString();
    return worker;
  }

  public getAlertsForWorker(workerId: string): Alert[] {
    return this.alerts.filter(a => a.workerId === workerId);
  }

  public getJackets(): SafetyJacket[] {
    return Array.from(this.jackets.values());
  }

  public addJacket(jacketData: Omit<SafetyJacket, 'id' | 'createdAt' | 'updatedAt'>): SafetyJacket {
    const id = `j-uuid-${Date.now()}`;
    const newJacket: SafetyJacket = {
      ...jacketData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.jackets.set(newJacket.jacketId, newJacket);
    return newJacket;
  }

  public deleteJacket(jacketId: string): boolean {
    const jacket = this.jackets.get(jacketId);
    if (jacket && jacket.workerId) {
      this.unpairJacketFromWorker(jacket.workerId);
    }
    return this.jackets.delete(jacketId);
  }

  public getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  public getDeviceById(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  public addDevice(deviceData: Omit<Device, 'id' | 'createdAt' | 'updatedAt' | 'lastSeen'>): Device {
    const id = `d-uuid-${Date.now()}`;
    const newDevice: Device = {
      ...deviceData,
      id,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.devices.set(newDevice.deviceId, newDevice);
    return newDevice;
  }

  public deleteDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (device && device.jacketId) {
      const jacket = this.jackets.get(device.jacketId);
      if (jacket) jacket.deviceId = undefined;
    }
    return this.devices.delete(deviceId);
  }

  public updateDevice(deviceId: string, updates: Partial<Device>): Device | null {
    const existing = this.devices.get(deviceId);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.devices.set(deviceId, updated);
    return updated;
  }

  public getLatestReading(deviceId: string): SensorReading | undefined {
    return this.latestReadings.get(deviceId);
  }

  public getSensorHistory(deviceId: string, limit: number = 60): SensorReading[] {
    const history = this.sensorHistory.get(deviceId) || [];
    return history.slice(-limit);
  }

  public recordSensorReading(reading: SensorReading): { reading: SensorReading; newAlert?: Alert; statusChanged: boolean } {
    // Append to history
    let history = this.sensorHistory.get(reading.deviceId);
    if (!history) {
      history = [];
      this.sensorHistory.set(reading.deviceId, history);
    }
    history.push(reading);
    if (history.length > 200) {
      history.shift(); // retain last 200
    }
    this.latestReadings.set(reading.deviceId, reading);

    // Update or Auto-provision Device
    let device = this.devices.get(reading.deviceId);
    const wasOffline = (device && device.connectionStatus === 'OFFLINE');
    if (device) {
      device.lastSeen = reading.timestamp;
      device.batteryPercentage = reading.batteryPercentage;
      device.connectionStatus = 'ONLINE';
      if (reading.sensorHealth) {
        device.sensorHealth = reading.sensorHealth;
      }
    } else {
      device = {
        id: `d-${reading.deviceId}`,
        deviceId: reading.deviceId,
        jacketId: reading.jacketId || `SJ-${reading.deviceId}`,
        assignedWorkerId: reading.workerId || `W-${reading.deviceId}`,
        firmwareVersion: 'v1.0.0-PROTOTYPE',
        ipAddress: '10.212.52.189',
        macAddress: 'ESP32-HARDWARE',
        wifiRssi: -60,
        batteryVoltage: 3.7,
        hardwareStatus: 'ACTIVE',
        lastSeen: reading.timestamp,
        batteryPercentage: reading.batteryPercentage,
        connectionStatus: 'ONLINE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.devices.set(reading.deviceId, device);
    }

    // Auto-provision Jacket if new
    if (reading.jacketId && !this.jackets.has(reading.jacketId)) {
      this.jackets.set(reading.jacketId, {
        id: `j-${reading.jacketId}`,
        jacketId: reading.jacketId,
        model: 'SAFEGUARD-PRO-V1 (ESP32 Multi-Gas Edition)',
        status: 'ACTIVE',
        workerId: reading.workerId || `W-${reading.deviceId}`,
        deviceId: reading.deviceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Auto-provision Worker if new
    if (reading.workerId && !this.workers.has(reading.workerId)) {
      this.workers.set(reading.workerId, {
        id: `w-${reading.workerId}`,
        workerId: reading.workerId,
        name: `Worker ${reading.workerId}`,
        department: 'Operations',
        designation: 'Field Worker',
        phone: '+1 (555) 000-0000',
        email: `${reading.workerId.toLowerCase()}@safeguard.internal`,
        emergencyContact: 'Central Operations Control',
        shift: 'DAY',
        bloodGroup: 'O+',
        medicalNotes: 'Real Hardware Operator',
        safetyTrainingDate: new Date().toISOString().slice(0, 10),
        status: 'SAFE',
        jacketId: reading.jacketId,
        deviceId: reading.deviceId,
        lastSeen: reading.timestamp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Safety threshold evaluation
    let evaluatedStatus: SafetyStatus = 'SAFE';
    let newAlert: Alert | undefined = undefined;

    // Critical conditions
    if (reading.flameDetected) {
      evaluatedStatus = 'CRITICAL';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'FLAME_DETECTED',
        severity: 'CRITICAL',
        message: 'Direct flame / infrared heat signature detected on safety jacket!',
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    } else if (reading.fallDetected) {
      evaluatedStatus = 'CRITICAL';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'FALL_DETECTED',
        severity: 'CRITICAL',
        message: 'Worker impact / sudden fall detected by MPU6050 accelerometer.',
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    } else if (reading.sosPressed) {
      evaluatedStatus = 'CRITICAL';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'SOS_PRESSED',
        severity: 'CRITICAL',
        message: 'Emergency SOS push button activated by worker!',
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    } else if (reading.gasLevel > this.thresholds.gasCritical) {

      evaluatedStatus = 'CRITICAL';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'HIGH_GAS',
        severity: 'CRITICAL',
        message: `Combustible/toxic gas concentration critically high: ${reading.gasLevel} ppm.`,
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    } else if (reading.temperature > this.thresholds.tempCritical) {
      evaluatedStatus = 'CRITICAL';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'HIGH_TEMPERATURE',
        severity: 'CRITICAL',
        message: `Dangerous ambient heat exposure: ${reading.temperature}°C.`,
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    } else if (reading.gasLevel > this.thresholds.gasWarning) {
      evaluatedStatus = 'WARNING';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'HIGH_GAS',
        severity: 'WARNING',
        message: `Elevated gas concentration detected: ${reading.gasLevel} ppm.`,
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    } else if (reading.temperature > this.thresholds.tempWarning) {
      evaluatedStatus = 'WARNING';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'HIGH_TEMPERATURE',
        severity: 'WARNING',
        message: `Elevated thermal condition: ${reading.temperature}°C.`,
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    } else if (reading.airQuality > this.thresholds.airQualityWarning) {
      evaluatedStatus = 'WARNING';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'POOR_AIR_QUALITY',
        severity: 'WARNING',
        message: `Poor breathable air quality index: ${reading.airQuality} ppm.`,
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    } else if (reading.batteryPercentage > 0 && reading.batteryPercentage < 15) {
      evaluatedStatus = 'WARNING';
      newAlert = this.createAlert({
        workerId: reading.workerId || 'W001',
        jacketId: reading.jacketId || 'SJ001',
        deviceId: reading.deviceId,
        type: 'LOW_BATTERY',
        severity: 'WARNING',
        message: `Wearable jacket battery level critically low: ${reading.batteryPercentage}%.`,
        latitude: reading.latitude,
        longitude: reading.longitude
      }) || undefined;
    }

    // Auto-resolve environmental alerts when readings normalize back to safe thresholds
    if (reading.temperature <= this.thresholds.tempWarning) {
      const activeTempAlerts = this.alerts.filter(
        a => a.deviceId === reading.deviceId && a.type === 'HIGH_TEMPERATURE' && a.status === 'ACTIVE'
      );
      activeTempAlerts.forEach(a => {
        this.resolveAlert(a.id, 'Environmental Monitor', `Temperature normalized to ${reading.temperature}°C.`);
      });
    }
    if (reading.gasLevel <= this.thresholds.gasWarning) {
      const activeGasAlerts = this.alerts.filter(
        a => a.deviceId === reading.deviceId && a.type === 'HIGH_GAS' && a.status === 'ACTIVE'
      );
      activeGasAlerts.forEach(a => {
        this.resolveAlert(a.id, 'Environmental Monitor', `Gas level normalized to ${reading.gasLevel} ppm.`);
      });
    }
    if (reading.airQuality <= this.thresholds.airQualityWarning) {
      const activeAqiAlerts = this.alerts.filter(
        a => a.deviceId === reading.deviceId && a.type === 'POOR_AIR_QUALITY' && a.status === 'ACTIVE'
      );
      activeAqiAlerts.forEach(a => {
        this.resolveAlert(a.id, 'Environmental Monitor', `Air quality normalized to index ${reading.airQuality}.`);
      });
    }

    // Auto-resolve any DEVICE_OFFLINE alerts when device reconnects
    if (wasOffline && reading.deviceId) {
      const offlineAlerts = this.alerts.filter(
        a => a.deviceId === reading.deviceId && a.type === 'DEVICE_OFFLINE' && a.status === 'ACTIVE'
      );
      offlineAlerts.forEach(a => {
        this.resolveAlert(a.id, 'System Watchdog', 'Smart jacket powered back on and reconnected to network.');
      });
    }

    // Hardware Diagnostic Continuity:
    // Update device sensor health in device object
    if (device && reading.sensorHealth) {
      device.sensorHealth = reading.sensorHealth;
    }
    // Auto-resolve any previous SENSOR_DISCONNECTED alerts so they do not clutter safety console
    const sensAlerts = this.alerts.filter(
      a => a.deviceId === reading.deviceId && a.type === 'SENSOR_DISCONNECTED' && a.status === 'ACTIVE'
    );
    sensAlerts.forEach(a => {
      this.resolveAlert(a.id, 'Hardware Diagnostics', 'Component telemetry diagnostics updated.');
    });


    // Geofence Boundary & Exclusion Zone Breach Evaluation
    const worker = reading.workerId ? this.workers.get(reading.workerId) : undefined;
    for (const gf of this.geofences.values()) {
      if (!gf.active) continue;
      const inside = (
        reading.latitude >= gf.minLat &&
        reading.latitude <= gf.maxLat &&
        reading.longitude >= gf.minLon &&
        reading.longitude <= gf.maxLon
      );
      if (inside) {
        let isBreach = false;
        if (gf.zoneType === 'EXCLUSION') {
          isBreach = true;
        } else if (gf.zoneType === 'RESTRICTED' || gf.zoneType === 'AUTHORIZED_ONLY') {
          const workerIdAllowed = gf.allowedWorkerIds && gf.allowedWorkerIds.includes(reading.workerId || '');
          const roleAllowed = worker && gf.allowedRoles && gf.allowedRoles.some(r =>
            worker.designation.toLowerCase().includes(r.toLowerCase()) ||
            worker.department.toLowerCase().includes(r.toLowerCase())
          );
          if (!workerIdAllowed && !roleAllowed) {
            isBreach = true;
          }
        }

        if (isBreach) {
          if (evaluatedStatus !== 'CRITICAL') {
            evaluatedStatus = gf.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
          }
          if (!newAlert) {
            newAlert = this.createAlert({
              workerId: reading.workerId || 'W001',
              jacketId: reading.jacketId || 'SJ001',
              deviceId: reading.deviceId,
              type: 'GEOFENCE_BREACH',
              severity: gf.severity,
              message: `Geofence breach detected! Worker ${worker?.name || reading.workerId} penetrated unauthorized hazard perimeter: ${gf.name} (${gf.hazardDescription})`,
              latitude: reading.latitude,
              longitude: reading.longitude
            }) || undefined;
          }

          break;
        }
      }
    }

    // Record worker trajectory point
    if (reading.workerId) {
      let traj = this.trajectories.get(reading.workerId);
      if (!traj) {
        traj = [];
        this.trajectories.set(reading.workerId, traj);
      }
      traj.push({
        latitude: reading.latitude,
        longitude: reading.longitude,
        timestamp: reading.timestamp,
        status: evaluatedStatus
      });
      if (traj.length > 30) {
        traj.shift();
      }
    }

    let statusChanged = false;
    if (reading.workerId) {
      const worker = this.workers.get(reading.workerId);
      if (worker) {
        worker.lastSeen = reading.timestamp;
        if (worker.status !== evaluatedStatus) {
          worker.status = evaluatedStatus;
          statusChanged = true;
        }
      }
    }

    return { reading, newAlert, statusChanged };
  }

  public createAlert(alertData: Omit<Alert, 'id' | 'status' | 'createdAt'>): Alert | null {
    // Avoid creating duplicate active alert for same type on this device
    const existingActive = this.alerts.find(
      a => a.deviceId === alertData.deviceId &&
           a.type === alertData.type &&
           (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
    );
    if (existingActive) {
      return null;
    }

    const worker = alertData.workerId ? this.workers.get(alertData.workerId) : undefined;
    const newAlert: Alert = {
      ...alertData,
      id: `ALT-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`,
      workerName: worker ? worker.name : 'Unknown Worker',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    this.alerts.unshift(newAlert);
    return newAlert;
  }


  public getAlerts(status?: string, severity?: string): Alert[] {
    return this.alerts.filter(a => {
      if (status && a.status !== status) return false;
      if (severity && a.severity !== severity) return false;
      return true;
    });
  }

  public clearAllAlerts(): void {
    this.alerts = [];
    for (const worker of this.workers.values()) {
      if (worker.status !== 'OFFLINE') {
        worker.status = 'SAFE';
      }
    }
  }

  public acknowledgeAlert(alertId: string, operatorName?: string): Alert | null {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return null;
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date().toISOString();
    if (operatorName) {
      alert.acknowledgedBy = operatorName;
    }
    return alert;
  }

  public resolveAlert(
    alertId: string,
    operatorName?: string,
    resolutionNotes?: string,
    rootCause?: string
  ): Alert | null {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return null;
    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date().toISOString();
    if (operatorName) {
      alert.resolvedBy = operatorName;
    }
    if (resolutionNotes) {
      alert.resolutionNotes = resolutionNotes;
    }
    if (rootCause) {
      alert.rootCause = rootCause;
    }

    // Check if worker has any remaining active alerts
    if (alert.workerId) {
      const remainingActive = this.alerts.some(
        a => a.workerId === alert.workerId && (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
      );
      if (!remainingActive) {
        const worker = this.workers.get(alert.workerId);
        if (worker && worker.status !== 'OFFLINE') {
          worker.status = 'SAFE';
        }
      }
    }
    return alert;
  }

  public getLocations(): LocationReading[] {
    const locations: LocationReading[] = [];
    this.workers.forEach(w => {
      if (w.deviceId) {
        const latest = this.latestReadings.get(w.deviceId);
        if (latest) {
          locations.push({
            id: `loc-${w.workerId}`,
            workerId: w.workerId,
            workerName: w.name,
            deviceId: w.deviceId,
            latitude: latest.latitude,
            longitude: latest.longitude,
            status: w.status,
            timestamp: latest.timestamp
          });
        }
      }
    });
    return locations;
  }

  public getDashboardSummary(): DashboardSummary {
    const allWorkers = Array.from(this.workers.values());
    const totalWorkers = allWorkers.length;
    const activeWorkers = allWorkers.filter(w => w.status !== 'OFFLINE').length;
    const safeWorkers = allWorkers.filter(w => w.status === 'SAFE').length;
    const activeAlerts = this.alerts.filter(a => a.status === 'ACTIVE').length;
    const offlineDevices = Array.from(this.devices.values()).filter(d => d.connectionStatus === 'OFFLINE').length;

    return {
      totalWorkers,
      activeWorkers,
      safeWorkers,
      activeAlerts,
      offlineDevices,
      systemStatus: {
        backendOnline: true,
        iotGatewayOnline: true,
        dbConnected: getDbStatus().isConnected,
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
      }
    };
  }

  public getZoneStats(): ZoneIncidentStat[] {
    const zones = [
      { id: 'ZONE_A', name: 'Refining & Distillation Columns', hazards: ['POOR_AIR_QUALITY', 'HIGH_GAS'] },
      { id: 'ZONE_B', name: 'High-Pressure Boiler & Thermal Unit', hazards: ['HIGH_TEMPERATURE', 'FLAME_DETECTED'] },
      { id: 'ZONE_C', name: 'Scaffolding & Structural Erection', hazards: ['FALL_DETECTED'] },
      { id: 'ZONE_D', name: 'Chemical Storage & Confined Spaces', hazards: ['HIGH_GAS', 'SOS_PRESSED'] },
      { id: 'ZONE_E', name: 'Electrical Substation & Switchgear', hazards: ['DEVICE_OFFLINE', 'LOW_BATTERY'] }
    ];

    const workerZoneMap: Record<string, string> = {
      W001: 'ZONE_A',
      W002: 'ZONE_B',
      W003: 'ZONE_C',
      W004: 'ZONE_E',
      W005: 'ZONE_D'
    };

    return zones.map(z => {
      const zoneAlerts = this.alerts.filter(a => {
        if (a.workerId && workerZoneMap[a.workerId] === z.id) return true;
        return z.hazards.includes(a.type);
      });

      const incidentCount = zoneAlerts.length;
      const criticalCount = zoneAlerts.filter(a => a.severity === 'CRITICAL').length;
      const warningCount = zoneAlerts.filter(a => a.severity === 'WARNING').length;

      const hazardCounts: Record<string, number> = {};
      zoneAlerts.forEach(a => {
        hazardCounts[a.type] = (hazardCounts[a.type] || 0) + 1;
      });
      let dominantHazard = z.hazards[0];
      let maxHCount = 0;
      Object.entries(hazardCounts).forEach(([type, count]) => {
        if (count > maxHCount) {
          maxHCount = count;
          dominantHazard = type;
        }
      });

      let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (criticalCount >= 2) riskLevel = 'CRITICAL';
      else if (criticalCount === 1 || incidentCount >= 3) riskLevel = 'HIGH';
      else if (incidentCount >= 1) riskLevel = 'MODERATE';

      return {
        zoneId: z.id,
        zoneName: z.name,
        incidentCount,
        criticalCount,
        warningCount,
        dominantHazard,
        riskLevel
      };
    });
  }

  public getShiftStats(): ShiftSafetyStat[] {
    const shifts: { shift: 'DAY' | 'SWING' | 'NIGHT'; hours: string; startHour: number; endHour: number }[] = [
      { shift: 'DAY', hours: '06:00 - 14:00', startHour: 6, endHour: 14 },
      { shift: 'SWING', hours: '14:00 - 22:00', startHour: 14, endHour: 22 },
      { shift: 'NIGHT', hours: '22:00 - 06:00', startHour: 22, endHour: 6 }
    ];

    const allWorkers = Array.from(this.workers.values());

    return shifts.map(s => {
      const enrolled = allWorkers.filter(w => (w.shift || 'DAY') === s.shift).length;

      const shiftAlerts = this.alerts.filter(a => {
        const hour = new Date(a.createdAt).getHours();
        if (s.startHour < s.endHour) {
          return hour >= s.startHour && hour < s.endHour;
        } else {
          return hour >= s.startHour || hour < s.endHour;
        }
      });

      const incidentCount = shiftAlerts.length;
      const criticalIncidents = shiftAlerts.filter(a => a.severity === 'CRITICAL').length;

      const acked = shiftAlerts.filter(a => a.acknowledgedAt);
      const totalAckSeconds = acked.reduce((acc, a) => {
        const diff = (new Date(a.acknowledgedAt!).getTime() - new Date(a.createdAt).getTime()) / 1000;
        return acc + Math.max(0, diff);
      }, 0);
      const mttaSeconds = acked.length > 0 ? Math.round(totalAckSeconds / acked.length) : 45;

      const complianceScore = Math.max(70, Math.min(100, Math.round(100 - (criticalIncidents * 8 + (incidentCount - criticalIncidents) * 3))));

      return {
        shift: s.shift,
        shiftHours: s.hours,
        enrolledWorkers: enrolled,
        incidentCount,
        criticalIncidents,
        mttaSeconds,
        complianceScore
      };
    });
  }

  public getWorkerRiskProfiles(): WorkerRiskProfile[] {
    const allWorkers = Array.from(this.workers.values());

    return allWorkers.map(w => {
      const workerAlerts = this.alerts.filter(a => a.workerId === w.workerId);
      const incidentCount = workerAlerts.length;
      const criticalCount = workerAlerts.filter(a => a.severity === 'CRITICAL').length;

      let avgTemperature = 28.5;
      let maxGasLevel = 120;
      if (w.deviceId) {
        const history = this.sensorHistory.get(w.deviceId) || [];
        if (history.length > 0) {
          const sumTemp = history.reduce((acc, r) => acc + r.temperature, 0);
          avgTemperature = Number((sumTemp / history.length).toFixed(1));
          maxGasLevel = Math.max(...history.map(r => r.gasLevel));
        }
      }

      let score = 15;
      score += criticalCount * 25;
      score += (incidentCount - criticalCount) * 10;
      if (maxGasLevel > 400) score += 25;
      else if (maxGasLevel > 250) score += 15;
      if (avgTemperature > 40) score += 20;
      else if (avgTemperature > 35) score += 10;
      score = Math.min(99, Math.max(5, score));

      let riskCategory: 'SAFE' | 'ELEVATED' | 'HIGH_RISK' = 'SAFE';
      if (score >= 65) riskCategory = 'HIGH_RISK';
      else if (score >= 35) riskCategory = 'ELEVATED';

      const lastAlert = workerAlerts[0];

      return {
        workerId: w.workerId,
        workerName: w.name,
        department: w.department,
        shift: w.shift || 'DAY',
        jacketId: w.jacketId,
        riskScore: score,
        riskCategory,
        incidentCount,
        criticalCount,
        avgTemperature,
        maxGasLevel,
        lastIncidentType: lastAlert ? lastAlert.type : undefined
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }

  public getAnalyticsSummary(): AnalyticsSummary {
    const totalIncidents = this.alerts.length;
    const activeIncidents = this.alerts.filter(a => a.status === 'ACTIVE').length;
    const resolvedIncidents = this.alerts.filter(a => a.status === 'RESOLVED').length;
    const criticalActive = this.alerts.filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length;

    const acked = this.alerts.filter(a => a.acknowledgedAt);
    const totalAckSeconds = acked.reduce((acc, a) => {
      const diff = (new Date(a.acknowledgedAt!).getTime() - new Date(a.createdAt).getTime()) / 1000;
      return acc + Math.max(0, diff);
    }, 0);
    const avgMttaSeconds = acked.length > 0 ? Math.round(totalAckSeconds / acked.length) : 42;

    const plantSafetyIndex = Math.max(40, Math.min(100, Math.round(100 - (criticalActive * 15 + activeIncidents * 4))));

    const zoneStats = this.getZoneStats();
    const shiftStats = this.getShiftStats();
    const topRiskWorkers = this.getWorkerRiskProfiles();

    const hazardCounts: Record<string, number> = {};
    this.alerts.forEach(a => {
      hazardCounts[a.type] = (hazardCounts[a.type] || 0) + 1;
    });

    const hazardDistribution = Object.entries(hazardCounts).map(([type, count]) => ({
      type,
      count,
      percentage: totalIncidents > 0 ? Number(((count / totalIncidents) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.count - a.count);

    return {
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      avgMttaSeconds,
      plantSafetyIndex,
      zoneStats,
      shiftStats,
      topRiskWorkers,
      hazardDistribution
    };
  }

  public getGeofences(): GeoFence[] {
    return Array.from(this.geofences.values());
  }

  public getGeofenceById(id: string): GeoFence | undefined {
    return this.geofences.get(id);
  }

  public createGeofence(data: Omit<GeoFence, 'id' | 'createdAt'>): GeoFence {
    const id = `GF_${Date.now().toString().slice(-4)}`;
    const newGf: GeoFence = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    this.geofences.set(id, newGf);
    return newGf;
  }

  public updateGeofence(id: string, updates: Partial<GeoFence>): GeoFence | null {
    const existing = this.geofences.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.geofences.set(id, updated);
    return updated;
  }

  public deleteGeofence(id: string): boolean {
    return this.geofences.delete(id);
  }

  public getTrajectories(workerId?: string): Record<string, TrajectoryPoint[]> {
    if (workerId) {
      const traj = this.trajectories.get(workerId) || [];
      return { [workerId]: traj };
    }
    const result: Record<string, TrajectoryPoint[]> = {};
    for (const [wId, points] of this.trajectories.entries()) {
      result[wId] = points;
    }
    return result;
  }

  public simulateGeofenceBreach(workerId: string, geofenceId: string): {
    worker: Worker;
    geofence: GeoFence;
    reading: SensorReading;
    alert?: Alert;
    statusChanged: boolean;
  } | null {
    const worker = this.workers.get(workerId);
    const gf = this.geofences.get(geofenceId);
    if (!worker || !gf) return null;

    const deviceId = worker.deviceId || 'ESP32_001';
    const jacketId = worker.jacketId || 'SJ001';

    // Place worker coordinates into the center of the geofence perimeter
    const targetLat = Number(((gf.minLat + gf.maxLat) / 2).toFixed(6));
    const targetLon = Number(((gf.minLon + gf.maxLon) / 2).toFixed(6));

    const latest = this.latestReadings.get(deviceId);

    const breachReading: SensorReading = {
      id: `sr-${deviceId}-${Date.now()}`,
      deviceId,
      jacketId,
      workerId: worker.workerId,
      temperature: latest?.temperature || 28.5,
      humidity: latest?.humidity || 52.0,
      gasLevel: latest?.gasLevel || 120,
      airQuality: latest?.airQuality || 80,
      flameDetected: false,
      fallDetected: false,
      sosPressed: false,
      batteryPercentage: latest?.batteryPercentage || 90,
      latitude: targetLat,
      longitude: targetLon,
      timestamp: new Date().toISOString()
    };

    const res = this.recordSensorReading(breachReading);

    return {
      worker,
      geofence: gf,
      reading: breachReading,
      alert: res.newAlert,
      statusChanged: res.statusChanged
    };
  }

  public checkOfflineDevices(thresholdMs?: number): { offlineCount: number; affectedWorkers: string[]; affectedDevices: string[] } {
    const effectiveThreshold = thresholdMs !== undefined ? thresholdMs : ((this.thresholds.heartbeatOfflineSec || 15) * 1000);
    const now = Date.now();
    const affectedWorkers: string[] = [];
    const affectedDevices: string[] = [];
    let offlineCount = 0;

    for (const device of this.devices.values()) {
      if (!device.lastSeen) continue;
      const elapsed = now - new Date(device.lastSeen).getTime();

      if (elapsed > effectiveThreshold && device.connectionStatus !== 'OFFLINE') {
        device.connectionStatus = 'OFFLINE';
        offlineCount++;

        affectedDevices.push(device.deviceId);

        if (device.assignedWorkerId) {
          const worker = this.workers.get(device.assignedWorkerId);
          if (worker && worker.status !== 'OFFLINE') {
            worker.status = 'OFFLINE';
            affectedWorkers.push(worker.workerId);
          }

          // Trigger DEVICE_OFFLINE Alert
          this.createAlert({
            workerId: device.assignedWorkerId,
            jacketId: device.jacketId || 'SJ001',
            deviceId: device.deviceId,
            type: 'DEVICE_OFFLINE',
            severity: 'WARNING',
            message: `Smart Safety Jacket ${device.jacketId || device.deviceId} powered off or disconnected from network.`
          });
        }
      }
    }

    return { offlineCount, affectedWorkers, affectedDevices };
  }
}


export const telemetryStore = new TelemetryStore();
