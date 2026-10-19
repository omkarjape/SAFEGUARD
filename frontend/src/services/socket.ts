import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const activeSubscriptions = new Set<string>();

export const getSocket = (): Socket => {
  if (!socket) {
    const gatewayUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : `${window.location.protocol}//${window.location.hostname}:5000`;

    socket = io(gatewayUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to industrial IoT Gateway:', socket?.id);
      // Resubscribe to rooms on reconnect
      activeSubscriptions.forEach(sub => {
        if (sub.startsWith('worker:')) {
          socket?.emit('subscribe_worker', sub.replace('worker:', ''));
        } else if (sub.startsWith('device:')) {
          socket?.emit('subscribe_device', sub.replace('device:', ''));
        }
      });
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket.IO] Disconnected from IoT Gateway:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });
  }

  return socket;
};

// Targeted Room Subscriptions
export const subscribeWorker = (workerId: string): void => {
  const s = getSocket();
  const room = `worker:${workerId}`;
  activeSubscriptions.add(room);
  s.emit('subscribe_worker', workerId);
};

export const unsubscribeWorker = (workerId: string): void => {
  const s = getSocket();
  const room = `worker:${workerId}`;
  activeSubscriptions.delete(room);
  s.emit('unsubscribe_worker', workerId);
};

export const subscribeDevice = (deviceId: string): void => {
  const s = getSocket();
  const room = `device:${deviceId}`;
  activeSubscriptions.add(room);
  s.emit('subscribe_device', deviceId);
};

export const unsubscribeDevice = (deviceId: string): void => {
  const s = getSocket();
  const room = `device:${deviceId}`;
  activeSubscriptions.delete(room);
  s.emit('unsubscribe_device', deviceId);
};

export const getActiveSubscriptionsCount = (): number => {
  return activeSubscriptions.size;
};

// Real-Time Hardware Actuation Dispatch with Promise Ack
export const dispatchEmergencyBuzzer = (
  deviceId: string,
  workerId?: string,
  reason?: string
): Promise<{ success: boolean; message: string; timestamp: string; deviceId: string }> => {
  const s = getSocket();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Hardware buzzer dispatch timed out waiting for gateway ack'));
    }, 4000);

    s.emit('dispatch_buzzer', { deviceId, workerId, reason }, (response: any) => {
      clearTimeout(timeout);
      if (response && response.success) {
        resolve(response);
      } else {
        reject(new Error(response?.message || 'Buzzer activation failed'));
      }
    });
  });
};

// Real-Time Ping / RTT Latency Measurement
export const measureLatency = (): Promise<number> => {
  const s = getSocket();
  if (!s.connected) {
    return Promise.resolve(-1);
  }

  const start = Date.now();
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(-1), 2500);

    s.emit('ping_latency', start, () => {
      clearTimeout(timer);
      const rtt = Date.now() - start;
      resolve(rtt);
    });
  });
};

// Active transport inspector
export const getTransportType = (): string => {
  if (!socket) return 'none';
  return (socket as any).io?.engine?.transport?.name?.toUpperCase() || 'WS';
};
