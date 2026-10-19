import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';

export const getLocations = (req: Request, res: Response): void => {
  try {
    const locations = telemetryStore.getLocations();
    res.json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getWorkerLocation = (req: Request, res: Response): void => {
  try {
    const workerId = req.params.workerId as string;
    const locations = telemetryStore.getLocations();
    const workerLoc = locations.find(l => l.workerId === workerId);
    if (!workerLoc) {
      res.status(404).json({ success: false, message: `Location not found for worker ${workerId}` });
      return;
    }
    res.json({ success: true, data: workerLoc });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
