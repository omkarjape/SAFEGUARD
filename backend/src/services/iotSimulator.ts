import { telemetryStore } from './telemetryStore';
import { emitEvent, emitToWorker, emitToDevice } from '../socket';

import {
  SensorReading,
  SimulationScenario,
  PlantScenario,
  ManualSensorOverride,
  WorkerSimulationState,
  SimulatorStatus
} from '../types';

function gaussianNoise(stdDev: number = 1.0, mean: number = 0.0): number {
  const u1 = Math.max(0.0001, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

class IoTSimulator {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number = 3000;
  private isRunning: boolean = false;
  private tickCount: number = 0;
  private activePlantScenario?: PlantScenario | 'CUSTOM' = 'BASELINE_SAFE';
  private workerStates: Map<string, WorkerSimulationState> = new Map();
  private lastTickTimestamp: string = new Date().toISOString();

  constructor() {
    this.initDefaultStates();
  }

  private initDefaultStates(): void {
    const workers = telemetryStore.getWorkers();
    workers.forEach(w => {
      if (!this.workerStates.has(w.workerId)) {
        this.workerStates.set(w.workerId, {
          workerId: w.workerId,
          activeScenario: 'normal',
          isOffline: false,
          currentValues: {
            temperature: 27.5,
            humidity: 55.0,
            gasLevel: 105,
            airQuality: 70,
            batteryPercentage: 95.0,
            wifiRssi: -58
          },
          motionState: 'WALKING'
        });
      }
    });
  }

  public start(intervalMs: number = 3000): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.intervalMs = intervalMs;
    this.isRunning = true;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    console.log(`[IoT Simulator] Started physics simulation engine (${this.intervalMs}ms ticks)`);
    this.broadcastStatus();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[IoT Simulator] Paused simulation engine');
    this.broadcastStatus();
  }

  public setIntervalMs(intervalMs: number): void {
    this.intervalMs = intervalMs;
    if (this.isRunning) {
      this.start(intervalMs);
    } else {
      this.broadcastStatus();
    }
  }

  public getStatus(): SimulatorStatus {
    const statesObj: Record<string, WorkerSimulationState> = {};
    this.workerStates.forEach((state, workerId) => {
      statesObj[workerId] = { ...state };
    });

    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      activePlantScenario: this.activePlantScenario,
      workerStates: statesObj,
      tickCount: this.tickCount,
      lastTickTimestamp: this.lastTickTimestamp
    };
  }

  private broadcastStatus(): void {
    emitEvent('simulator_status_update', this.getStatus());
  }

  public setWorkerScenario(workerId: string, scenario: SimulationScenario): void {
    this.initDefaultStates();
    let state = this.workerStates.get(workerId);
    if (!state) {
      state = {
        workerId,
        activeScenario: scenario,
        isOffline: scenario === 'offline',
        currentValues: {
          temperature: 27.5,
          humidity: 55.0,
          gasLevel: 105,
          airQuality: 70,
          batteryPercentage: 95.0,
          wifiRssi: -58
        },
        motionState: scenario === 'fall' ? 'FREEFALL' : 'WALKING'
      };
      this.workerStates.set(workerId, state);
    } else {
      state.activeScenario = scenario;
      state.isOffline = scenario === 'offline';
      if (scenario === 'fall') {
        state.motionState = 'FREEFALL';
      }
    }

    this.activePlantScenario = 'CUSTOM';

    if (scenario === 'offline') {
      telemetryStore.updateWorker(workerId, { status: 'OFFLINE' });
      const worker = telemetryStore.getWorkerById(workerId);
      if (worker && worker.deviceId) {
        telemetryStore.updateDevice(worker.deviceId, { connectionStatus: 'OFFLINE' });
      }
      emitEvent('device_status_update', { workerId, status: 'OFFLINE' });
    }

    console.log(`[IoT Simulator] Worker ${workerId} scenario updated to ${scenario}`);
    this.tick();
    this.broadcastStatus();
  }

  public setManualOverride(workerId: string, override: ManualSensorOverride): void {
    this.initDefaultStates();
    const state = this.workerStates.get(workerId);
    if (state) {
      state.manualOverride = {
        ...(state.manualOverride || {}),
        ...override
      };
      this.activePlantScenario = 'CUSTOM';
      console.log(`[IoT Simulator] Manual override applied to ${workerId}:`, override);
      this.tick();
      this.broadcastStatus();
    }
  }

  public clearWorkerOverride(workerId: string): void {
    const state = this.workerStates.get(workerId);
    if (state) {
      state.manualOverride = undefined;
      console.log(`[IoT Simulator] Cleared manual override for ${workerId}`);
      this.tick();
      this.broadcastStatus();
    }
  }

  public setPlantScenario(plantScenario: PlantScenario): void {
    this.initDefaultStates();
    this.activePlantScenario = plantScenario;

    // Reset all overrides
    this.workerStates.forEach(s => {
      s.manualOverride = undefined;
      s.activeScenario = 'normal';
      s.isOffline = false;
    });

    switch (plantScenario) {
      case 'BASELINE_SAFE':
        // All workers normal
        break;

      case 'CONFINED_SPACE_TOXIC_GAS':
        // Worker 1 suffers gas leak + asphyxiation risk
        this.applyScenarioInternal('W001', 'gas_warning');
        break;

      case 'BOILER_ROOM_THERMAL_RUNAWAY':
        // Worker 2 experiences extreme thermal runaway
        this.applyScenarioInternal('W002', 'high_temp');
        break;

      case 'SCAFFOLDING_FALL_INCIDENT':
        // Worker 3 has sudden fall impact
        this.applyScenarioInternal('W003', 'fall');
        break;

      case 'DUAL_HAZARD_CRISIS':
        this.applyScenarioInternal('W001', 'gas_warning');
        this.applyScenarioInternal('W002', 'fall');
        break;

      case 'MASS_EVACUATION_DRILL':
        this.applyScenarioInternal('W001', 'gas_warning');
        this.applyScenarioInternal('W002', 'high_temp');
        this.applyScenarioInternal('W003', 'sos');
        break;
    }

    console.log(`[IoT Simulator] Plant scenario triggered: ${plantScenario}`);
    this.tick();
    this.broadcastStatus();
  }

  private applyScenarioInternal(workerId: string, scenario: SimulationScenario): void {
    const state = this.workerStates.get(workerId);
    if (state) {
      state.activeScenario = scenario;
      state.isOffline = scenario === 'offline';
      if (scenario === 'fall') {
        state.motionState = 'FREEFALL';
      }
    }
  }

  public resetAll(): void {
    this.activePlantScenario = 'BASELINE_SAFE';
    const workers = telemetryStore.getWorkers();

    workers.forEach(w => {
      this.workerStates.set(w.workerId, {
        workerId: w.workerId,
        activeScenario: 'normal',
        isOffline: false,
        currentValues: {
          temperature: 27.5,
          humidity: 55.0,
          gasLevel: 105,
          airQuality: 70,
          batteryPercentage: 94.0,
          wifiRssi: -58
        },
        motionState: 'WALKING'
      });

      telemetryStore.updateWorker(w.workerId, { status: 'SAFE' });
      if (w.deviceId) {
        telemetryStore.updateDevice(w.deviceId, { connectionStatus: 'ONLINE' });
      }
    });

    console.log('[IoT Simulator] Plant reset to SAFE baseline');
    this.tick();
    this.broadcastStatus();
  }

  // Backward compatibility alias
  public setScenario(scenario: SimulationScenario, targetWorkerId: string = 'W001'): void {
    this.setWorkerScenario(targetWorkerId, scenario);
  }

  public getActiveScenario(): { scenario: SimulationScenario; targetWorker: string } {
    const state = this.workerStates.get('W001');
    return {
      scenario: state ? state.activeScenario : 'normal',
      targetWorker: 'W001'
    };
  }

  private tick(): void {
    this.tickCount++;
    this.lastTickTimestamp = new Date().toISOString();
    const workers = telemetryStore.getWorkers();

    workers.forEach(worker => {
      if (!worker.deviceId || !worker.jacketId) return;

      let simState = this.workerStates.get(worker.workerId);
      if (!simState) {
        simState = {
          workerId: worker.workerId,
          activeScenario: 'normal',
          isOffline: false,
          currentValues: {
            temperature: 27.5,
            humidity: 55.0,
            gasLevel: 105,
            airQuality: 70,
            batteryPercentage: 94.0,
            wifiRssi: -58
          },
          motionState: 'WALKING'
        };
        this.workerStates.set(worker.workerId, simState);
      }

      // If simulated offline, do not emit sensor readings
      if (simState.isOffline) {
        return;
      }

      const curr = simState.currentValues;
      const override = simState.manualOverride;
      const scenario = simState.activeScenario;
      const timeFactor = this.tickCount * 0.12 + (worker.workerId === 'W001' ? 0 : 2.5);

      // 1. Temperature: Physics-based Thermal Inertia
      let targetTemp = 27.2 + Math.sin(timeFactor) * 2.0;
      if (scenario === 'high_temp') {
        targetTemp = 45.8;
      } else if (scenario === 'flame') {
        targetTemp = 49.5;
      }
      // Exponential convergence towards target + subtle thermal micro-jitter
      const alphaTemp = 0.38; // Thermal inertia coefficient
      let nextTemp = curr.temperature + alphaTemp * (targetTemp - curr.temperature) + gaussianNoise(0.12);
      if (override && override.temperature !== undefined) {
        nextTemp = override.temperature;
      }

      // 2. Humidity
      let targetHum = 54.0 + Math.cos(timeFactor * 0.7) * 4.5;
      if (scenario === 'high_temp') {
        targetHum = 32.0; // dry heat
      }
      let nextHum = curr.humidity + 0.3 * (targetHum - curr.humidity) + gaussianNoise(0.2);
      if (override && override.humidity !== undefined) {
        nextHum = override.humidity;
      }

      // 3. Combustible Gas (MQ-2) & Toxic Gas (MQ-135): Diffusion & Logarithmic Decay
      let targetGas = 100 + Math.floor(Math.sin(timeFactor * 0.4) * 15);
      let targetAir = 68 + Math.floor(Math.cos(timeFactor * 0.5) * 12);
      if (scenario === 'gas_warning') {
        targetGas = 520;
        targetAir = 320;
      }
      // Gas diffusion climb rate vs exhaust ventilation decay rate
      const alphaGas = curr.gasLevel < targetGas ? 0.45 : 0.28;
      let nextGas = curr.gasLevel + alphaGas * (targetGas - curr.gasLevel) + gaussianNoise(3.5);
      let nextAir = curr.airQuality + 0.35 * (targetAir - curr.airQuality) + gaussianNoise(2.0);
      if (override && override.gasLevel !== undefined) {
        nextGas = override.gasLevel;
      }
      if (override && override.airQuality !== undefined) {
        nextAir = override.airQuality;
      }

      // 4. Battery Dynamics: Slow linear discharge + low_battery scenario
      let nextBattery = Math.max(8.0, curr.batteryPercentage - 0.003);
      if (scenario === 'low_battery') {
        nextBattery = 9.2;
      }
      if (override && override.batteryPercentage !== undefined) {
        nextBattery = override.batteryPercentage;
      }

      // 5. Wi-Fi RSSI (dBm)
      let nextRssi = -56 + Math.round(gaussianNoise(2.0));
      if (scenario === 'offline') {
        nextRssi = -95;
      }
      if (override && override.wifiRssi !== undefined) {
        nextRssi = override.wifiRssi;
      }

      // 6. MPU6050 Motion Dynamics & Fall State Machine
      let isFallDetected = false;
      if (scenario === 'fall') {
        if (simState.motionState === 'FREEFALL') {
          // Progress to impact
          simState.motionState = 'IMPACT';
          isFallDetected = true;
        } else if (simState.motionState === 'IMPACT') {
          // Post fall resting flat
          simState.motionState = 'POST_FALL_REST';
          isFallDetected = true;
        } else {
          isFallDetected = true;
        }
      } else {
        simState.motionState = 'WALKING';
        isFallDetected = false;
      }
      if (override && override.fallDetected !== undefined) {
        isFallDetected = override.fallDetected;
      }

      // 7. Flame Detector
      let isFlame = scenario === 'flame';
      if (override && override.flameDetected !== undefined) {
        isFlame = override.flameDetected;
      }

      // 8. SOS Emergency Hardware Button
      let isSos = scenario === 'sos';
      if (override && override.sosPressed !== undefined) {
        isSos = override.sosPressed;
      }

      // 9. GPS Positioning (subtle wander within industrial plant quadrant)
      const latBase = worker.workerId === 'W001' ? 19.7660 : worker.workerId === 'W002' ? 19.7672 : 19.7651;
      const lonBase = worker.workerId === 'W001' ? 74.4770 : worker.workerId === 'W002' ? 74.4758 : 74.4785;
      let nextLat = latBase + Math.sin(timeFactor * 0.05) * 0.00035;
      let nextLon = lonBase + Math.cos(timeFactor * 0.05) * 0.00035;
      if (override && override.latitude !== undefined) {
        nextLat = override.latitude;
      }
      if (override && override.longitude !== undefined) {
        nextLon = override.longitude;
      }

      // Save updated interpolated values
      simState.currentValues = {
        temperature: Number(nextTemp.toFixed(1)),
        humidity: Number(nextHum.toFixed(1)),
        gasLevel: Math.max(10, Math.round(nextGas)),
        airQuality: Math.max(10, Math.round(nextAir)),
        batteryPercentage: Number(nextBattery.toFixed(1)),
        wifiRssi: nextRssi
      };

      // Construct verified SensorReading packet
      const reading: SensorReading = {
        id: `sr-${worker.deviceId}-${Date.now()}`,
        deviceId: worker.deviceId,
        jacketId: worker.jacketId,
        workerId: worker.workerId,
        temperature: simState.currentValues.temperature,
        humidity: simState.currentValues.humidity,
        gasLevel: simState.currentValues.gasLevel,
        airQuality: simState.currentValues.airQuality,
        flameDetected: isFlame,
        fallDetected: isFallDetected,
        sosPressed: isSos,
        batteryPercentage: simState.currentValues.batteryPercentage,
        latitude: Number(nextLat.toFixed(6)),
        longitude: Number(nextLon.toFixed(6)),
        timestamp: new Date().toISOString()
      };

      // Ingest into telemetry store & trigger threshold evaluation
      const result = telemetryStore.recordSensorReading(reading);

      // Targeted low-latency room emission (Phase 8 Architecture)
      emitToWorker(worker.workerId, 'worker_telemetry', reading);
      if (worker.deviceId) {
        emitToDevice(worker.deviceId, 'device_telemetry', reading);
      }

      // Emit sensor reading update to global feed
      emitEvent('sensor_update', reading);


      if (result.newAlert) {
        emitEvent('alert_triggered', result.newAlert);
      }

      if (result.statusChanged) {
        emitEvent('worker_status_update', {
          workerId: worker.workerId,
          status: worker.status,
          lastSeen: worker.lastSeen
        });
      }
    });

    // Automated Heartbeat Offline Detection
    const now = Date.now();
    const allDevices = telemetryStore.getDevices();
    allDevices.forEach(d => {
      const timeSinceLastSeen = now - new Date(d.lastSeen).getTime();
      if (timeSinceLastSeen > 120000 && d.connectionStatus !== 'OFFLINE') {
        d.connectionStatus = 'OFFLINE';
        telemetryStore.updateDevice(d.deviceId, { connectionStatus: 'OFFLINE' });
        if (d.assignedWorkerId) {
          telemetryStore.updateWorker(d.assignedWorkerId, { status: 'OFFLINE' });
        }
        const offlineAlert = telemetryStore.createAlert({
          workerId: d.assignedWorkerId || 'Unknown',
          jacketId: d.jacketId || 'Unknown',
          deviceId: d.deviceId,
          type: 'DEVICE_OFFLINE',
          severity: 'CRITICAL',
          message: `Hardware node ${d.deviceId} heartbeat timed out (> 120s). Device marked OFFLINE.`
        });
        emitEvent('device_status_update', { deviceId: d.deviceId, status: 'OFFLINE' });
        emitEvent('alert_triggered', offlineAlert);
      } else if (timeSinceLastSeen > 30000 && timeSinceLastSeen <= 120000 && d.connectionStatus === 'ONLINE') {
        d.connectionStatus = 'WARNING';
        telemetryStore.updateDevice(d.deviceId, { connectionStatus: 'WARNING' });
        emitEvent('device_status_update', { deviceId: d.deviceId, status: 'WARNING' });
      }
    });

    // Broadcast updated dashboard summary periodically
    emitEvent('dashboard_summary', telemetryStore.getDashboardSummary());
  }
}

export const iotSimulator = new IoTSimulator();
