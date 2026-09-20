import React from 'react';

export default function GlassCard({
  children,
  className = '',
  glowColor = 'rgba(56, 189, 248, 0.15)',
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`glass-card relative overflow-hidden rounded-2xl p-6 transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20 ${className}`}
    >
      {/* Subtle ambient light */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-15 dark:opacity-25"
        style={{ backgroundColor: glowColor }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
