// ==============================================================================
// SMART INDUSTRIAL WORKER SAFETY & REAL-TIME MONITORING SYSTEM
// ESP32 Arduino IDE Sketch (.ino) - Wearable Smart Safety Jacket
//
// LIBRARIES REQUIRED (Install via Arduino IDE Library Manager):
// 1. "ArduinoJson" by Benoit Blanchon (v6.21.x or v7.x)
// 2. "DHT sensor library" by Adafruit (v1.4.x)
// 3. "Adafruit Unified Sensor" by Adafruit
// 4. "Adafruit MPU6050" by Adafruit (v2.2.x)
// 5. "TinyGPSPlus" by Mikal Hart (v1.0.3)
// 6. "WebSockets" by Markus Sattler (v2.4.x)
//
// BOARD SETTINGS (Tools menu):
// - Board: "ESP32 Dev Module"
// - CPU Frequency: 240MHz or 160MHz
// - Flash Frequency: 80MHz
// - Upload Speed: 115200 or 460800 (Avoid 921600 to prevent RTS reset serial disconnects)
// - Partition Scheme: Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)
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

// -----------------------------------------------------------------------------
// USER CONFIGURATION (Customize for your network and deployment)
// -----------------------------------------------------------------------------
const char* WIFI_SSID           = "omkarjape";
const char* WIFI_PASSWORD       = "987654321";
const char* GATEWAY_HOST        = "10.127.244.226"; // Current laptop Wi-Fi IP address
const uint16_t GATEWAY_PORT     = 5000;
const char* API_SENSOR_ENDPOINT = "/api/sensor-data";
const char* WS_SOCKET_PATH      = "/socket.io/?EIO=4&transport=websocket";

// Hardware Identification
const char* DEVICE_ID           = "ESP32_001";
const char* JACKET_ID           = "SJ001";
const char* WORKER_ID           = "W001";

// Pinout Definitions
#define PIN_DHT22               4
#define PIN_MQ2_ADC             34
#define PIN_MQ135_ADC           35
#define PIN_BATTERY_ADC         36
#define PIN_I2C_SDA             21
#define PIN_I2C_SCL             22
#define PIN_FLAME_DIGITAL       32
#define PIN_GPS_RX2             16
#define PIN_GPS_TX2             17
#define PIN_SOS_BUTTON          13
#define PIN_BUZZER_ALARM        25
#define PIN_LED_GREEN           26
#define PIN_LED_RED             27

// Hardware Drivers
// Set to DHT11 (standard blue sensor) or DHT22 (white sensor)
#define DHTTYPE                 DHT11
DHT dht(PIN_DHT22, DHTTYPE);
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
WebSocketsClient webSocket;

// Hardware Component Continuity Health State
struct SensorHealthInfo {
  bool dht22;
  bool mpu6050;
  bool mq2;
  bool mq135;
  bool flame;
  bool gps;
  bool sos;
};

// Shared Telemetry Packet
struct SensorPacket {
  float temperature;
  float humidity;
  int gasLevel;
  int airQuality;
  bool flameDetected;
  bool fallDetected;
  bool sosPressed;
  int battery;
  double latitude;
  double longitude;
  char timestamp[32];
  SensorHealthInfo health;
};

static SensorPacket currentPacket = {
  0.0f, 0.0f, 0, 0, false, false, false, 100,
  0.0, 0.0, "1970-01-01T00:00:00.000Z",
  { false, false, false, false, true, false, true }
};

static SemaphoreHandle_t packetMutex = NULL;
static bool mpuInitialized = false;

// Fall Detection Kinematics State
enum FallState { FALL_IDLE, FALL_FREEFALL, FALL_IMPACT, FALL_CONFIRMED };
static volatile FallState currentFallState = FALL_IDLE;
static unsigned long freefallStartTime = 0;
static unsigned long impactStartTime = 0;

// SOS Button State
static volatile bool sosButtonPressed = false;
static volatile unsigned long lastSosTime = 0;

void IRAM_ATTR isrSOSButton() {
  unsigned long now = millis();
  if (now - lastSosTime > 50) {
    if (digitalRead(PIN_SOS_BUTTON) == LOW) {
      sosButtonPressed = true;
    }
    lastSosTime = now;
  }
}

// -----------------------------------------------------------------------------
// BUZZER MODULE POLARITY CONFIGURATION
// -----------------------------------------------------------------------------
// Set to true for Active-HIGH buzzer modules (Standard: Sounds when pin is HIGH)
// Set to false for Active-LOW buzzer modules (KY-012 / 3-pin: Sounds when pin is LOW)
const bool BUZZER_ACTIVE_HIGH = true;

// Remote Buzzer State
static volatile bool remoteBuzzerActive = false;
static unsigned long buzzerDeactivateTime = 0;

void setBuzzerHardware(bool active) {
  if (BUZZER_ACTIVE_HIGH) {
    digitalWrite(PIN_BUZZER_ALARM, active ? HIGH : LOW);
  } else {
    digitalWrite(PIN_BUZZER_ALARM, active ? LOW : HIGH);
  }
}

void triggerLocalAlarm(int durationMs) {
  remoteBuzzerActive = true;
  buzzerDeactivateTime = millis() + durationMs;
  setBuzzerHardware(true);
  digitalWrite(PIN_LED_RED, HIGH);
}

void stopLocalAlarm() {
  remoteBuzzerActive = false;
  setBuzzerHardware(false);
  digitalWrite(PIN_LED_RED, LOW);
}


// WebSocket Event Callback (Socket.IO v4 Engine.IO protocol)
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.printf("[WebSocket] Connected! Subscribing to device:%s\n", DEVICE_ID);
    webSocket.sendTXT("42[\"subscribe_device\",\"" + String(DEVICE_ID) + "\"]");
  } else if (type == WStype_TEXT) {
    String msg = (char*)payload;
    if (msg.startsWith("42")) {
      int startIdx = msg.indexOf('[');
      if (startIdx != -1) {
        StaticJsonDocument<512> doc;
        if (!deserializeJson(doc, msg.substring(startIdx))) {
          const char* eventName = doc[0];
          if (eventName && (strcmp(eventName, "buzzer_command") == 0 || strcmp(eventName, "dispatch_buzzer") == 0)) {
            Serial.println("[SIREN] Remote buzzer alarm command received from dashboard!");
            triggerLocalAlarm(5000);
          }
        }
      }
    }
  }
}

// Task 1: 50Hz Fall Kinematics (Core 1)
void TaskIMUFall(void *pv) {
  TickType_t lastWake = xTaskGetTickCount();
  while (true) {
    if (!mpuInitialized) {
      // If MPU6050 is not connected, do NOT hammer I2C bus at 50Hz!
      // This prevents high CPU heating and bus lockups.
      vTaskDelay(pdMS_TO_TICKS(1500));
      continue;
    }

    sensors_event_t a, g, temp;
    if (mpu.getEvent(&a, &g, &temp)) {
      float totalG = sqrt(a.acceleration.x * a.acceleration.x +
                          a.acceleration.y * a.acceleration.y +
                          a.acceleration.z * a.acceleration.z) / 9.80665f;
      unsigned long now = millis();

      switch (currentFallState) {
        case FALL_IDLE:
          if (totalG < 0.45f) {
            currentFallState = FALL_FREEFALL;
            freefallStartTime = now;
          }
          break;
        case FALL_FREEFALL:
          if (totalG > 3.20f) {
            currentFallState = FALL_IMPACT;
            impactStartTime = now;
          } else if (now - freefallStartTime > 800) {
            currentFallState = FALL_IDLE;
          }
          break;
        case FALL_IMPACT:
          if (now - impactStartTime >= 1500) {
            currentFallState = FALL_CONFIRMED;
            Serial.println("[ALARM] Fall confirmed by MPU6050!");
            if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
              currentPacket.fallDetected = true;
              xSemaphoreGive(packetMutex);
            }
            triggerLocalAlarm(4000);
          } else if (totalG > 2.0f) {
            currentFallState = FALL_IDLE;
          }
          break;
        case FALL_CONFIRMED:
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
    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(20));
  }
}

// Task 2: Sensor Sampling (Core 1, 1000ms)
void TaskSensorRead(void *pv) {
  TickType_t lastWake = xTaskGetTickCount();
  while (true) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    // Auto-correct scale if DHT11 integer byte was shifted by 256:
    if (!isnan(t) && t > 120.0f) {
      t = t / 25.6f;
    }
    if (!isnan(h) && h > 100.0f) {
      h = h / 25.6f;
    }

    int rawMQ2 = analogRead(PIN_MQ2_ADC);
    int gasPpm = (int)((rawMQ2 / 4095.0f) * 720.0f) + 20;

    int rawMQ135 = analogRead(PIN_MQ135_ADC);
    int aqi = (int)((rawMQ135 / 4095.0f) * 420.0f) + 15;

    bool isFlame = (digitalRead(PIN_FLAME_DIGITAL) == LOW);

    bool dhtConnected = !isnan(t) && !isnan(h);
    bool mq2Connected = (rawMQ2 > 25);
    bool mq135Connected = (rawMQ135 > 25);
    bool flameConnected = true; // Digital pullup monitored circuit
    bool gpsConnected = (gpsSerial.available() > 0 || gps.charsProcessed() > 0);
    bool sosConnected = true;

    // Check MPU6050 I2C bus health cleanly
    Wire.beginTransmission(0x68);
    bool mpuConnected = (Wire.endTransmission() == 0);
    if (mpuConnected && !mpuInitialized) {
      mpuInitialized = mpu.begin(0x68);
    } else if (!mpuConnected) {
      mpuInitialized = false;
    }

    // Battery percentage: Default to 100% when running via USB power
    int battPct = 100;
    int rawBatt = analogRead(PIN_BATTERY_ADC);
    if (rawBatt > 100) {
      float vBatt = (rawBatt / 4095.0f) * 3.3f * 2.0f;
      battPct = constrain((int)(((vBatt - 3.2f) / 1.0f) * 100.0f), 0, 100);
    }

    bool sos = sosButtonPressed;
    if (sos) {
      Serial.println("[SOS] Hardware button pressed!");
      triggerLocalAlarm(5000);
      sosButtonPressed = false;
    }

    if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      if (dhtConnected) {
        currentPacket.temperature = t;
        currentPacket.humidity = h;
      } else {
        currentPacket.temperature = 0.0f;
        currentPacket.humidity = 0.0f;
      }
      currentPacket.gasLevel = mq2Connected ? gasPpm : 0;
      currentPacket.airQuality = mq135Connected ? aqi : 0;
      currentPacket.flameDetected = isFlame;
      currentPacket.battery = battPct;
      if (sos) currentPacket.sosPressed = true;

      // Update hardware continuity health
      currentPacket.health.dht22 = dhtConnected;
      currentPacket.health.mpu6050 = mpuConnected;
      currentPacket.health.mq2 = mq2Connected;
      currentPacket.health.mq135 = mq135Connected;
      currentPacket.health.flame = flameConnected;
      currentPacket.health.gps = gpsConnected;
      currentPacket.health.sos = sosConnected;

      struct tm ti;
      if (getLocalTime(&ti)) {
        strftime(currentPacket.timestamp, sizeof(currentPacket.timestamp), "%Y-%m-%dT%H:%M:%S.000Z", &ti);
      }
      xSemaphoreGive(packetMutex);
    }

    if (remoteBuzzerActive && millis() > buzzerDeactivateTime) {
      stopLocalAlarm();
    }

    // -------------------------------------------------------------------------
    // COMPREHENSIVE LIVE SERIAL MONITOR TELEMETRY DISPLAY
    // -------------------------------------------------------------------------
    Serial.println("\n=================[ ESP32 SMART SAFETY JACKET ]=================");
    Serial.printf(" Device ID: %s | Jacket: %s | Worker: %s\n", DEVICE_ID, JACKET_ID, WORKER_ID);
    Serial.println("-----------------------------------------------------------------");
    if (dhtConnected) {
      Serial.printf(" [OK] Temperature : %.1f °C\n", t);
      Serial.printf(" [OK] Humidity    : %.1f %%\n", h);
    } else {
      Serial.println(" [!!] Temperature : DISCONNECTED (Check DHT22 Pin 4)");
      Serial.println(" [!!] Humidity    : DISCONNECTED (Check DHT22 Pin 4)");
    }

    if (mq2Connected) {
      Serial.printf(" [OK] Gas (MQ-2)  : %d ppm  [Raw ADC: %d]\n", gasPpm, rawMQ2);
    } else {
      Serial.printf(" [!!] Gas (MQ-2)  : DISCONNECTED (Raw: %d, Check Pin 34 & 5V VCC)\n", rawMQ2);
    }

    if (mq135Connected) {
      Serial.printf(" [OK] AQI (MQ-135): %d AQI  [Raw ADC: %d]\n", aqi, rawMQ135);
    } else {
      Serial.printf(" [!!] AQI (MQ-135): DISCONNECTED (Raw: %d, Check Pin 35 & 5V VCC)\n", rawMQ135);
    }

    Serial.printf(" [%s] Flame Sensor: %s (Pin 32)\n", isFlame ? "ALARM" : "SAFE", isFlame ? "🔥 FLAME DETECTED!" : "Clear / Normal");
    Serial.printf(" [%s] Motion / IMU: %s (SDA 21, SCL 22)\n", mpuConnected ? "OK" : "!!", mpuConnected ? (currentPacket.fallDetected ? "⚠️ IMPACT DETECTED!" : "Nominal") : "DISCONNECTED (No I2C Response)");
    Serial.printf(" [OK] SOS Button  : %s (Pin 13)\n", sos ? "🚨 SOS TRIGGERED!" : "Armed & Ready");
    Serial.printf(" [OK] Battery     : %d %% (Raw ADC: %d)\n", battPct, rawBatt);
    if (gpsConnected && (currentPacket.latitude != 19.766020 || currentPacket.longitude != 74.477040)) {
      Serial.printf(" [OK] GPS Position: Lat: %.6f, Lon: %.6f\n", currentPacket.latitude, currentPacket.longitude);
    } else {
      Serial.printf(" [..] GPS Position: No Fix / Default (Lat: %.6f, Lon: %.6f)\n", currentPacket.latitude, currentPacket.longitude);
    }
    Serial.printf(" [Wi-Fi] Network  : %s (IP: %s | RSSI: %d dBm)\n",
      WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED",
      WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString().c_str() : "0.0.0.0",
      WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0);
    Serial.println("=================================================================");

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(1000));
  }
}

// Task 3: NEO-6M GPS (Core 1)
void TaskGPS(void *pv) {
  while (true) {
    while (gpsSerial.available() > 0) {
      if (gps.encode(gpsSerial.read())) {
        if (gps.location.isValid() && gps.location.isUpdated()) {
          if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            currentPacket.latitude = gps.location.lat();
            currentPacket.longitude = gps.location.lng();
            xSemaphoreGive(packetMutex);
          }
        }
      }
    }
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// Task 4: Wi-Fi & Gateway Dispatch (Core 0, 2000ms)
void TaskNetwork(void *pv) {
  Serial.printf("[Wi-Fi] Connecting to: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[Wi-Fi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    WiFi.setSleep(true); // Enable modem sleep to drop chip operating temperature
    digitalWrite(PIN_LED_GREEN, HIGH);
    configTime(19800, 0, "pool.ntp.org");
    webSocket.begin(GATEWAY_HOST, GATEWAY_PORT, WS_SOCKET_PATH);
    webSocket.onEvent(webSocketEvent);
  }

  TickType_t lastWake = xTaskGetTickCount();
  while (true) {
    if (WiFi.status() == WL_CONNECTED) {
      webSocket.loop();
    } else {
      WiFi.reconnect();
      vTaskDelay(pdMS_TO_TICKS(3000));
      continue;
    }

    StaticJsonDocument<512> doc;
    if (xSemaphoreTake(packetMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      doc["deviceId"] = DEVICE_ID;
      doc["jacketId"] = JACKET_ID;
      doc["workerId"] = WORKER_ID;
      doc["temperature"] = serialized(String(currentPacket.temperature, 1));
      doc["humidity"] = serialized(String(currentPacket.humidity, 1));
      doc["gasLevel"] = currentPacket.gasLevel;
      doc["airQuality"] = currentPacket.airQuality;
      doc["flameDetected"] = currentPacket.flameDetected;
      doc["fallDetected"] = currentPacket.fallDetected;
      doc["sosPressed"] = currentPacket.sosPressed;
      doc["battery"] = currentPacket.battery;
      doc["latitude"] = serialized(String(currentPacket.latitude, 6));
      doc["longitude"] = serialized(String(currentPacket.longitude, 6));
      doc["timestamp"] = currentPacket.timestamp;

      JsonObject healthObj = doc.createNestedObject("sensorHealth");
      healthObj["dht22"] = currentPacket.health.dht22;
      healthObj["mpu6050"] = currentPacket.health.mpu6050;
      healthObj["mq2"] = currentPacket.health.mq2;
      healthObj["mq135"] = currentPacket.health.mq135;
      healthObj["flame"] = currentPacket.health.flame;
      healthObj["gps"] = currentPacket.health.gps;
      healthObj["sos"] = currentPacket.health.sos;

      if (currentPacket.sosPressed) currentPacket.sosPressed = false;
      xSemaphoreGive(packetMutex);
    }

    String jsonStr;
    serializeJson(doc, jsonStr);

    HTTPClient http;
    String url = String("http://") + GATEWAY_HOST + ":" + GATEWAY_PORT + API_SENSOR_ENDPOINT;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(jsonStr);
    if (code == 200 || code == 201) {
      digitalWrite(PIN_LED_GREEN, HIGH);
      Serial.printf("[HTTP Ingest] Status: %d OK | Temp: %.1fC | Gas: %d | Health: [DHT:%d, IMU:%d, MQ2:%d, GPS:%d]\n",
        code, currentPacket.temperature, currentPacket.gasLevel,
        currentPacket.health.dht22, currentPacket.health.mpu6050,
        currentPacket.health.mq2, currentPacket.health.gps);
    } else {
      digitalWrite(PIN_LED_GREEN, LOW);
      Serial.printf("[HTTP Ingest] ERROR Code: %d (Check Gateway IP: %s:%d)\n", code, GATEWAY_HOST, GATEWAY_PORT);
    }
    http.end();

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(2000));
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Set CPU to 160MHz: lowers ESP32 heat generation by ~35% while retaining full FreeRTOS performance
  setCpuFrequencyMhz(160);

  // Use INPUT_PULLUP on flame sensor pin to prevent floating 0 false alarms when unplugged
  pinMode(PIN_FLAME_DIGITAL, INPUT_PULLUP);
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER_ALARM, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  // Power-on self test beep
  digitalWrite(PIN_BUZZER_ALARM, HIGH);
  digitalWrite(PIN_LED_GREEN, HIGH);
  delay(150);
  digitalWrite(PIN_BUZZER_ALARM, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);

  attachInterrupt(digitalPinToInterrupt(PIN_SOS_BUTTON), isrSOSButton, FALLING);

  dht.begin();
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  mpuInitialized = mpu.begin(0x68);
  if (mpuInitialized) {
    Serial.println("[IMU] MPU6050 initialized successfully.");
  } else {
    Serial.println("[IMU] MPU6050 not detected at 0x68! Will poll in low-power idle mode.");
  }
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX2, PIN_GPS_TX2);

  packetMutex = xSemaphoreCreateMutex();

  xTaskCreatePinnedToCore(TaskIMUFall,    "TaskIMUFall",    4096, NULL, 3, NULL, 1);
  xTaskCreatePinnedToCore(TaskSensorRead, "TaskSensorRead", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(TaskGPS,        "TaskGPS",        3072, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(TaskNetwork,    "TaskNetwork",    8192, NULL, 1, NULL, 0);

  Serial.println("[SYSTEM] ESP32 Smart Safety Jacket operational.");
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}