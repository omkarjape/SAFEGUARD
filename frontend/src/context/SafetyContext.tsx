import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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
  SimulatorStatus
} from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { audioAlerts } from '../utils/audioAlert';


interface SafetyContextType {
  workers: Worker[];
  devices: Device[];
  jackets: SafetyJacket[];
  alerts: Alert[];
  locations: LocationReading[];
  summary: DashboardSummary | null;
  liveSensors: Record<string, SensorReading>;
  sensorHistory: Record<string, SensorReading[]>;
  activeAlertToast: Alert | null;
  dismissAlertToast: () => void;
  isLoading: boolean;
  isConnected: boolean;
  activeScenario: SimulationScenario;
  targetWorkerId: string;
  simulatorStatus: SimulatorStatus | null;
  refreshData: () => Promise<void>;
  acknowledgeAlert: (alertId: string, operatorName?: string) => Promise<void>;
  resolveAlert: (
    alertId: string,
    resolutionData?: { operatorName?: string; resolutionNotes?: string; rootCause?: string }
  ) => Promise<void>;
  clearAllAlerts: () => Promise<void>;
  createWorker: (workerData: Partial<Worker>) => Promise<Worker>;
  updateWorker: (id: string, workerData: Partial<Worker>) => Promise<Worker>;
  deleteWorker: (id: string) => Promise<void>;
  pairJacket: (workerId: string, jacketId: string) => Promise<void>;
  unpairJacket: (workerId: string) => Promise<void>;
  createDevice: (deviceData: Partial<Device>) => Promise<Device>;
  updateDevice: (id: string, updates: Partial<Device>) => Promise<Device>;
  deleteDevice: (id: string) => Promise<void>;
  createJacket: (jacketData: Partial<SafetyJacket>) => Promise<SafetyJacket>;
  deleteJacket: (id: string) => Promise<void>;
  triggerSimulator: (scenario: SimulationScenario, targetWorker?: string) => Promise<void>;
  setWorkerScenario: (workerId: string, scenario: SimulationScenario) => Promise<void>;
  setPlantScenario: (scenario: PlantScenario) => Promise<void>;
  setManualOverride: (workerId: string, override: ManualSensorOverride) => Promise<void>;
  clearWorkerOverride: (workerId: string) => Promise<void>;
  configureSimulator: (intervalMs?: number, isRunning?: boolean) => Promise<void>;
  resetAllSimulator: () => Promise<void>;
}

const SafetyContext = createContext<SafetyContextType | undefined>(undefined);

export const SafetyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [jackets, setJackets] = useState<SafetyJacket[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [locations, setLocations] = useState<LocationReading[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [liveSensors, setLiveSensors] = useState<Record<string, SensorReading>>({});
  const [sensorHistory, setSensorHistory] = useState<Record<string, SensorReading[]>>({});
  const [activeAlertToast, setActiveAlertToast] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<SimulationScenario>('normal');
  const [targetWorkerId, setTargetWorkerId] = useState<string>('W001');
  const [simulatorStatus, setSimulatorStatus] = useState<SimulatorStatus | null>(null);


  const refreshData = useCallback(async () => {
    try {
      const [sum, wrks, devs, jcks, alrts, locs, sim] = await Promise.all([
        api.getDashboardSummary(),
        api.getWorkers(),
        api.getDevices(),
        api.getJackets(),
        api.getAlerts(),
        api.getLocations(),
        api.getSimulatorStatus().catch(() => null)
      ]);

      setSummary(sum);
      setWorkers(wrks);
      setDevices(devs);
      setJackets(jcks);
      setAlerts(alrts);
      setLocations(locs);
      if (sim) setSimulatorStatus(sim);

      // Preload initial sensor history for active devices
      devs.forEach(async (d) => {
        try {
          const history = await api.getSensorHistory(d.deviceId, 40);
          if (history.length > 0) {
            setLiveSensors(prev => ({ ...prev, [d.deviceId]: history[history.length - 1] }));
            setSensorHistory(prev => ({ ...prev, [d.deviceId]: history }));
          }
        } catch {
          // ignore device initial history error
        }
      });
    } catch (err) {
      console.error('[SafetyContext] Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    refreshData();
    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    setIsConnected(socket.connected);

    // Socket.IO event listeners
    socket.on('sensor_update', (reading: SensorReading) => {
      setLiveSensors(prev => ({ ...prev, [reading.deviceId]: reading }));
      setSensorHistory(prev => {
        const current = prev[reading.deviceId] || [];
        const next = [...current, reading];
        if (next.length > 60) next.shift(); // keep last 60 points
        return { ...prev, [reading.deviceId]: next };
      });

      // Update devices list with ONLINE status and lastSeen
      setDevices(prev => prev.map(d =>
        d.deviceId === reading.deviceId
          ? {
              ...d,
              connectionStatus: 'ONLINE',
              lastSeen: reading.timestamp,
              batteryPercentage: reading.batteryPercentage,
              sensorHealth: reading.sensorHealth || d.sensorHealth
            }
          : d
      ));

      // Update worker with fresh status and lastSeen
      if (reading.workerId) {
        setWorkers(prev => prev.map(w =>
          w.workerId === reading.workerId
            ? { ...w, lastSeen: reading.timestamp, status: w.status === 'OFFLINE' ? 'SAFE' : w.status }
            : w
        ));
      }

      // Update location if coordinates provided
      if (reading.workerId && reading.latitude && reading.longitude) {
        setLocations(prev => {
          const index = prev.findIndex(l => l.workerId === reading.workerId);
          const updatedLoc: LocationReading = {
            id: `loc-${reading.workerId}`,
            workerId: reading.workerId!,
            workerName: reading.workerId === 'W001' ? 'Worker 01' : (reading.workerId || 'Worker'),
            deviceId: reading.deviceId,
            latitude: reading.latitude,
            longitude: reading.longitude,
            status: 'SAFE',
            timestamp: reading.timestamp
          };
          if (index >= 0) {
            const next = [...prev];
            next[index] = { ...next[index], ...updatedLoc };
            return next;
          }
          return [...prev, updatedLoc];
        });
      }
    });

    socket.on('alert_triggered', (newAlert: Alert) => {
      setAlerts(prev => {
        // avoid duplicates
        if (prev.some(a => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });

      // Sound siren strictly for CRITICAL real emergencies (Flame, SOS, Fall, lethal gas/heat)
      if (newAlert.severity === 'CRITICAL') {
        setActiveAlertToast(newAlert);
        audioAlerts.playCriticalAlarm();
      } else if (newAlert.severity === 'WARNING') {
        setActiveAlertToast(newAlert);
        // Only sound warning beep for actual environmental conditions (NOT for diagnostic disconnections or offline events)
        if (newAlert.type !== 'SENSOR_DISCONNECTED' && newAlert.type !== 'DEVICE_OFFLINE') {
          audioAlerts.playWarningBeep();
        }
      }
    });

    socket.on('alert_updated', (updatedAlert: any) => {
      if (updatedAlert && updatedAlert.cleared) {
        setAlerts([]);
        setActiveAlertToast(null);
        return;
      }
      setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
    });

    socket.on('alerts_cleared', () => {
      setAlerts([]);
      setActiveAlertToast(null);
    });

    socket.on('worker_status_update', ({ workerId, status, lastSeen }: { workerId: string; status: any; lastSeen: string }) => {
      setWorkers(prev => prev.map(w => w.workerId === workerId ? { ...w, status, lastSeen } : w));
      if (status === 'OFFLINE') {
        setDevices(prev => prev.map(d => d.assignedWorkerId === workerId ? { ...d, connectionStatus: 'OFFLINE' } : d));
      }
    });

    socket.on('dashboard_summary', (newSummary: DashboardSummary) => {
      setSummary(newSummary);
    });

    socket.on('device_status_update', ({ deviceId, status }: { deviceId: string; status: any }) => {
      setDevices(prev => prev.map(d => d.deviceId === deviceId ? { ...d, connectionStatus: status } : d));
    });

    socket.on('simulator_status_update', (simStatus: SimulatorStatus) => {
      setSimulatorStatus(simStatus);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('sensor_update');
      socket.off('alert_triggered');
      socket.off('alert_updated');
      socket.off('alerts_cleared');
      socket.off('worker_status_update');
      socket.off('dashboard_summary');
      socket.off('device_status_update');
      socket.off('simulator_status_update');
    };

  }, [refreshData]);


  const dismissAlertToast = () => {
    setActiveAlertToast(null);
  };

  const acknowledgeAlert = async (alertId: string, operatorName?: string) => {
    try {
      const updated = await api.acknowledgeAlert(alertId, operatorName);
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
    } catch (err) {
      console.error('[SafetyContext] Failed to acknowledge alert:', err);
    }
  };

  const resolveAlert = async (
    alertId: string,
    resolutionData?: { operatorName?: string; resolutionNotes?: string; rootCause?: string }
  ) => {
    try {
      const updated = await api.resolveAlert(alertId, resolutionData);
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
      if (activeAlertToast?.id === alertId) {
        setActiveAlertToast(null);
      }
      refreshData();
    } catch (err) {
      console.error('[SafetyContext] Failed to resolve alert:', err);
    }
  };

  const clearAllAlerts = async (): Promise<void> => {
    try {
      await api.clearAllAlerts();
      setAlerts([]);
      setActiveAlertToast(null);
      await refreshData();
    } catch (err) {
      console.error('[SafetyContext] Failed to clear alerts:', err);
    }
  };

  const createWorker = async (workerData: Partial<Worker>): Promise<Worker> => {
    const created = await api.createWorker(workerData);
    setWorkers(prev => [...prev, created]);
    refreshData();
    return created;
  };

  const updateWorker = async (id: string, workerData: Partial<Worker>): Promise<Worker> => {
    const updated = await api.updateWorker(id, workerData);
    setWorkers(prev => prev.map(w => w.workerId === id ? updated : w));
    refreshData();
    return updated;
  };

  const deleteWorker = async (id: string): Promise<void> => {
    await api.deleteWorker(id);
    setWorkers(prev => prev.filter(w => w.workerId !== id));
    refreshData();
  };

  const pairJacket = async (workerId: string, jacketId: string): Promise<void> => {
    await api.pairJacket(workerId, jacketId);
    await refreshData();
  };

  const unpairJacket = async (workerId: string): Promise<void> => {
    await api.unpairJacket(workerId);
    await refreshData();
  };

  const createDevice = async (deviceData: Partial<Device>): Promise<Device> => {
    const created = await api.createDevice(deviceData);
    setDevices(prev => [...prev, created]);
    await refreshData();
    return created;
  };

  const updateDevice = async (id: string, updates: Partial<Device>): Promise<Device> => {
    const updated = await api.updateDevice(id, updates);
    setDevices(prev => prev.map(d => d.deviceId === id ? updated : d));
    await refreshData();
    return updated;
  };

  const deleteDevice = async (id: string): Promise<void> => {
    await api.deleteDevice(id);
    setDevices(prev => prev.filter(d => d.deviceId !== id));
    await refreshData();
  };

  const createJacket = async (jacketData: Partial<SafetyJacket>): Promise<SafetyJacket> => {
    const created = await api.createJacket(jacketData);
    setJackets(prev => [...prev, created]);
    await refreshData();
    return created;
  };

  const deleteJacket = async (id: string): Promise<void> => {
    await api.deleteJacket(id);
    setJackets(prev => prev.filter(j => j.jacketId !== id));
    await refreshData();
  };

  const triggerSimulator = async (scenario: SimulationScenario, targetWorker: string = 'W001') => {
    setActiveScenario(scenario);
    setTargetWorkerId(targetWorker);
    const updated = await api.setWorkerScenario(targetWorker, scenario);
    setSimulatorStatus(updated);
  };

  const setWorkerScenario = async (workerId: string, scenario: SimulationScenario) => {
    setActiveScenario(scenario);
    setTargetWorkerId(workerId);
    const updated = await api.setWorkerScenario(workerId, scenario);
    setSimulatorStatus(updated);
  };

  const setPlantScenario = async (scenario: PlantScenario) => {
    const updated = await api.setPlantScenario(scenario);
    setSimulatorStatus(updated);
  };

  const setManualOverride = async (workerId: string, override: ManualSensorOverride) => {
    const updated = await api.setManualOverride(workerId, override);
    setSimulatorStatus(updated);
  };

  const clearWorkerOverride = async (workerId: string) => {
    const updated = await api.clearWorkerOverride(workerId);
    setSimulatorStatus(updated);
  };

  const configureSimulator = async (intervalMs?: number, isRunning?: boolean) => {
    const updated = await api.configureSimulator(intervalMs, isRunning);
    setSimulatorStatus(updated);
  };

  const resetAllSimulator = async () => {
    const updated = await api.resetAllSimulator();
    setSimulatorStatus(updated);
    setActiveScenario('normal');
  };

  return (
    <SafetyContext.Provider
      value={{
        workers,
        devices,
        jackets,
        alerts,
        locations,
        summary,
        liveSensors,
        sensorHistory,
        activeAlertToast,
        dismissAlertToast,
        isLoading,
        isConnected,
        activeScenario,
        targetWorkerId,
        simulatorStatus,
        refreshData,
        acknowledgeAlert,
        resolveAlert,
        clearAllAlerts,
        createWorker,
        updateWorker,
        deleteWorker,
        pairJacket,
        unpairJacket,
        createDevice,
        updateDevice,
        deleteDevice,
        createJacket,
        deleteJacket,
        triggerSimulator,
        setWorkerScenario,
        setPlantScenario,
        setManualOverride,
        clearWorkerOverride,
        configureSimulator,
        resetAllSimulator
      }}
    >
      {children}
    </SafetyContext.Provider>
  );

};

export const useSafety = (): SafetyContextType => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};
