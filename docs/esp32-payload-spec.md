# ESP32 Wearable Smart Safety Jacket Payload Specification

This document defines the exact HTTP REST JSON payload structure transmitted by the ESP32 microcontroller to the backend IoT Gateway.

## Ingestion Endpoint

- **Method**: `POST`
- **Path**: `/api/sensor-data`
- **Content-Type**: `application/json`

## Payload JSON Schema

```json
{
  "deviceId": "ESP32_001",
  "jacketId": "SJ001",
  "workerId": "W001",
  "temperature": 28.4,
  "humidity": 61.2,
  "gasLevel": 320,
  "airQuality": 410,
  "flameDetected": false,
  "fallDetected": false,
  "sosPressed": false,
  "battery": 87,
  "latitude": 19.766020,
  "longitude": 74.477040,
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```

## Field Definitions

| Field | Type | Unit / Description | Hardware Source |
| :--- | :--- | :--- | :--- |
| `deviceId` | string | Unique hardware ID | ESP32 MAC / Chip ID (`ESP32_001`) |
| `jacketId` | string | Assigned smart safety vest | Barcode / Config (`SJ001`) |
| `workerId` | string | Enrolled worker identifier | Assigned Employee (`W001`) |
| `temperature` | float | Ambient temperature (°C) | DHT22 / AM2302 Sensor |
| `humidity` | float | Relative humidity (% RH) | DHT22 / AM2302 Sensor |
| `gasLevel` | integer | Combustible/Smoke gas (ppm) | MQ-2 Gas Sensor Analog/ADC |
| `airQuality` | integer | Air quality index / harmful gases | MQ-135 Sensor Analog/ADC |
| `flameDetected` | boolean | Infrared flame trigger (`true`/`false`) | Optical IR Flame Sensor Digital Pin |
| `fallDetected` | boolean | Sudden fall / impact event | MPU6050 Accelerometer + Gyroscope |
| `sosPressed` | boolean | Emergency SOS hardware button | Tactile Pushbutton (GPIO interrupt) |
| `battery` | integer | Remaining battery percentage (0-100%) | LiPo Voltage Divider ADC |
| `latitude` | float | Decimal GPS latitude | NEO-6M GPS Module (UART) |
| `longitude` | float | Decimal GPS longitude | NEO-6M GPS Module (UART) |
| `timestamp` | string | ISO 8601 UTC timestamp | ESP32 SNTP / RTC Clock |

## Threshold Evaluation Rules

| Condition | Evaluated Severity | Generated Alert |
| :--- | :--- | :--- |
| `flameDetected == true` | **CRITICAL** | `FLAME_DETECTED` |
| `fallDetected == true` | **CRITICAL** | `FALL_DETECTED` |
| `sosPressed == true` | **CRITICAL** | `SOS_PRESSED` |
| `gasLevel > 450 ppm` | **CRITICAL** | `HIGH_GAS` |
| `temperature > 42.0°C` | **CRITICAL** | `HIGH_TEMPERATURE` |
| `gasLevel > 280 ppm` | **WARNING** | `HIGH_GAS` |
| `temperature > 35.0°C` | **WARNING** | `HIGH_TEMPERATURE` |
| `airQuality > 200 AQI` | **WARNING** | `POOR_AIR_QUALITY` |
| `battery < 15%` | **WARNING** | `LOW_BATTERY` |
| No heartbeat > 120s | **CRITICAL** | `DEVICE_OFFLINE` |
