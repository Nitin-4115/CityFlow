import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Activity,
  Users,
  Sparkles,
  Database,
  Navigation2,
  Sun,
  Moon,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isDark, setIsDark }) {
  const tabs = [
    { id: 'map', label: 'Transit Map', icon: MapPin },
    { id: 'traffic', label: 'Corridor Traffic', icon: Activity },
    { id: 'ridership', label: 'Station Ridership', icon: Users },
    { id: 'predict', label: 'AI Forecaster', icon: Sparkles },
    { id: 'engine', label: 'Big Data Engine', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 dark:border-white/10 dark:bg-slate-950/85 backdrop-blur-2xl px-6 py-3.5 transition-colors shadow-sm dark:shadow-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 p-0.5 shadow-md dark:shadow-glow-blue">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white dark:bg-slate-950">
              <Navigation2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                City<span className="text-sky-600 dark:text-sky-400">Flow</span>
              </span>
              <span className="rounded-md border border-sky-500/20 bg-sky-500/10 dark:border-sky-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Smart Transit Analytics &amp; Traffic Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100/90 dark:border-white/10 dark:bg-slate-900/50 p-1.5 backdrop-blur-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm border border-slate-200 dark:bg-gradient-to-r dark:from-sky-500/20 dark:to-indigo-500/20 dark:border-sky-400/40 dark:shadow-glow-blue"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={`relative z-10 h-3.5 w-3.5 ${isActive ? 'text-sky-600 dark:text-sky-400' : ''}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Theme Toggle & Status */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-slate-900 dark:text-amber-400 dark:hover:bg-slate-800 transition-all shadow-sm"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Live Network Active
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="mt-3 flex lg:hidden overflow-x-auto gap-1 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex whitespace-nowrap items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                isActive
                  ? 'bg-sky-600 dark:bg-sky-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
