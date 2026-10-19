import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec, getPostmanCollection } from '../docs/openapi';
import { validateRequest } from '../middleware/validate';
import { getDbStatus } from '../db/prisma';

import {
  createWorkerSchema,
  updateWorkerSchema,
  pairJacketSchema,
  createDeviceSchema,
  updateDeviceSchema,
  createJacketSchema,
  sensorDataSchema,
  createAlertSchema,
  acknowledgeAlertSchema,
  resolveAlertSchema,
  createGeoFenceSchema,
  updateGeoFenceSchema,
  simulatorScenarioSchema,
  simulatorPlantScenarioSchema,
  simulatorOverrideSchema,
  simulatorConfigureSchema,
  updateSettingsSchema
} from '../schemas';


import { getDashboardSummary } from '../controllers/dashboardController';
import {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  pairJacket,
  unpairJacket
} from '../controllers/workerController';
import {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  getJackets,
  createJacket,
  deleteJacket
} from '../controllers/deviceController';
import {
  postSensorData,
  getSensorDataByDeviceId,
  getLatestSensorData
} from '../controllers/sensorController';
import {
  getAlerts,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  clearAlerts
} from '../controllers/alertController';
import { getLocations, getWorkerLocation } from '../controllers/locationController';
import {
  getGeofences,
  getGeofenceById,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  getTrajectories,
  simulateBreach
} from '../controllers/geofenceController';
import {
  triggerScenario,
  getSimulatorStatus,
  setWorkerScenario,
  setPlantScenario,
  setManualOverride,
  clearWorkerOverride,
  configureEngine,
  resetAll
} from '../controllers/simulatorController';
import {
  getAnalyticsSummary,
  getZoneHeatmap,
  getShiftAnalytics,
  getWorkerRiskScores
} from '../controllers/analyticsController';
import { getSettings, updateSettings } from '../controllers/settingsController';


const router = Router();

// ==========================================
// Interactive API Documentation & Specs
// ==========================================
router.get('/docs/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

router.get('/docs/postman.json', (req: Request, res: Response) => {
  res.json(getPostmanCollection());
});

router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'SAFEGUARD: Industrial IoT API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true
    }
  })
);

// ==========================================
// Health & System Status
// ==========================================
router.get('/health', async (req: Request, res: Response) => {
  const dbStatus = getDbStatus();
  res.json({
    status: 'HEALTHY',
    service: 'Smart Industrial Worker Safety IoT Gateway',
    database: {
      connected: dbStatus.isConnected,
      mode: dbStatus.mode,
      lastChecked: dbStatus.lastChecked
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


router.get('/dashboard/summary', getDashboardSummary);

// ==========================================
// Workforce Management Endpoints
// ==========================================
router.get('/workers', getWorkers);
router.get('/workers/:id', getWorkerById);
router.post('/workers', validateRequest({ body: createWorkerSchema }), createWorker);
router.put('/workers/:id', validateRequest({ body: updateWorkerSchema }), updateWorker);
router.delete('/workers/:id', deleteWorker);
router.post('/workers/:id/pair-jacket', validateRequest({ body: pairJacketSchema }), pairJacket);
router.post('/workers/:id/unpair-jacket', unpairJacket);

// ==========================================
// Devices & Hardware Fleet
// ==========================================
router.get('/devices', getDevices);
router.get('/devices/:id', getDeviceById);
router.post('/devices', validateRequest({ body: createDeviceSchema }), createDevice);
router.put('/devices/:id', validateRequest({ body: updateDeviceSchema }), updateDevice);
router.delete('/devices/:id', deleteDevice);
router.get('/jackets', getJackets);
router.post('/jackets', validateRequest({ body: createJacketSchema }), createJacket);
router.delete('/jackets/:id', deleteJacket);

// ==========================================
// Sensor Telemetry (ESP32 Ingestion & History)
// ==========================================
router.post('/sensor-data', validateRequest({ body: sensorDataSchema }), postSensorData);
router.get('/sensor-data/:deviceId', getSensorDataByDeviceId);
router.get('/sensor-data/:deviceId/latest', getLatestSensorData);

// ==========================================
// Safety Alerts & Escalation
// ==========================================
router.get('/alerts', getAlerts);
router.post('/alerts', validateRequest({ body: createAlertSchema }), createAlert);
router.post('/alerts/clear', clearAlerts);
router.delete('/alerts', clearAlerts);
router.patch('/alerts/:id/acknowledge', validateRequest({ body: acknowledgeAlertSchema }), acknowledgeAlert);
router.patch('/alerts/:id/resolve', validateRequest({ body: resolveAlertSchema }), resolveAlert);

// ==========================================
// GPS & Location Tracking & Trajectories
// ==========================================
router.get('/locations', getLocations);
router.get('/locations/trajectories', getTrajectories);
router.get('/locations/:workerId/latest', getWorkerLocation);

// ==========================================
// Geo-Fencing & Exclusion Hazard Zones
// ==========================================
router.get('/geofences', getGeofences);
router.get('/geofences/:id', getGeofenceById);
router.post('/geofences', validateRequest({ body: createGeoFenceSchema }), createGeofence);
router.put('/geofences/:id', validateRequest({ body: updateGeoFenceSchema }), updateGeofence);
router.delete('/geofences/:id', deleteGeofence);
router.post('/geofences/simulate-breach', simulateBreach);


// ==========================================
// Physics Simulator & Telemetry Lab
// ==========================================
router.get('/simulator/status', getSimulatorStatus);
router.post('/simulator/trigger', triggerScenario);
router.post('/simulator/scenario', validateRequest({ body: simulatorScenarioSchema }), setWorkerScenario);
router.post('/simulator/plant-scenario', validateRequest({ body: simulatorPlantScenarioSchema }), setPlantScenario);
router.post('/simulator/override', validateRequest({ body: simulatorOverrideSchema }), setManualOverride);
router.delete('/simulator/override/:workerId', clearWorkerOverride);
router.post('/simulator/configure', validateRequest({ body: simulatorConfigureSchema }), configureEngine);
router.post('/simulator/reset', resetAll);

// ==========================================
// Analytics, Historical Reporting & Heatmaps
// ==========================================
router.get('/analytics/summary', getAnalyticsSummary);
router.get('/analytics/zones', getZoneHeatmap);
router.get('/analytics/shifts', getShiftAnalytics);
router.get('/analytics/risk-scores', getWorkerRiskScores);

// ==========================================
// System Thresholds & Safety Gateway Settings
// ==========================================
router.get('/settings', getSettings);
router.put('/settings', validateRequest({ body: updateSettingsSchema }), updateSettings);
router.post('/settings', validateRequest({ body: updateSettingsSchema }), updateSettings);

export default router;

