import rateLimit from 'express-rate-limit';

// Standard rate limiter for general web dashboard endpoints
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again after 15 minutes.'
    }
  }
});

// High-throughput limiter for IoT sensor payload ingestion
export const sensorIngestionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 telemetry packets per minute per device/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TELEMETRY_RATE_EXCEEDED',
      message: 'Sensor ingestion rate exceeded. Check ESP32 transmission interval.'
    }
  }
});
