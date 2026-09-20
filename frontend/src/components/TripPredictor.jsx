import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Sun,
  CloudRain,
  CloudFog,
  Building2,
  Palmtree,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Search,
} from 'lucide-react';
import GlassCard from './GlassCard';

export default function TripPredictor() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('ROUTE_001');
  const [routeSearch, setRouteSearch] = useState('');
  const [hour, setHour] = useState(8);
  const [weather, setWeather] = useState('CLEAR');
  const [isWeekend, setIsWeekend] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/routes')
      .then((res) => res.json())
      .then((data) => {
        setRoutes(data.routes || []);
        if (data.routes?.length > 0) {
          setSelectedRoute(data.routes[0].route_id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const filteredRoutes = routes.filter((r) => {
    const q = routeSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.route_id.toLowerCase().includes(q) ||
      (r.corridor_name && r.corridor_name.toLowerCase().includes(q))
    );
  });

  const triggerPrediction = async () => {
    if (!selectedRoute) return;
    setLoading(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: selectedRoute,
          hour: parseInt(hour, 10),
          weather: weather,
          is_weekend: isWeekend,
        }),
      });
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRoute) {
      triggerPrediction();
    }
  }, [selectedRoute, hour, weather, isWeekend]);

  const getStatusBadge = (label) => {
    if (label === 'HEAVY_CONGESTION') {
      return {
        bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
        icon: AlertTriangle,
        text: 'Heavy Congestion (< 15 km/h)',
        color: '#f43f5e',
      };
    }
    if (label === 'MODERATE_TRAFFIC') {
      return {
        bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        icon: Zap,
        text: 'Moderate Traffic (15–30 km/h)',
        color: '#f59e0b',
      };
    }
    return {
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
      icon: CheckCircle2,
      text: 'Normal Free Flow (≥ 30 km/h)',
      color: '#10b981',
    };
  };

  const badge = prediction ? getStatusBadge(prediction.predicted_label) : null;
  const highestProb = prediction?.probabilities ? Math.max(...Object.values(prediction.probabilities)) : 0;

  return (
    <div className="space-y-6">
      <GlassCard glowColor="rgba(168, 85, 247, 0.35)">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-purple-400" />
          <h3 className="font-display text-xl font-bold text-white">
            Real-Time AI Congestion Forecasting Cyber-Deck
          </h3>
        </div>
        <p className="text-xs text-slate-300 max-w-3xl">
          Trained Scikit-Learn Random Forest model (~95.3% accuracy) trained directly on MongoDB's <code>route_hourly_profile</code> collection. Forecasts future corridor congestion before it happens.
        </p>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Deck */}
        <GlassCard className="lg:col-span-7 space-y-6" glowColor="rgba(56, 189, 248, 0.25)">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-2">
            Scenario Parameters
          </div>

          {/* Route Corridor Search & Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Route Corridor ({filteredRoutes.length} of {routes.length}):
              </label>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search route (e.g. Silk Board, Electronic City, ROUTE_001)..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                className="glass-input w-full rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 mb-2"
              />
            </div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs text-white"
            >
              {filteredRoutes.length === 0 ? (
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  No matching corridors found
                </option>
              ) : (
                filteredRoutes.map((r) => (
                  <option key={r.route_id} value={r.route_id} className="bg-slate-900 text-white">
                    {r.route_id} · {r.corridor_name} ({r.avg_speed_kmph} km/h)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Hour of Day Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Hour of Day:</span>
              <span className="font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {String(hour).padStart(2, '0')}:00 {[8, 9, 18, 19].includes(Number(hour)) && !isWeekend ? '(Rush Hour)' : ''}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>00:00 (Midnight)</span>
              <span>08:00 (Morning Rush)</span>
              <span>18:00 (Evening Rush)</span>
              <span>23:00</span>
            </div>
          </div>

          {/* Weather Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Weather Condition:</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'CLEAR', label: 'Clear Skies', icon: Sun, color: 'text-amber-400' },
                { id: 'RAIN', label: 'Heavy Rain', icon: CloudRain, color: 'text-sky-400' },
                { id: 'FOG', label: 'Dense Fog', icon: CloudFog, color: 'text-purple-400' },
              ].map((w) => {
                const Icon = w.icon;
                const isSelected = weather === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWeather(w.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/20 text-white shadow-glow-blue'
                        : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${w.color}`} />
                    <span>{w.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Type Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Day Type:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsWeekend(false)}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  !isWeekend
                    ? 'border-indigo-400 bg-indigo-500/20 text-white shadow-glow-blue'
                    : 'border-white/10 bg-slate-950/40 text-slate-400'
                }`}
              >
                <Building2 className="h-4 w-4 text-indigo-400" />
                <span>Weekday Commute</span>
              </button>
              <button
                onClick={() => setIsWeekend(true)}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  isWeekend
                    ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-glow-emerald'
                    : 'border-white/10 bg-slate-950/40 text-slate-400'
                }`}
              >
                <Palmtree className="h-4 w-4 text-emerald-400" />
                <span>Weekend Schedule</span>
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Prediction Hologram Output Card */}
        <GlassCard className="lg:col-span-5 flex flex-col justify-between" glowColor="rgba(16, 185, 129, 0.35)">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Prediction Outcome
              </span>
              <span className="font-mono text-[11px] text-purple-300">
                RandomForest · 95.3% Acc
              </span>
            </div>

            {/* Main Result Display */}
            {prediction && badge && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={prediction.predicted_label}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`rounded-2xl border p-5 text-center ${badge.bg}`}
                >
                  <span className="text-[11px] uppercase font-bold tracking-wider opacity-80">
                    Predicted Congestion
                  </span>
                  <div className="font-display text-2xl font-bold mt-1 mb-1" style={{ color: badge.color }}>
                    {prediction.predicted_label.replace('_', ' ')}
                  </div>
                  <div className="text-xs font-mono font-semibold">
                    Confidence: {(highestProb * 100).toFixed(1)}%
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Probability Breakdown */}
            {prediction?.probabilities && (
              <div className="space-y-3 mt-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Class Probability Distribution
                </span>
                {Object.entries(prediction.probabilities).map(([cls, prob]) => (
                  <div key={cls} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">{cls.replace('_', ' ')}</span>
                      <span className="font-bold text-white">{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${prob * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor:
                            cls === 'HEAVY_CONGESTION'
                              ? '#f43f5e'
                              : cls === 'MODERATE_TRAFFIC'
                              ? '#f59e0b'
                              : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feature Importance Footer */}
          {prediction?.feature_importance && (
            <div className="border-t border-white/10 pt-4 mt-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Top Model Feature Weights:
              </span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {Object.entries(prediction.feature_importance).map(([f, w]) => (
                  <span
                    key={f}
                    className="rounded-md bg-slate-950 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/5"
                  >
                    {f}: {(w * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
