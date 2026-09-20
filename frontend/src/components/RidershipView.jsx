import React, { useState, useEffect } from 'react';
import { Users, Clock, Award } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import GlassCard from './GlassCard';

export default function RidershipView() {
  const [ridership, setRidership] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedStopId, setSelectedStopId] = useState('STOP_501');

  useEffect(() => {
    fetch('/api/ridership')
      .then((res) => res.json())
      .then((data) => {
        setRidership(data.ridership || []);
        if (data.ridership?.length > 0) {
          setSelectedStopId(data.ridership[0].stop_id);
        }
      })
      .catch(console.error);

    fetch('/api/stops')
      .then((res) => res.json())
      .then((data) => setStops(data.stops || []))
      .catch(console.error);
  }, []);

  const stopLookup = {};
  stops.forEach((s) => {
    stopLookup[s.stop_id] = s.stop_name;
  });

  const selectedData = ridership.find((r) => r.stop_id === selectedStopId);
  const chartData = selectedData?.hourly_ridership || [];

  return (
    <div className="space-y-6">
      <GlassCard glowColor="rgba(168, 85, 247, 0.2)">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Hourly Transit Ridership &amp; Commuter Curves
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated RFID smartcard tap-ins categorized by General, Student, and Senior passenger cards
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Station:</span>
            <select
              value={selectedStopId}
              onChange={(e) => setSelectedStopId(e.target.value)}
              className="glass-input rounded-xl px-3.5 py-2 text-xs"
            >
              {ridership.map((r) => (
                <option key={r.stop_id} value={r.stop_id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {stopLookup[r.stop_id] || r.stop_id} ({r.daily_boardings.toLocaleString()} / day)
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/50 p-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Daily Commuters</span>
              <div className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {selectedData.daily_boardings.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Average daily station volume</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/50 p-4">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Peak Rush Hour</span>
              <div className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {String(selectedData.peak_hour).padStart(2, '0')}:00
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{selectedData.peak_hour_boardings} passengers at peak</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/50 p-4">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Best Travel Window</span>
              <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                11:00 AM – 3:00 PM
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Lowest station congestion</p>
            </div>
          </div>
        )}

        {/* Stacked Gradient Area Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGeneral" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorStudent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorSenior" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" stroke="#94a3b8" tickFormatter={(h) => `${h}:00`} />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const total = payload.reduce((acc, p) => acc + (p.value || 0), 0);
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white dark:border-white/15 dark:bg-slate-950/95 p-3 shadow-xl backdrop-blur-xl">
                        <div className="font-bold text-xs text-slate-900 dark:text-white mb-1.5 font-mono">
                          Hour {label}:00 (Total: {total} boardings)
                        </div>
                        {payload.map((entry, index) => (
                          <div key={index} className="flex justify-between gap-4 text-[11px]" style={{ color: entry.color }}>
                            <span>{entry.name}:</span>
                            <span className="font-mono font-bold">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="general" name="General" stackId="1" stroke="#0284c7" fillOpacity={1} fill="url(#colorGeneral)" />
              <Area type="monotone" dataKey="student" name="Student Pass" stackId="1" stroke="#d97706" fillOpacity={1} fill="url(#colorStudent)" />
              <Area type="monotone" dataKey="senior" name="Senior Citizens" stackId="1" stroke="#059669" fillOpacity={1} fill="url(#colorSenior)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
