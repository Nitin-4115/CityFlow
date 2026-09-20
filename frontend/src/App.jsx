import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import TransitMap from './components/TransitMap';
import CongestionView from './components/CongestionView';
import RidershipView from './components/RidershipView';
import TripPredictor from './components/TripPredictor';
import BigDataStudio from './components/BigDataStudio';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-[#07090e] text-slate-100' : 'bg-slate-50/70 text-slate-900'
      } flex flex-col relative overflow-hidden transition-colors duration-300`}
    >
      {/* Ambient background glows */}
      {isDark ? (
        <>
          <div className="pointer-events-none fixed -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-sky-600/10 blur-[130px]" />
          <div className="pointer-events-none fixed top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none fixed -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-sky-200/40 blur-[130px]" />
          <div className="pointer-events-none fixed top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-200/30 blur-[140px]" />
        </>
      )}

      {/* Navbar with Dark/Light Toggle */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'map' && <TransitMap isDark={isDark} />}
            {activeTab === 'traffic' && <CongestionView />}
            {activeTab === 'ridership' && <RidershipView />}
            {activeTab === 'predict' && <TripPredictor />}
            {activeTab === 'engine' && <BigDataStudio />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 dark:border-white/10 dark:bg-slate-950/60 backdrop-blur-xl py-4 px-6 text-center text-xs text-slate-500 relative z-10">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-slate-600 dark:text-slate-400 font-medium">CityFlow &copy; 2026 — Smart City Transit &amp; Traffic Intelligence Platform</span>
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
            <span>Hadoop HDFS</span>
            <span>&bull;</span>
            <span>MongoDB Aggregations</span>
            <span>&bull;</span>
            <span>RandomForest AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
