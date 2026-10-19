# ESP32 Smart Safety Jacket — Hardware Wiring & Assembly Guide

This guide provides the complete electrical schematic, pinout tables, voltage level protection, and assembly instructions for the wearable smart safety jacket prototype (**ESP32_001** / **SJ001** / **W001 Rajesh Kumar**).

---

## 1. System Architecture Diagram

```
                                  +-----------------------+
                                  | 3.7V 2500mAh 18650    |
                                  | Li-Ion Battery        |
                                  +-----------+-----------+
                                              |
                                     [TP4056 Charger]
                                              |
                                   [MT3608 Boost to 5V]
                                              |
                          +-------------------+-------------------+
                          |                                       |
                     +----+----+                             +----+----+
                     | 5V Rail |                             | 3.3V Rail|
                     +----+----+                             +----+----+
                          |                                       | (ESP32 LDO)
            +-------------+-------------+                         |
            |             |             |                         |
        +---+---+     +---+---+     +---+---+               +-----+-----+-----+-----+
        | MQ-2  |     |MQ-135 |     |Buzzer |               |     |     |     |     |
        |Heater |     |Heater |     |Driver |             DHT22 MPU6050 NEO6M Flame SOS
        +-------+     +-------+     +-------+
```

---

## 2. Complete ESP32 GPIO Pinout Mapping

| Component | Function / Subsystem | Pin on Module | ESP32 NodeMCU Pin | Power Rail | Interface Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DHT22 (AM2302)** | Ambient Temp & Humidity | `VCC` | `3V3` | 3.3V | Decoupling 100nF cap |
| | | `GND` | `GND` | Ground | Common system ground |
| | | `DATA` | **GPIO 4** | 3.3V Logic | 10kΩ pull-up to 3.3V |
| **MQ-2** | Combustible Gas / Smoke | `VCC` | `VIN (5V)` | 5V DC | Heater coil requires 5V |
| | | `GND` | `GND` | Ground | Common ground |
| | | `AOUT` | **GPIO 34** | 3.3V Max | **Via 10kΩ/20kΩ Voltage Divider** |
| **MQ-135** | Toxic Gases & Air Quality | `VCC` | `VIN (5V)` | 5V DC | Heater coil requires 5V |
| | | `GND` | `GND` | Ground | Common ground |
| | | `AOUT` | **GPIO 35** | 3.3V Max | **Via 10kΩ/20kΩ Voltage Divider** |
| **MPU-6050** | 6-Axis IMU (Fall Detector)| `VCC` | `3V3` | 3.3V | Onboard regulator |
| | | `GND` | `GND` | Ground | Common ground |
| | | `SDA` | **GPIO 21** | 3.3V Logic | Hardware I2C Data |
| | | `SCL` | **GPIO 22** | 3.3V Logic | Hardware I2C Clock |
| | | `AD0` | `GND` | Ground | Sets I2C Address to `0x68` |
| **Optical Flame**| Infrared Fire Detector | `VCC` | `3V3` | 3.3V | Infrared photodiode |
| | | `GND` | `GND` | Ground | Common ground |
| | | `DO` | **GPIO 32** | 3.3V Logic | Digital Active-LOW on Flame |
| **NEO-6M GPS** | Satellite Positioning | `VCC` | `3V3` or `VIN` | 3.3V - 5V | NEO-6M has onboard 3.3V LDO |
| | | `GND` | `GND` | Ground | Common ground |
| | | `TX` | **GPIO 16 (RX2)** | 3.3V Logic | Hardware Serial2 Receive |
| | | `RX` | **GPIO 17 (TX2)** | 3.3V Logic | Hardware Serial2 Transmit |
| **Emergency SOS**| Tactile Panic Button | `Terminal A`| **GPIO 13** | 3.3V Pullup | Internal `INPUT_PULLUP` enabled |
| | | `Terminal B`| `GND` | Ground | Momentary closure to GND |
| **Active Siren** | 85dB Acoustic Alarm | `Collector` | **GPIO 25** | 5V VCC | Via 2N2222 NPN Transistor |
| **Status LED Green**| System Nominal Indicator | `Anode (+)` | **GPIO 26** | 3.3V Logic | Via 220Ω current limiting resistor |
| **Status LED Red** | Emergency Hazard Alert | `Anode (+)` | **GPIO 27** | 3.3V Logic | Via 220Ω current limiting resistor |
| **Battery Monitor**| Voltage Measurement | `Divider Out`| **GPIO 36 (VP)** | 3.3V Max | 100kΩ / 100kΩ divider from LiPo (+) |

---

## 3. Voltage Divider Circuits for Analog Protection

> [!WARNING]
> **ADC Pin Voltage Protection**: The ESP32 ADC inputs (GPIO 34 and GPIO 35) are rated for a maximum of **3.3V**. The MQ-2 and MQ-135 sensors operate from 5V and can output analog voltages up to ~4.8V in high gas concentrations. Direct connection without a voltage divider can permanently damage the ESP32.

### MQ-2 & MQ-135 Voltage Divider Circuit:
```
Module Analog Out (0 - 5.0V)
          |
         [R1: 10 kΩ]
          |
          +-----> Connect to ESP32 (GPIO 34 or GPIO 35) (Max 3.33V)
          |
         [R2: 20 kΩ]
          |
         GND
```
Formula:
$$V_{\text{out}} = V_{\text{in}} \times \left( \frac{R_2}{R_1 + R_2} \right) = 5.0\text{V} \times \left( \frac{20\text{k}\Omega}{30\text{k}\Omega} \right) = 3.33\text{V}$$

---

## 4. Active Piezo Buzzer Transistor Driver Circuit

The ESP32 GPIO pins can supply a maximum of 12mA, which is insufficient to drive an 85dB+ industrial warning buzzer. Use a general-purpose NPN transistor (2N2222 or BC547):

```
+5V Rail
   |
   +---[+] Active Buzzer [-]
             |
             +-------+
                     |
                    [C] Collector
ESP32 GPIO 25 ---[1 kΩ]---[B] 2N2222 NPN Transistor
                    [E] Emitter
                     |
                    GND
```

---

## 5. Wearable Power Supply & Charging

For wearable integration into the physical safety jacket:
1. **Battery Cell**: Single 18650 Rechargeable Li-Ion Cell (3.7V nominal, 2500mAh - 3000mAh) or Flat Li-Po Pouch Cell.
2. **Charging & Protection Module**: **TP4056** with integrated battery protection (DW01A + FS8205A) providing over-discharge (<2.5V) and over-charge (>4.2V) protection.
3. **Step-Up Boost Converter**: **MT3608** DC-DC Boost Converter stepped up to **5.0V** to feed the ESP32 `VIN` pin and gas sensor heater coils.
4. **Estimated Operating Runtime**:
   - ESP32 with Wi-Fi + Sensors: ~140mA average current draw.
   - 2500mAh battery yields **14-16 hours** of continuous field operation (sufficient for a double 8-hour shift).

---

## 6. Flashing & Deployment Instructions

### Option A: Using PlatformIO (Recommended)
1. Install [VS Code](https://code.visualstudio.com/) and the **PlatformIO IDE** extension.
2. Open the `firmware/` folder in VS Code.
3. In `firmware/include/config.h`, set your local Wi-Fi SSID, Password, and your laptop's Gateway IP address:
   ```c
   #define WIFI_SSID       "Your_WiFi_Name"
   #define WIFI_PASSWORD   "Your_WiFi_Password"
   #define GATEWAY_HOST    "192.168.1.50" // IP where 'npm run dev' is running
   ```
4. Connect the ESP32 to your PC via Micro-USB or USB-C.
5. Click **PlatformIO: Build** (check icon) and **PlatformIO: Upload** (arrow icon).
6. Open **Serial Monitor** at **115200 baud**.

### Option B: Using Arduino IDE
1. Install [Arduino IDE 2.x](https://www.arduino.cc/en/software).
2. Add ESP32 Board URL in `Preferences` -> `Additional boards manager URLs`:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Install the **esp32** board package in `Boards Manager`.
4. Install required libraries via `Tools` -> `Manage Libraries...`:
   - `ArduinoJson` (v6.21.x or v7.x)
   - `DHT sensor library` by Adafruit
   - `Adafruit MPU6050` & `Adafruit Unified Sensor`
   - `TinyGPSPlus` by Mikal Hart
   - `WebSockets` by Markus Sattler
5. Open `firmware/esp32_smart_jacket.ino`.
6. Select Board: **ESP32 Dev Module**, Port: **COMx**, and click **Upload**.

---

## 7. Pre-Deployment Hardware Diagnostic Checklist

Before issuing the smart jacket to an industrial worker:
- [ ] **Power-On Self-Test**: Ensure the buzzer emits a short 150ms confirmation chirp and both LEDs flash on boot.
- [ ] **DHT22 Check**: Verify temperature reading matches ambient thermometer within $\pm 0.5^\circ\text{C}$.
- [ ] **Gas Sensor Warm-up**: Allow MQ-2 and MQ-135 sensors to pre-heat for at least 3-5 minutes until analog baseline stabilizes (<150 ppm).
- [ ] **MPU6050 Fall Test**: Drop jacket onto a safety foam pad from 1 meter. Confirm red LED flashes, buzzer sounds, and control room receives `FALL_DETECTED`.
- [ ] **SOS Button Test**: Depress panic pushbutton. Confirm immediate siren sounding and control room HUD DEFCON elevation to Level 3/4.
- [ ] **GPS Fix**: Ensure jacket has line-of-sight to the sky for initial satellite almanac acquisition (typically 30-45 seconds for cold start).
