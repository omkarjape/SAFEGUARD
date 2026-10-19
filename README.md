# SAFEGUARD: Smart Industrial Worker Safety & Real-Time Monitoring Platform

An enterprise-grade, IoT-enabled industrial worker safety and real-time monitoring platform designed to protect industrial personnel wearing smart safety jackets equipped with wearable sensing (ESP32, DHT22, MQ-2, MQ-135, MPU6050, Flame, GPS, SOS).

---

## 1. System Architecture

```
Physical / Simulated Wearable Jacket (ESP32)
  ├── DHT22: Temperature & Humidity
  ├── MQ-2: Combustible Gas & Smoke
  ├── MQ-135: Hazardous Air Quality & Toxic Gas
  ├── MPU6050: 6-DOF Fall & Impact Detection
  ├── Flame Sensor: Infrared Fire Ignition Detection
  ├── NEO-6M GPS: Real-Time Plant Geolocation
  ├── SOS Pushbutton: Emergency Hardware Trigger
  └── OLED / Buzzer / RGB Status LEDs
           │
           ▼  (HTTP POST /api/sensor-data)
Backend IoT Gateway (Node.js + Express + TypeScript)
  ├── Zod Request Validation & Telemetry Ingestion
  ├── Autonomous Threshold & Hazard Detection Engine
  ├── Socket.IO Real-Time Event Engine
  └── Prisma ORM (PostgreSQL Multi-Worker Data Model)
           │
           ▼  (WebSocket bi-directional stream)
Industrial Control Room Dashboard (React + Vite + Tailwind + Recharts)
  ├── Overview Dashboard with Real-Time KPIs
  ├── Live Telemetry Stream with Pulsing Status Indicators
  ├── Real-time Sensor Charts (Temperature, Humidity, Gas, Air)
  ├── Worker Personnel Directory & Jacket Allocation
  ├── Wearable Hardware & ESP32 Node Management
  ├── Safety Alerts Incident Center & Triage Workflow
  ├── Plant Facility Geolocation & Worker GPS Radar Map
  └── Built-in Development Simulator Control Panel
```

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS (Dark Slate Industrial Control Room Theme)
- **Icons**: Lucide React
- **Telemetry Charts**: Recharts (Responsive Time-Series)
- **Routing**: React Router DOM v6
- **Real-Time Client**: Socket.IO Client
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js v20+ with TypeScript
- **Framework**: Express.js
- **Real-Time Engine**: Socket.IO Server
- **Security**: Helmet, CORS, Environment Isolation
- **Validation**: Zod (Schema-enforced IoT payloads)

### Database Layer
- **ORM**: Prisma ORM
- **Database Engine**: PostgreSQL
- **Architecture**: Multi-Worker, Multi-Jacket, and Multi-Device ready

---

## 3. Project Structure

```
c:/Users/Omkar/Desktop/IOT Project/
├── frontend/
│   ├── src/
│   │   ├── components/      # StatusBadge, Sidebar, Header, SimulatorPanel, AlertBannerToast
│   │   ├── context/         # SafetyContext (Socket.IO, live telemetry store)
│   │   ├── layouts/         # DashboardLayout (Persistent navigation shell)
│   │   ├── pages/           # Dashboard, Workers, WorkerDetails, Devices, Live, Alerts, Analytics, Locations, Settings
│   │   ├── services/        # api.ts, socket.ts
│   │   ├── types/           # Strongly typed data models
│   │   ├── App.tsx          # Application routes
│   │   ├── main.tsx         # React bootstrap
│   │   └── index.css        # Industrial theme styling
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── controllers/     # dashboard, worker, device, sensor, alert, location, simulator
│   │   ├── middleware/      # errorHandler.ts
│   │   ├── routes/          # index.ts (Full REST API routes)
│   │   ├── services/        # iotSimulator.ts, telemetryStore.ts
│   │   ├── socket/          # index.ts (WebSocket broadcast engine)
│   │   ├── types/           # TypeScript interfaces & enums
│   │   ├── utils/           # mockData.ts
│   │   └── server.ts        # Express & Socket.IO server bootstrap
│   ├── package.json
│   └── tsconfig.json
│
├── prisma/
│   └── schema.prisma        # Multi-worker PostgreSQL relational schema
│
├── docs/
│   └── esp32-payload-spec.md # Formal hardware JSON payload specification
│
├── .env.example             # Template environment variables
├── .env                     # Local configuration
├── README.md
└── package.json             # Root monorepo orchestration
```

---

## 4. Getting Started (Running the Project)

### Prerequisites
- Node.js (v18 or v20+)
- npm (v9+)

### Step 1: Install Dependencies
From the project root:
```bash
npm run install:all
```
Or individually:
```bash
# In backend directory
cd backend
npm install

# In frontend directory
cd ../frontend
npm install
```

### Step 2: Start Development Environment
You can launch both the Backend Gateway and the Frontend Dashboard concurrently with a single command from the root directory:

```bash
npm run dev
```

Or run them in separate terminal windows:

**Terminal 1 (Backend Gateway & IoT Simulator):**
```bash
cd backend
npm run dev
```
*Backend runs on: `http://localhost:5000`*

**Terminal 2 (Frontend React Dashboard):**
```bash
cd frontend
npm run dev
```
*Frontend opens at: `http://localhost:5173`*

---

## 5. Development Simulator & Hazard Testing

Since the physical ESP32 prototype is in development, a **Development Simulator** is built directly into the system:

1. Look at the bottom-right corner of the dashboard for the floating **DEVELOPMENT SIMULATOR** panel.
2. Select a target worker (default: `Worker 01 (W001)`).
3. Click any scenario button to instantly inject hazardous telemetry:
   - 🟢 **Normal Baseline**: Smooth realistic fluctuating readings (Temp: ~28°C, Gas: ~120 ppm).
   - 🌡️ **High Temp Alert**: Triggers temperature spike above 44°C (furnace exposure).
   - ☣️ **Toxic Gas Leak**: Injects combustible gas spike above 480 ppm (MQ-2 hazard).
   - 🔥 **Flame Detected**: Triggers infrared optical flame detector on jacket.
   - ⚡ **Fall Detected**: Simulates MPU6050 sudden deceleration and horizontal tilt impact.
   - 🚨 **SOS Push Button**: Simulates worker pressing the physical emergency toggle switch.
   - 🔋 **Low Battery**: Drops wearable battery level below 10%.
   - 📡 **Device Offline**: Simulates RF connection loss or dead battery (no heartbeat).

When triggered:
- The worker's safety status switches instantly (SAFE ➔ WARNING / CRITICAL).
- A high-priority emergency alert banner pops up.
- The alerts counter badge bounces and updates.
- Real-time Recharts display the spike on the live telemetry stream.
- Supervisors can acknowledge or resolve the alert from the **Alerts Center**.

---

## 6. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Gateway health check & uptime |
| `GET` | `/api/dashboard/summary` | Aggregate workforce safety KPIs |
| `GET` | `/api/workers` | Retrieve all enrolled workers |
| `GET` | `/api/workers/:id` | Retrieve single worker profile & live sensors |
| `POST` | `/api/workers` | Enroll new worker |
| `PUT` | `/api/workers/:id` | Update worker / assign jacket |
| `DELETE` | `/api/workers/:id` | Delete worker record |
| `GET` | `/api/devices` | List registered ESP32 nodes & battery levels |
| `POST` | `/api/sensor-data` | **ESP32 Telemetry Ingestion Endpoint** |
| `GET` | `/api/sensor-data/:deviceId` | Historical sensor readings buffer |
| `GET` | `/api/sensor-data/:deviceId/latest` | Latest telemetry reading |
| `GET` | `/api/alerts` | List all safety incidents (filterable by status/severity) |
| `PATCH` | `/api/alerts/:id/acknowledge` | Acknowledge active alert |
| `PATCH` | `/api/alerts/:id/resolve` | Mark safety alert resolved |
| `GET` | `/api/locations` | Worker GPS coordinates for plant radar map |
| `POST` | `/api/simulator/trigger` | Trigger simulated hazard scenario |

---

## 7. Connecting Physical ESP32 (Phase 12 Preview)

To connect your physical ESP32 development board:
1. Connect DHT22, MQ-2, MQ-135, MPU6050, Flame Sensor, NEO-6M GPS, and SOS button to the designated GPIO pins on your ESP32.
2. Connect ESP32 to Wi-Fi.
3. Configure your ESP32 Arduino / ESP-IDF sketch to send an HTTP POST request to:
   ```
   http://<YOUR_COMPUTER_LOCAL_IP>:5000/api/sensor-data
   ```
   With the JSON payload defined in [`docs/esp32-payload-spec.md`](file:///c:/Users/Omkar/Desktop/IOT%20Project/docs/esp32-payload-spec.md).
4. The dashboard will automatically detect the incoming physical data and update in real-time.
