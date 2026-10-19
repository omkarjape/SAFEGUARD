import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('  SAFEGUARD: Seeding PostgreSQL Safety Database');
  console.log('====================================================');

  try {
    // 1. Clean existing records in reverse dependency order
    console.log('-> Cleaning existing records...');
    await prisma.sensorReading.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.locationReading.deleteMany();
    await prisma.device.deleteMany();
    await prisma.safetyJacket.deleteMany();
    await prisma.worker.deleteMany();
    await prisma.user.deleteMany();

    // 2. Seed Supervisor User
    console.log('-> Creating Safety Supervisor account...');
    await prisma.user.create({
      data: {
        email: 'supervisor@safeguard.internal',
        name: 'Industrial Safety Supervisor',
        passwordHash: '$2a$12$e8Y...dummyhashforprototype',
        role: 'SUPERVISOR',
        department: 'Plant Safety Operations'
      }
    });

    // 3. Seed Workers
    console.log('-> Seeding Industrial Workforce roster...');
    const w1 = await prisma.worker.create({
      data: {
        workerId: 'W001',
        name: 'Rajesh Kumar',
        department: 'Chemical Processing',
        designation: 'Senior Chemical Technician',
        phone: '+91 98765 43210',
        email: 'rajesh.k@industrial.internal',
        emergencyContact: '+91 98765 00001',
        shift: 'DAY',
        bloodGroup: 'O+',
        medicalNotes: 'Mild asthma, heat sensitive',
        safetyTrainingDate: '2024-03-15',
        status: 'SAFE'
      }
    });

    const w2 = await prisma.worker.create({
      data: {
        workerId: 'W002',
        name: 'Priya Sharma',
        department: 'Boiler Operations',
        designation: 'Boiler System Engineer',
        phone: '+91 98765 43211',
        email: 'priya.s@industrial.internal',
        emergencyContact: '+91 98765 00002',
        shift: 'SWING',
        bloodGroup: 'B+',
        medicalNotes: 'No chronic conditions',
        safetyTrainingDate: '2024-05-20',
        status: 'SAFE'
      }
    });

    const w3 = await prisma.worker.create({
      data: {
        workerId: 'W003',
        name: 'Amit Patel',
        department: 'Structural Fabrication',
        designation: 'High-Altitude Welder',
        phone: '+91 98765 43212',
        email: 'amit.p@industrial.internal',
        emergencyContact: '+91 98765 00003',
        shift: 'DAY',
        bloodGroup: 'A+',
        medicalNotes: 'Hypertension (managed with daily medication)',
        safetyTrainingDate: '2024-01-10',
        status: 'SAFE'
      }
    });

    await prisma.worker.create({
      data: {
        workerId: 'W004',
        name: 'Vikram Mehta',
        department: 'Refinery Maintenance',
        designation: 'Safety Officer (Reserve)',
        phone: '+91 98765 43213',
        email: 'vikram.m@industrial.internal',
        emergencyContact: '+91 98765 00004',
        shift: 'NIGHT',
        bloodGroup: 'AB+',
        medicalNotes: 'Annual certification up to date',
        safetyTrainingDate: '2024-06-01',
        status: 'SAFE'
      }
    });

    // 4. Seed Safety Jackets & Devices
    console.log('-> Seeding Smart Safety Jackets and ESP32 Nodes...');
    const sj1 = await prisma.safetyJacket.create({
      data: {
        jacketId: 'SJ001',
        model: 'ProArmor Sentinel-X',
        status: 'ACTIVE',
        workerId: w1.id
      }
    });

    const d1 = await prisma.device.create({
      data: {
        deviceId: 'ESP32_001',
        firmwareVersion: 'v2.4.1',
        ipAddress: '192.168.1.101',
        macAddress: '24:6F:28:AE:3C:80',
        wifiRssi: -58.0,
        batteryVoltage: 3.98,
        batteryPercentage: 94.0,
        connectionStatus: 'ONLINE',
        jacketId: sj1.id
      }
    });

    const sj2 = await prisma.safetyJacket.create({
      data: {
        jacketId: 'SJ002',
        model: 'ProArmor Sentinel-X',
        status: 'ACTIVE',
        workerId: w2.id
      }
    });

    await prisma.device.create({
      data: {
        deviceId: 'ESP32_002',
        firmwareVersion: 'v2.4.1',
        ipAddress: '192.168.1.102',
        macAddress: '24:6F:28:AE:3C:81',
        wifiRssi: -64.0,
        batteryVoltage: 4.05,
        batteryPercentage: 98.0,
        connectionStatus: 'ONLINE',
        jacketId: sj2.id
      }
    });

    const sj3 = await prisma.safetyJacket.create({
      data: {
        jacketId: 'SJ003',
        model: 'ProArmor Sentinel-X',
        status: 'ACTIVE',
        workerId: w3.id
      }
    });

    await prisma.device.create({
      data: {
        deviceId: 'ESP32_003',
        firmwareVersion: 'v2.4.1',
        ipAddress: '192.168.1.103',
        macAddress: '24:6F:28:AE:3C:82',
        wifiRssi: -52.0,
        batteryVoltage: 3.82,
        batteryPercentage: 88.0,
        connectionStatus: 'ONLINE',
        jacketId: sj3.id
      }
    });

    // Unassigned Reserve Jacket & Device
    const sj4 = await prisma.safetyJacket.create({
      data: {
        jacketId: 'SJ004',
        model: 'ProArmor Sentinel-X',
        status: 'INACTIVE'
      }
    });

    await prisma.device.create({
      data: {
        deviceId: 'ESP32_004',
        firmwareVersion: 'v2.4.1',
        ipAddress: '192.168.1.104',
        macAddress: '24:6F:28:AE:3C:83',
        wifiRssi: -60.0,
        batteryVoltage: 4.15,
        batteryPercentage: 100.0,
        connectionStatus: 'ONLINE',
        jacketId: sj4.id
      }
    });

    // 5. Seed Initial Sensor Telemetry Samples
    console.log('-> Seeding baseline sensor telemetry for physical prototype ESP32_001...');
    await prisma.sensorReading.create({
      data: {
        deviceId: d1.deviceId,
        jacketId: sj1.jacketId,
        workerId: w1.workerId,
        temperature: 28.2,
        humidity: 54.6,
        gasLevel: 108.0,
        airQuality: 68.0,
        flameDetected: false,
        fallDetected: false,
        sosPressed: false,
        batteryPercentage: 94.0,
        latitude: 19.7660,
        longitude: 74.4770
      }
    });

    console.log('====================================================');
    console.log('  SUCCESS: PostgreSQL Database Seed Completed!      ');
    console.log('====================================================');
  } catch (error) {
    console.warn('[Prisma Seed Notice] Could not complete database seeding:');
    console.warn(error instanceof Error ? error.message : String(error));
    console.log('\nTIP: To run a local PostgreSQL instance, execute:');
    console.log('  docker run --name safeguard-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16');
  } finally {
    await prisma.$disconnect();
  }
}

main();
