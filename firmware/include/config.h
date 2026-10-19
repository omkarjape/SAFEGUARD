#ifndef CONFIG_H
#define CONFIG_H

// ==============================================================================
// SMART INDUSTRIAL WORKER SAFETY & REAL-TIME MONITORING SYSTEM
// ESP32 WEARABLE SAFETY JACKET FIRMWARE CONFIGURATION
// Prototype Hardware: Rajesh Kumar (W001) <-> SJ001 <-> ESP32_001
// ==============================================================================

// -----------------------------------------------------------------------------
// 1. Wi-Fi & Network Configuration
// -----------------------------------------------------------------------------
// Replace with your local industrial Wi-Fi or router SSID and password
#define WIFI_SSID               "Omkar"
#define WIFI_PASSWORD           "12345678"
#define WIFI_CONNECT_TIMEOUT_MS 15000
#define WIFI_RETRY_DELAY_MS     3000

// -----------------------------------------------------------------------------
// 2. Central IoT Gateway Configuration
// -----------------------------------------------------------------------------
// IP address or hostname of the machine running the backend server (port 5000)
// On local testing with laptop running the server: use your laptop's local LAN IP (e.g. 192.168.1.15)
#define GATEWAY_HOST            "192.168.1.100"
#define GATEWAY_PORT            5000
#define API_SENSOR_ENDPOINT     "/api/sensor-data"
#define WS_SOCKET_PATH          "/socket.io/?EIO=4&transport=websocket"

// -----------------------------------------------------------------------------
// 3. Wearable Hardware Identity
// -----------------------------------------------------------------------------
#define DEVICE_ID               "ESP32_001"
#define JACKET_ID               "SJ001"
#define WORKER_ID               "W001"
#define FIRMWARE_VERSION        "v1.4.2-industrial-freertos"

// -----------------------------------------------------------------------------
// 4. ESP32 Hardware Pinout Mapping
// -----------------------------------------------------------------------------
// Microclimate Sensor (DHT22 / AM2302)
#define PIN_DHT22               4       // Digital 1-Wire data pin with 10k pullup to 3.3V

// Gas Sensors (ADC1 channel only - ADC2 conflicts with Wi-Fi)
#define PIN_MQ2_ADC             34      // ADC1_CH6 (Analog input from voltage divider)
#define PIN_MQ135_ADC           35      // ADC1_CH7 (Analog input from voltage divider)
#define PIN_BATTERY_ADC         36      // ADC1_CH0 / SENSOR_VP (Battery voltage divider)

// 6-Axis Motion IMU (MPU6050 via I2C)
#define PIN_I2C_SDA             21      // Hardware I2C SDA
#define PIN_I2C_SCL             22      // Hardware I2C SCL
#define MPU6050_I2C_ADDRESS     0x68    // Default MPU6050 I2C address

// Optical Infrared Flame Photodiode
#define PIN_FLAME_DIGITAL       32      // Digital trigger (LOW on fire/IR detection)

// NEO-6M GPS Satellite Module (Hardware Serial2 UART)
#define PIN_GPS_RX2             16      // ESP32 RX2 (connect to GPS Module TX)
#define PIN_GPS_TX2             17      // ESP32 TX2 (connect to GPS Module RX)
#define GPS_BAUD_RATE           9600    // Standard NMEA 0183 baud rate

// Emergency Hardware Pushbutton (SOS)
#define PIN_SOS_BUTTON          13      // Active-LOW input with internal pull-up
#define SOS_DEBOUNCE_TIME_MS    50      // Software debounce window

// Acoustic Siren & Visual Indicators
#define PIN_BUZZER_ALARM        25      // Active 85dB piezo buzzer (PWM / Digital)
#define PIN_LED_GREEN           26      // System Normal / Wi-Fi Connected indicator
#define PIN_LED_RED             27      // Hazard Detected / Perimeter Breach indicator

// -----------------------------------------------------------------------------
// 5. Kinematics & Sensor Calibration Constants
// -----------------------------------------------------------------------------
#define DHT_SENSOR_TYPE         DHT22
#define SENSOR_READ_INTERVAL_MS 1000    // Ambient sensors polled every 1.0 second
#define IMU_POLL_INTERVAL_MS    20      // IMU kinematics evaluated at 50Hz (20ms)
#define TELEMETRY_SEND_RATE_MS  2000    // Telemetry dispatched every 2.0 seconds

// MPU6050 Fall Detection Dynamic Thresholds
#define FREEFALL_THRESHOLD_G    0.45f   // Below 0.45g indicates freefall descent
#define IMPACT_THRESHOLD_G      3.20f   // Above 3.2g indicates sudden ground impact
#define POST_FALL_REST_MS       1500    // Immobility verification duration

// Gas Sensor ADC Conversion Factors (12-bit ADC: 0 - 4095)
#define ADC_MAX_VALUE           4095.0f
#define ADC_REF_VOLTAGE         3.3f
#define MQ2_CALIBRATION_SLOPE   1.2f    // Empirical scaling for ppm estimation
#define MQ135_CALIBRATION_SLOPE 0.95f   // Empirical scaling for AQI estimation

// Battery Monitoring (LiPo 1S: 3.2V empty to 4.2V fully charged)
#define BATTERY_MIN_VOLTAGE     3.20f
#define BATTERY_MAX_VOLTAGE     4.20f
#define BATTERY_DIVIDER_RATIO   2.0f    // 100k / 100k equal voltage divider

// Default Fallback Coordinates (Industrial Plant Center)
#define FALLBACK_LATITUDE       19.766020
#define FALLBACK_LONGITUDE      74.477040

#endif // CONFIG_H
