export type QCStatus = 'VALID' | 'SUSPECT' | 'CRITICAL_ANOMALY' | 'MISSING';

export type RuleType = 
  | 'PHYSICAL_LIMIT' 
  | 'PERSISTENCE_LOCKUP' 
  | 'STEP_RATE' 
  | 'MISSING_VALUE' 
  | 'THERMODYNAMIC_CONSISTENCY';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AlertStatus = 
  | 'OPEN' 
  | 'UNDER_INVESTIGATION' 
  | 'ACKNOWLEDGED' 
  | 'CALIBRATION_REQUIRED' 
  | 'RESOLVED';

export type MissingValueStrategy = 
  | 'QUARANTINE_FLAG' 
  | 'LINEAR_INTERPOLATION' 
  | 'FORWARD_FILL' 
  | 'EXCLUDE_DROP';

export interface QCAnomaly {
  id: string;
  recordId: string;
  timestamp: string;
  stationId: string;
  stationName: string;
  metric: 'temperature' | 'humidity' | 'pressure' | 'windSpeed' | 'solarRadiation' | 'dewPoint';
  ruleType: RuleType;
  severity: AlertSeverity;
  observedValue: number | null | string;
  expectedRange: string;
  deviation: string;
  description: string;
  scientificExplanation: string;
  status: AlertStatus;
  investigationNotes?: string;
  flaggedAt: string;
  resolvedAt?: string;
}

export interface WeatherRecord {
  id: string;
  timestamp: string;
  stationId: string;
  stationName: string;
  temperature: number | null; // Celsius
  humidity: number | null;    // % (0-100)
  pressure: number | null;    // hPa
  windSpeed: number | null;   // m/s
  solarRadiation: number | null; // W/m^2
  dewPoint: number | null;    // Celsius
  qcStatus: QCStatus;
  qcFlags: QCAnomaly[];
  isSyntheticTest?: boolean;  // Tagged for QA benchmark test rows (e.g. 95°C spike)
  isStuckSequence?: boolean;  // Part of repeated/stuck sensor sequence
  isMissing?: boolean;        // Contains missing telemetric payload
  imputedFields?: string[];   // Fields adjusted via imputation
}

export interface StationMetadata {
  id: string;
  name: string;
  location: string;
  elevation: number; // meters
  sensorModel: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL_OFFLINE';
  lastPing: string;
}

export interface DatasetStats {
  totalRecords: number;
  validRecords: number;
  anomalousRecords: number;
  missingRecords: number;
  qcPassRate: number; // percentage
  metrics: {
    temperature: MetricSummary;
    humidity: MetricSummary;
    pressure: MetricSummary;
    windSpeed: MetricSummary;
    solarRadiation: MetricSummary;
  };
  anomalyBreakdown: {
    physicalLimit: number;
    persistenceLockup: number;
    stepRate: number;
    missingValue: number;
    thermodynamic: number;
  };
}

export interface MetricSummary {
  min: number | null;
  max: number | null;
  mean: number | null;
  stdDev: number | null;
  missingCount: number;
}

export interface DatasetOption {
  id: string;
  title: string;
  tag: string;
  description: string;
  recordCount: number;
  isDemo: boolean;
  contains95CSpike: boolean;
  containsStuckReadings: boolean;
  containsMissingData: boolean;
}

export type UserRole = 'LEAD_QA_ENGINEER' | 'FIELD_TECHNICIAN' | 'HACKATHON_JUDGE';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  stationClearance: string[];
  loginTimestamp: string;
  sessionActions: string[];
}

export interface SessionSummary {
  user: UserSession;
  durationMinutes: number;
  actionsPerformed: string[];
  logoutTimestamp: string;
}
