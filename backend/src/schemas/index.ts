import { z } from 'zod';

// Worker Schemas
export const createWorkerSchema = z.object({
  workerId: z.string().min(2, 'Worker ID must be at least 2 characters').max(30),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  department: z.string().min(2, 'Department is required').max(100),
  designation: z.string().min(2, 'Designation is required').max(100),
  phone: z.string().min(7, 'Valid phone number required').max(20),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  emergencyContact: z.string().min(7, 'Valid emergency contact required').max(20),
  shift: z.enum(['DAY', 'NIGHT', 'SWING']).optional(),
  bloodGroup: z.string().max(10).optional(),
  medicalNotes: z.string().max(500).optional(),
  safetyTrainingDate: z.string().optional(),
  jacketId: z.string().optional(),
  deviceId: z.string().optional()
});

export const updateWorkerSchema = createWorkerSchema.partial().omit({ workerId: true });

export const pairJacketSchema = z.object({
  jacketId: z.string().min(2, 'Jacket ID is required')
});

// Device Schemas
export const createDeviceSchema = z.object({
  deviceId: z.string().min(2, 'Device ID must be at least 2 characters').max(50),
  firmwareVersion: z.string().min(1, 'Firmware version is required').max(50),
  macAddress: z.string().max(30).optional(),
  ipAddress: z.string().max(50).optional(),
  wifiRssi: z.number().min(-110).max(0).optional(),
  batteryVoltage: z.number().min(0).max(10).optional(),
  batteryPercentage: z.number().min(0).max(100).optional(),
  hardwareStatus: z.enum(['ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED']).optional()
});

export const updateDeviceSchema = createDeviceSchema.partial().omit({ deviceId: true });

// Jacket Schemas
export const createJacketSchema = z.object({
  jacketId: z.string().min(2, 'Jacket ID must be at least 2 characters').max(50),
  model: z.string().min(2, 'Model name is required').max(100),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  workerId: z.string().optional(),
  deviceId: z.string().optional()
});

// Sensor Data ESP32 Ingestion Schema
export const sensorDataSchema = z.object({
  deviceId: z.string().min(2, 'Device ID is required'),
  jacketId: z.string().min(2, 'Jacket ID is required'),
  workerId: z.string().min(2, 'Worker ID is required'),
  temperature: z.number({ required_error: 'temperature is required' }),
  humidity: z.number({ required_error: 'humidity is required' }),
  gasLevel: z.number({ required_error: 'gasLevel is required' }),
  airQuality: z.number({ required_error: 'airQuality is required' }),
  flameDetected: z.boolean({ required_error: 'flameDetected is required' }),
  fallDetected: z.boolean({ required_error: 'fallDetected is required' }),
  sosPressed: z.boolean({ required_error: 'sosPressed is required' }),
  battery: z.number({ required_error: 'battery is required' }),
  latitude: z.number({ required_error: 'latitude is required' }),
  longitude: z.number({ required_error: 'longitude is required' }),
  timestamp: z.string().optional(),
  sensorHealth: z.record(z.boolean()).optional()
});

// Alert Creation Schema
export const createAlertSchema = z.object({
  workerId: z.string().min(2, 'Worker ID is required'),
  jacketId: z.string().min(2, 'Jacket ID is required'),
  deviceId: z.string().min(2, 'Device ID is required'),
  type: z.enum([
    'FALL_DETECTED',
    'SOS_PRESSED',
    'HIGH_TEMPERATURE',
    'HIGH_GAS',
    'POOR_AIR_QUALITY',
    'FLAME_DETECTED',
    'LOW_BATTERY',
    'DEVICE_OFFLINE',
    'GEOFENCE_BREACH',
    'SENSOR_DISCONNECTED'
  ]),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  message: z.string().min(3, 'Alert message is required').max(300),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

// GeoFence Schemas
export const createGeoFenceSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  zoneType: z.enum(['EXCLUSION', 'RESTRICTED', 'AUTHORIZED_ONLY', 'SAFE_CORRIDOR']),
  severity: z.enum(['WARNING', 'CRITICAL']),
  minLat: z.number(),
  maxLat: z.number(),
  minLon: z.number(),
  maxLon: z.number(),
  plantBounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  hazardDescription: z.string().min(3, 'Hazard description is required').max(300),
  allowedRoles: z.array(z.string()).optional(),
  allowedWorkerIds: z.array(z.string()).optional(),
  active: z.boolean().default(true)
});

export const updateGeoFenceSchema = createGeoFenceSchema.partial();


export const acknowledgeAlertSchema = z.object({
  operatorName: z.string().optional()
});

export const resolveAlertSchema = z.object({
  operatorName: z.string().optional(),
  resolutionNotes: z.string().optional(),
  rootCause: z.string().optional()
});

// Simulator Schemas
export const simulatorScenarioSchema = z.object({
  workerId: z.string().optional(),
  scenario: z.enum([
    'normal',
    'high_temp',
    'gas_warning',
    'flame',
    'fall',
    'sos',
    'low_battery',
    'offline'
  ])
});

export const simulatorPlantScenarioSchema = z.object({
  scenario: z.enum([
    'BASELINE_SAFE',
    'CONFINED_SPACE_TOXIC_GAS',
    'BOILER_ROOM_THERMAL_RUNAWAY',
    'SCAFFOLDING_FALL_INCIDENT',
    'MASS_EVACUATION_DRILL',
    'DUAL_HAZARD_CRISIS'
  ])
});

export const simulatorOverrideSchema = z.object({
  workerId: z.string().min(2, 'workerId is required'),
  override: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    gasLevel: z.number().optional(),
    airQuality: z.number().optional(),
    flameDetected: z.boolean().optional(),
    fallDetected: z.boolean().optional(),
    sosPressed: z.boolean().optional(),
    batteryPercentage: z.number().optional(),
    wifiRssi: z.number().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  })
});

export const simulatorConfigureSchema = z.object({
  intervalMs: z.number().min(500).max(10000).optional(),
  isRunning: z.boolean().optional()
});

export const updateSettingsSchema = z.object({
  tempWarning: z.number().min(0).max(100).optional(),
  tempCritical: z.number().min(0).max(150).optional(),
  gasWarning: z.number().min(0).max(10000).optional(),
  gasCritical: z.number().min(0).max(10000).optional(),
  airQualityWarning: z.number().min(0).max(10000).optional(),
  heartbeatWarningSec: z.number().min(1).max(3600).optional(),
  heartbeatOfflineSec: z.number().min(5).max(7200).optional(),
  iotGatewayUrl: z.string().optional(),
  audioAlerts: z.boolean().optional()
});

