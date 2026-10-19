import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket: Socket) => {
    const transportName = socket.conn.transport.name;
    console.log(`[Socket.IO] Client connected: ${socket.id} (Transport: ${transportName})`);

    // Worker Room Subscriptions
    socket.on('subscribe_worker', (workerId: string) => {
      const room = `worker:${workerId}`;
      socket.join(room);
      console.log(`[Socket.IO] ${socket.id} subscribed to ${room}`);
    });

    socket.on('unsubscribe_worker', (workerId: string) => {
      const room = `worker:${workerId}`;
      socket.leave(room);
      console.log(`[Socket.IO] ${socket.id} unsubscribed from ${room}`);
    });

    // Device Room Subscriptions
    socket.on('subscribe_device', (deviceId: string) => {
      const room = `device:${deviceId}`;
      socket.join(room);
      console.log(`[Socket.IO] ${socket.id} subscribed to ${room}`);
    });

    socket.on('unsubscribe_device', (deviceId: string) => {
      const room = `device:${deviceId}`;
      socket.leave(room);
      console.log(`[Socket.IO] ${socket.id} unsubscribed from ${room}`);
    });

    // Plant-Wide Overview & Alerts Channels
    socket.on('subscribe_alerts', () => {
      socket.join('safety_alerts');
    });

    socket.on('unsubscribe_alerts', () => {
      socket.leave('safety_alerts');
    });

    socket.on('subscribe_plant', () => {
      socket.join('plant_overview');
    });

    socket.on('unsubscribe_plant', () => {
      socket.leave('plant_overview');
    });

    // Latency Ping / Heartbeat RTT Probe
    socket.on('ping_latency', (clientTimestamp: number, ack?: (res: any) => void) => {
      if (typeof ack === 'function') {
        ack({
          clientTimestamp,
          serverTimestamp: Date.now()
        });
      }
    });

    // Bi-directional Emergency Hardware Actuation Command
    socket.on('dispatch_buzzer', (payload: { workerId?: string; deviceId: string; reason?: string }, ack?: (res: any) => void) => {
      console.log(`[Socket.IO] Actuating emergency buzzer on device ${payload.deviceId}: ${payload.reason || 'Manual Dispatch'}`);

      // Emit hardware actuation command to targeted device room
      io?.to(`device:${payload.deviceId}`).emit('buzzer_command', {
        deviceId: payload.deviceId,
        workerId: payload.workerId,
        action: 'BUZZER_ALARM_ON',
        reason: payload.reason || 'Supervisor Emergency Signal',
        timestamp: new Date().toISOString()
      });

      // Acknowledge back to sender
      if (typeof ack === 'function') {
        ack({
          success: true,
          deviceId: payload.deviceId,
          action: 'BUZZER_ALARM_ON',
          timestamp: new Date().toISOString(),
          message: `Hardware buzzer activation confirmed for ${payload.deviceId}`
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
}

export function emitEvent(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}

export function emitToWorker(workerId: string, event: string, data: any): void {
  if (io) {
    io.to(`worker:${workerId}`).emit(event, data);
  }
}

export function emitToDevice(deviceId: string, event: string, data: any): void {
  if (io) {
    io.to(`device:${deviceId}`).emit(event, data);
  }
}

export function emitToRoom(room: string, event: string, data: any): void {
  if (io) {
    io.to(room).emit(event, data);
  }
}
