export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Smart Industrial Worker Safety IoT Platform API',
    version: '1.0.0',
    description: 'Enterprise REST API and real-time IoT gateway documentation for the Smart Industrial Worker Safety & Real-Time Monitoring System. Manages ESP32 smart jackets, live environmental/biometric sensors, incident escalation, and workforce tracking.',
    contact: {
      name: 'Industrial Safety Platform Support',
      email: 'safety-eng@industrial-iot.internal'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local IoT Gateway Server'
    }
  ],
  tags: [
    { name: 'System & Health', description: 'IoT Gateway heartbeat, system status, and aggregate dashboard metrics' },
    { name: 'Workers', description: 'Industrial workforce management, medical flags, shift scheduling, and jacket pairing' },
    { name: 'Devices & Fleet', description: 'ESP32 microcontroller provisioning, firmware tracking, RSSI, and self-test diagnostics' },
    { name: 'Safety Jackets', description: 'Smart wearable safety jacket inventory and status lifecycle' },
    { name: 'Sensor Telemetry', description: 'ESP32 sensor payload ingestion (DHT22, MQ-2, MQ-135, MPU6050, Flame, GPS) and time-series history' },
    { name: 'Alerts & Incidents', description: 'Safety hazard incident management, operator acknowledgment, and resolution auditing' },
    { name: 'Location Tracking', description: 'Plant GPS coordinates and personnel geo-monitoring' },
    { name: 'Physics Simulator', description: 'Multi-worker physics simulation engine, manual sensor injection lab, and disaster drill presets' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Service health check',
        description: 'Returns service uptime, status, and system timestamp.',
        responses: {
          '200': {
            description: 'Gateway is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'HEALTHY' },
                    service: { type: 'string', example: 'Smart Industrial Worker Safety IoT Gateway' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number', example: 120.45 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/dashboard/summary': {
      get: {
        tags: ['System & Health'],
        summary: 'Dashboard aggregate KPIs',
        description: 'Retrieves total workers, active count, safe workers, active alerts, and offline hardware count.',
        responses: {
          '200': {
            description: 'Aggregated safety metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/DashboardSummary' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/workers': {
      get: {
        tags: ['Workers'],
        summary: 'List all enrolled industrial workers',
        responses: {
          '200': {
            description: 'List of workers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Worker' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Workers'],
        summary: 'Enroll a new worker',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWorkerRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Worker enrolled successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Worker' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' }
        }
      }
    },
    '/workers/{id}': {
      get: {
        tags: ['Workers'],
        summary: 'Get worker profile and latest telemetry',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'W001' }
        ],
        responses: {
          '200': {
            description: 'Worker details with latest sensor data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/WorkerWithTelemetry' }
                  }
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFound' }
        }
      },
      put: {
        tags: ['Workers'],
        summary: 'Update worker details',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'W001' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateWorkerRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Worker updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Worker' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Workers'],
        summary: 'De-enroll worker safely',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'W001' }
        ],
        responses: {
          '200': {
            description: 'Worker removed from registry',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/workers/{id}/pair-jacket': {
      post: {
        tags: ['Workers'],
        summary: 'Atomically pair smart jacket and ESP32 device to worker',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'W001' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['jacketId'],
                properties: {
                  jacketId: { type: 'string', example: 'SJ001' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Pairing complete',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Worker' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/workers/{id}/unpair-jacket': {
      post: {
        tags: ['Workers'],
        summary: 'Unpair smart jacket from worker',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'W001' }
        ],
        responses: {
          '200': {
            description: 'Unpairing complete',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Worker' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/devices': {
      get: {
        tags: ['Devices & Fleet'],
        summary: 'List all registered ESP32 nodes',
        responses: {
          '200': {
            description: 'List of devices',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Device' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Devices & Fleet'],
        summary: 'Register new ESP32 microcontroller',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDeviceRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Device registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Device' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/devices/{id}': {
      get: {
        tags: ['Devices & Fleet'],
        summary: 'Get device metadata and connection status',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'ESP32_001' }
        ],
        responses: {
          '200': {
            description: 'Device details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Device' }
                  }
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Devices & Fleet'],
        summary: 'Update device metadata or status',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'ESP32_001' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateDeviceRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Device updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Device' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Devices & Fleet'],
        summary: 'Decommission device',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'ESP32_001' }
        ],
        responses: {
          '200': {
            description: 'Device deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/jackets': {
      get: {
        tags: ['Safety Jackets'],
        summary: 'List all safety jackets in inventory',
        responses: {
          '200': {
            description: 'List of safety jackets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/SafetyJacket' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Safety Jackets'],
        summary: 'Register new safety jacket model',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateJacketRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Jacket registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SafetyJacket' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/jackets/{id}': {
      delete: {
        tags: ['Safety Jackets'],
        summary: 'Retire safety jacket',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'SJ001' }
        ],
        responses: {
          '200': {
            description: 'Jacket retired',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/sensor-data': {
      post: {
        tags: ['Sensor Telemetry'],
        summary: 'Ingest physical/simulated ESP32 sensor packet',
        description: 'Endpoint used by ESP32 firmware via HTTP POST to stream JSON telemetry packets.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Esp32Payload' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Telemetry ingested successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        recorded: { $ref: '#/components/schemas/SensorReading' },
                        alertCreated: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' }
        }
      }
    },
    '/sensor-data/{deviceId}': {
      get: {
        tags: ['Sensor Telemetry'],
        summary: 'Get historical telemetry time-series for a device',
        parameters: [
          { name: 'deviceId', in: 'path', required: true, schema: { type: 'string' }, example: 'ESP32_001' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 60 }, description: 'Number of recent readings to fetch' }
        ],
        responses: {
          '200': {
            description: 'Historical sensor points',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/SensorReading' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/sensor-data/{deviceId}/latest': {
      get: {
        tags: ['Sensor Telemetry'],
        summary: 'Get most recent sensor reading for a device',
        parameters: [
          { name: 'deviceId', in: 'path', required: true, schema: { type: 'string' }, example: 'ESP32_001' }
        ],
        responses: {
          '200': {
            description: 'Latest reading',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SensorReading' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/alerts': {
      get: {
        tags: ['Alerts & Incidents'],
        summary: 'List safety hazard alerts',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] } }
        ],
        responses: {
          '200': {
            description: 'Filtered alerts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Alert' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Alerts & Incidents'],
        summary: 'Create custom hazard alert manually',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAlertRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Alert logged',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Alert' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/alerts/{id}/acknowledge': {
      patch: {
        tags: ['Alerts & Incidents'],
        summary: 'Acknowledge an active hazard alert',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Alert acknowledged',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Alert' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/alerts/{id}/resolve': {
      patch: {
        tags: ['Alerts & Incidents'],
        summary: 'Mark an alert as safely resolved',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Alert resolved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Alert' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/locations': {
      get: {
        tags: ['Location Tracking'],
        summary: 'Get all workforce GPS coordinates',
        responses: {
          '200': {
            description: 'List of personnel location coordinates',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/LocationReading' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/simulator/status': {
      get: {
        tags: ['Physics Simulator'],
        summary: 'Get simulation engine status and per-worker states',
        responses: {
          '200': {
            description: 'Engine status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SimulatorStatus' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/simulator/scenario': {
      post: {
        tags: ['Physics Simulator'],
        summary: 'Apply hazard scenario to specific worker',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['scenario'],
                properties: {
                  workerId: { type: 'string', default: 'W001' },
                  scenario: {
                    type: 'string',
                    enum: ['normal', 'high_temp', 'gas_warning', 'flame', 'fall', 'sos', 'low_battery', 'offline']
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Scenario applied',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SimulatorStatus' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/simulator/plant-scenario': {
      post: {
        tags: ['Physics Simulator'],
        summary: 'Trigger coordinated plant-wide disaster drill',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['scenario'],
                properties: {
                  scenario: {
                    type: 'string',
                    enum: [
                      'BASELINE_SAFE',
                      'CONFINED_SPACE_TOXIC_GAS',
                      'BOILER_ROOM_THERMAL_RUNAWAY',
                      'SCAFFOLDING_FALL_INCIDENT',
                      'MASS_EVACUATION_DRILL',
                      'DUAL_HAZARD_CRISIS'
                    ]
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Plant drill applied',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SimulatorStatus' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/simulator/override': {
      post: {
        tags: ['Physics Simulator'],
        summary: 'Inject fine-grained manual sensor overrides for a worker',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workerId', 'override'],
                properties: {
                  workerId: { type: 'string', example: 'W001' },
                  override: { $ref: '#/components/schemas/ManualSensorOverride' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Overrides applied',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SimulatorStatus' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/simulator/override/{workerId}': {
      delete: {
        tags: ['Physics Simulator'],
        summary: 'Clear manual overrides and resume natural physics simulation',
        parameters: [
          { name: 'workerId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Override cleared',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SimulatorStatus' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/simulator/configure': {
      post: {
        tags: ['Physics Simulator'],
        summary: 'Configure simulation engine heartbeat and run state',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  intervalMs: { type: 'number', minimum: 500, maximum: 10000, example: 3000 },
                  isRunning: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Engine updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SimulatorStatus' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/simulator/reset': {
      post: {
        tags: ['Physics Simulator'],
        summary: 'Reset plant workforce to safe baseline',
        responses: {
          '200': {
            description: 'Plant safety reset',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SimulatorStatus' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Worker: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workerId: { type: 'string', example: 'W001' },
          name: { type: 'string', example: 'Rajesh Kumar' },
          department: { type: 'string', example: 'Chemical Processing' },
          designation: { type: 'string', example: 'Senior Technician' },
          phone: { type: 'string', example: '+91 98765 43210' },
          email: { type: 'string', example: 'rajesh.k@industrial.internal' },
          emergencyContact: { type: 'string', example: '+91 98765 00001' },
          shift: { type: 'string', enum: ['DAY', 'NIGHT', 'SWING'], example: 'DAY' },
          bloodGroup: { type: 'string', example: 'O+' },
          medicalNotes: { type: 'string', example: 'Mild asthma; heat sensitive' },
          status: { type: 'string', enum: ['SAFE', 'WARNING', 'CRITICAL', 'OFFLINE'], example: 'SAFE' },
          jacketId: { type: 'string', example: 'SJ001' },
          deviceId: { type: 'string', example: 'ESP32_001' },
          lastSeen: { type: 'string', format: 'date-time' }
        }
      },
      CreateWorkerRequest: {
        type: 'object',
        required: ['workerId', 'name', 'department', 'designation', 'phone', 'emergencyContact'],
        properties: {
          workerId: { type: 'string', example: 'W004' },
          name: { type: 'string', example: 'Kavita Singh' },
          department: { type: 'string', example: 'Foundry & Smelting' },
          designation: { type: 'string', example: 'Furnace Operator' },
          phone: { type: 'string', example: '+91 91234 56789' },
          email: { type: 'string', example: 'kavita.s@industrial.internal' },
          emergencyContact: { type: 'string', example: '+91 91234 00002' },
          shift: { type: 'string', enum: ['DAY', 'NIGHT', 'SWING'], example: 'SWING' },
          bloodGroup: { type: 'string', example: 'B+' },
          medicalNotes: { type: 'string', example: 'No known allergies' }
        }
      },
      UpdateWorkerRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          department: { type: 'string' },
          designation: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          emergencyContact: { type: 'string' },
          shift: { type: 'string', enum: ['DAY', 'NIGHT', 'SWING'] },
          bloodGroup: { type: 'string' },
          medicalNotes: { type: 'string' }
        }
      },
      WorkerWithTelemetry: {
        allOf: [
          { $ref: '#/components/schemas/Worker' },
          {
            type: 'object',
            properties: {
              latestSensor: { $ref: '#/components/schemas/SensorReading' }
            }
          }
        ]
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          deviceId: { type: 'string', example: 'ESP32_001' },
          firmwareVersion: { type: 'string', example: 'v2.4.1' },
          ipAddress: { type: 'string', example: '192.168.1.101' },
          macAddress: { type: 'string', example: '24:6F:28:AE:3C:80' },
          wifiRssi: { type: 'number', example: -58 },
          batteryVoltage: { type: 'number', example: 3.98 },
          batteryPercentage: { type: 'number', example: 94 },
          connectionStatus: { type: 'string', enum: ['ONLINE', 'WARNING', 'OFFLINE', 'MAINTENANCE'], example: 'ONLINE' },
          assignedWorkerId: { type: 'string', example: 'W001' },
          jacketId: { type: 'string', example: 'SJ001' },
          lastSeen: { type: 'string', format: 'date-time' }
        }
      },
      CreateDeviceRequest: {
        type: 'object',
        required: ['deviceId', 'firmwareVersion'],
        properties: {
          deviceId: { type: 'string', example: 'ESP32_004' },
          firmwareVersion: { type: 'string', example: 'v2.4.1' },
          macAddress: { type: 'string', example: '24:6F:28:AE:40:99' },
          ipAddress: { type: 'string', example: '192.168.1.104' },
          wifiRssi: { type: 'number', example: -62 },
          batteryVoltage: { type: 'number', example: 4.10 }
        }
      },
      UpdateDeviceRequest: {
        type: 'object',
        properties: {
          firmwareVersion: { type: 'string' },
          ipAddress: { type: 'string' },
          macAddress: { type: 'string' },
          connectionStatus: { type: 'string', enum: ['ONLINE', 'WARNING', 'OFFLINE', 'MAINTENANCE'] },
          hardwareStatus: { type: 'string', enum: ['ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'] }
        }
      },
      SafetyJacket: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          jacketId: { type: 'string', example: 'SJ001' },
          model: { type: 'string', example: 'ProArmor Sentinel-X' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], example: 'ACTIVE' },
          workerId: { type: 'string', example: 'W001' },
          deviceId: { type: 'string', example: 'ESP32_001' }
        }
      },
      CreateJacketRequest: {
        type: 'object',
        required: ['jacketId', 'model'],
        properties: {
          jacketId: { type: 'string', example: 'SJ004' },
          model: { type: 'string', example: 'ProArmor Sentinel-X' }
        }
      },
      SensorReading: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          deviceId: { type: 'string', example: 'ESP32_001' },
          jacketId: { type: 'string', example: 'SJ001' },
          workerId: { type: 'string', example: 'W001' },
          temperature: { type: 'number', example: 28.4, description: 'Ambient temperature in °C (DHT22)' },
          humidity: { type: 'number', example: 54.2, description: 'Relative humidity in % (DHT22)' },
          gasLevel: { type: 'number', example: 112, description: 'Combustible gas & smoke in ppm (MQ-2)' },
          airQuality: { type: 'number', example: 74, description: 'Toxic gas air quality index / ppm (MQ-135)' },
          flameDetected: { type: 'boolean', example: false, description: 'IR optical flame detector latch' },
          fallDetected: { type: 'boolean', example: false, description: 'MPU6050 6-axis accelerometer fall shock' },
          sosPressed: { type: 'boolean', example: false, description: 'Manual emergency push-button latch' },
          batteryPercentage: { type: 'number', example: 92.5, description: 'Smart vest LiPo battery state of charge' },
          latitude: { type: 'number', example: 19.766012 },
          longitude: { type: 'number', example: 74.477034 },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      Esp32Payload: {
        type: 'object',
        required: [
          'deviceId',
          'jacketId',
          'workerId',
          'temperature',
          'humidity',
          'gasLevel',
          'airQuality',
          'flameDetected',
          'fallDetected',
          'sosPressed',
          'battery',
          'latitude',
          'longitude'
        ],
        properties: {
          deviceId: { type: 'string', example: 'ESP32_001' },
          jacketId: { type: 'string', example: 'SJ001' },
          workerId: { type: 'string', example: 'W001' },
          temperature: { type: 'number', example: 28.5 },
          humidity: { type: 'number', example: 55.0 },
          gasLevel: { type: 'number', example: 110 },
          airQuality: { type: 'number', example: 72 },
          flameDetected: { type: 'boolean', example: false },
          fallDetected: { type: 'boolean', example: false },
          sosPressed: { type: 'boolean', example: false },
          battery: { type: 'number', example: 94.0 },
          latitude: { type: 'number', example: 19.7660 },
          longitude: { type: 'number', example: 74.4770 }
        }
      },
      Alert: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workerId: { type: 'string', example: 'W001' },
          workerName: { type: 'string', example: 'Rajesh Kumar' },
          jacketId: { type: 'string', example: 'SJ001' },
          deviceId: { type: 'string', example: 'ESP32_001' },
          type: {
            type: 'string',
            enum: ['FALL_DETECTED', 'SOS_PRESSED', 'HIGH_TEMPERATURE', 'HIGH_GAS', 'POOR_AIR_QUALITY', 'FLAME_DETECTED', 'LOW_BATTERY', 'DEVICE_OFFLINE'],
            example: 'HIGH_GAS'
          },
          severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'], example: 'CRITICAL' },
          message: { type: 'string', example: 'Combustible gas spike > 520 ppm detected on jacket SJ001' },
          status: { type: 'string', enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'], example: 'ACTIVE' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateAlertRequest: {
        type: 'object',
        required: ['workerId', 'jacketId', 'deviceId', 'type', 'severity', 'message'],
        properties: {
          workerId: { type: 'string', example: 'W001' },
          jacketId: { type: 'string', example: 'SJ001' },
          deviceId: { type: 'string', example: 'ESP32_001' },
          type: { type: 'string', enum: ['FALL_DETECTED', 'SOS_PRESSED', 'HIGH_TEMPERATURE', 'HIGH_GAS', 'POOR_AIR_QUALITY', 'FLAME_DETECTED', 'LOW_BATTERY', 'DEVICE_OFFLINE'] },
          severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
          message: { type: 'string', example: 'Chemical leak observed near tank 4' }
        }
      },
      LocationReading: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workerId: { type: 'string', example: 'W001' },
          workerName: { type: 'string', example: 'Rajesh Kumar' },
          deviceId: { type: 'string', example: 'ESP32_001' },
          latitude: { type: 'number', example: 19.7660 },
          longitude: { type: 'number', example: 74.4770 },
          status: { type: 'string', enum: ['SAFE', 'WARNING', 'CRITICAL', 'OFFLINE'] },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      DashboardSummary: {
        type: 'object',
        properties: {
          totalWorkers: { type: 'number', example: 3 },
          activeWorkers: { type: 'number', example: 3 },
          safeWorkers: { type: 'number', example: 3 },
          activeAlerts: { type: 'number', example: 0 },
          offlineDevices: { type: 'number', example: 0 },
          systemStatus: {
            type: 'object',
            properties: {
              backendOnline: { type: 'boolean', example: true },
              iotGatewayOnline: { type: 'boolean', example: true },
              dbConnected: { type: 'boolean', example: true },
              uptimeSeconds: { type: 'number', example: 340 }
            }
          }
        }
      },
      SimulatorStatus: {
        type: 'object',
        properties: {
          isRunning: { type: 'boolean', example: true },
          intervalMs: { type: 'number', example: 3000 },
          activePlantScenario: { type: 'string', example: 'BASELINE_SAFE' },
          workerStates: { type: 'object' },
          tickCount: { type: 'number', example: 45 },
          lastTickTimestamp: { type: 'string', format: 'date-time' }
        }
      },
      ManualSensorOverride: {
        type: 'object',
        properties: {
          temperature: { type: 'number', example: 48.5 },
          humidity: { type: 'number', example: 42.0 },
          gasLevel: { type: 'number', example: 550 },
          airQuality: { type: 'number', example: 320 },
          flameDetected: { type: 'boolean', example: false },
          fallDetected: { type: 'boolean', example: true },
          sosPressed: { type: 'boolean', example: false },
          batteryPercentage: { type: 'number', example: 85.0 },
          wifiRssi: { type: 'number', example: -60 }
        }
      }
    },
    responses: {
      ValidationError: {
        description: 'Schema validation failure',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string', example: 'Request payload failed schema validation' },
                    details: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field: { type: 'string', example: 'phone' },
                          message: { type: 'string', example: 'Valid phone number required' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      NotFound: {
        description: 'Requested entity was not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'NOT_FOUND' },
                    message: { type: 'string', example: 'Resource not found' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const getPostmanCollection = () => {
  return {
    info: {
      name: 'Smart Industrial Worker Safety & Monitoring API',
      description: 'Complete Postman API Collection for the Industrial Worker Safety & Smart Jacket IoT Platform.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'System & Health',
        item: [
          {
            name: 'Health Check',
            request: { method: 'GET', url: '{{baseUrl}}/health' }
          },
          {
            name: 'Dashboard Summary',
            request: { method: 'GET', url: '{{baseUrl}}/dashboard/summary' }
          }
        ]
      },
      {
        name: 'Workers',
        item: [
          {
            name: 'Get All Workers',
            request: { method: 'GET', url: '{{baseUrl}}/workers' }
          },
          {
            name: 'Get Worker By ID',
            request: { method: 'GET', url: '{{baseUrl}}/workers/W001' }
          },
          {
            name: 'Enroll Worker',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/workers',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  workerId: 'W004',
                  name: 'Vikram Mehta',
                  department: 'Refinery Maintenance',
                  designation: 'Safety Inspector',
                  phone: '+91 98765 11111',
                  emergencyContact: '+91 98765 22222',
                  shift: 'DAY',
                  bloodGroup: 'A+'
                }, null, 2)
              }
            }
          },
          {
            name: 'Pair Smart Jacket',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/workers/W001/pair-jacket',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: { mode: 'raw', raw: JSON.stringify({ jacketId: 'SJ001' }, null, 2) }
            }
          }
        ]
      },
      {
        name: 'Devices & Fleet',
        item: [
          {
            name: 'List Devices',
            request: { method: 'GET', url: '{{baseUrl}}/devices' }
          },
          {
            name: 'Register ESP32 Device',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/devices',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  deviceId: 'ESP32_004',
                  firmwareVersion: 'v2.4.1',
                  macAddress: '24:6F:28:AE:55:01'
                }, null, 2)
              }
            }
          }
        ]
      },
      {
        name: 'Sensor Telemetry',
        item: [
          {
            name: 'Ingest ESP32 Telemetry',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/sensor-data',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  deviceId: 'ESP32_001',
                  jacketId: 'SJ001',
                  workerId: 'W001',
                  temperature: 28.5,
                  humidity: 55.0,
                  gasLevel: 110,
                  airQuality: 70,
                  flameDetected: false,
                  fallDetected: false,
                  sosPressed: false,
                  battery: 95.0,
                  latitude: 19.7660,
                  longitude: 74.4770
                }, null, 2)
              }
            }
          },
          {
            name: 'Get Latest Sensor Data',
            request: { method: 'GET', url: '{{baseUrl}}/sensor-data/ESP32_001/latest' }
          }
        ]
      },
      {
        name: 'Simulator & Physics Engine',
        item: [
          {
            name: 'Get Simulator Status',
            request: { method: 'GET', url: '{{baseUrl}}/simulator/status' }
          },
          {
            name: 'Inject Worker Scenario',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/simulator/scenario',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: { mode: 'raw', raw: JSON.stringify({ workerId: 'W001', scenario: 'gas_warning' }, null, 2) }
            }
          },
          {
            name: 'Trigger Plant Evacuation Drill',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/simulator/plant-scenario',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: { mode: 'raw', raw: JSON.stringify({ scenario: 'MASS_EVACUATION_DRILL' }, null, 2) }
            }
          },
          {
            name: 'Reset All Workers to Safe Baseline',
            request: { method: 'POST', url: '{{baseUrl}}/simulator/reset' }
          }
        ]
      }
    ],
    variable: [
      { key: 'baseUrl', value: 'http://localhost:5000/api' }
    ]
  };
};
