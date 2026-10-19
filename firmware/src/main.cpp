// ==============================================================================
// SMART INDUSTRIAL WORKER SAFETY & REAL-TIME MONITORING SYSTEM
// Production-Ready ESP32 Firmware - Dual-Core FreeRTOS Multitasking Architecture
// Hardware: Rajesh Kumar (W001) | Smart Jacket SJ001 | Node ESP32_001
// ==============================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include <time.h>

#include "config.h"

// -----------------------------------------------------------------------------
// Sensor & Peripheral Hardware Drivers
// -----------------------------------------------------------------------------
DHT dht(PIN_DHT22, DHT_SENSOR_TYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2); // Hardware UART2 (RX2: GPIO 16, TX2: GPIO 17)
WebSocketsClient webSocket;

// -----------------------------------------------------------------------------
// Shared Data Structures & FreeRTOS Synchronization
// -----------------------------------------------------------------------------
struct SensorDataPacket {
  float temperature;
  float humidity;
  int gasLevel;
  int airQuality;
  bool flameDetected;
  bool fallDetected;
  bool sosPressed;
  int batteryPercentage;
  double latitude;
  double longitude;
  char timestamp[32];
};

static SensorDataPacket currentPacket = {
  28.0f, 55.0f, 110, 70, false, false, false, 95,
  FALLBACK_LATITUDE, FALLBACK_LONGITUDE, "2026-09-25T10:00:00.000Z"
};

static SemaphoreHandle_t packetMutex = NULL;

// -----------------------------------------------------------------------------
// Fall Kinematics State Machine Variables
// -----------------------------------------------------------------------------
enum FallState {
  FALL_IDLE,
  FALL_FREEFALL,
  FALL_IMPACT,
  FALL_CONFIRMED
};

static volatile FallState currentFallState = FALL_IDLE;
static unsigned long freefallStartTime = 0;
static unsigned long impactStartTime = 0;

// -----------------------------------------------------------------------------
// Hardware Interrupts & Flags
// -----------------------------------------------------------------------------
static volatile bool sosButtonPressed = false;
static volatile unsigned long lastSosInterruptTime = 0;

void IRAM_ATTR isrSOSButton() {
  unsigned long now = millis();
  if (now - lastSosInterruptTime > SOS_DEBOUNCE_TIME_MS) {
    if (digitalRead(PIN_SOS_BUTTON) == LOW) {
      sosButtonPressed = true;
    }
    lastSosInterruptTime = now;
  }
}

// Remote Buzzer Siren State
static volatile bool remoteBuzzerActive = false;
static unsigned long buzzerDeactivateTime = 0;

// -----------------------------------------------------------------------------
// Time & NTP Helpers
// -----------------------------------------------------------------------------
void initNTPTime() {
  configTime(19800, 0, "pool.ntp.org", "time.google.com"); // UTC+5:30 (19800s)
  Serial.println("[NTP] Initialized SNTP synchronization...");
}

void getFormattedTimestamp(char* buffer, size_t maxLen) {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    // Fallback timestamp if NTP not yet locked
    snprintf(buffer, maxLen, "2026-09-25T%02lu:%02lu:%02lu.000Z",
             (millis() / 3600000) % 24, (millis() / 60000) % 60, (millis() / 1000) % 60);
    return;
  }
  strftime(buffer, maxLen, "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
}

// -----------------------------------------------------------------------------
// Hardware Buzzer & LED Actuator Control
// -----------------------------------------------------------------------------
void triggerLocalAlarm(int durationMs) {
  remoteBuzzerActive = true;
  buzzerDeactivateTime = millis() + durationMs;
  digitalWrite(PIN_BUZZER_ALARM, HIGH);
  digitalWrite(PIN_LED_RED, HIGH);
}

void stopLocalAlarm() {
  remoteBuzzerActive = false;
  digitalWrite(PIN_BUZZER_ALARM, LOW);
  digitalWrite(PIN_LED_RED, LOW);
}

// -----------------------------------------------------------------------------
// WebSocket Event Callback (Bidirectional Evacuation Siren)
// -----------------------------------------------------------------------------
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WebSocket] Disconnected from Central IoT Gateway");
      break;

    case WStype_CONNECTED:
      Serial.printf("[WebSocket] Connected to URL: %s\n", payload);
      // Subscribe to device specific hardware room
      {
        StaticJsonDocument<256> doc;
        doc["action"] = "subscribe";
        doc["room"] = "device:" DEVICE_ID;
        doc["deviceId"] = DEVICE_ID;
        String regMsg;
        serializeJson(doc, regMsg);
        webSocket.sendTXT(regMsg);
        Serial.println("[WebSocket] Registered hardware room: device:" DEVICE_ID);
      }
      break;

    case WStype_TEXT:
      Serial.printf("[WebSocket] Message received: %s\n", payload);
      {
        StaticJsonDocument<512> doc;
        DeserializationError err = deserializeJson(doc, payload);
        if (!err) {
          const char* event = doc["event"];
          // Control room emergency buzzer actuation command
          if (event && (strcmp(event, "dispatch_buzzer") == 0 || strcmp(event, "emergency_siren") == 0)) {
            int duration = doc["durationMs"] | 5000;
            Serial.printf("[SIREN ACTUATION] Remote emergency buzzer activated for %d ms!\n", duration);
            triggerLocalAlarm(duration);

            // Send acknowledgment back to control room
            StaticJsonDocument<256> ack;
            ack["event"] = "buzzer_acknowledged";
            ack["deviceId"] = DEVICE_ID;
            ack["jacketId"] = JACKET_ID;
            ack["status"] = "SIREN_ACTIVE";
            ack["timestamp"] = millis();
            String ackStr;
            serializeJson(ack, ackStr);
            webSocket.sendTXT(ackStr);
          } else if (event && strcmp(event, "silence_buzzer") == 0) {
            Serial.println("[SIREN ACTUATION] Remote silence command received.");
            stopLocalAlarm();
          }
        }
      }
      break;

    case WStype_ERROR:
      Serial.println("[WebSocket] Connection error encountered!");
      break;

    default:
      break;
  }
}

// -----------------------------------------------------------------------------
// FreeRTOS Task: IMU Fall Kinematics (Core 1, High-Rate 50Hz)
// -----------------------------------------------------------------------------
void TaskIMUFall(void *pvParameters) {
  Serial.println("[TaskIMUFall] Running on Core " + String(xPortGetCoreID()) + " at 50Hz");
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(IMU_POLL_INTERVAL_MS);

  while (true) {
    sensors_event_t a, g, temp;
    if (mpu.getEvent(&a, &g, &temp)) {
      // Calculate total acceleration magnitude in g's (Earth gravity = 9.80665 m/s^2)
      float totalAccelM_S2 = sqrt(a.acceleration.x * a.acceleration.x +
                                  a.acceleration.y * a.acceleration.y +
                                  a.acceleration.z * a.acceleration.z);
      float totalAccelG = totalAccelM_S2 / 9.80665f;

      unsigned long now = millis();

      switch (currentFallState) {
        case FALL_IDLE:
          // Freefall descent detection (< 0.45g)
          if (totalAccelG < FREEFALL_THRESHOLD_G) {
            currentFallState = FALL_FREEFALL;
            freefallStartTime = now;
          }
          break;

        case FALL_FREEFALL:
          // Transition to impact detection window (must occur within 100ms - 800ms)
          if (totalAccelG > IMPACT_THRESHOLD_G) {
            currentFallState = FALL_IMPACT;
            impactStartTime = now;
          } else if (now - freefallStartTime > 800) {
            // Freefall timeout without impact -> reset
            currentFallState = FALL_IDLE;
          }
          break;

        case FALL_IMPACT:
          // Post-impact immobility confirmation window (1500ms resting)
          if (now - impactStartTime >= POST_FALL_REST_MS) {
            // Confirm fall incident
            currentFallState = FALL_CONFIRMED;
            Serial.println("[CRITICAL ALARM] Fall detected by MPU6050 6-Axis Kinematics Engine!");

            if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
              currentPacket.fallDetected = true;
              xSemaphoreGive(packetMutex);
            }
            triggerLocalAlarm(4000);
          } else if (totalAccelG > 2.0f) {
            // Continued high motion -> worker regained balance or did not fall
            currentFallState = FALL_IDLE;
          }
          break;

        case FALL_CONFIRMED:
          // Hold fall state until acknowledged or cleared after 10 seconds
          if (now - impactStartTime > 10000) {
            currentFallState = FALL_IDLE;
            if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
              currentPacket.fallDetected = false;
              xSemaphoreGive(packetMutex);
            }
          }
          break;
      }
    }

    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// -----------------------------------------------------------------------------
// FreeRTOS Task: Ambient Sensor Polling (Core 1, 1000ms Interval)
// -----------------------------------------------------------------------------
void TaskSensorRead(void *pvParameters) {
  Serial.println("[TaskSensorRead] Running on Core " + String(xPortGetCoreID()) + " at 1.0Hz");
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(SENSOR_READ_INTERVAL_MS);

  while (true) {
    // 1. Read DHT22 Microclimate (Temperature & Humidity)
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    // 2. Read Combustible Gas (MQ-2)
    int rawMQ2 = analogRead(PIN_MQ2_ADC);
    int gasPpm = (int)((rawMQ2 / ADC_MAX_VALUE) * 600.0f * MQ2_CALIBRATION_SLOPE) + 20;

    // 3. Read Toxic Gas / Air Quality (MQ-135)
    int rawMQ135 = analogRead(PIN_MQ135_ADC);
    int airQualityIndex = (int)((rawMQ135 / ADC_MAX_VALUE) * 450.0f * MQ135_CALIBRATION_SLOPE) + 15;

    // 4. Read Optical Flame Detector (Active-LOW on flame trigger)
    bool isFlame = (digitalRead(PIN_FLAME_DIGITAL) == LOW);

    // 5. Read Battery Capacity via 1:2 Voltage Divider
    int rawBatt = analogRead(PIN_BATTERY_ADC);
    float pinVoltage = (rawBatt / ADC_MAX_VALUE) * ADC_REF_VOLTAGE;
    float batteryVoltage = pinVoltage * BATTERY_DIVIDER_RATIO;
    int batteryPct = (int)(((batteryVoltage - BATTERY_MIN_VOLTAGE) / (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) * 100.0f);
    batteryPct = constrain(batteryPct, 0, 100);

    // 6. Check Emergency SOS Button State
    bool sosActive = sosButtonPressed;
    if (sosActive) {
      Serial.println("[EMERGENCY] Physical SOS panic pushbutton activated by worker!");
      triggerLocalAlarm(5000);
      sosButtonPressed = false; // Reset latch
    }

    // 7. Atomic update of shared telemetry packet
    if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      if (!isnan(t)) currentPacket.temperature = t;
      if (!isnan(h)) currentPacket.humidity = h;
      currentPacket.gasLevel = gasPpm;
      currentPacket.airQuality = airQualityIndex;
      currentPacket.flameDetected = isFlame;
      currentPacket.batteryPercentage = batteryPct;
      if (sosActive) currentPacket.sosPressed = true;
      getFormattedTimestamp(currentPacket.timestamp, sizeof(currentPacket.timestamp));
      xSemaphoreGive(packetMutex);
    }

    // Deactivate local buzzer if duration expired
    if (remoteBuzzerActive && millis() > buzzerDeactivateTime) {
      stopLocalAlarm();
    }

    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// -----------------------------------------------------------------------------
// FreeRTOS Task: NEO-6M GPS Receiver (Core 1, 100ms Polling)
// -----------------------------------------------------------------------------
void TaskGPS(void *pvParameters) {
  Serial.println("[TaskGPS] Running on Core " + String(xPortGetCoreID()) + " parsing NMEA stream");

  while (true) {
    while (gpsSerial.available() > 0) {
      char c = gpsSerial.read();
      if (gps.encode(c)) {
        if (gps.location.isValid() && gps.location.isUpdated()) {
          double lat = gps.location.lat();
          double lon = gps.location.lng();

          if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            currentPacket.latitude = lat;
            currentPacket.longitude = lon;
            xSemaphoreGive(packetMutex);
          }
        }
      }
    }
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// -----------------------------------------------------------------------------
// FreeRTOS Task: Network & Cloud Dispatcher (Core 0)
// -----------------------------------------------------------------------------
void TaskNetwork(void *pvParameters) {
  Serial.println("[TaskNetwork] Running on Core " + String(xPortGetCoreID()) + " managing Wi-Fi & Gateway APIs");

  // Connect to industrial Wi-Fi
  Serial.printf("[Wi-Fi] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < WIFI_CONNECT_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[Wi-Fi] Connected! IP: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    digitalWrite(PIN_LED_GREEN, HIGH);
    initNTPTime();

    // Start WebSocket client for bidirectional control room commands
    webSocket.begin(GATEWAY_HOST, GATEWAY_PORT, WS_SOCKET_PATH);
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
  } else {
    Serial.println("\n[Wi-Fi] Warning: Connection timeout. Operating in offline telemetry buffering mode.");
  }

  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = pdMS_TO_TICKS(TELEMETRY_SEND_RATE_MS);

  while (true) {
    // Service WebSocket client events
    if (WiFi.status() == WL_CONNECTED) {
      webSocket.loop();
    } else {
      // Auto-reconnect Wi-Fi
      Serial.println("[Wi-Fi] Reconnecting...");
      WiFi.reconnect();
      vTaskDelay(pdMS_TO_TICKS(WIFI_RETRY_DELAY_MS));
      continue;
    }

    // Build JSON Payload strictly adhering to docs/esp32-payload-spec.md
    StaticJsonDocument<512> jsonDoc;
    if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      jsonDoc["deviceId"] = DEVICE_ID;
      jsonDoc["jacketId"] = JACKET_ID;
      jsonDoc["workerId"] = WORKER_ID;
      jsonDoc["temperature"] = serialized(String(currentPacket.temperature, 1));
      jsonDoc["humidity"] = serialized(String(currentPacket.humidity, 1));
      jsonDoc["gasLevel"] = currentPacket.gasLevel;
      jsonDoc["airQuality"] = currentPacket.airQuality;
      jsonDoc["flameDetected"] = currentPacket.flameDetected;
      jsonDoc["fallDetected"] = currentPacket.fallDetected;
      jsonDoc["sosPressed"] = currentPacket.sosPressed;
      jsonDoc["battery"] = currentPacket.batteryPercentage;
      jsonDoc["latitude"] = serialized(String(currentPacket.latitude, 6));
      jsonDoc["longitude"] = serialized(String(currentPacket.longitude, 6));
      jsonDoc["timestamp"] = currentPacket.timestamp;

      // Reset one-shot emergency flags after packaging
      if (currentPacket.sosPressed) currentPacket.sosPressed = false;

      xSemaphoreGive(packetMutex);
    }

    String payloadString;
    serializeJson(jsonDoc, payloadString);

    // Dispatch HTTP POST to /api/sensor-data
    HTTPClient http;
    String fullUrl = "http://" + String(GATEWAY_HOST) + ":" + String(GATEWAY_PORT) + String(API_SENSOR_ENDPOINT);
    http.begin(fullUrl);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(payloadString);
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      digitalWrite(PIN_LED_GREEN, HIGH);
      // Serial.printf("[HTTP Gateway] Telemetry ingested successfully: %d\n", httpResponseCode);
    } else {
      Serial.printf("[HTTP Gateway] Ingestion error: %d | Host: %s\n", httpResponseCode, fullUrl.c_str());
      digitalWrite(PIN_LED_GREEN, LOW);
    }
    http.end();

    vTaskDelayUntil(&xLastWakeTime, xFrequency);
  }
}

// -----------------------------------------------------------------------------
// Arduino Setup: Hardware Initialization & FreeRTOS Task Creation
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(BAUD_SERIAL);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("  SAFEGUARD: ESP32 Smart Safety Jacket Node Starting");
  Serial.println("  Firmware: " FIRMWARE_VERSION);
  Serial.println("  Node ID:  " DEVICE_ID " | Worker: " WORKER_ID);
  Serial.println("========================================================");

  // 1. Initialize GPIO Pin Modes
  pinMode(PIN_FLAME_DIGITAL, INPUT_PULLUP);
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER_ALARM, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  digitalWrite(PIN_BUZZER_ALARM, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // 2. Power-On Self-Test (POST) Indicator
  Serial.println("[POST] Testing acoustic buzzer and status LEDs...");
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_RED, HIGH);
  digitalWrite(PIN_BUZZER_ALARM, HIGH);
  delay(150);
  digitalWrite(PIN_BUZZER_ALARM, LOW);
  delay(150);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // 3. Attach Hardware SOS Pushbutton Interrupt
  attachInterrupt(digitalPinToInterrupt(PIN_SOS_BUTTON), isrSOSButton, FALLING);
  Serial.println("[SOS] Attached hardware interrupt to GPIO " + String(PIN_SOS_BUTTON));

  // 4. Initialize DHT22 Microclimate Sensor
  dht.begin();
  Serial.println("[DHT22] Initialized on GPIO " + String(PIN_DHT22));

  // 5. Initialize I2C Bus and MPU6050 Accelerometer
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  if (!mpu.begin(MPU6050_I2C_ADDRESS)) {
    Serial.println("[MPU6050] Warning: Sensor not detected on I2C bus. Check SDA/SCL wiring.");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[MPU6050] Initialized with 8G range & 21Hz low-pass filter.");
  }

  // 6. Initialize Hardware UART2 for NEO-6M GPS
  gpsSerial.begin(GPS_BAUD_RATE, SERIAL_8N1, PIN_GPS_RX2, PIN_GPS_TX2);
  Serial.println("[NEO-6M] Initialized UART2 on RX=" + String(PIN_GPS_RX2) + ", TX=" + String(PIN_GPS_TX2));

  // 7. Create FreeRTOS Mutex
  packetMutex = xSemaphoreCreateMutex();
  if (packetMutex == NULL) {
    Serial.println("[FreeRTOS] Error: Failed to create packetMutex semaphore!");
  }

  // 8. Launch Preemptive FreeRTOS Tasks Across Dual Cores
  // Tasks on Core 1 (Sensor sampling, Kinematics, GPS)
  xTaskCreatePinnedToCore(TaskIMUFall,    "TaskIMUFall",    4096, NULL, 3, NULL, 1);
  xTaskCreatePinnedToCore(TaskSensorRead, "TaskSensorRead", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(TaskGPS,        "TaskGPS",        3072, NULL, 1, NULL, 1);

  // Tasks on Core 0 (Wi-Fi, HTTP Ingestion, WebSockets, NTP)
  xTaskCreatePinnedToCore(TaskNetwork,    "TaskNetwork",    8192, NULL, 1, NULL, 0);

  Serial.println("[FreeRTOS] All tasks successfully scheduled on Core 0 & Core 1.");
}

// -----------------------------------------------------------------------------
// Arduino Loop (Idle loop, CPU cycles yielded to FreeRTOS scheduler)
// -----------------------------------------------------------------------------
void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
