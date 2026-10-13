import { WeatherRecord, DatasetOption, StationMetadata } from '../types';

export const STATIONS: StationMetadata[] = [
  {
    id: 'STN-01',
    name: 'Alpine Valley Ridge',
    location: 'Lat 46.204° N, Lon 7.852° E',
    elevation: 1840,
    sensorModel: 'Vaisala HMP155 / PT100 RTD Class A',
    status: 'DEGRADED',
    lastPing: '2 mins ago',
  },
  {
    id: 'STN-02',
    name: 'Coastal Harbor Pier',
    location: 'Lat 34.019° N, Lon -118.491° W',
    elevation: 8,
    sensorModel: 'Campbell Scientific CS215 / Baro Druck RPT410',
    status: 'DEGRADED',
    lastPing: '1 min ago',
  },
  {
    id: 'STN-03',
    name: 'Desert Basin Mesonet',
    location: 'Lat 33.448° N, Lon -112.074° W',
    elevation: 330,
    sensorModel: 'Met One 083E-1 / Kipp & Zonen CMP11',
    status: 'OPERATIONAL',
    lastPing: '45 secs ago',
  },
];

export const DATASET_OPTIONS: DatasetOption[] = [
  {
    id: 'benchmark-hackathon',
    title: 'National Hackathon QA Benchmark Suite',
    tag: 'Demo Benchmark (Stress-Tested)',
    description: 'Gold standard QA test suite featuring the synthetic 95.2°C temperature spike, 5-tick ADC stuck sensor lockup, and packet dropout gaps.',
    recordCount: 96,
    isDemo: true,
    contains95CSpike: true,
    containsStuckReadings: true,
    containsMissingData: true,
  },
  {
    id: 'alpine-icing',
    title: 'Alpine Sub-Zero & Rime Icing Simulation',
    tag: 'Simulated Cold Region',
    description: 'Sub-zero mountain pass telemetric simulation with mechanical anemometer rime-icing lockups and low battery brownouts.',
    recordCount: 48,
    isDemo: true,
    contains95CSpike: false,
    containsStuckReadings: true,
    containsMissingData: true,
  },
  {
    id: 'desert-solar',
    title: 'Desert Arid Array with Solar Saturation',
    tag: 'Simulated Extreme Heat',
    description: 'High diurnal temperature range (14°C to 48.5°C) with pyranometer solar radiation flux spikes and thermodynamic checks.',
    recordCount: 48,
    isDemo: true,
    contains95CSpike: false,
    containsStuckReadings: false,
    containsMissingData: false,
  },
  {
    id: 'pristine-control',
    title: 'WMO Pristine Control Baseline (100% Valid)',
    tag: 'Verification Control Suite',
    description: 'Clean reference dataset strictly conforming to WMO-No. 8 physical and step-rate envelopes. Zero anomalies.',
    recordCount: 48,
    isDemo: true,
    contains95CSpike: false,
    containsStuckReadings: false,
    containsMissingData: false,
  },
];

export function generateBenchmarkDataset(): WeatherRecord[] {
  const records: WeatherRecord[] = [];
  const baseDate = new Date('2026-10-13T00:00:00Z');

  // 96 observations at 15-minute intervals across 24 hours
  for (let i = 0; i < 96; i++) {
    const timestamp = new Date(baseDate.getTime() + i * 15 * 60 * 1000).toISOString();
    const timeLabel = timestamp.substring(11, 16);
    const hour = parseInt(timeLabel.substring(0, 2), 10);
    const minute = parseInt(timeLabel.substring(3, 5), 10);

    // Baseline diurnal curve: cooler at 05:00, peak at 14:00
    const diurnalFactor = Math.sin(((hour + minute / 60 - 8) / 24) * 2 * Math.PI);
    let temp: number | null = Number((16.5 + diurnalFactor * 7.2 + (Math.sin(i * 0.4) * 0.4)).toFixed(2));
    let humidity: number | null = Number((68.0 - diurnalFactor * 25.0 + (Math.cos(i * 0.3) * 1.5)).toFixed(1));
    let pressure: number | null = Number((1012.4 + Math.sin(i * 0.1) * 2.1).toFixed(1));
    let windSpeed: number | null = Number((3.8 + Math.abs(Math.sin(i * 0.2)) * 4.2).toFixed(1));
    let solarRadiation: number | null = hour >= 6 && hour <= 18 ? Number((Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI) * 820 + Math.random() * 20)).toFixed(1)) : 0;
    let dewPoint: number | null = Number((temp - ((100 - humidity) / 5)).toFixed(1));

    let isSyntheticTest = false;
    let isStuckSequence = false;
    let isMissing = false;

    // INJECTION 1: The Synthetic 95.2°C Temperature Test Reading at 14:15 (Index 57)
    // Specifically requested to verify the system flags this synthetic physical limit violation
    if (i === 57) {
      temp = 95.2; // EXTREME PHYSICAL LIMIT VIOLATION (Death Valley record is 56.7°C)
      isSyntheticTest = true;
    }

    // INJECTION 2: Repeated Readings / Stuck Sensor Persistence at 04:00 - 05:00 (Indices 16, 17, 18, 19, 20)
    // 5 consecutive timestamps with EXACTLY 12.450°C and 82.10% humidity (Zero Delta)
    if (i >= 16 && i <= 20) {
      temp = 12.450;
      humidity = 82.10;
      isStuckSequence = true;
    }

    // INJECTION 3: Missing Telemetry / Frame Dropout at 07:30 - 08:00 (Indices 30, 31)
    if (i === 30) {
      temp = null;
      humidity = null;
      isMissing = true;
    } else if (i === 31) {
      pressure = null;
      isMissing = true;
    }

    // INJECTION 4: Step-Rate Jump at 11:30 (Index 46) on Desert Edge
    if (i === 46) {
      temp = 38.8; // Instant jump of +17.5°C over prior reading 21.3°C
    }

    // INJECTION 5: Thermodynamic Inversion at 21:00 (Index 84)
    if (i === 84) {
      temp = 15.2;
      dewPoint = 19.8; // Dew point exceeding dry bulb temperature
    }

    records.push({
      id: `BENCH-${i + 1}`,
      timestamp,
      stationId: i % 2 === 0 ? 'STN-01' : (i % 3 === 0 ? 'STN-03' : 'STN-02'),
      stationName: i % 2 === 0 ? 'Alpine Valley Ridge' : (i % 3 === 0 ? 'Desert Basin Mesonet' : 'Coastal Harbor Pier'),
      temperature: temp,
      humidity,
      pressure,
      windSpeed,
      solarRadiation,
      dewPoint,
      qcStatus: 'VALID',
      qcFlags: [],
      isSyntheticTest,
      isStuckSequence,
      isMissing,
    });
  }

  return records;
}

export function generateAlpineIcingDataset(): WeatherRecord[] {
  const records: WeatherRecord[] = [];
  const baseDate = new Date('2026-10-13T00:00:00Z');

  for (let i = 0; i < 48; i++) {
    const timestamp = new Date(baseDate.getTime() + i * 30 * 60 * 1000).toISOString();
    let temp: number | null = Number((-12.4 + Math.sin(i * 0.2) * 4.5).toFixed(2));
    let humidity: number | null = Number((88.0 + Math.sin(i * 0.4) * 8.0).toFixed(1));
    let pressure: number | null = Number((895.0 + Math.cos(i * 0.1) * 6.0).toFixed(1));
    let windSpeed: number | null = Number((8.5 + Math.sin(i * 0.3) * 5.0).toFixed(1));

    let isStuckSequence = false;
    let isMissing = false;

    // Rime icing anemometer jam: wind speed stuck at exactly 0.00 m/s for 6 ticks
    if (i >= 22 && i <= 27) {
      windSpeed = 0.00;
      isStuckSequence = true;
    }

    // Telemetry brownout
    if (i === 14) {
      temp = null;
      isMissing = true;
    }

    records.push({
      id: `ALPINE-${i + 1}`,
      timestamp,
      stationId: 'STN-01',
      stationName: 'Alpine Valley Ridge',
      temperature: temp,
      humidity,
      pressure,
      windSpeed,
      solarRadiation: 120,
      dewPoint: temp ? Number((temp - 2.1).toFixed(1)) : null,
      qcStatus: 'VALID',
      qcFlags: [],
      isStuckSequence,
      isMissing,
    });
  }

  return records;
}

export function generateDesertSolarDataset(): WeatherRecord[] {
  const records: WeatherRecord[] = [];
  const baseDate = new Date('2026-10-13T00:00:00Z');

  for (let i = 0; i < 48; i++) {
    const timestamp = new Date(baseDate.getTime() + i * 30 * 60 * 1000).toISOString();
    const hour = parseInt(timestamp.substring(11, 13), 10);
    const diurnal = Math.sin(((hour - 7) / 24) * 2 * Math.PI);
    let temp: number | null = Number((28.0 + diurnal * 16.5).toFixed(2));
    let humidity: number | null = Number((22.0 - diurnal * 12.0).toFixed(1));
    let solar: number | null = hour >= 6 && hour <= 18 ? Number((Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI) * 1150)).toFixed(1)) : 0;

    // Single solar pyranometer saturation anomaly (> 1400 W/m2)
    if (i === 24) {
      solar = 1485.0; // Above solar constant
    }

    records.push({
      id: `DESERT-${i + 1}`,
      timestamp,
      stationId: 'STN-03',
      stationName: 'Desert Basin Mesonet',
      temperature: temp,
      humidity,
      pressure: 980.2,
      windSpeed: 4.5,
      solarRadiation: solar,
      dewPoint: temp ? Number((temp - 20.0).toFixed(1)) : null,
      qcStatus: 'VALID',
      qcFlags: [],
    });
  }

  return records;
}

export function generatePristineControlDataset(): WeatherRecord[] {
  const records: WeatherRecord[] = [];
  const baseDate = new Date('2026-10-13T00:00:00Z');

  for (let i = 0; i < 48; i++) {
    const timestamp = new Date(baseDate.getTime() + i * 30 * 60 * 1000).toISOString();
    const hour = parseInt(timestamp.substring(11, 13), 10);
    const diurnal = Math.sin(((hour - 8) / 24) * 2 * Math.PI);
    // Controlled smooth realistic readings
    const temp = Number((18.0 + diurnal * 5.5 + Math.sin(i * 0.5) * 0.3).toFixed(2));
    const humidity = Number((65.0 - diurnal * 15.0 + Math.cos(i * 0.4) * 0.8).toFixed(1));
    const pressure = Number((1014.2 + Math.sin(i * 0.1) * 1.5).toFixed(1));
    const windSpeed = Number((4.1 + Math.sin(i * 0.3) * 1.8).toFixed(1));
    const solar = hour >= 6 && hour <= 18 ? Number((Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI) * 720)).toFixed(1)) : 0;
    const dewPoint = Number((temp - ((100 - humidity) / 5)).toFixed(1));

    records.push({
      id: `CTRL-${i + 1}`,
      timestamp,
      stationId: 'STN-02',
      stationName: 'Coastal Harbor Pier',
      temperature: temp,
      humidity,
      pressure,
      windSpeed,
      solarRadiation: solar,
      dewPoint,
      qcStatus: 'VALID',
      qcFlags: [],
    });
  }

  return records;
}

export function loadDatasetById(id: string): WeatherRecord[] {
  switch (id) {
    case 'benchmark-hackathon':
      return generateBenchmarkDataset();
    case 'alpine-icing':
      return generateAlpineIcingDataset();
    case 'desert-solar':
      return generateDesertSolarDataset();
    case 'pristine-control':
      return generatePristineControlDataset();
    default:
      return generateBenchmarkDataset();
  }
}
