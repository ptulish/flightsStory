import { useMemo, useRef, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Line,
  Marker,
  Sphere,
  ZoomableGroup,
} from 'react-simple-maps';
import { geoInterpolate } from 'd3-geo';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Globe2 } from 'lucide-react';
import worldData from 'world-atlas/countries-110m.json';
import { getAirline } from '../data/airlines';
import { formatKm, formatNumber } from '../utils/format';

// Subtle, dark-themed palette so flight arcs really pop.
const COLORS = {
  ocean: '#0c1226',
  land: '#172041',
  landHover: '#1f2a55',
  border: 'rgba(94,133,255,0.18)',
  graticule: 'rgba(94,133,255,0.08)',
  marker: '#22d3ee',
  markerStroke: '#0a0e1a',
};

const ARC_RESOLUTION = 48;

export default function FlightMap({ stats, height = 480 }) {
  const [position, setPosition] = useState({ coordinates: [25, 25], zoom: 1 });
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const { arcs, markers } = useMemo(() => buildGeometry(stats), [stats]);

  const onZoom = (delta) =>
    setPosition((p) => ({
      ...p,
      zoom: Math.max(0.7, Math.min(6, p.zoom + delta)),
    }));

  const zoomK = Math.max(0.7, position.zoom);
  // Labels live inside ZoomableGroup, so keep text visually stable on screen.
  const labelFontPx = clamp(6.4, 9.5, 8.2 / Math.pow(zoomK, 0.9));
  const labelStrokePx = clamp(0.8, 2, 1.8 / Math.pow(zoomK, 0.88));
  const labelYOffset = (radius) => -(radius + 4.8) / Math.pow(zoomK, 0.92);

  return (
    <div ref={wrapRef} className="card relative overflow-hidden p-0" style={{ height }}>
      {/* Header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto">
          <p className="label flex items-center gap-1.5">
            <Globe2 className="h-3 w-3" />
            Routes flown
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {markers.length} airports · {arcs.length} unique routes ·{' '}
            {formatKm(stats.totals.distance_km)} traveled
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-line bg-bg-card/80 p-1 backdrop-blur">
          <button
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-white/5 hover:text-ink"
            onClick={() => onZoom(0.4)}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-white/5 hover:text-ink"
            onClick={() => onZoom(-0.4)}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 165 }}
        width={980}
        height={520}
        style={{ width: '100%', height: '100%' }}
      >
        <Sphere id="ocean" stroke="transparent" fill={COLORS.ocean} />
        <Graticule stroke={COLORS.graticule} step={[20, 20]} />
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          onMoveEnd={setPosition}
          maxZoom={6}
          minZoom={0.7}
        >
          <Geographies geography={worldData}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: COLORS.land,
                      stroke: COLORS.border,
                      strokeWidth: 0.4,
                      outline: 'none',
                    },
                    hover: { fill: COLORS.landHover, outline: 'none' },
                    pressed: { fill: COLORS.landHover, outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Soft glow under each arc */}
          {arcs.map((arc) => (
            <Line
              key={`g-${arc.key}`}
              coordinates={arc.points}
              stroke={arc.color}
              strokeOpacity={0.08}
              strokeWidth={Math.max(2, arc.width * 3)}
              fill="transparent"
              strokeLinecap="round"
            />
          ))}

          {/* Actual arc strokes */}
          {arcs.map((arc) => (
            <Line
              key={arc.key}
              coordinates={arc.points}
              stroke={arc.color}
              strokeOpacity={hover && hover.key !== arc.key ? 0.25 : 0.85}
              strokeWidth={arc.width}
              fill="transparent"
              strokeLinecap="round"
              onMouseEnter={() => setHover(arc)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
          ))}

          {markers.map((m) => (
            <Marker key={m.iata} coordinates={[m.lng, m.lat]}>
              <circle
                r={m.radius + 1.5}
                fill={COLORS.marker}
                fillOpacity={0.18}
              />
              <circle
                r={m.radius}
                fill={COLORS.marker}
                stroke={COLORS.markerStroke}
                strokeWidth={1}
              />
              {(m.radius >= 4.2 || zoomK > 1.35) && (
                <text
                  textAnchor="middle"
                  y={labelYOffset(m.radius)}
                  className="font-mono"
                  style={{
                    fontSize: labelFontPx,
                    fill: '#cdd6f5',
                    fillOpacity: clamp(0.62, 0.98, 0.6 + zoomK * 0.18),
                    paintOrder: 'stroke',
                    stroke: '#0a0e1a',
                    strokeWidth: labelStrokePx,
                    letterSpacing: 0.4 / Math.pow(zoomK, 0.5),
                    transition: 'font-size 120ms ease, stroke-width 120ms ease, fill-opacity 120ms ease',
                  }}
                >
                  {m.iata}
                </text>
              )}
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl border border-line bg-bg-card/95 p-3 text-sm shadow-card backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink-muted">{hover.fromIata}</span>
              <span className="text-ink-muted">→</span>
              <span className="font-mono text-xs text-ink-muted">{hover.toIata}</span>
            </div>
            <p className="mt-1 truncate text-sm">
              {hover.fromCity} → {hover.toCity}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {formatNumber(hover.count)}× flown · {formatKm(hover.distance_km)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden rounded-xl border border-line bg-bg-card/80 px-3 py-2 text-[10px] text-ink-muted backdrop-blur sm:block">
        <p className="label mb-1">Arc thickness</p>
        <div className="flex items-center gap-2">
          <span className="block h-0.5 w-6 bg-brand-300" />
          <span>= more flights</span>
        </div>
      </div>
    </div>
  );
}

function buildGeometry(stats) {
  const { routes } = stats;
  const visitMap = new Map();

  // Pre-compute great-circle interpolated paths for each unique route.
  const arcs = routes
    .filter((r) => r.a && r.b)
    .map((r) => {
      const from = [r.a.lng, r.a.lat];
      const to = [r.b.lng, r.b.lat];
      const interp = geoInterpolate(from, to);
      const points = Array.from({ length: ARC_RESOLUTION + 1 }, (_, i) =>
        interp(i / ARC_RESOLUTION),
      );
      // Color by the most common airline on this route — approximated by route order.
      const color = pickRouteColor(r);
      return {
        key: r.key,
        points,
        color,
        width: 0.8 + Math.log2(r.count + 1) * 0.9,
        count: r.count,
        distance_km: r.distance_km,
        fromIata: r.a.iata,
        toIata: r.b.iata,
        fromCity: r.a.city,
        toCity: r.b.city,
      };
    });

  // Build airport markers, scaled by total visit count.
  routes.forEach((r) => {
    if (!r.a || !r.b) return;
    visitMap.set(r.a.iata, (visitMap.get(r.a.iata) || 0) + r.count);
    visitMap.set(r.b.iata, (visitMap.get(r.b.iata) || 0) + r.count);
  });

  const markerSet = new Map();
  routes.forEach((r) => {
    [r.a, r.b].forEach((ap) => {
      if (!ap) return;
      const visits = visitMap.get(ap.iata) || 1;
      const radius = Math.max(2, Math.min(7, 1.5 + Math.log2(visits + 1) * 1.4));
      markerSet.set(ap.iata, {
        iata: ap.iata,
        city: ap.city,
        lat: ap.lat,
        lng: ap.lng,
        visits,
        radius,
      });
    });
  });

  return { arcs, markers: [...markerSet.values()] };
}

function pickRouteColor(route) {
  // Simple deterministic palette based on the route key, blended toward brand colors.
  const palette = [
    '#5e85ff',
    '#22d3ee',
    '#a78bfa',
    '#f472b6',
    '#34d399',
    '#fbbf24',
    '#60a5fa',
  ];
  let hash = 0;
  for (let i = 0; i < route.key.length; i++) {
    hash = (hash * 31 + route.key.charCodeAt(i)) | 0;
  }
  // Boost prominent routes toward the bright brand-cyan.
  if (route.count >= 6) return '#22d3ee';
  return palette[Math.abs(hash) % palette.length];
}

function clamp(min, max, value) {
  return Math.min(max, Math.max(min, value));
}

// Re-export for tests / imports elsewhere
export { buildGeometry };
