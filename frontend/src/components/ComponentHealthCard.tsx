import React from 'react';
import { Worker, Device, SensorReading } from '../types';
import {
  Cpu,
  Wifi,
  WifiOff,
  Thermometer,
  Wind,
  Flame,
  Activity,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Volume2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface ComponentHealthCardProps {
  worker?: Worker;
  device?: Device;
  liveSensor?: SensorReading;
}

export const ComponentHealthCard: React.FC<ComponentHealthCardProps> = ({
  worker,
  device,
  liveSensor
}) => {
  // 1-second client-side heartbeat freshness monitor
  const [now, setNow] = React.useState<number>(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastSeenMs = liveSensor?.timestamp
    ? new Date(liveSensor.timestamp).getTime()
    : (device?.lastSeen ? new Date(device.lastSeen).getTime() : 0);

  // Consider online only if last telemetry packet arrived within the last 8 seconds
  const isHeartbeatFresh = lastSeenMs > 0 && (now - lastSeenMs < 8000);

  const isOnline = Boolean(
    isHeartbeatFresh &&
    device?.connectionStatus !== 'OFFLINE' &&
    worker?.status !== 'OFFLINE'
  );

  // Component Health Checks
  // Check explicit sensorHealth from firmware payload first; fall back to baseline heuristics
  const dhtHealth = liveSensor?.sensorHealth?.dht22 !== undefined
    ? Boolean(liveSensor.sensorHealth.dht22)
    : (isOnline && (liveSensor?.temperature || 0) > 0);

  const mq2Health = liveSensor?.sensorHealth?.mq2 !== undefined
    ? Boolean(liveSensor.sensorHealth.mq2)
    : (isOnline && (liveSensor?.gasLevel || 0) > 0);

  const mq135Health = liveSensor?.sensorHealth?.mq135 !== undefined
    ? Boolean(liveSensor.sensorHealth.mq135)
    : (isOnline && (liveSensor?.airQuality || 0) > 0);

  const flameHealth = liveSensor?.sensorHealth?.flame !== undefined
    ? Boolean(liveSensor.sensorHealth.flame)
    : true;

  const mpuHealth = liveSensor?.sensorHealth?.mpu6050 !== undefined
    ? Boolean(liveSensor.sensorHealth.mpu6050)
    : isOnline;

  const gpsHealth = liveSensor?.sensorHealth?.gps !== undefined
    ? Boolean(liveSensor.sensorHealth.gps)
    : (isOnline && liveSensor?.latitude !== undefined && liveSensor.latitude !== 19.76602 && liveSensor.latitude !== 0);

  const sosHealth = true;
  const buzzerHealth = true;

  const components = [
    {
      id: 'dht22',
      name: 'DHT22 Climate Sensor',
      purpose: 'Body Temp & Ambient Humidity',
      pin: 'GPIO 4',
      type: '1-Wire Digital',
      healthy: dhtHealth,
      icon: Thermometer,
      liveValue: isOnline && dhtHealth && liveSensor && liveSensor.temperature > 0
        ? `${liveSensor.temperature.toFixed(1)}°C | ${liveSensor.humidity.toFixed(0)}%`
        : (isOnline ? 'Disconnected / Awaiting Sensor' : 'Jacket Offline')
    },
    {
      id: 'mq2',
      name: 'MQ-2 Gas Detector',
      purpose: 'LPG, Butane, Smoke & Fire Gas',
      pin: 'GPIO 34',
      type: 'Analog ADC1',
      healthy: mq2Health,
      icon: Wind,
      liveValue: isOnline && mq2Health && liveSensor && liveSensor.gasLevel > 0
        ? `${liveSensor.gasLevel} ppm`
        : (isOnline ? 'Disconnected / Pin Floating' : 'Jacket Offline')
    },
    {
      id: 'mq135',
      name: 'MQ-135 Air Quality',
      purpose: 'Ammonia, CO2, Toxins & Air Quality',
      pin: 'GPIO 35',
      type: 'Analog ADC1',
      healthy: mq135Health,
      icon: Wind,
      liveValue: isOnline && mq135Health && liveSensor && liveSensor.airQuality > 0
        ? `${liveSensor.airQuality} AQI`
        : (isOnline ? 'Disconnected / Pin Floating' : 'Jacket Offline')
    },
    {
      id: 'flame',
      name: 'IR Flame Sensor',
      purpose: 'Optical Fire & Flare Photodiode',
      pin: 'GPIO 32',
      type: 'Digital Pullup',
      healthy: flameHealth,
      icon: Flame,
      liveValue: isOnline && liveSensor?.flameDetected
        ? '🔥 FLAME DETECTED'
        : 'Safe / No Fire Detected'
    },
    {
      id: 'mpu6050',
      name: 'MPU6050 6-Axis IMU',
      purpose: 'Fall Impact & Immobility Kinematics',
      pin: 'I2C (SDA 21, SCL 22)',
      type: 'I2C Bus 400kHz',
      healthy: mpuHealth,
      icon: Activity,
      liveValue: isOnline && liveSensor?.fallDetected
        ? '⚠️ IMPACT DETECTED'
        : (mpuHealth ? 'Kinematics Nominal' : 'Disconnected / No I2C ACK')
    },
    {
      id: 'gps',
      name: 'NEO-6M GPS Module',
      purpose: 'Outdoor Satellite Geolocation',
      pin: 'UART2 (RX 16, TX 17)',
      type: 'Hardware Serial 9600',
      healthy: gpsHealth,
      icon: MapPin,
      liveValue: isOnline && gpsHealth && liveSensor
        ? `${liveSensor.latitude.toFixed(4)}°N, ${liveSensor.longitude.toFixed(4)}°E`
        : 'No Satellite Lock / Disconnected'
    },
    {
      id: 'sos',
      name: 'Emergency SOS Button',
      purpose: 'Worker Panic Hardware Button',
      pin: 'GPIO 13',
      type: 'Interrupt Pullup',
      healthy: sosHealth,
      icon: AlertCircle,
      liveValue: isOnline && liveSensor?.sosPressed
        ? '🚨 SOS BUTTON PRESSED'
        : 'Armed & Ready (Pullup Safe)'
    },
    {
      id: 'buzzer',
      name: 'Acoustic Siren Alarm',
      purpose: 'Audio-Visual Warning Beeper',
      pin: 'GPIO 25 & 27',
      type: 'Active High Output',
      healthy: buzzerHealth,
      icon: Volume2,
      liveValue: 'Online / Remote Dispatch Ready'
    }
  ];

  const disconnectedList = components.filter(c => !c.healthy);

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1f293d] p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f293d] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
                Smart Jacket Hardware & Component Health Monitor
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {device?.deviceId || 'ESP32_001'} &bull; {worker?.workerId || 'W001'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time hardware continuity and disconnection diagnostics for wearable safety vest {device?.jacketId || 'SJ001'}
            </p>
          </div>
        </div>

        {/* Master Jacket Power / Connectivity Badge */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>JACKET ONLINE (POWERED ON)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/90 border border-red-500/60 text-red-200 text-xs font-bold shadow-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span>JACKET OFFLINE (POWERED OFF)</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Status Banner Alert */}
      {!isOnline ? (
        <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="font-bold">Smart Safety Jacket is currently Powered Off or Unreachable</p>
            <p className="text-red-300/80 text-[11px] mt-0.5">
              Turn on the ESP32 board or connect its battery/USB cable to resume live telemetry transmission.
            </p>
          </div>
        </div>
      ) : disconnectedList.length > 0 ? (
        <div className="p-3.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">
                Hardware Alert: {disconnectedList.length} Component(s) Disconnected or Damaged
              </p>
              <p className="text-amber-300/80 text-[11px] mt-0.5">
                The following sensor modules are not detected: {disconnectedList.map(c => c.name).join(', ')}. Connect jumper wires to ESP32 pins.
              </p>
            </div>
          </div>
          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 shrink-0">
            {disconnectedList.length} UNPLUGGED
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold text-emerald-300">All Safety Jacket Components Connected & Operational</p>
            <p className="text-emerald-400/80 text-[11px] mt-0.5">
              Microcontroller buses and sensors are passing live diagnostic checks. 100% hardware health.
            </p>
          </div>
        </div>
      )}

      {/* Component Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {components.map((comp) => {
          const Icon = comp.icon;
          const status = !isOnline
            ? { text: 'OFFLINE', color: 'text-slate-500 bg-slate-900 border-slate-800' }
            : comp.healthy
              ? { text: 'CONNECTED', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' }
              : { text: 'DISCONNECTED', color: 'text-amber-400 bg-amber-950/60 border-amber-500/40' };

          return (
            <div
              key={comp.id}
              className={`p-3.5 rounded-xl border transition-all ${
                !isOnline
                  ? 'bg-[#0d1322]/60 border-slate-800/80 opacity-60'
                  : comp.healthy
                    ? 'bg-[#0e1629] border-[#1e293b] hover:border-emerald-500/40'
                    : 'bg-[#1a1215] border-amber-900/50 hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${comp.healthy && isOnline ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-800 text-slate-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{comp.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{comp.pin}</span>
                  </div>
                </div>

                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${status.color}`}>
                  {status.text}
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-baseline justify-between text-[11px]">
                <span className="text-slate-400 text-[10px]">Real Value:</span>
                <span className={`font-mono font-semibold ${!isOnline ? 'text-slate-500' : comp.healthy ? 'text-cyan-300' : 'text-amber-400'}`}>
                  {!isOnline ? 'N/A' : comp.liveValue}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
