import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately before all other module imports
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to local .env if present

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { standardLimiter, sensorIngestionLimiter } from './middleware/rateLimiter';
import { initSocketIO, emitEvent } from './socket';
import { iotSimulator } from './services/iotSimulator';
import { telemetryStore } from './services/telemetryStore';
import { checkDatabaseConnection, getDbStatus } from './db/prisma';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Security Headers (Helmet with relaxed CSP for Swagger UI rendering)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Rate Limiters
app.use('/api/sensor-data', sensorIngestionLimiter);
app.use('/api', standardLimiter);

// Mount API Routes
app.use('/api', apiRoutes);

// Catch-all 404 handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const SIMULATOR_ENABLED = process.env.SIMULATOR_ENABLED === 'true';
const SIMULATOR_INTERVAL_MS = parseInt(process.env.SIMULATOR_INTERVAL_MS || '3000');

server.listen(PORT, async () => {
  const dbConnected = await checkDatabaseConnection();
  const dbStatus = getDbStatus();

  console.log('================================================================');
  console.log('  SAFEGUARD: Smart Industrial Worker Safety Platform');
  console.log(`  Backend Gateway running on: http://localhost:${PORT}`);
  console.log(`  Health Check:               http://localhost:${PORT}/api/health`);
  console.log(`  Interactive Swagger Docs:   http://localhost:${PORT}/api/docs`);
  console.log(`  Postman Collection:         http://localhost:${PORT}/api/docs/postman.json`);
  console.log(`  Raw OpenAPI 3.0 Spec:       http://localhost:${PORT}/api/docs/openapi.json`);
  console.log(`  Database Storage Mode:      ${dbConnected ? 'PostgreSQL [ONLINE]' : 'Resilient In-Memory Mode [ACTIVE]'}`);
  console.log('================================================================');

  // Check database periodically
  setInterval(async () => {
    await checkDatabaseConnection();
  }, 60000);

  // Automated Hardware Watchdog: Detects when safety jacket is powered off or disconnected
  const offlineThreshold = parseInt(process.env.DEVICE_OFFLINE_THRESHOLD_MS || '8000');
  setInterval(() => {
    const result = telemetryStore.checkOfflineDevices(offlineThreshold);
    if (result.offlineCount > 0) {
      emitEvent('dashboard_summary', telemetryStore.getDashboardSummary());
      for (const devId of result.affectedDevices) {
        emitEvent('device_status_update', {
          deviceId: devId,
          status: 'OFFLINE'
        });
      }
      for (const wId of result.affectedWorkers) {
        emitEvent('worker_status_update', {
          workerId: wId,
          status: 'OFFLINE',
          lastSeen: new Date().toISOString()
        });
      }
      const activeAlerts = telemetryStore.getAlerts('ACTIVE');
      const latestOfflineAlert = activeAlerts.find(a => a.type === 'DEVICE_OFFLINE');
      if (latestOfflineAlert) {
        emitEvent('alert_triggered', latestOfflineAlert);
      }
    }
  }, 2000);

  if (SIMULATOR_ENABLED) {
    iotSimulator.start(SIMULATOR_INTERVAL_MS);
  }
});

export { app, server };

