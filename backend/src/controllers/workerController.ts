import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';
import { z } from 'zod';
import { emitEvent } from '../socket';

const workerCreateSchema = z.object({
  workerId: z.string().min(2),
  name: z.string().min(2),
  department: z.string().min(2),
  designation: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  emergencyContact: z.string().min(5),
  shift: z.enum(['DAY', 'NIGHT', 'SWING']).optional(),
  bloodGroup: z.string().optional(),
  medicalNotes: z.string().optional(),
  safetyTrainingDate: z.string().optional(),
  status: z.enum(['SAFE', 'WARNING', 'CRITICAL', 'OFFLINE']).default('SAFE'),
  jacketId: z.string().optional().or(z.literal('')),
  deviceId: z.string().optional().or(z.literal('')),
});

export const getWorkers = (req: Request, res: Response): void => {
  try {
    const department = req.query.department as string | undefined;
    const search = req.query.search as string | undefined;
    let workers = telemetryStore.getWorkers();

    if (department && department !== 'ALL') {
      workers = workers.filter(w => w.department === department);
    }
    if (search) {
      const q = search.toLowerCase();
      workers = workers.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.workerId.toLowerCase().includes(q) ||
        w.department.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getWorkerById = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const worker = telemetryStore.getWorkerById(id);
    if (!worker) {
      res.status(404).json({ success: false, message: `Worker ${id} not found` });
      return;
    }
    const latestSensor = worker.deviceId ? telemetryStore.getLatestReading(worker.deviceId) : null;
    const alertHistory = telemetryStore.getAlertsForWorker(worker.workerId);

    res.json({
      success: true,
      data: {
        ...worker,
        latestSensor,
        alertHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const createWorker = (req: Request, res: Response): void => {
  try {
    const parsed = workerCreateSchema.parse(req.body);
    const existing = telemetryStore.getWorkerById(parsed.workerId);
    if (existing) {
      res.status(400).json({ success: false, message: `Worker ID ${parsed.workerId} already exists` });
      return;
    }
    const newWorker = telemetryStore.addWorker({
      ...parsed,
      jacketId: parsed.jacketId || undefined,
      deviceId: parsed.deviceId || undefined,
      email: parsed.email || undefined
    });

    if (newWorker.jacketId) {
      telemetryStore.pairJacketToWorker(newWorker.workerId, newWorker.jacketId);
    }

    emitEvent('worker_created', newWorker);
    res.status(201).json({ success: true, data: newWorker });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message, errors: error.errors });
      return;
    }
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const updateWorker = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const updated = telemetryStore.updateWorker(id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: `Worker ${id} not found` });
      return;
    }
    emitEvent('worker_updated', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const deleteWorker = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const deleted = telemetryStore.deleteWorker(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: `Worker ${id} not found` });
      return;
    }
    emitEvent('worker_deleted', { workerId: id });
    res.json({ success: true, message: `Worker ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const pairJacket = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const { jacketId } = req.body;
    if (!jacketId) {
      res.status(400).json({ success: false, message: 'jacketId is required' });
      return;
    }
    const result = telemetryStore.pairJacketToWorker(id, jacketId);
    if (!result) {
      res.status(404).json({ success: false, message: `Worker ${id} or Jacket ${jacketId} not found` });
      return;
    }
    emitEvent('worker_updated', result.worker);
    emitEvent('jacket_updated', result.jacket);
    if (result.device) emitEvent('device_updated', result.device);

    res.json({
      success: true,
      message: `Jacket ${jacketId} paired to worker ${id}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const unpairJacket = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const worker = telemetryStore.unpairJacketFromWorker(id);
    if (!worker) {
      res.status(404).json({ success: false, message: `Worker ${id} not found` });
      return;
    }
    emitEvent('worker_updated', worker);
    res.json({
      success: true,
      message: `Safety jacket unassigned from worker ${id}`,
      data: worker
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
