import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';
import { emitEvent, emitToWorker, emitToDevice } from '../socket';

export const getGeofences = (req: Request, res: Response): void => {
  try {
    const geofences = telemetryStore.getGeofences();
    res.json({
      success: true,
      data: geofences
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getGeofenceById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const gf = telemetryStore.getGeofenceById(id as string);
    if (!gf) {
      res.status(404).json({ success: false, message: `Geofence ${id} not found` });
      return;
    }
    res.json({ success: true, data: gf });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const createGeofence = (req: Request, res: Response): void => {
  try {
    const newGf = telemetryStore.createGeofence(req.body);
    emitEvent('geofence_created', newGf);
    res.status(201).json({ success: true, data: newGf });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const updateGeofence = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const updated = telemetryStore.updateGeofence(id as string, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: `Geofence ${id} not found` });
      return;
    }
    emitEvent('geofence_updated', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const deleteGeofence = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const deleted = telemetryStore.deleteGeofence(id as string);
    if (!deleted) {
      res.status(404).json({ success: false, message: `Geofence ${id} not found` });
      return;
    }
    emitEvent('geofence_deleted', { id });
    res.json({ success: true, message: `Geofence ${id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getTrajectories = (req: Request, res: Response): void => {
  try {
    const workerId = req.query.workerId as string | undefined;
    const trajectories = telemetryStore.getTrajectories(workerId);
    res.json({ success: true, data: trajectories });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const simulateBreach = (req: Request, res: Response): void => {
  try {
    const { workerId = 'W001', geofenceId = 'GF_001' } = req.body;
    const result = telemetryStore.simulateGeofenceBreach(workerId as string, geofenceId as string);

    if (!result) {
      res.status(404).json({
        success: false,
        message: `Worker ${workerId} or Geofence ${geofenceId} not found`
      });
      return;
    }

    // Broadcast WebSocket events across rooms
    emitEvent('sensor_update', result.reading);
    emitToWorker(result.worker.workerId, 'worker_telemetry', result.reading);
    if (result.worker.deviceId) {
      emitToDevice(result.worker.deviceId, 'device_telemetry', result.reading);
    }

    if (result.alert) {
      emitEvent('alert_triggered', result.alert);
      emitEvent('geofence_breach', {
        worker: result.worker,
        geofence: result.geofence,
        alert: result.alert,
        reading: result.reading
      });
    }

    if (result.statusChanged) {
      emitEvent('worker_status_update', {
        workerId: result.worker.workerId,
        status: result.worker.status,
        lastSeen: result.worker.lastSeen
      });
    }

    res.json({
      success: true,
      message: `Geofence breach simulated for ${result.worker.name} entering ${result.geofence.name}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
