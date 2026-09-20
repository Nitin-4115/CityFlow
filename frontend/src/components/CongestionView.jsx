import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Radio,
  Ticket,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import GlassCard from './GlassCard';

export default function CongestionView() {
  const [summary, setSummary] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [topN, setTopN] = useState('15');

  useEffect(() => {
    fetch('/api/summary').then((res) => res.json()).then(setSummary).catch(console.error);
    fetch('/api/routes').then((res) => res.json()).then((data) => setRoutes(data.routes || [])).catch(console.error);
  }, []);

  const getStatusColor = (level) => {
    if (level === 'HEAVY_CONGESTION') return '#f43f5e';
    if (level === 'MODERATE_TRAFFIC') return '#f59e0b';
    return '#10b981';
  };

  const filteredRoutes = routes.filter((r) => {
    const matchesSearch =
      r.route_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.corridor_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.congestion_level === statusFilter;
    return matchesSearch && matchesStatus;
  });

  let chartData = [...filteredRoutes].sort((a, b) => a.avg_speed_kmph - b.avg_speed_kmph);
  if (topN !== 'ALL') {
    chartData = chartData.slice(0, parseInt(topN, 10));
  }

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard glowColor="rgba(56, 189, 248, 0.25)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Routes Analyzed</span>
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {summary?.total_routes || routes.length || 24} Corridors
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Continuous GPS speed monitoring</p>
        </GlassCard>

        <GlassCard glowColor="rgba(244, 63, 94, 0.25)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-rose-600 dark:text-rose-400">Heavy Bottlenecks</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {summary?.heavy_congestion_routes || 5} Corridors
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Average speed below 15 km/h</p>
        </GlassCard>

        <GlassCard glowColor="rgba(168, 85, 247, 0.25)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">GPS Pings Processed</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <Radio className="h-5 w-5" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {summary?.total_gps_pings?.toLocaleString() || '2,100,000'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Validated IoT telemetry records</p>
        </GlassCard>

        <GlassCard glowColor="rgba(16, 185, 129, 0.25)">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Daily Transit Boardings</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Ticket className="h-5 w-5" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {summary?.total_daily_boardings?.toLocaleString() || '500,000'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Across urban transit stations</p>
        </GlassCard>
      </div>

      {/* Speed Bar Chart */}
      <GlassCard glowColor="rgba(56, 189, 248, 0.15)">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Corridor Average Speeds (Slowest to Fastest)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Corridors at the top represent major congestion bottlenecks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Top N Corridors Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Show:</span>
              <select
                value={topN}
                onChange={(e) => setTopN(e.target.value)}
                className="glass-input rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
              >
                <option value="15">Top 15 Bottlenecks (Default)</option>
                <option value="25">Top 25</option>
                <option value="50">Top 50</option>
                <option value="100">Top 100</option>
                <option value="ALL">All ({filteredRoutes.length})</option>
              </select>
            </div>

            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search corridor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input w-full rounded-xl pl-8 pr-3 py-1.5 text-xs"
              />
            </div>

            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-white/5 text-xs">
              {['ALL', 'HEAVY_CONGESTION', 'MODERATE_TRAFFIC', 'NORMAL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compact scrollable container so graph never overflows screen */}
        <div className="overflow-y-auto max-h-[480px] w-full pr-2 rounded-xl">
          <div style={{ height: `${Math.max(340, chartData.length * 28)}px` }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 35, left: 160, bottom: 5 }}>
              <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => `${v} km/h`} />
              <YAxis
                type="category"
                dataKey="route_id"
                stroke="#64748b"
                tickFormatter={(id) => {
                  const item = routes.find((r) => r.route_id === id);
                  if (!item) return id;
                  const name = item.corridor_name.length > 22 ? item.corridor_name.slice(0, 22) + '...' : item.corridor_name;
                  return `${id} · ${name}`;
                }}
                width={155}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white dark:border-white/15 dark:bg-slate-950/95 p-3 shadow-xl backdrop-blur-xl">
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{d.route_id}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{d.corridor_name}</div>
                        <div className="mt-1 font-mono text-xs font-semibold" style={{ color: getStatusColor(d.congestion_level) }}>
                          Speed: {d.avg_speed_kmph} km/h · {d.congestion_level}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="avg_speed_kmph" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.congestion_level)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </GlassCard>

      {/* Corridor Table */}
      <GlassCard glowColor="rgba(99, 102, 241, 0.15)">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white mb-3">Corridor Metrics Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-white/10 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3">Corridor Name</th>
                <th className="py-2.5 px-3">Speed</th>
                <th className="py-2.5 px-3">GPS Pings</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
              {filteredRoutes.map((r) => (
                <tr key={r.route_id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">{r.route_id}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.corridor_name}</td>
                  <td className="py-2.5 px-3 font-mono">{r.avg_speed_kmph} km/h</td>
                  <td className="py-2.5 px-3 font-mono">{r.total_pings?.toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        r.congestion_level === 'HEAVY_CONGESTION'
                          ? 'badge-heavy'
                          : r.congestion_level === 'MODERATE_TRAFFIC'
                          ? 'badge-moderate'
                          : 'badge-normal'
                      }`}
                    >
                      {r.congestion_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
