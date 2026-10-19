import axios from 'axios';
import {
  Worker,
  Device,
  SafetyJacket,
  Alert,
  LocationReading,
  DashboardSummary,
  SensorReading,
  SimulationScenario,
  PlantScenario,
  ManualSensorOverride,
  SimulatorStatus,
  ZoneIncidentStat,
  ShiftSafetyStat,
  WorkerRiskProfile,
  AnalyticsSummary,
  GeoFence,
  TrajectoryPoint,
  SafetyThresholds
} from '../types';


const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const api = {
  // Dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await client.get<{ success: boolean; data: DashboardSummary }>('/dashboard/summary');
    return res.data.data;
  },

  // Workers
  getWorkers: async (): Promise<Worker[]> => {
    const res = await client.get<{ success: boolean; data: Worker[] }>('/workers');
    return res.data.data;
  },

  getWorkerById: async (id: string): Promise<Worker & { latestSensor?: SensorReading }> => {
    const res = await client.get<{ success: boolean; data: Worker & { latestSensor?: SensorReading } }>(`/workers/${id}`);
    return res.data.data;
  },

  createWorker: async (worker: Partial<Worker>): Promise<Worker> => {
    const res = await client.post<{ success: boolean; data: Worker }>('/workers', worker);
    return res.data.data;
  },

  updateWorker: async (id: string, updates: Partial<Worker>): Promise<Worker> => {
    const res = await client.put<{ success: boolean; data: Worker }>(`/workers/${id}`, updates);
    return res.data.data;
  },

  deleteWorker: async (id: string): Promise<void> => {
    await client.delete(`/workers/${id}`);
  },

  pairJacket: async (workerId: string, jacketId: string): Promise<{ worker: Worker; jacket: SafetyJacket; device?: Device }> => {
    const res = await client.post<{ success: boolean; data: { worker: Worker; jacket: SafetyJacket; device?: Device } }>(`/workers/${workerId}/pair-jacket`, { jacketId });
    return res.data.data;
  },

  unpairJacket: async (workerId: string): Promise<Worker> => {
    const res = await client.post<{ success: boolean; data: Worker }>(`/workers/${workerId}/unpair-jacket`);
    return res.data.data;
  },

  // Devices & Jackets
  getDevices: async (): Promise<Device[]> => {
    const res = await client.get<{ success: boolean; data: Device[] }>('/devices');
    return res.data.data;
  },

  getDeviceById: async (id: string): Promise<Device & { latestSensor?: SensorReading }> => {
    const res = await client.get<{ success: boolean; data: Device & { latestSensor?: SensorReading } }>(`/devices/${id}`);
    return res.data.data;
  },

  createDevice: async (device: Partial<Device>): Promise<Device> => {
    const res = await client.post<{ success: boolean; data: Device }>('/devices', device);
    return res.data.data;
  },

  updateDevice: async (id: string, updates: Partial<Device>): Promise<Device> => {
    const res = await client.put<{ success: boolean; data: Device }>(`/devices/${id}`, updates);
    return res.data.data;
  },

  deleteDevice: async (id: string): Promise<void> => {
    await client.delete(`/devices/${id}`);
  },

  getJackets: async (): Promise<SafetyJacket[]> => {
    const res = await client.get<{ success: boolean; data: SafetyJacket[] }>('/jackets');
    return res.data.data;
  },

  createJacket: async (jacket: Partial<SafetyJacket>): Promise<SafetyJacket> => {
    const res = await client.post<{ success: boolean; data: SafetyJacket }>('/jackets', jacket);
    return res.data.data;
  },

  deleteJacket: async (id: string): Promise<void> => {
    await client.delete(`/jackets/${id}`);
  },

  // Sensors
  getSensorHistory: async (deviceId: string, limit: number = 60): Promise<SensorReading[]> => {
    const res = await client.get<{ success: boolean; data: SensorReading[] }>(`/sensor-data/${deviceId}?limit=${limit}`);
    return res.data.data;
  },

  getLatestSensor: async (deviceId: string): Promise<SensorReading> => {
    const res = await client.get<{ success: boolean; data: SensorReading }>(`/sensor-data/${deviceId}/latest`);
    return res.data.data;
  },

  // Alerts
  getAlerts: async (status?: string, severity?: string): Promise<Alert[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    const res = await client.get<{ success: boolean; data: Alert[] }>(`/alerts?${params.toString()}`);
    return res.data.data;
  },

  acknowledgeAlert: async (alertId: string, operatorName?: string): Promise<Alert> => {
    const res = await client.patch<{ success: boolean; data: Alert }>(`/alerts/${alertId}/acknowledge`, { operatorName });
    return res.data.data;
  },

  resolveAlert: async (
    alertId: string,
    resolutionData?: { operatorName?: string; resolutionNotes?: string; rootCause?: string }
  ): Promise<Alert> => {
    const res = await client.patch<{ success: boolean; data: Alert }>(`/alerts/${alertId}/resolve`, resolutionData || {});
    return res.data.data;
  },

  clearAllAlerts: async (): Promise<void> => {
    await client.post('/alerts/clear');
  },

  // Locations & Trajectories
  getLocations: async (): Promise<LocationReading[]> => {
    const res = await client.get<{ success: boolean; data: LocationReading[] }>('/locations');
    return res.data.data;
  },

  getTrajectories: async (workerId?: string): Promise<Record<string, TrajectoryPoint[]>> => {
    const params = workerId ? `?workerId=${workerId}` : '';
    const res = await client.get<{ success: boolean; data: Record<string, TrajectoryPoint[]> }>(`/locations/trajectories${params}`);
    return res.data.data;
  },

  // Geofencing
  getGeofences: async (): Promise<GeoFence[]> => {
    const res = await client.get<{ success: boolean; data: GeoFence[] }>('/geofences');
    return res.data.data;
  },

  getGeofenceById: async (id: string): Promise<GeoFence> => {
    const res = await client.get<{ success: boolean; data: GeoFence }>(`/geofences/${id}`);
    return res.data.data;
  },

  createGeofence: async (geofence: Partial<GeoFence>): Promise<GeoFence> => {
    const res = await client.post<{ success: boolean; data: GeoFence }>('/geofences', geofence);
    return res.data.data;
  },

  updateGeofence: async (id: string, updates: Partial<GeoFence>): Promise<GeoFence> => {
    const res = await client.put<{ success: boolean; data: GeoFence }>(`/geofences/${id}`, updates);
    return res.data.data;
  },

  deleteGeofence: async (id: string): Promise<void> => {
    await client.delete(`/geofences/${id}`);
  },

  simulateGeofenceBreach: async (workerId: string, geofenceId: string): Promise<{
    worker: Worker;
    geofence: GeoFence;
    reading: SensorReading;
    alert?: Alert;
  }> => {
    const res = await client.post<{
      success: boolean;
      data: {
        worker: Worker;
        geofence: GeoFence;
        reading: SensorReading;
        alert?: Alert;
      };
    }>('/geofences/simulate-breach', { workerId, geofenceId });
    return res.data.data;
  },


  // Simulator Control & Physics Engine
  getSimulatorStatus: async (): Promise<SimulatorStatus> => {
    const res = await client.get<{ success: boolean; data: SimulatorStatus }>('/simulator/status');
    return res.data.data;
  },

  triggerSimulatorScenario: async (scenario: SimulationScenario, targetWorkerId: string = 'W001'): Promise<SimulatorStatus> => {
    const res = await client.post<{ success: boolean; data: SimulatorStatus }>('/simulator/scenario', {
      workerId: targetWorkerId,
      scenario
    });
    return res.data.data;
  },

  setWorkerScenario: async (workerId: string, scenario: SimulationScenario): Promise<SimulatorStatus> => {
    const res = await client.post<{ success: boolean; data: SimulatorStatus }>('/simulator/scenario', {
      workerId,
      scenario
    });
    return res.data.data;
  },

  setPlantScenario: async (scenario: PlantScenario): Promise<SimulatorStatus> => {
    const res = await client.post<{ success: boolean; data: SimulatorStatus }>('/simulator/plant-scenario', { scenario });
    return res.data.data;
  },

  setManualOverride: async (workerId: string, override: ManualSensorOverride): Promise<SimulatorStatus> => {
    const res = await client.post<{ success: boolean; data: SimulatorStatus }>('/simulator/override', {
      workerId,
      override
    });
    return res.data.data;
  },

  clearWorkerOverride: async (workerId: string): Promise<SimulatorStatus> => {
    const res = await client.delete<{ success: boolean; data: SimulatorStatus }>(`/simulator/override/${workerId}`);
    return res.data.data;
  },

  configureSimulator: async (intervalMs?: number, isRunning?: boolean): Promise<SimulatorStatus> => {
    const res = await client.post<{ success: boolean; data: SimulatorStatus }>('/simulator/configure', {
      intervalMs,
      isRunning
    });
    return res.data.data;
  },

  resetAllSimulator: async (): Promise<SimulatorStatus> => {
    const res = await client.post<{ success: boolean; data: SimulatorStatus }>('/simulator/reset');
    return res.data.data;
  },

  // Analytics & Incident Reporting
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const res = await client.get<{ success: boolean; data: AnalyticsSummary }>('/analytics/summary');
    return res.data.data;
  },

  getZoneHeatmap: async (): Promise<ZoneIncidentStat[]> => {
    const res = await client.get<{ success: boolean; data: ZoneIncidentStat[] }>('/analytics/zones');
    return res.data.data;
  },

  getShiftAnalytics: async (): Promise<ShiftSafetyStat[]> => {
    const res = await client.get<{ success: boolean; data: ShiftSafetyStat[] }>('/analytics/shifts');
    return res.data.data;
  },

  getWorkerRiskScores: async (): Promise<WorkerRiskProfile[]> => {
    const res = await client.get<{ success: boolean; data: WorkerRiskProfile[] }>('/analytics/risk-scores');
    return res.data.data;
  },

  // Settings & System Thresholds
  getSettings: async (): Promise<SafetyThresholds> => {
    const res = await client.get<{ success: boolean; data: SafetyThresholds }>('/settings');
    return res.data.data;
  },

  updateSettings: async (settings: Partial<SafetyThresholds>): Promise<SafetyThresholds> => {
    const res = await client.put<{ success: boolean; data: SafetyThresholds }>('/settings', settings);
    return res.data.data;
  }
};

