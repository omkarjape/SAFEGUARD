import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';

export const getDashboardSummary = (req: Request, res: Response): void => {
  try {
    const summary = telemetryStore.getDashboardSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard summary',
      error: (error as Error).message
    });
  }
};
