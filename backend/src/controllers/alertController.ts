import { Request, Response } from 'express';
import { telemetryStore } from '../services/telemetryStore';
import { emitEvent } from '../socket';

export const getAlerts = (req: Request, res: Response): void => {
  try {
    const status = req.query.status as string | undefined;
    const severity = req.query.severity as string | undefined;
    const alerts = telemetryStore.getAlerts(status, severity);
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const createAlert = (req: Request, res: Response): void => {
  try {
    const newAlert = telemetryStore.createAlert(req.body);
    if (newAlert) {
      emitEvent('alert_triggered', newAlert);
      res.status(201).json({ success: true, data: newAlert });
    } else {
      res.status(200).json({ success: true, message: 'Alert already active', data: null });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};


export const acknowledgeAlert = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const operatorName = (req.body && req.body.operatorName) ? req.body.operatorName : undefined;
    const alert = telemetryStore.acknowledgeAlert(id, operatorName);
    if (!alert) {
      res.status(404).json({ success: false, message: `Alert ${id} not found` });
      return;
    }
    emitEvent('alert_updated', alert);
    emitEvent('dashboard_summary', telemetryStore.getDashboardSummary());
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const resolveAlert = (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const { operatorName, resolutionNotes, rootCause } = req.body || {};
    const alert = telemetryStore.resolveAlert(id, operatorName, resolutionNotes, rootCause);
    if (!alert) {
      res.status(404).json({ success: false, message: `Alert ${id} not found` });
      return;
    }
    emitEvent('alert_updated', alert);
    emitEvent('dashboard_summary', telemetryStore.getDashboardSummary());
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const clearAlerts = (req: Request, res: Response): void => {
  try {
    telemetryStore.clearAllAlerts();
    emitEvent('alert_updated', { cleared: true });
    emitEvent('alerts_cleared', {});
    emitEvent('dashboard_summary', telemetryStore.getDashboardSummary());
    res.json({ success: true, message: 'All alerts cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

