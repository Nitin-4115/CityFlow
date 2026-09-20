import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip } from 'react-leaflet';
import { MapPin, Layers, Route } from 'lucide-react';
import GlassCard from './GlassCard';

export default function TransitMap({ isDark }) {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [showCorridors, setShowCorridors] = useState(true);
  const [showStations, setShowStations] = useState(true);

  useEffect(() => {
    fetch('/api/stops').then((res) => res.json()).then((data) => setStops(data.stops || [])).catch(console.error);
    fetch('/api/routes').then((res) => res.json()).then((data) => setRoutes(data.routes || [])).catch(console.error);
  }, []);

  const routeLevelMap = {};
  routes.forEach((r) => {
    routeLevelMap[r.route_id] = r.congestion_level;
  });

  const getStopStatus = (routeIds) => {
    let worst = 'NORMAL';
    const order = ['NORMAL', 'MODERATE_TRAFFIC', 'HEAVY_CONGESTION'];
    routeIds.forEach((rid) => {
      const lvl = routeLevelMap[rid] || 'NORMAL';
      if (order.indexOf(lvl) > order.indexOf(worst)) {
        worst = lvl;
      }
    });
    return worst;
  };

  const getStatusInfo = (level) => {
    if (level === 'HEAVY_CONGESTION') {
      return {
        color: '#f43f5e',
        label: 'Heavy Delay',
        badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
      };
    }
    if (level === 'MODERATE_TRAFFIC') {
      return {
        color: '#f59e0b',
        label: 'Moderate Traffic',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
      };
    }
    return {
      color: '#10b981',
      label: 'Smooth Flow',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    };
  };

  const filteredStops = stops.filter((s) => {
    if (filter === 'ALL') return true;
    const status = getStopStatus(s.route_ids);
    return status === filter;
  });

  const filteredRoutes = routes.filter((r) => {
    if (filter === 'ALL') return true;
    return r.congestion_level === filter;
  });

  // OpenStreetMap standard tile URL (100% free, no API key required, no watermarks)
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="space-y-4">
      <GlassCard glowColor="rgba(56, 189, 248, 0.2)">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Metropolitan Transit & Corridor Map
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live transit stations and all active cross-city corridor paths across Bengaluru
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Layer Toggles */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-white/10 text-xs">
              <button
                onClick={() => setShowStations(!showStations)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  showStations
                    ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                Stations ({filteredStops.length})
              </button>
              <button
                onClick={() => setShowCorridors(!showCorridors)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  showCorridors
                    ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Route className="h-3.5 w-3.5" />
                Corridors ({filteredRoutes.length})
              </button>
            </div>

            {/* Quick Congestion Filter */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-white/10 text-xs">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'HEAVY_CONGESTION', label: 'Delays Only' },
                { id: 'NORMAL', label: 'Smooth Flow' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    filter === f.id
                      ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className={`h-[540px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative shadow-md dark:shadow-2xl ${isDark ? 'dark-map-tiles' : ''}`}>
          <MapContainer
            key={isDark ? 'dark-map' : 'light-map'}
            center={[12.9716, 77.6146]}
            zoom={11}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={tileUrl}
            />

            {/* Active Corridor Routes (Polylines) */}
            {showCorridors &&
              filteredRoutes.map((route) => {
                if (!route.latitude || !route.lat_dest) return null;
                const info = getStatusInfo(route.congestion_level);
                const isHeavy = route.congestion_level === 'HEAVY_CONGESTION';
                return (
                  <Polyline
                    key={route.route_id}
                    positions={[
                      [route.latitude, route.longitude],
                      [route.lat_dest, route.lon_dest],
                    ]}
                    pathOptions={{
                      color: info.color,
                      weight: isHeavy ? 3.5 : 2,
                      opacity: isHeavy ? 0.85 : 0.6,
                      dashArray: isHeavy ? '6, 6' : undefined,
                    }}
                  >
                    <Tooltip sticky direction="top" opacity={0.9}>
                      <div className="p-1 font-sans text-xs">
                        <div className="font-bold text-slate-900 dark:text-white">{route.route_id}</div>
                        <div className="text-slate-600 dark:text-slate-300">{route.corridor_name}</div>
                        <div className="font-mono mt-0.5 font-semibold" style={{ color: info.color }}>
                          Speed: {route.avg_speed_kmph} km/h · {info.label}
                        </div>
                      </div>
                    </Tooltip>
                  </Polyline>
                );
              })}

            {/* Transit Stations (Circles) */}
            {showStations &&
              filteredStops.map((stop) => {
                const [lon, lat] = stop.location.coordinates;
                const worstLevel = getStopStatus(stop.route_ids);
                const info = getStatusInfo(worstLevel);
                const radius = 8 + Math.min((stop.daily_boardings || 0) / 400, 8);

                return (
                  <CircleMarker
                    key={stop.stop_id}
                    center={[lat, lon]}
                    radius={radius}
                    pathOptions={{
                      color: info.color,
                      fillColor: info.color,
                      fillOpacity: 0.85,
                      weight: 2,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                      <div className="text-xs font-semibold font-sans">
                        {stop.stop_name}
                      </div>
                    </Tooltip>
                    <Popup>
                      <div className="p-1 space-y-2 font-sans min-w-[200px]">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{stop.stop_name}</div>
                          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${info.badge}`}>
                            {info.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">Connected Routes:</span> {stop.route_ids.join(', ')}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">Daily Commuters:</span>{' '}
                          <b className="text-slate-900 dark:text-white">{stop.daily_boardings?.toLocaleString() || 'N/A'}</b>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
          </MapContainer>
        </div>
      </GlassCard>
    </div>
  );
}
