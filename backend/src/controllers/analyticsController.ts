import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';

export const getAnalyticsSummary = (req: Request, res: Response): void => {
  try {
    const summary = telemetryStore.getAnalyticsSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getZoneHeatmap = (req: Request, res: Response): void => {
  try {
    const zones = telemetryStore.getZoneStats();
    res.json({ success: true, data: zones });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getShiftAnalytics = (req: Request, res: Response): void => {
  try {
    const shifts = telemetryStore.getShiftStats();
    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getWorkerRiskScores = (req: Request, res: Response): void => {
  try {
    const profiles = telemetryStore.getWorkerRiskProfiles();
    res.json({ success: true, data: profiles });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
