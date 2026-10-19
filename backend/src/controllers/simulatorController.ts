import { Request, Response } from 'express';
import { iotSimulator } from '../services/iotSimulator';
import { SimulationScenario, PlantScenario, ManualSensorOverride } from '../types';

export const getSimulatorStatus = (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: iotSimulator.getStatus()
  });
};

export const setWorkerScenario = (req: Request, res: Response): void => {
  const { workerId = 'W001', scenario } = req.body;
  if (!scenario) {
    res.status(400).json({
      success: false,
      message: 'scenario is required'
    });
    return;
  }

  iotSimulator.setWorkerScenario(workerId as string, scenario as SimulationScenario);
  res.json({
    success: true,
    message: `Scenario ${scenario} applied to worker ${workerId}`,
    data: iotSimulator.getStatus()
  });
};

// Backward compatibility alias for /api/simulator/trigger
export const triggerScenario = setWorkerScenario;


export const setPlantScenario = (req: Request, res: Response): void => {
  const { scenario } = req.body;
  if (!scenario) {
    res.status(400).json({
      success: false,
      message: 'scenario is required'
    });
    return;
  }

  iotSimulator.setPlantScenario(scenario as PlantScenario);
  res.json({
    success: true,
    message: `Plant scenario ${scenario} applied`,
    data: iotSimulator.getStatus()
  });
};

export const setManualOverride = (req: Request, res: Response): void => {
  const { workerId, override } = req.body;
  if (!workerId || !override) {
    res.status(400).json({
      success: false,
      message: 'workerId and override object are required'
    });
    return;
  }

  iotSimulator.setManualOverride(workerId as string, override as ManualSensorOverride);
  res.json({
    success: true,
    message: `Manual override applied to worker ${workerId}`,
    data: iotSimulator.getStatus()
  });
};

export const clearWorkerOverride = (req: Request, res: Response): void => {
  const workerId = (req.params.workerId || req.body.workerId) as string;
  if (!workerId) {
    res.status(400).json({
      success: false,
      message: 'workerId is required'
    });
    return;
  }

  iotSimulator.clearWorkerOverride(workerId);
  res.json({
    success: true,
    message: `Manual override cleared for worker ${workerId}`,
    data: iotSimulator.getStatus()
  });
};

export const configureEngine = (req: Request, res: Response): void => {
  const { intervalMs, isRunning } = req.body;

  if (typeof intervalMs === 'number' && intervalMs >= 500 && intervalMs <= 10000) {
    iotSimulator.setIntervalMs(intervalMs);
  }

  if (typeof isRunning === 'boolean') {
    if (isRunning) {
      iotSimulator.start(typeof intervalMs === 'number' ? intervalMs : undefined);
    } else {
      iotSimulator.stop();
    }
  }

  res.json({
    success: true,
    message: 'Simulator engine configured',
    data: iotSimulator.getStatus()
  });
};

export const resetAll = (req: Request, res: Response): void => {
  iotSimulator.resetAll();
  res.json({
    success: true,
    message: 'Plant safety reset to SAFE baseline for all workers',
    data: iotSimulator.getStatus()
  });
};
