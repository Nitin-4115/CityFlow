import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDrive,
  Cpu,
  Folder,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import GlassCard from './GlassCard';

export default function BigDataStudio() {
  const [activeSubTab, setActiveSubTab] = useState('hadoop');
  const [hdfsData, setHdfsData] = useState(null);
  const [mrData, setMrData] = useState(null);
  const [mongoStatus, setMongoStatus] = useState(null);
  const [aggsData, setAggsData] = useState(null);
  const [selectedJob, setSelectedJob] = useState(0);
  const [selectedPipeline, setSelectedPipeline] = useState(0);

  useEffect(() => {
    fetch('/api/hdfs/status').then((r) => r.json()).then(setHdfsData).catch(console.error);
    fetch('/api/mapreduce/jobs').then((r) => r.json()).then(setMrData).catch(console.error);
    fetch('/api/mongo/status').then((r) => r.json()).then(setMongoStatus).catch(console.error);
    fetch('/api/mongo/aggregations').then((r) => r.json()).then(setAggsData).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <GlassCard glowColor="rgba(99, 102, 241, 0.2)">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Big Data Architecture &amp; Storage Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distributed storage on Hadoop HDFS, 3 MapReduce Streaming jobs, and MongoDB aggregation pipelines
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab('hadoop')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeSubTab === 'hadoop'
                  ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              <span>Hadoop &amp; HDFS</span>
            </button>
            <button
              onClick={() => setActiveSubTab('mongo')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeSubTab === 'mongo'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Database className="h-4 w-4" />
              <span>MongoDB Pipelines</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Hadoop & HDFS View */}
      {activeSubTab === 'hadoop' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inode tree */}
            <GlassCard className="lg:col-span-1" glowColor="rgba(56, 189, 248, 0.2)">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-xs font-bold uppercase text-slate-500 dark:text-slate-400">HDFS File Hierarchy</span>
                <span className="font-mono text-[10px] text-sky-700 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  hdfs://namenode:9000
                </span>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-100 dark:bg-slate-950/80 p-3.5 font-mono text-xs border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-bold">
                  <Folder className="h-4 w-4" />
                  <span>/smartcity</span>
                </div>
                <div className="ml-4 space-y-2 border-l border-slate-300 dark:border-white/10 pl-3">
                  <div>
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
                      <Folder className="h-3.5 w-3.5" />
                      <span>raw_gps/</span>
                    </div>
                    <div className="ml-3 text-slate-500 dark:text-slate-400 text-[11px]">gps_telemetry.csv (~13.2 MB)</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
                      <Folder className="h-3.5 w-3.5" />
                      <span>raw_rfid/</span>
                    </div>
                    <div className="ml-3 text-slate-500 dark:text-slate-400 text-[11px]">rfid_ticketing.csv (~3.5 MB)</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <Folder className="h-3.5 w-3.5" />
                      <span>processed_traffic/</span>
                    </div>
                    <div className="ml-3 text-slate-500 dark:text-slate-400 text-[11px]">part-00000 (12 routes)</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <Folder className="h-3.5 w-3.5" />
                      <span>processed_traffic_hourly/</span>
                    </div>
                    <div className="ml-3 text-slate-500 dark:text-slate-400 text-[11px]">part-00000 (1,728 profiles)</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <Folder className="h-3.5 w-3.5" />
                      <span>processed_ridership/</span>
                    </div>
                    <div className="ml-3 text-slate-500 dark:text-slate-400 text-[11px]">part-00000 (432 bins)</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* HDFS Operations Log */}
            <GlassCard className="lg:col-span-2" glowColor="rgba(99, 102, 241, 0.2)">
              <span className="font-display text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 block">
                HDFS File Operations (Adding, Retrieving, Deleting)
              </span>
              <div className="space-y-3">
                {hdfsData?.operations_proof?.map((op, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-400">{op.category}</span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> {op.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">{op.description}</p>
                    <div className="rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                      <code>{op.command}</code>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* MapReduce Jobs Details */}
          {mrData && (
            <GlassCard glowColor="rgba(168, 85, 247, 0.15)">
              <span className="font-display text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 block">
                Hadoop MapReduce Streaming Jobs
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mrData.jobs.map((job, idx) => (
                  <div
                    key={job.job_id}
                    onClick={() => setSelectedJob(idx)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      selectedJob === idx
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 font-mono">JOB #{idx + 1}</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{job.name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{job.description}</p>
                    <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-white/5 pt-2 flex justify-between font-mono">
                      <span>Records:</span>
                      <b className="text-sky-600 dark:text-sky-400">{job.records_emitted.toLocaleString()}</b>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* MongoDB Aggregations View */}
      {activeSubTab === 'mongo' && (
        <div className="space-y-6">
          {/* Collections Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mongoStatus?.collections?.map((col) => (
              <GlassCard key={col.name} glowColor="rgba(16, 185, 129, 0.2)">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">{col.name}</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-800 dark:text-white border border-slate-200 dark:border-transparent">
                    {col.count.toLocaleString()} docs
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{col.description}</p>
                <div className="border-t border-slate-200 dark:border-white/5 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Indexes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {col.indexes.map((idx, i) => (
                      <span key={i} className="rounded bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 text-[9px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                        {idx}
                      </span>
                    ))}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* 6 Aggregation Pipelines */}
          {aggsData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                  6 Aggregation Pipelines
                </span>
                {aggsData.aggregations.map((agg, idx) => (
                  <div
                    key={agg.id}
                    onClick={() => setSelectedPipeline(idx)}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                      selectedPipeline === idx
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/40 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">PIPELINE #{agg.id}</span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{agg.title}</h4>
                  </div>
                ))}
              </div>

              <GlassCard className="lg:col-span-2" glowColor="rgba(16, 185, 129, 0.2)">
                {(() => {
                  const agg = aggsData.aggregations[selectedPipeline];
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">{agg.title}</h3>
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{agg.purpose}</p>

                      <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">MongoDB Query (MQL):</span>
                        <div className="rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-300 max-h-40 overflow-x-auto">
                          <pre>{JSON.stringify(agg.query, null, 2)}</pre>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Query Output:</span>
                        <div className="rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-sky-300 max-h-44 overflow-x-auto">
                          <pre>{JSON.stringify(agg.output, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </GlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
