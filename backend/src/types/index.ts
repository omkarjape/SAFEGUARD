export type SafetyStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
export type DeviceStatus = 'ONLINE' | 'WARNING' | 'OFFLINE' | 'MAINTENANCE';
export type JacketStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export type AlertType =
  | 'FALL_DETECTED'
  | 'SOS_PRESSED'
  | 'HIGH_TEMPERATURE'
  | 'HIGH_GAS'
  | 'POOR_AIR_QUALITY'
  | 'FLAME_DETECTED'
  | 'LOW_BATTERY'
  | 'DEVICE_OFFLINE'
  | 'GEOFENCE_BREACH'
  | 'SENSOR_DISCONNECTED';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Worker {
  id: string;
  workerId: string; // e.g. "W001"
  name: string;
  department: string;
  designation: string;
  phone: string;
  email?: string;
  emergencyContact: string;
  shift?: 'DAY' | 'NIGHT' | 'SWING';
  bloodGroup?: string;
  medicalNotes?: string;
  safetyTrainingDate?: string;
  status: SafetyStatus;
  jacketId?: string;
  deviceId?: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyJacket {
  id: string;
  jacketId: string; // e.g. "SJ001"
  model: string;
  status: JacketStatus;
  workerId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  deviceId: string; // e.g. "ESP32_001"
  jacketId?: string;
  assignedWorkerId?: string;
  firmwareVersion: string;
  ipAddress?: string;
  macAddress?: string;
  wifiRssi?: number;       // dBm (e.g. -58)
  batteryVoltage?: number; // Volts (e.g. 3.95)
  lastSeen: string;
  batteryPercentage: number;
  connectionStatus: DeviceStatus;
  hardwareStatus?: 'ACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
  sensorHealth?: SensorHealth;
  createdAt: string;
  updatedAt: string;
}

export interface SensorHealth {
  dht22?: boolean;
  mpu6050?: boolean;
  mq2?: boolean;
  mq135?: boolean;
  flame?: boolean;
  gps?: boolean;
  sos?: boolean;
  buzzer?: boolean;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  jacketId?: string;
  workerId?: string;
  temperature: number; // °C (DHT22)
  humidity: number;    // % RH (DHT22)
  gasLevel: number;    // ppm (MQ-2)
  airQuality: number;  // index / ppm (MQ-135)
  flameDetected: boolean;
  fallDetected: boolean;
  sosPressed: boolean;
  batteryPercentage: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  sensorHealth?: SensorHealth;
}

export interface Alert {
  id: string;
  workerId: string;
  workerName?: string;
  jacketId: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  latitude?: number;
  longitude?: number;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  rootCause?: string;
}


export interface LocationReading {
  id: string;
  workerId: string;
  workerName: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  status: SafetyStatus;
  timestamp: string;
}

export interface DashboardSummary {
  totalWorkers: number;
  activeWorkers: number;
  safeWorkers: number;
  activeAlerts: number;
  offlineDevices: number;
  systemStatus: {
    backendOnline: boolean;
    iotGatewayOnline: boolean;
    dbConnected: boolean;
    uptimeSeconds: number;
  };
}

export interface Esp32Payload {
  deviceId: string;
  jacketId: string;
  workerId: string;
  temperature: number;
  humidity: number;
  gasLevel: number;
  airQuality: number;
  flameDetected: boolean;
  fallDetected: boolean;
  sosPressed: boolean;
  battery: number;
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export type SimulationScenario =
  | 'normal'
  | 'high_temp'
  | 'gas_warning'
  | 'flame'
  | 'fall'
  | 'sos'
  | 'low_battery'
  | 'offline';

export type PlantScenario =
  | 'BASELINE_SAFE'
  | 'CONFINED_SPACE_TOXIC_GAS'
  | 'BOILER_ROOM_THERMAL_RUNAWAY'
  | 'SCAFFOLDING_FALL_INCIDENT'
  | 'MASS_EVACUATION_DRILL'
  | 'DUAL_HAZARD_CRISIS';

export interface ManualSensorOverride {
  temperature?: number;
  humidity?: number;
  gasLevel?: number;
  airQuality?: number;
  flameDetected?: boolean;
  fallDetected?: boolean;
  sosPressed?: boolean;
  batteryPercentage?: number;
  wifiRssi?: number;
  latitude?: number;
  longitude?: number;
}

export interface WorkerSimulationState {
  workerId: string;
  activeScenario: SimulationScenario;
  manualOverride?: ManualSensorOverride;
  isOffline: boolean;
  currentValues: {
    temperature: number;
    humidity: number;
    gasLevel: number;
    airQuality: number;
    batteryPercentage: number;
    wifiRssi: number;
  };
  motionState?: 'STATIONARY' | 'WALKING' | 'FREEFALL' | 'IMPACT' | 'POST_FALL_REST';
}

export interface SimulatorStatus {
  isRunning: boolean;
  intervalMs: number;
  activePlantScenario?: PlantScenario | 'CUSTOM';
  workerStates: Record<string, WorkerSimulationState>;
  tickCount: number;
  lastTickTimestamp: string;
}

export interface ZoneIncidentStat {
  zoneId: string;
  zoneName: string;
  incidentCount: number;
  criticalCount: number;
  warningCount: number;
  dominantHazard: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface ShiftSafetyStat {
  shift: 'DAY' | 'SWING' | 'NIGHT';
  shiftHours: string;
  enrolledWorkers: number;
  incidentCount: number;
  criticalIncidents: number;
  mttaSeconds: number;
  complianceScore: number; // 0-100%
}

export interface WorkerRiskProfile {
  workerId: string;
  workerName: string;
  department: string;
  shift: string;
  jacketId?: string;
  riskScore: number; // 0 - 100
  riskCategory: 'SAFE' | 'ELEVATED' | 'HIGH_RISK';
  incidentCount: number;
  criticalCount: number;
  avgTemperature: number;
  maxGasLevel: number;
  lastIncidentType?: string;
}

export interface AnalyticsSummary {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  avgMttaSeconds: number;
  plantSafetyIndex: number; // 0 - 100
  zoneStats: ZoneIncidentStat[];
  shiftStats: ShiftSafetyStat[];
  topRiskWorkers: WorkerRiskProfile[];
  hazardDistribution: { type: string; count: number; percentage: number }[];
}

export type GeoFenceZoneType = 'EXCLUSION' | 'RESTRICTED' | 'AUTHORIZED_ONLY' | 'SAFE_CORRIDOR';

export interface GeoFence {
  id: string; // e.g. "GF_001"
  name: string; // e.g. "High-Voltage Transformer Yard"
  zoneType: GeoFenceZoneType;
  severity: 'WARNING' | 'CRITICAL';
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  plantBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hazardDescription: string;
  allowedRoles?: string[];
  allowedWorkerIds?: string[];
  active: boolean;
  createdAt?: string;
}

export interface TrajectoryPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  status?: SafetyStatus;
}

export interface WorkerTrajectory {
  workerId: string;
  workerName?: string;
  deviceId?: string;
  points: TrajectoryPoint[];
}

export interface SafetyThresholds {
  tempWarning: number;
  tempCritical: number;
  gasWarning: number;
  gasCritical: number;
  airQualityWarning: number;
  heartbeatWarningSec: number;
  heartbeatOfflineSec: number;
  iotGatewayUrl: string;
  audioAlerts: boolean;
}

