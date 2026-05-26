import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

export default function StreakBadge({ count = 0 }) {
  if (count <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05, y: -2 }}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-500/10 
                 border border-orange-500/25 shadow-[0_0_15px_rgba(249,115,22,0.15)] 
                 hover:shadow-[0_0_25px_rgba(249,115,22,0.3)] hover:border-orange-500/40 
                 transition-all duration-300 backdrop-blur-md cursor-help group"
    >
      {/* Glow aura */}
      <span className="absolute inset-0 rounded-full bg-orange-500/5 group-hover:bg-orange-500/10 blur-md transition-colors" />

      {/* Flame Icon with pulse and float */}
      <motion.div
        animate={{
          y: [0, -2, 0],
          scale: [1, 1.08, 1],
          filter: [
            'drop-shadow(0 0 2px rgba(249,115,22,0.5))',
            'drop-shadow(0 0 6px rgba(249,115,22,0.8))',
            'drop-shadow(0 0 2px rgba(249,115,22,0.5))'
          ]
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="text-orange-500 relative z-10 shrink-0"
      >
        <Flame size={16} className="fill-orange-500" />
      </motion.div>

      {/* Day Count Text */}
      <span className="font-display font-black text-xs text-orange-400 select-none relative z-10 tracking-wider">
        {count} {count === 1 ? 'DAY' : 'DAYS'}
      </span>

      {/* Floating Tooltip */}
      <div className="absolute left-1/2 -bottom-10 -translate-x-1/2 opacity-0 group-hover:opacity-100 
                      translate-y-2 group-hover:translate-y-0 pointer-events-none transition-all duration-300 
                      z-50 bg-background/95 backdrop-blur-md border border-text-main/10 px-2.5 py-1 
                      rounded-lg shadow-2xl text-[9px] font-black uppercase tracking-wider text-text-muted whitespace-nowrap"
      >
        Daily Login Streak 🔥
      </div>
    </motion.div>
  );
}
