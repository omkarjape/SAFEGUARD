import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';
import { SafetyThresholds } from '../types';
import { emitEvent } from '../socket';

export const getSettings = (req: Request, res: Response): void => {
  try {
    const thresholds = telemetryStore.getThresholds();
    res.json({
      success: true,
      data: thresholds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve safety threshold settings',
      error: (error as Error).message
    });
  }
};

export const updateSettings = (req: Request, res: Response): void => {
  try {
    const updates: Partial<SafetyThresholds> = req.body;
    const updated = telemetryStore.updateThresholds(updates);
    emitEvent('thresholds_updated', updated);
    emitEvent('dashboard_summary', telemetryStore.getDashboardSummary());
    res.json({
      success: true,
      message: 'Safety thresholds updated and propagated to active IoT gateway',
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update safety threshold settings',
      error: (error as Error).message
    });
  }
};
