import { PrismaClient } from '@prisma/client';
import net from 'net';

let prisma: PrismaClient | null = null;
let isDatabaseConnected: boolean = false;
let lastCheckTimestamp: string = new Date().toISOString();

try {
  prisma = new PrismaClient({
    log: [] // Silent logging: in-memory mode is active when PostgreSQL is not installed
  });
} catch (err) {
  prisma = null;
}

const isPortOpen = (port: number = 5432, host: string = 'localhost'): Promise<boolean> => {
  return new Promise(resolve => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(400);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
  lastCheckTimestamp = new Date().toISOString();
  if (!prisma) {
    isDatabaseConnected = false;
    return false;
  }

  // Pre-check socket connection before invoking Prisma to avoid noisy connection errors
  const portReachable = await isPortOpen(5432, 'localhost');
  if (!portReachable) {
    isDatabaseConnected = false;
    return false;
  }

  try {
    const connectionPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out after 2000ms')), 2000)
    );

    await Promise.race([connectionPromise, timeoutPromise]);
    isDatabaseConnected = true;
    return true;
  } catch (err: any) {
    isDatabaseConnected = false;
    return false;
  }
};

export const getDbStatus = () => {
  return {
    isConnected: isDatabaseConnected,
    mode: isDatabaseConnected ? ('POSTGRESQL' as const) : ('IN_MEMORY' as const),
    lastChecked: lastCheckTimestamp
  };
};

export { prisma };
