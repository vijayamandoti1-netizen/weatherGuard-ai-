import { WeatherRecord, QCAnomaly, RuleType, AlertSeverity, MissingValueStrategy, DatasetStats, MetricSummary } from '../types';

export const WMO_PHYSICAL_BOUNDS = {
  temperature: { min: -80, max: 60, unit: '°C', standardMax: 56.7 },
  humidity: { min: 0, max: 100, unit: '%' },
  pressure: { min: 800, max: 1085, unit: 'hPa' },
  windSpeed: { min: 0, max: 75, unit: 'm/s' },
  solarRadiation: { min: 0, max: 1400, unit: 'W/m²' },
};

export const STEP_RATE_THRESHOLDS = {
  temperature: 8.0, // °C max delta between consecutive standard 5-min intervals
  pressure: 4.0,    // hPa max delta
  humidity: 30.0,   // % max delta
};

export const PERSISTENCE_CONSECUTIVE_LIMIT = 4; // 4+ invariant readings = stuck sensor

/**
 * Runs WMO-No. 8 compliant automated quality control tests on a stream of weather station records.
 */
export function runQualityControl(
  records: WeatherRecord[],
  missingStrategy: MissingValueStrategy = 'QUARANTINE_FLAG'
): { auditedRecords: WeatherRecord[]; allAnomalies: QCAnomaly[] } {
  const anomalies: QCAnomaly[] = [];
  
  // Clone records to avoid mutating original source
  let processed: WeatherRecord[] = records.map((r) => ({
    ...r,
    qcFlags: [...(r.qcFlags || [])],
  }));

  // Step 1: Missing value handling and imputation if requested
  if (missingStrategy === 'LINEAR_INTERPOLATION') {
    processed = applyLinearInterpolation(processed);
  } else if (missingStrategy === 'FORWARD_FILL') {
    processed = applyForwardFill(processed);
  } else if (missingStrategy === 'EXCLUDE_DROP') {
    processed = processed.filter(
      (r) => r.temperature !== null && r.humidity !== null && r.pressure !== null
    );
  }

  // Step 2: Group by station to evaluate step-rate and persistence checks accurately
  const stationGroups = new Map<string, WeatherRecord[]>();
  for (const r of processed) {
    if (!stationGroups.has(r.stationId)) {
      stationGroups.set(r.stationId, []);
    }
    stationGroups.get(r.stationId)!.push(r);
  }

  // Step 3: Run QC rule validations
  for (const [stationId, stnRecords] of stationGroups.entries()) {
    // Sort chronologically by timestamp
    stnRecords.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Track streaks for persistence test
    let tempStreakValue: number | null = null;
    let tempStreakCount = 0;
    let tempStreakStartIndex = 0;

    let humidStreakValue: number | null = null;
    let humidStreakCount = 0;
    let humidStreakStartIndex = 0;

    for (let i = 0; i < stnRecords.length; i++) {
      const rec = stnRecords[i];
      const prevRec = i > 0 ? stnRecords[i - 1] : null;
      const recAnomalies: QCAnomaly[] = [];

      // Test 1: Missing Value Validation
      if (rec.temperature === null || isNaN(rec.temperature)) {
        recAnomalies.push(createAnomaly({
          recordId: rec.id,
          timestamp: rec.timestamp,
          stationId: rec.stationId,
          stationName: rec.stationName,
          metric: 'temperature',
          ruleType: 'MISSING_VALUE',
          severity: 'HIGH',
          observedValue: 'NULL / DROP',
          expectedRange: '[-80°C to 60°C]',
          deviation: 'Complete Telemetry Null',
          description: 'Temperature sensor telemetric frame dropout.',
          scientificExplanation: 'Automated weather station failed to transmit valid numeric register value. Suggests solar voltage sag, packet loss, or bus timeout.',
        }));
      }

      if (rec.humidity === null || isNaN(rec.humidity)) {
        recAnomalies.push(createAnomaly({
          recordId: rec.id,
          timestamp: rec.timestamp,
          stationId: rec.stationId,
          stationName: rec.stationName,
          metric: 'humidity',
          ruleType: 'MISSING_VALUE',
          severity: 'HIGH',
          observedValue: 'NULL / DROP',
          expectedRange: '[0% to 100%]',
          deviation: 'Complete Telemetry Null',
          description: 'Hygrometer telemetric frame dropout.',
          scientificExplanation: 'Missing relative humidity reading. Sensor channel unresponsive.',
        }));
      }

      if (rec.pressure === null || isNaN(rec.pressure)) {
        recAnomalies.push(createAnomaly({
          recordId: rec.id,
          timestamp: rec.timestamp,
          stationId: rec.stationId,
          stationName: rec.stationName,
          metric: 'pressure',
          ruleType: 'MISSING_VALUE',
          severity: 'MEDIUM',
          observedValue: 'NULL / DROP',
          expectedRange: '[800 to 1085 hPa]',
          deviation: 'Barometer Null',
          description: 'Barometric sensor missing telemetry.',
          scientificExplanation: 'Barometric pressure sensor data stream absent.',
        }));
      }

      // Test 2: Physical Limit Envelope (Crucial: synthetic 95°C test reading flagged here!)
      if (rec.temperature !== null && !isNaN(rec.temperature)) {
        if (rec.temperature > WMO_PHYSICAL_BOUNDS.temperature.max) {
          recAnomalies.push(createAnomaly({
            recordId: rec.id,
            timestamp: rec.timestamp,
            stationId: rec.stationId,
            stationName: rec.stationName,
            metric: 'temperature',
            ruleType: 'PHYSICAL_LIMIT',
            severity: 'CRITICAL',
            observedValue: `${rec.temperature.toFixed(1)}°C`,
            expectedRange: `[${WMO_PHYSICAL_BOUNDS.temperature.min}°C to ${WMO_PHYSICAL_BOUNDS.temperature.max}°C]`,
            deviation: `+${(rec.temperature - WMO_PHYSICAL_BOUNDS.temperature.max).toFixed(1)}°C above upper ceiling`,
            description: `Extreme Temperature Anomaly: Reading of ${rec.temperature.toFixed(1)}°C exceeds terrestrial physical limit.`,
            scientificExplanation: `Earth absolute terrestrial maximum temperature on record is 56.7°C (Death Valley, CA). An observation of ${rec.temperature.toFixed(1)}°C violates climatological physical boundaries by +${(rec.temperature - 56.7).toFixed(1)}°C. High probability of PT100 RTD resistance open-circuit, moisture bridging, or 5V reference rail short.`,
          }));
        } else if (rec.temperature < WMO_PHYSICAL_BOUNDS.temperature.min) {
          recAnomalies.push(createAnomaly({
            recordId: rec.id,
            timestamp: rec.timestamp,
            stationId: rec.stationId,
            stationName: rec.stationName,
            metric: 'temperature',
            ruleType: 'PHYSICAL_LIMIT',
            severity: 'CRITICAL',
            observedValue: `${rec.temperature.toFixed(1)}°C`,
            expectedRange: `[${WMO_PHYSICAL_BOUNDS.temperature.min}°C to ${WMO_PHYSICAL_BOUNDS.temperature.max}°C]`,
            deviation: `${(rec.temperature - WMO_PHYSICAL_BOUNDS.temperature.min).toFixed(1)}°C below terrestrial floor`,
            description: `Sub-Terrestrial Temperature Floor Violation (${rec.temperature.toFixed(1)}°C).`,
            scientificExplanation: `Reading falls below WMO terrestrial physical limit (-80.0°C). Indicative of transducer zero-voltage grounding failure.`,
          }));
        }
      }

      // Physical Limit: Humidity
      if (rec.humidity !== null && !isNaN(rec.humidity)) {
        if (rec.humidity < 0 || rec.humidity > 100) {
          recAnomalies.push(createAnomaly({
            recordId: rec.id,
            timestamp: rec.timestamp,
            stationId: rec.stationId,
            stationName: rec.stationName,
            metric: 'humidity',
            ruleType: 'PHYSICAL_LIMIT',
            severity: 'HIGH',
            observedValue: `${rec.humidity.toFixed(1)}%`,
            expectedRange: '[0% to 100%]',
            deviation: rec.humidity > 100 ? `+${(rec.humidity - 100).toFixed(1)}%` : `${rec.humidity.toFixed(1)}%`,
            description: `Relative humidity out of physical bounds (${rec.humidity.toFixed(1)}%).`,
            scientificExplanation: 'Relative humidity represents vapor pressure divided by saturation vapor pressure; mathematically bounded between 0% and 100%. Capacitive polymer sensor requires recalibration.',
          }));
        }
      }

      // Physical Limit: Pressure
      if (rec.pressure !== null && !isNaN(rec.pressure)) {
        if (rec.pressure < WMO_PHYSICAL_BOUNDS.pressure.min || rec.pressure > WMO_PHYSICAL_BOUNDS.pressure.max) {
          recAnomalies.push(createAnomaly({
            recordId: rec.id,
            timestamp: rec.timestamp,
            stationId: rec.stationId,
            stationName: rec.stationName,
            metric: 'pressure',
            ruleType: 'PHYSICAL_LIMIT',
            severity: 'HIGH',
            observedValue: `${rec.pressure.toFixed(1)} hPa`,
            expectedRange: `[${WMO_PHYSICAL_BOUNDS.pressure.min} to ${WMO_PHYSICAL_BOUNDS.pressure.max} hPa]`,
            deviation: `${rec.pressure.toFixed(1)} hPa`,
            description: `Barometric pressure out of atmospheric bounds (${rec.pressure.toFixed(1)} hPa).`,
            scientificExplanation: 'Violates standard barometric boundary envelope for station elevation.',
          }));
        }
      }

      // Test 3: Thermodynamic Consistency (Dew point cannot exceed dry bulb air temperature)
      if (rec.temperature !== null && rec.dewPoint !== null && !isNaN(rec.temperature) && !isNaN(rec.dewPoint)) {
        if (rec.dewPoint > rec.temperature + 0.5) {
          recAnomalies.push(createAnomaly({
            recordId: rec.id,
            timestamp: rec.timestamp,
            stationId: rec.stationId,
            stationName: rec.stationName,
            metric: 'dewPoint',
            ruleType: 'THERMODYNAMIC_CONSISTENCY',
            severity: 'HIGH',
            observedValue: `Td: ${rec.dewPoint.toFixed(1)}°C > T: ${rec.temperature.toFixed(1)}°C`,
            expectedRange: 'Dewpoint <= Dry Bulb Air Temp',
            deviation: `+${(rec.dewPoint - rec.temperature).toFixed(1)}°C supersaturation discrepancy`,
            description: 'Thermodynamic Inversion: Dew point exceeds ambient air temperature.',
            scientificExplanation: 'Atmospheric air cannot sustain supersaturation in ambient boundary layers under equilibrium. Indicates hygrometer or temperature calibration divergence.',
          }));
        }
      }

      // Test 4: Step Rate (Spike Jump Test)
      if (prevRec && rec.temperature !== null && prevRec.temperature !== null && !isNaN(rec.temperature) && !isNaN(prevRec.temperature)) {
        const deltaTemp = Math.abs(rec.temperature - prevRec.temperature);
        if (deltaTemp > STEP_RATE_THRESHOLDS.temperature && rec.temperature < 70) {
          // If it wasn't already caught by the physical limit (like 95C)
          recAnomalies.push(createAnomaly({
            recordId: rec.id,
            timestamp: rec.timestamp,
            stationId: rec.stationId,
            stationName: rec.stationName,
            metric: 'temperature',
            ruleType: 'STEP_RATE',
            severity: 'HIGH',
            observedValue: `Δ ${deltaTemp.toFixed(1)}°C in interval`,
            expectedRange: `<= ${STEP_RATE_THRESHOLDS.temperature}°C per epoch`,
            deviation: `Exceeded by ${(deltaTemp - STEP_RATE_THRESHOLDS.temperature).toFixed(1)}°C`,
            description: `Sudden Step-Rate Temperature Jump: Δ${deltaTemp.toFixed(1)}°C.`,
            scientificExplanation: 'Natural thermal inertia of air and sensor thermal mass limits rate of change. Sudden step jumps indicate loose terminal connection or transient electrical noise.',
          }));
        }
      }

      // Test 5: Persistence / Stuck Sensor (Repeated Readings Investigation)
      if (rec.temperature !== null && !isNaN(rec.temperature)) {
        if (tempStreakValue !== null && Math.abs(rec.temperature - tempStreakValue) < 0.0001) {
          tempStreakCount++;
          if (tempStreakCount >= PERSISTENCE_CONSECUTIVE_LIMIT) {
            recAnomalies.push(createAnomaly({
              recordId: rec.id,
              timestamp: rec.timestamp,
              stationId: rec.stationId,
              stationName: rec.stationName,
              metric: 'temperature',
              ruleType: 'PERSISTENCE_LOCKUP',
              severity: 'HIGH',
              observedValue: `${rec.temperature.toFixed(3)}°C (Streak: ${tempStreakCount})`,
              expectedRange: 'Dynamic stochastic variation (σ > 0.05)',
              deviation: 'Zero variance (Δ = 0.0000)',
              description: `Sensor Lockup / Repeated Reading: Identical value held for ${tempStreakCount} consecutive samples.`,
              scientificExplanation: `Natural atmospheric micro-turbulence generates continuous thermodynamic variation. Exactly identical readings over ${tempStreakCount} cycles indicate ADC register freeze, data-logger FIFO stall, or frozen telemetry buffer.`,
            }));
            rec.isStuckSequence = true;
          }
        } else {
          tempStreakValue = rec.temperature;
          tempStreakCount = 1;
          tempStreakStartIndex = i;
        }
      }

      // Persistence on Humidity
      if (rec.humidity !== null && !isNaN(rec.humidity)) {
        if (humidStreakValue !== null && Math.abs(rec.humidity - humidStreakValue) < 0.0001) {
          humidStreakCount++;
          if (humidStreakCount >= PERSISTENCE_CONSECUTIVE_LIMIT) {
            recAnomalies.push(createAnomaly({
              recordId: rec.id,
              timestamp: rec.timestamp,
              stationId: rec.stationId,
              stationName: rec.stationName,
              metric: 'humidity',
              ruleType: 'PERSISTENCE_LOCKUP',
              severity: 'MEDIUM',
              observedValue: `${rec.humidity.toFixed(2)}% (Streak: ${humidStreakCount})`,
              expectedRange: 'Stochastic fluctuation',
              deviation: 'Zero variance',
              description: `Hygrometer persistence lockup for ${humidStreakCount} ticks.`,
              scientificExplanation: 'Zero-variance reading on capacitive humidity sensor suggests sensor membrane contamination or frozen I2C driver.',
            }));
            rec.isStuckSequence = true;
          }
        } else {
          humidStreakValue = rec.humidity;
          humidStreakCount = 1;
          humidStreakStartIndex = i;
        }
      }

      // Update record QC Status
      rec.qcFlags = recAnomalies;
      if (recAnomalies.some((a) => a.severity === 'CRITICAL')) {
        rec.qcStatus = 'CRITICAL_ANOMALY';
      } else if (recAnomalies.some((a) => a.ruleType === 'MISSING_VALUE')) {
        rec.qcStatus = 'MISSING';
        rec.isMissing = true;
      } else if (recAnomalies.length > 0) {
        rec.qcStatus = 'SUSPECT';
      } else {
        rec.qcStatus = 'VALID';
      }

      anomalies.push(...recAnomalies);
    }
  }

  return { auditedRecords: processed, allAnomalies: anomalies };
}

function createAnomaly(params: {
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
}): QCAnomaly {
  return {
    id: `ANOM-${params.stationId}-${Date.parse(params.timestamp) || Math.random()}-${params.metric}`,
    recordId: params.recordId,
    timestamp: params.timestamp,
    stationId: params.stationId,
    stationName: params.stationName,
    metric: params.metric,
    ruleType: params.ruleType,
    severity: params.severity,
    observedValue: params.observedValue,
    expectedRange: params.expectedRange,
    deviation: params.deviation,
    description: params.description,
    scientificExplanation: params.scientificExplanation,
    status: 'OPEN',
    flaggedAt: new Date().toISOString(),
  };
}

/**
 * Applies Linear Interpolation to missing numeric values in a dataset.
 */
function applyLinearInterpolation(records: WeatherRecord[]): WeatherRecord[] {
  const result = [...records];
  const metrics: (keyof WeatherRecord)[] = ['temperature', 'humidity', 'pressure', 'windSpeed'];

  for (const metric of metrics) {
    for (let i = 0; i < result.length; i++) {
      if (result[i][metric] === null || isNaN(result[i][metric] as number)) {
        // Find previous valid
        let prevValid: number | null = null;
        let prevIndex = -1;
        for (let p = i - 1; p >= 0; p--) {
          const val = result[p][metric];
          if (val !== null && !isNaN(val as number)) {
            prevValid = val as number;
            prevIndex = p;
            break;
          }
        }

        // Find next valid
        let nextValid: number | null = null;
        let nextIndex = -1;
        for (let n = i + 1; n < result.length; n++) {
          const val = result[n][metric];
          if (val !== null && !isNaN(val as number)) {
            nextValid = val as number;
            nextIndex = n;
            break;
          }
        }

        if (prevValid !== null && nextValid !== null && nextIndex > prevIndex) {
          const ratio = (i - prevIndex) / (nextIndex - prevIndex);
          const interpolated = Number((prevValid + ratio * (nextValid - prevValid)).toFixed(2));
          result[i] = {
            ...result[i],
            [metric]: interpolated,
            imputedFields: [...(result[i].imputedFields || []), metric as string],
          };
        } else if (prevValid !== null) {
          result[i] = {
            ...result[i],
            [metric]: prevValid,
            imputedFields: [...(result[i].imputedFields || []), metric as string],
          };
        }
      }
    }
  }

  return result;
}

/**
 * Applies Forward Fill (hold last known value) to missing values.
 */
function applyForwardFill(records: WeatherRecord[]): WeatherRecord[] {
  const result = [...records];
  const metrics: (keyof WeatherRecord)[] = ['temperature', 'humidity', 'pressure', 'windSpeed'];

  for (const metric of metrics) {
    let lastValid: number | null = null;
    for (let i = 0; i < result.length; i++) {
      const val = result[i][metric];
      if (val !== null && !isNaN(val as number)) {
        lastValid = val as number;
      } else if (lastValid !== null) {
        result[i] = {
          ...result[i],
          [metric]: lastValid,
          imputedFields: [...(result[i].imputedFields || []), metric as string],
        };
      }
    }
  }

  return result;
}

/**
 * Computes exact statistical summaries from the selected dataset.
 */
export function calculateDatasetStatistics(records: WeatherRecord[]): DatasetStats {
  const total = records.length;
  if (total === 0) {
    return {
      totalRecords: 0,
      validRecords: 0,
      anomalousRecords: 0,
      missingRecords: 0,
      qcPassRate: 100,
      metrics: {
        temperature: getEmptyMetricSummary(),
        humidity: getEmptyMetricSummary(),
        pressure: getEmptyMetricSummary(),
        windSpeed: getEmptyMetricSummary(),
        solarRadiation: getEmptyMetricSummary(),
      },
      anomalyBreakdown: {
        physicalLimit: 0,
        persistenceLockup: 0,
        stepRate: 0,
        missingValue: 0,
        thermodynamic: 0,
      },
    };
  }

  const validRecords = records.filter((r) => r.qcStatus === 'VALID').length;
  const anomalousRecords = records.filter((r) => r.qcStatus === 'CRITICAL_ANOMALY' || r.qcStatus === 'SUSPECT').length;
  const missingRecords = records.filter((r) => r.qcStatus === 'MISSING').length;
  const qcPassRate = Number(((validRecords / total) * 100).toFixed(1));

  let physicalLimit = 0;
  let persistenceLockup = 0;
  let stepRate = 0;
  let missingValue = 0;
  let thermodynamic = 0;

  for (const r of records) {
    for (const flag of r.qcFlags) {
      if (flag.ruleType === 'PHYSICAL_LIMIT') physicalLimit++;
      else if (flag.ruleType === 'PERSISTENCE_LOCKUP') persistenceLockup++;
      else if (flag.ruleType === 'STEP_RATE') stepRate++;
      else if (flag.ruleType === 'MISSING_VALUE') missingValue++;
      else if (flag.ruleType === 'THERMODYNAMIC_CONSISTENCY') thermodynamic++;
    }
  }

  return {
    totalRecords: total,
    validRecords,
    anomalousRecords,
    missingRecords,
    qcPassRate,
    metrics: {
      temperature: computeMetricSummary(records.map((r) => r.temperature)),
      humidity: computeMetricSummary(records.map((r) => r.humidity)),
      pressure: computeMetricSummary(records.map((r) => r.pressure)),
      windSpeed: computeMetricSummary(records.map((r) => r.windSpeed)),
      solarRadiation: computeMetricSummary(records.map((r) => r.solarRadiation)),
    },
    anomalyBreakdown: {
      physicalLimit,
      persistenceLockup,
      stepRate,
      missingValue,
      thermodynamic,
    },
  };
}

function computeMetricSummary(values: (number | null)[]): MetricSummary {
  const validVals = values.filter((v): v is number => v !== null && !isNaN(v));
  const missingCount = values.length - validVals.length;

  if (validVals.length === 0) {
    return { min: null, max: null, mean: null, stdDev: null, missingCount };
  }

  const min = Math.min(...validVals);
  const max = Math.max(...validVals);
  const sum = validVals.reduce((acc, v) => acc + v, 0);
  const mean = Number((sum / validVals.length).toFixed(2));

  // Compute sample standard deviation
  const variance =
    validVals.length > 1
      ? validVals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (validVals.length - 1)
      : 0;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    mean,
    stdDev,
    missingCount,
  };
}

function getEmptyMetricSummary(): MetricSummary {
  return { min: null, max: null, mean: null, stdDev: null, missingCount: 0 };
}
