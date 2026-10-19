import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';
import { emitEvent } from '../socket';
import { z } from 'zod';
import { SensorReading } from '../types';

// ESP32 Payload Validation Schema strictly matching Section 22
const esp32SensorPayloadSchema = z.object({
  deviceId: z.string().min(1),
  jacketId: z.string().min(1),
  workerId: z.string().min(1),
  temperature: z.number(),
  humidity: z.number(),
  gasLevel: z.number(),
  airQuality: z.number(),
  flameDetected: z.boolean(),
  fallDetected: z.boolean(),
  sosPressed: z.boolean(),
  battery: z.number().min(0).max(100),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string().optional(),
  sensorHealth: z.record(z.boolean()).optional()
});

export const postSensorData = (req: Request, res: Response): void => {
  try {
    const validated = esp32SensorPayloadSchema.parse(req.body);

    let temp = validated.temperature;
    let hum = validated.humidity;

    // Automatic DHT11 / DHT22 protocol scale normalization:
    // If a DHT11 sensor (byte-based) is read with a DHT22 driver (16-bit word),
    // values are multiplied by 25.6 (e.g., 29°C becomes ~743°C, 46% becomes ~1177%).
    if (temp > 120) {
      temp = Number((temp / 25.6).toFixed(1));
    }
    if (hum > 100) {
      hum = Number((hum / 25.6).toFixed(1));
    }

    const reading: SensorReading = {
      id: `sr-${validated.deviceId}-${Date.now()}`,
      deviceId: validated.deviceId,
      jacketId: validated.jacketId,
      workerId: validated.workerId,
      temperature: temp,
      humidity: hum,
      gasLevel: validated.gasLevel,
      airQuality: validated.airQuality,
      flameDetected: validated.flameDetected,
      fallDetected: validated.fallDetected,
      sosPressed: validated.sosPressed,
      batteryPercentage: validated.battery,
      latitude: validated.latitude,
      longitude: validated.longitude,
      timestamp: validated.timestamp || new Date().toISOString(),
      sensorHealth: validated.sensorHealth
    };

    const result = telemetryStore.recordSensorReading(reading);

    // Emit live update over WebSockets
    emitEvent('sensor_update', reading);
    emitEvent('device_status_update', {
      deviceId: reading.deviceId,
      status: 'ONLINE'
    });
    emitEvent('dashboard_summary', telemetryStore.getDashboardSummary());

    if (result.newAlert) {
      emitEvent('alert_triggered', result.newAlert);
    }

    if (reading.workerId) {
      const worker = telemetryStore.getWorkerById(reading.workerId);
      if (worker) {
        emitEvent('worker_status_update', {
          workerId: worker.workerId,
          status: worker.status,
          lastSeen: worker.lastSeen
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Sensor data ingested successfully',
      data: {
        readingId: reading.id,
        status: result.newAlert ? 'ALERT_GENERATED' : 'OK'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid sensor payload format from IoT device',
        errors: error.errors
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to process sensor reading',
      error: (error as Error).message
    });
  }
};

export const getSensorDataByDeviceId = (req: Request, res: Response): void => {
  try {
    const deviceId = req.params.deviceId as string;
    const limit = parseInt(req.query.limit as string) || 60;
    const history = telemetryStore.getSensorHistory(deviceId, limit);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getLatestSensorData = (req: Request, res: Response): void => {
  try {
    const deviceId = req.params.deviceId as string;
    const latest = telemetryStore.getLatestReading(deviceId);
    if (!latest) {
      res.status(404).json({ success: false, message: `No telemetry available for device ${deviceId}` });
      return;
    }
    res.json({ success: true, data: latest });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
