import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Layers,
  Sparkles,
  Play,
  CheckCircle2,
  Code2,
  Zap,
  Clock,
  Compass,
} from 'lucide-react';
import GlassCard from './GlassCard';

export default function MongoStudio() {
  const [mongoStatus, setMongoStatus] = useState(null);
  const [aggsData, setAggsData] = useState(null);
  const [selectedPipeline, setSelectedPipeline] = useState(0);

  useEffect(() => {
    fetch('/api/mongo/status')
      .then((res) => res.json())
      .then((data) => setMongoStatus(data))
      .catch((err) => console.error(err));

    fetch('/api/mongo/aggregations')
      .then((res) => res.json())
      .then((data) => setAggsData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      {/* Activity 1 Header Banner */}
      <GlassCard className="border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-teal-950/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-xs font-bold text-emerald-300">
                MONGODB BIG DATA ENGINE
              </span>
              <span className="text-xs text-slate-400">
                MongoDB NoSQL Data Processing &amp; Geospatial Analysis
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              MongoDB Big Data Ingestion &amp; Aggregations Studio
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Store big data in MongoDB collections with 2dsphere geospatial and compound indexes, processed through 6 production aggregation pipelines.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5">
            <Database className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono font-semibold text-emerald-300">
              smartcity database
            </span>
          </div>
        </div>
      </GlassCard>

      {/* 4 Collections Storage & Indexing Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mongoStatus?.collections?.map((col) => (
          <GlassCard
            key={col.name}
            glowColor="rgba(16, 185, 129, 0.2)"
            className="border-white/10 hover:border-emerald-500/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-emerald-400">{col.name}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-white">
                {col.count.toLocaleString()} docs
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mb-3 min-h-[32px]">{col.description}</p>
            <div className="border-t border-white/5 pt-2 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Indexes Built:</span>
              <div className="flex flex-wrap gap-1">
                {col.indexes.map((idx, i) => (
                  <span
                    key={i}
                    className="rounded bg-slate-950 px-1.5 py-0.5 text-[9px] font-mono text-slate-300 border border-white/5"
                  >
                    {idx}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* 6 Aggregation Pipelines Interactive Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline List */}
        <div className="space-y-2.5 lg:col-span-1">
          <div className="flex items-center gap-2 px-1 text-xs font-bold text-slate-300">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>6 Aggregation Pipelines ($match, $group, $lookup, $near, $facet)</span>
          </div>
          {aggsData?.aggregations?.map((agg, idx) => (
            <GlassCard
              key={agg.id}
              onClick={() => setSelectedPipeline(idx)}
              enableTilt={false}
              className={`cursor-pointer transition-all ${
                selectedPipeline === idx
                  ? 'border-emerald-500/50 bg-emerald-950/25 shadow-glow-emerald'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">
                    PIPELINE #{agg.id}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-0.5">{agg.title}</h4>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {agg.operators.map((op, i) => (
                  <span
                    key={i}
                    className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-mono text-emerald-300"
                  >
                    {op}
                  </span>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Pipeline Code & Output Inspector */}
        <GlassCard className="lg:col-span-2" glowColor="rgba(16, 185, 129, 0.25)">
          {aggsData?.aggregations && (() => {
            const agg = aggsData.aggregations[selectedPipeline];
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      Aggregation Pipeline {agg.id} of 6
                    </span>
                    <h3 className="font-display text-lg font-bold text-white">{agg.title}</h3>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Executed &amp; Verified
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{agg.purpose}</p>

                {/* Query Definition Code */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-1.5">
                    <Code2 className="h-4 w-4 text-emerald-400" />
                    <span>MongoDB Aggregation Query (MQL)</span>
                  </div>
                  <div className="rounded-xl bg-slate-950/90 p-3.5 font-mono text-[11px] text-emerald-300 border border-white/10 overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(agg.query, null, 2)}</pre>
                  </div>
                </div>

                {/* Live Query Results */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-sky-400" />
                      <span>Pipeline Aggregation Output Documents</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {agg.output.length} result record(s)
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-950/90 p-3.5 font-mono text-[11px] text-sky-300 border border-white/10 overflow-x-auto max-h-56">
                    <pre>{JSON.stringify(agg.output, null, 2)}</pre>
                  </div>
                </div>
              </div>
            );
          })()}
        </GlassCard>
      </div>
    </div>
  );
}

