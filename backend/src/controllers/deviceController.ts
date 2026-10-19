import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';
import { emitEvent } from '../socket';
import { z } from 'zod';

const deviceCreateSchema = z.object({
  deviceId: z.string().min(2),
  jacketId: z.string().optional().or(z.literal('')),
  assignedWorkerId: z.string().optional().or(z.literal('')),
  firmwareVersion: z.string().default('v1.0.0'),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  batteryPercentage: z.number().min(0).max(100).default(100),
  connectionStatus: z.enum(['ONLINE', 'WARNING', 'OFFLINE', 'MAINTENANCE']).default('ONLINE'),
  hardwareStatus: z.enum(['ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED']).default('ACTIVE'),
});

const jacketCreateSchema = z.object({
  jacketId: z.string().min(2),
  model: z.string().default('SAFEGUARD-PRO-V1'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).default('ACTIVE'),
  workerId: z.string().optional().or(z.literal('')),
  deviceId: z.string().optional().or(z.literal('')),
});

export const getDevices = (req: Request, res: Response): void => {
  try {
    const devices = telemetryStore.getDevices();
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getDeviceById = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const device = telemetryStore.getDeviceById(id);
    if (!device) {
      res.status(404).json({ success: false, message: `Device ${id} not found` });
      return;
    }
    const latestSensor = telemetryStore.getLatestReading(id);
    res.json({ success: true, data: { ...device, latestSensor } });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const createDevice = (req: Request, res: Response): void => {
  try {
    const parsed = deviceCreateSchema.parse(req.body);
    const existing = telemetryStore.getDeviceById(parsed.deviceId);
    if (existing) {
      res.status(400).json({ success: false, message: `Device ID ${parsed.deviceId} already registered` });
      return;
    }
    const newDevice = telemetryStore.addDevice({
      ...parsed,
      jacketId: parsed.jacketId || undefined,
      assignedWorkerId: parsed.assignedWorkerId || undefined,
      macAddress: parsed.macAddress || `24:6F:28:${Math.random().toString(16).slice(2, 4).toUpperCase()}:${Math.random().toString(16).slice(2, 4).toUpperCase()}:${Math.random().toString(16).slice(2, 4).toUpperCase()}`,
      wifiRssi: -62,
      batteryVoltage: 4.10,
    });
    emitEvent('device_created', newDevice);
    res.status(201).json({ success: true, data: newDevice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
      return;
    }
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const updateDevice = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const updated = telemetryStore.updateDevice(id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: `Device ${id} not found` });
      return;
    }
    emitEvent('device_updated', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const deleteDevice = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const deleted = telemetryStore.deleteDevice(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: `Device ${id} not found` });
      return;
    }
    emitEvent('device_deleted', { deviceId: id });
    res.json({ success: true, message: `Device ${id} decommissioned successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getJackets = (req: Request, res: Response): void => {
  try {
    const jackets = telemetryStore.getJackets();
    res.json({ success: true, data: jackets });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const createJacket = (req: Request, res: Response): void => {
  try {
    const parsed = jacketCreateSchema.parse(req.body);
    const existing = telemetryStore.getJackets().find(j => j.jacketId === parsed.jacketId);
    if (existing) {
      res.status(400).json({ success: false, message: `Jacket ID ${parsed.jacketId} already registered` });
      return;
    }
    const newJacket = telemetryStore.addJacket({
      ...parsed,
      workerId: parsed.workerId || undefined,
      deviceId: parsed.deviceId || undefined
    });
    emitEvent('jacket_created', newJacket);
    res.status(201).json({ success: true, data: newJacket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
      return;
    }
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const deleteJacket = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const deleted = telemetryStore.deleteJacket(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: `Jacket ${id} not found` });
      return;
    }
    emitEvent('jacket_deleted', { jacketId: id });
    res.json({ success: true, message: `Jacket ${id} removed successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
