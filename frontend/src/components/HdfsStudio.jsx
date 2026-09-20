import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Folder,
  FileText,
  Terminal,
  CheckCircle2,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  Code2,
} from 'lucide-react';
import GlassCard from './GlassCard';

export default function HdfsStudio() {
  const [hdfsData, setHdfsData] = useState(null);
  const [mrData, setMrData] = useState(null);
  const [selectedJob, setSelectedJob] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('hdfs');

  useEffect(() => {
    fetch('/api/hdfs/status')
      .then((res) => res.json())
      .then((data) => setHdfsData(data))
      .catch((err) => console.error(err));

    fetch('/api/mapreduce/jobs')
      .then((res) => res.json())
      .then((data) => setMrData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      {/* Activity 2 Header Banner */}
      <GlassCard className="border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-slate-900/60 to-indigo-950/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-md bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 text-xs font-bold text-sky-300">
                HADOOP DISTRIBUTED STORAGE
              </span>
              <span className="text-xs text-slate-400">Hadoop Pseudo-Cluster (v3.2.1)</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              HDFS File Management &amp; MapReduce Execution Studio
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Complete proof of adding, retrieving, deleting files/directories on HDFS, and executing 3 Hadoop Streaming MapReduce jobs.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab('hdfs')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeSubTab === 'hdfs'
                  ? 'bg-sky-500 text-white shadow-glow-blue'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              <span>HDFS Operations &amp; Tree</span>
            </button>
            <button
              onClick={() => setActiveSubTab('mapreduce')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeSubTab === 'mapreduce'
                  ? 'bg-indigo-500 text-white shadow-glow-blue'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Cpu className="h-4 w-4" />
              <span>MapReduce Jobs (3)</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Sub-Tab 1: HDFS File Management Operations */}
      {activeSubTab === 'hdfs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HDFS Directory Tree View */}
          <GlassCard className="lg:col-span-1" glowColor="rgba(56, 189, 248, 0.3)">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-sky-400" />
                <h3 className="font-display text-sm font-bold text-white">HDFS Inode Hierarchy</h3>
              </div>
              <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                hdfs://namenode:9000
              </span>
            </div>

            <div className="space-y-2 rounded-xl bg-slate-950/80 p-4 font-mono text-xs text-slate-300 border border-white/5">
              <div className="flex items-center gap-2 text-sky-400 font-semibold">
                <Folder className="h-4 w-4" />
                <span>/smartcity</span>
              </div>
              <div className="ml-4 space-y-2 border-l border-white/10 pl-3">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Folder className="h-3.5 w-3.5" />
                    <span>raw_gps/</span>
                  </div>
                  <div className="ml-4 flex items-center gap-1 text-slate-400 text-[11px]">
                    <FileText className="h-3 w-3 text-slate-500" />
                    <span>gps_telemetry.csv (~13.2 MB)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Folder className="h-3.5 w-3.5" />
                    <span>raw_rfid/</span>
                  </div>
                  <div className="ml-4 flex items-center gap-1 text-slate-400 text-[11px]">
                    <FileText className="h-3 w-3 text-slate-500" />
                    <span>rfid_ticketing.csv (~3.5 MB)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Folder className="h-3.5 w-3.5" />
                    <span>processed_traffic/</span>
                  </div>
                  <div className="ml-4 flex items-center gap-1 text-slate-400 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>part-00000 (12 routes)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Folder className="h-3.5 w-3.5" />
                    <span>processed_traffic_hourly/</span>
                  </div>
                  <div className="ml-4 flex items-center gap-1 text-slate-400 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>part-00000 (1,728 profiles)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Folder className="h-3.5 w-3.5" />
                    <span>processed_ridership/</span>
                  </div>
                  <div className="ml-4 flex items-center gap-1 text-slate-400 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>part-00000 (432 bins)</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Explicit File Management Operations (Add, Retrieve, Delete) */}
          <GlassCard className="lg:col-span-2" glowColor="rgba(99, 102, 241, 0.3)">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="h-5 w-5 text-indigo-400" />
              <h3 className="font-display text-sm font-bold text-white">
                HDFS File Management Commands (Rubric Proofs)
              </h3>
            </div>

            <div className="space-y-4">
              {hdfsData?.operations_proof?.map((op, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-4 transition-all hover:border-sky-500/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sky-300 tracking-wide uppercase">
                      {op.category}
                    </span>
                    <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> {op.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">{op.description}</p>
                  <div className="rounded-lg bg-black/70 p-2.5 font-mono text-[11px] text-emerald-300 border border-white/5 overflow-x-auto">
                    <code>{op.command}</code>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Sub-Tab 2: MapReduce Streaming Jobs */}
      {activeSubTab === 'mapreduce' && mrData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Selector List */}
          <div className="space-y-3 lg:col-span-1">
            {mrData.jobs.map((job, idx) => (
              <GlassCard
                key={job.job_id}
                onClick={() => setSelectedJob(idx)}
                enableTilt={false}
                className={`cursor-pointer transition-all ${
                  selectedJob === idx
                    ? 'border-indigo-500/50 bg-indigo-950/30 shadow-glow-blue'
                    : 'hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">
                      JOB #{idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{job.name}</h4>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                  <span>Output Records:</span>
                  <span className="font-mono font-bold text-white">{job.records_emitted.toLocaleString()}</span>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Selected Job Detailed Inspector */}
          <GlassCard className="lg:col-span-2" glowColor="rgba(168, 85, 247, 0.25)">
            {(() => {
              const job = mrData.jobs[selectedJob];
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-xs font-mono text-purple-400 font-bold">{job.job_id}</span>
                      <h3 className="font-display text-lg font-bold text-white">{job.name}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/20">
                      {job.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{job.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Input HDFS Path</span>
                      <div className="font-mono text-xs text-amber-300 mt-1">{job.input}</div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Output Partition</span>
                      <div className="font-mono text-xs text-emerald-300 mt-1">{job.output}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
                      <Code2 className="h-4 w-4 text-sky-400" />
                      <span>Hadoop Streaming Invocation String</span>
                    </div>
                    <div className="rounded-lg bg-black/90 p-3 font-mono text-[11px] text-sky-300 leading-relaxed border border-white/5 overflow-x-auto">
                      hadoop jar hadoop-streaming.jar \<br />
                      &nbsp;&nbsp;-files {job.mapper},{job.reducer} \<br />
                      &nbsp;&nbsp;-mapper "python3 {job.mapper.split('/').pop()}" \<br />
                      &nbsp;&nbsp;-reducer "python3 {job.reducer.split('/').pop()}" \<br />
                      &nbsp;&nbsp;-input {job.input.split('/').slice(0, 3).join('/')} \<br />
                      &nbsp;&nbsp;-output {job.output.split('/').slice(0, 3).join('/')}
                    </div>
                  </div>
                </div>
              );
            })()}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

