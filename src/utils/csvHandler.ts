import { WeatherRecord } from '../types';

export interface CSVParseResult {
  records: WeatherRecord[];
  detectedColumns: string[];
  totalRowsParsed: number;
  unrecognizedColumns: string[];
  warnings: string[];
}

/**
 * Standard RFC-4180 compliant CSV Parser with flexible header mapping.
 */
export function parseWeatherCSV(csvText: string): CSVParseResult {
  const lines = csvText.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const rawHeaders = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const warnings: string[] = [];

  // Map header aliases
  const colMap: { [key: string]: number } = {};
  rawHeaders.forEach((header, index) => {
    const cleanHeader = header.replace(/[^a-z0-9]/g, '');
    if (['timestamp', 'time', 'datetime', 'date', 'recordedat'].includes(cleanHeader)) {
      colMap['timestamp'] = index;
    } else if (['stationid', 'station', 'stnid', 'stationcode'].includes(cleanHeader)) {
      colMap['stationId'] = index;
    } else if (['stationname', 'stationlocation', 'sitename'].includes(cleanHeader)) {
      colMap['stationName'] = index;
    } else if (['temp', 'temperature', 'tempc', 'temperaturec', 'airtemp'].includes(cleanHeader)) {
      colMap['temperature'] = index;
    } else if (['humidity', 'rh', 'relativehumidity', 'humiditypct'].includes(cleanHeader)) {
      colMap['humidity'] = index;
    } else if (['pressure', 'baro', 'barometer', 'pressurehpa', 'slp'].includes(cleanHeader)) {
      colMap['pressure'] = index;
    } else if (['wind', 'windspeed', 'windspeedms', 'velocity'].includes(cleanHeader)) {
      colMap['windSpeed'] = index;
    } else if (['solar', 'solarrad', 'solarradiation', 'radiation', 'pyranometer'].includes(cleanHeader)) {
      colMap['solarRadiation'] = index;
    } else if (['dewpoint', 'td', 'dewtemp'].includes(cleanHeader)) {
      colMap['dewPoint'] = index;
    }
  });

  const parsedRecords: WeatherRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    const rawTs = colMap['timestamp'] !== undefined ? row[colMap['timestamp']] : null;
    const timestamp = parseTimestamp(rawTs, i);
    const stationId = colMap['stationId'] !== undefined && row[colMap['stationId']] ? row[colMap['stationId']].trim() : 'STN-CUSTOM';
    const stationName = colMap['stationName'] !== undefined && row[colMap['stationName']] ? row[colMap['stationName']].trim() : `Station ${stationId}`;

    const temp = parseNumeric(colMap['temperature'] !== undefined ? row[colMap['temperature']] : null);
    const humidity = parseNumeric(colMap['humidity'] !== undefined ? row[colMap['humidity']] : null);
    const pressure = parseNumeric(colMap['pressure'] !== undefined ? row[colMap['pressure']] : null);
    const windSpeed = parseNumeric(colMap['windSpeed'] !== undefined ? row[colMap['windSpeed']] : null);
    const solarRadiation = parseNumeric(colMap['solarRadiation'] !== undefined ? row[colMap['solarRadiation']] : null);
    const dewPoint = parseNumeric(colMap['dewPoint'] !== undefined ? row[colMap['dewPoint']] : null);

    parsedRecords.push({
      id: `CSV-ROW-${i}`,
      timestamp,
      stationId,
      stationName,
      temperature: temp,
      humidity,
      pressure,
      windSpeed,
      solarRadiation,
      dewPoint,
      qcStatus: 'VALID',
      qcFlags: [],
      isSyntheticTest: temp !== null && temp > 80,
      isMissing: temp === null || humidity === null || pressure === null,
    });
  }

  const recognized = Object.keys(colMap);
  const unrecognized = rawHeaders.filter((_, idx) => !Object.values(colMap).includes(idx));

  if (!colMap['temperature']) {
    warnings.push('Temperature column was not explicitly identified; values defaulted to null.');
  }

  return {
    records: parsedRecords,
    detectedColumns: recognized,
    totalRowsParsed: parsedRecords.length,
    unrecognizedColumns: unrecognized,
    warnings,
  };
}

function parseNumeric(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const clean = val.trim().toLowerCase();
  if (['', 'na', 'null', 'nan', 'none', '-999', '-9999', 'missing', 'err'].includes(clean)) {
    return null;
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}

function parseTimestamp(raw: string | null, rowIdx: number): string {
  if (!raw || raw.trim() === '') {
    const base = new Date('2026-10-13T00:00:00Z');
    return new Date(base.getTime() + rowIdx * 15 * 60 * 1000).toISOString();
  }
  const parsed = Date.parse(raw);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Exports records to RFC-4180 CSV.
 */
export function exportToCSV(records: WeatherRecord[], mode: 'clean' | 'audited'): string {
  if (mode === 'clean') {
    const headers = [
      'timestamp',
      'station_id',
      'station_name',
      'temperature_c',
      'humidity_pct',
      'pressure_hpa',
      'wind_speed_ms',
      'solar_radiation_wm2',
      'dew_point_c',
      'qc_status',
    ];

    const rows = records.map((r) => [
      r.timestamp,
      escapeCSV(r.stationId),
      escapeCSV(r.stationName),
      r.temperature !== null ? r.temperature.toFixed(2) : '',
      r.humidity !== null ? r.humidity.toFixed(1) : '',
      r.pressure !== null ? r.pressure.toFixed(1) : '',
      r.windSpeed !== null ? r.windSpeed.toFixed(1) : '',
      r.solarRadiation !== null ? r.solarRadiation.toFixed(1) : '',
      r.dewPoint !== null ? r.dewPoint.toFixed(1) : '',
      r.qcStatus,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  }

  // Audited mode includes complete QA forensics
  const headers = [
    'timestamp',
    'station_id',
    'station_name',
    'temperature_c',
    'humidity_pct',
    'pressure_hpa',
    'wind_speed_ms',
    'solar_radiation_wm2',
    'qc_status',
    'anomalies_count',
    'rules_violated',
    'max_severity',
    'investigation_status',
    'qa_engineer_notes',
  ];

  const rows = records.map((r) => {
    const rules = r.qcFlags.map((f) => f.ruleType).join(';');
    const maxSeverity = r.qcFlags.some((f) => f.severity === 'CRITICAL')
      ? 'CRITICAL'
      : r.qcFlags.some((f) => f.severity === 'HIGH')
      ? 'HIGH'
      : r.qcFlags.length > 0
      ? 'MEDIUM'
      : 'NONE';

    const invStatus = r.qcFlags.length > 0 ? r.qcFlags[0].status : 'VALID_CLEARED';
    const notes = r.qcFlags.map((f) => f.investigationNotes || f.description).filter(Boolean).join(' | ');

    return [
      r.timestamp,
      escapeCSV(r.stationId),
      escapeCSV(r.stationName),
      r.temperature !== null ? r.temperature.toFixed(2) : '',
      r.humidity !== null ? r.humidity.toFixed(1) : '',
      r.pressure !== null ? r.pressure.toFixed(1) : '',
      r.windSpeed !== null ? r.windSpeed.toFixed(1) : '',
      r.solarRadiation !== null ? r.solarRadiation.toFixed(1) : '',
      r.qcStatus,
      r.qcFlags.length.toString(),
      escapeCSV(rules),
      maxSeverity,
      invStatus,
      escapeCSV(notes),
    ];
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

function escapeCSV(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Triggers client-side browser download for generated CSV.
 */
export function downloadCSVFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
