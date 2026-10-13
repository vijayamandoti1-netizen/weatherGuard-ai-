import React, { useState, useMemo } from 'react';
import { WeatherRecord, QCAnomaly } from '../types';
import { WMO_PHYSICAL_BOUNDS } from '../utils/qcRulesEngine';
import { ZoomIn, ZoomOut, AlertOctagon, Info, Crosshair } from 'lucide-react';

interface WeatherChartProps {
  records: WeatherRecord[];
  selectedMetric: 'temperature' | 'humidity' | 'pressure' | 'windSpeed' | 'solarRadiation';
  onSelectAnomaly: (anomaly: QCAnomaly) => void;
  selectedStationId: string;
  onSelectStation: (stnId: string) => void;
}

export const WeatherChart: React.FC<WeatherChartProps> = ({
  records,
  selectedMetric,
  onSelectAnomaly,
  selectedStationId,
  onSelectStation,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [zoomWindow, setZoomWindow] = useState<'ALL' | 'ANOMALY_FOCUS' | 'FIRST_HALF' | 'SECOND_HALF'>('ALL');

  // Filter records by station if selected
  const stationFilteredRecords = useMemo(() => {
    if (selectedStationId === 'ALL') return records;
    return records.filter((r) => r.stationId === selectedStationId);
  }, [records, selectedStationId]);

  // Window slicing
  const displayedRecords = useMemo(() => {
    if (zoomWindow === 'ALL') return stationFilteredRecords;
    if (zoomWindow === 'FIRST_HALF') return stationFilteredRecords.slice(0, Math.floor(stationFilteredRecords.length / 2));
    if (zoomWindow === 'SECOND_HALF') return stationFilteredRecords.slice(Math.floor(stationFilteredRecords.length / 2));
    if (zoomWindow === 'ANOMALY_FOCUS') {
      // Find index of highest anomaly (like 95C)
      const anomIdx = stationFilteredRecords.findIndex(
        (r) => r.temperature !== null && r.temperature > 60
      );
      if (anomIdx !== -1) {
        const start = Math.max(0, anomIdx - 10);
        const end = Math.min(stationFilteredRecords.length, anomIdx + 11);
        return stationFilteredRecords.slice(start, end);
      }
      return stationFilteredRecords.slice(0, 30);
    }
    return stationFilteredRecords;
  }, [stationFilteredRecords, zoomWindow]);

  // Calculate scales and coordinate mappings
  const { points, yMin, yMax, unit, wmoMaxLimit } = useMemo(() => {
    const validValues = displayedRecords
      .map((r) => r[selectedMetric])
      .filter((v): v is number => v !== null && !isNaN(v));

    let min = validValues.length > 0 ? Math.min(...validValues) : 0;
    let max = validValues.length > 0 ? Math.max(...validValues) : 100;

    // Ensure ceiling accommodates 95C spike and WMO threshold for temperature
    if (selectedMetric === 'temperature') {
      max = Math.max(max, 65);
      min = Math.min(min, -5);
    } else if (selectedMetric === 'humidity') {
      min = 0;
      max = Math.max(max, 100);
    } else if (selectedMetric === 'pressure') {
      min = Math.min(min, 990);
      max = Math.max(max, 1030);
    } else if (selectedMetric === 'windSpeed') {
      min = 0;
      max = Math.max(max, 25);
    } else if (selectedMetric === 'solarRadiation') {
      min = 0;
      max = Math.max(max, 1000);
    }

    // Add padding to margins
    const range = max - min || 1;
    const paddedMin = min - range * 0.05;
    const paddedMax = max + range * 0.08;

    const unitStr =
      selectedMetric === 'temperature'
        ? '°C'
        : selectedMetric === 'humidity'
        ? '%'
        : selectedMetric === 'pressure'
        ? 'hPa'
        : selectedMetric === 'windSpeed'
        ? 'm/s'
        : 'W/m²';

    const wmoMax =
      selectedMetric === 'temperature'
        ? WMO_PHYSICAL_BOUNDS.temperature.max
        : selectedMetric === 'humidity'
        ? WMO_PHYSICAL_BOUNDS.humidity.max
        : selectedMetric === 'pressure'
        ? WMO_PHYSICAL_BOUNDS.pressure.max
        : undefined;

    return {
      points: displayedRecords,
      yMin: paddedMin,
      yMax: paddedMax,
      unit: unitStr,
      wmoMaxLimit: wmoMax,
    };
  }, [displayedRecords, selectedMetric]);

  // SVG dimensions
  const svgWidth = 1000;
  const svgHeight = 360;
  const padding = { top: 30, right: 40, bottom: 50, left: 60 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const getYCoord = (val: number | null) => {
    if (val === null || isNaN(val)) return null;
    const ratio = (val - yMin) / (yMax - yMin);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  const getXCoord = (index: number) => {
    if (points.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (points.length - 1)) * chartWidth;
  };

  // Generate path data
  const polylinePoints = useMemo(() => {
    const coords: { x: number; y: number; val: number; record: WeatherRecord; index: number }[] = [];
    points.forEach((r, idx) => {
      const val = r[selectedMetric];
      if (val !== null && !isNaN(val)) {
        const y = getYCoord(val);
        const x = getXCoord(idx);
        if (y !== null) {
          coords.push({ x, y, val, record: r, index: idx });
        }
      }
    });
    return coords;
  }, [points, selectedMetric, yMin, yMax]);

  const pathD = useMemo(() => {
    if (polylinePoints.length === 0) return '';
    return polylinePoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [polylinePoints]);

  const wmoY = wmoMaxLimit !== undefined ? getYCoord(wmoMaxLimit) : null;
  const zeroY = yMin <= 0 && yMax >= 0 ? getYCoord(0) : null;

  // Selected or hovered point
  const hoveredPoint = hoveredIndex !== null && hoveredIndex < points.length ? points[hoveredIndex] : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
      {/* Chart Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Telemetry Time-Series & Anomaly Detection Visualizer
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            ({displayedRecords.length} records in view)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Station Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
            <span className="text-slate-400">Station:</span>
            <select
              value={selectedStationId}
              onChange={(e) => onSelectStation(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stations Combined</option>
              <option value="STN-01">STN-01 (Alpine Valley)</option>
              <option value="STN-02">STN-02 (Coastal Harbor)</option>
              <option value="STN-03">STN-03 (Desert Basin)</option>
            </select>
          </div>

          {/* Zoom / View Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md p-0.5 text-xs">
            <button
              onClick={() => setZoomWindow('ALL')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                zoomWindow === 'ALL' ? 'bg-cyan-950 text-cyan-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full 24h
            </button>
            <button
              onClick={() => setZoomWindow('ANOMALY_FOCUS')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                zoomWindow === 'ANOMALY_FOCUS' ? 'bg-red-950 text-red-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Zoom directly to the synthetic 95°C spike window"
            >
              Focus 95°C Spike
            </button>
            <button
              onClick={() => setZoomWindow('FIRST_HALF')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                zoomWindow === 'FIRST_HALF' ? 'bg-slate-800 text-slate-200 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              00:00–12:00
            </button>
            <button
              onClick={() => setZoomWindow('SECOND_HALF')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                zoomWindow === 'SECOND_HALF' ? 'bg-slate-800 text-slate-200 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12:00–24:00
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full overflow-x-auto bg-slate-950/60 rounded-lg border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[700px] select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Grid lines */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background horizontal guide lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding.top + chartHeight * pct;
            const val = yMax - pct * (yMax - yMin);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  strokeOpacity="0.4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {val.toFixed(0)} {unit}
                </text>
              </g>
            );
          })}

          {/* Zero degree guideline if applicable */}
          {zeroY !== null && zeroY >= padding.top && zeroY <= padding.top + chartHeight && (
            <g>
              <line
                x1={padding.left}
                y1={zeroY}
                x2={svgWidth - padding.right}
                y2={zeroY}
                stroke="#64748b"
                strokeWidth="1.2"
              />
              <text
                x={svgWidth - padding.right + 6}
                y={zeroY + 3}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                0°C Freezing
              </text>
            </g>
          )}

          {/* WMO Physical Max Limit Line (Critical for 95C spike verification) */}
          {wmoY !== null && wmoY >= padding.top && wmoY <= padding.top + chartHeight && (
            <g>
              <line
                x1={padding.left}
                y1={wmoY}
                x2={svgWidth - padding.right}
                y2={wmoY}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text
                x={svgWidth - padding.right - 10}
                y={wmoY - 6}
                fill="#f87171"
                fontSize="10"
                textAnchor="end"
                fontWeight="bold"
                fontFamily="monospace"
              >
                WMO Climatological Upper Bound ({wmoMaxLimit} {unit})
              </text>
            </g>
          )}

          {/* Trend Polyline */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="transition-all duration-200"
            />
          )}

          {/* Time axis X ticks */}
          {points.map((r, idx) => {
            if (idx % Math.ceil(points.length / 8) === 0 || idx === points.length - 1) {
              const x = getXCoord(idx);
              const label = r.timestamp.substring(11, 16);
              return (
                <g key={`x-${idx}`}>
                  <line
                    x1={x}
                    y1={padding.top + chartHeight}
                    x2={x}
                    y2={padding.top + chartHeight + 4}
                    stroke="#475569"
                  />
                  <text
                    x={x}
                    y={padding.top + chartHeight + 16}
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Missing Telemetry Indicators (Gaps) */}
          {points.map((r, idx) => {
            const val = r[selectedMetric];
            if (val === null || isNaN(val)) {
              const x = getXCoord(idx);
              const midY = padding.top + chartHeight / 2;
              return (
                <g key={`missing-${idx}`}>
                  <circle
                    cx={x}
                    cy={midY}
                    r="5"
                    fill="#451a03"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={x}
                    y={midY - 8}
                    fill="#fbbf24"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    NULL
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Data Points & Anomaly Highlight Pins */}
          {polylinePoints.map((pt) => {
            const hasAnomalies = pt.record.qcFlags.length > 0;
            const isCritical95C = pt.record.isSyntheticTest || (selectedMetric === 'temperature' && pt.val > 60);
            const isStuck = pt.record.isStuckSequence;
            const isHovered = hoveredIndex === pt.index;

            // CRITICAL 95°C TEST ANOMALY PIN
            if (isCritical95C) {
              return (
                <g
                  key={`pt-${pt.index}`}
                  className="cursor-pointer"
                  onClick={() => {
                    const anom = pt.record.qcFlags.find((f) => f.metric === selectedMetric) || pt.record.qcFlags[0];
                    if (anom) onSelectAnomaly(anom);
                  }}
                  onMouseEnter={() => setHoveredIndex(pt.index)}
                >
                  {/* Glowing beacon circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="12"
                    fill="#ef4444"
                    fillOpacity="0.25"
                    className="animate-ping"
                  />
                  {/* Diamond shape */}
                  <polygon
                    points={`${pt.x},${pt.y - 8} ${pt.x + 8},${pt.y} ${pt.x},${pt.y + 8} ${pt.x - 8},${pt.y}`}
                    fill="#dc2626"
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                  {/* Badge Text */}
                  <rect
                    x={pt.x - 36}
                    y={pt.y - 28}
                    width="72"
                    height="18"
                    rx="3"
                    fill="#991b1b"
                    stroke="#f87171"
                    strokeWidth="1"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 15}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {pt.val.toFixed(1)}°C FLAG
                  </text>
                </g>
              );
            }

            // STUCK REPEATED SENSOR PIN
            if (isStuck) {
              return (
                <g
                  key={`pt-${pt.index}`}
                  className="cursor-pointer"
                  onClick={() => {
                    const anom = pt.record.qcFlags.find((f) => f.ruleType === 'PERSISTENCE_LOCKUP') || pt.record.qcFlags[0];
                    if (anom) onSelectAnomaly(anom);
                  }}
                  onMouseEnter={() => setHoveredIndex(pt.index)}
                >
                  <rect
                    x={pt.x - 4.5}
                    y={pt.y - 4.5}
                    width="9"
                    height="9"
                    fill="#d97706"
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                  />
                </g>
              );
            }

            // Standard anomaly point
            if (hasAnomalies) {
              return (
                <circle
                  key={`pt-${pt.index}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#f97316"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => {
                    if (pt.record.qcFlags[0]) onSelectAnomaly(pt.record.qcFlags[0]);
                  }}
                  onMouseEnter={() => setHoveredIndex(pt.index)}
                />
              );
            }

            // Normal point (interactive on hover)
            return (
              <circle
                key={`pt-${pt.index}`}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5 : 2.5}
                fill={isHovered ? '#38bdf8' : '#0891b2'}
                stroke={isHovered ? '#ffffff' : 'none'}
                strokeWidth={isHovered ? 1.5 : 0}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredIndex(pt.index)}
              />
            );
          })}

          {/* Vertical cursor guide for hovered element */}
          {hoveredIndex !== null && hoveredIndex < points.length && (
            <line
              x1={getXCoord(hoveredIndex)}
              y1={padding.top}
              x2={getXCoord(hoveredIndex)}
              y2={padding.top + chartHeight}
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="mt-2 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="font-mono text-cyan-300 font-semibold">
                {hoveredPoint.timestamp.substring(11, 16)} UTC
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-300 font-medium">{hoveredPoint.stationName}</span>
              <span className="text-slate-400 font-mono">({hoveredPoint.stationId})</span>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <span className="text-slate-400 capitalize">{selectedMetric}: </span>
                <span className="font-mono font-bold text-white">
                  {hoveredPoint[selectedMetric] !== null
                    ? `${(hoveredPoint[selectedMetric] as number).toFixed(2)} ${unit}`
                    : 'NULL / MISSING'}
                </span>
              </div>

              <div>
                <span className="text-slate-400">QC Status: </span>
                <span
                  className={`font-semibold ${
                    hoveredPoint.qcStatus === 'CRITICAL_ANOMALY'
                      ? 'text-red-400'
                      : hoveredPoint.qcStatus === 'SUSPECT'
                      ? 'text-amber-400'
                      : hoveredPoint.qcStatus === 'MISSING'
                      ? 'text-orange-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {hoveredPoint.qcStatus}
                </span>
              </div>

              {hoveredPoint.qcFlags.length > 0 && (
                <button
                  onClick={() => onSelectAnomaly(hoveredPoint.qcFlags[0])}
                  className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 font-medium cursor-pointer"
                >
                  View QA Report →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Guide */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
            <span>Valid Telemetry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rotate-45 bg-red-600 inline-block border border-white" />
            <span className="text-red-300 font-medium">Physical Envelope Breach (e.g. 95°C Spike)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-600 inline-block border border-amber-300" />
            <span className="text-amber-300 font-medium">Stuck Sensor Persistence (Δ = 0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-400 inline-block" />
            <span className="text-amber-400">Missing Telemetry (Null / Gap)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Tip: Click any anomaly diamond or square to open full meteorological forensics.
        </div>
      </div>
    </div>
  );
};
