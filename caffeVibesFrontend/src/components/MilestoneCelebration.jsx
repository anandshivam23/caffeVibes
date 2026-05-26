import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Sparkles } from 'lucide-react';

const CELEBRATION_COLORS = [
  '#D4A373', // Primary warm coffee/caramel
  '#E9D8A6', // Warm cream/gold
  '#F4A261', // Peach/orange
  '#E76F51', // Terracotta
  '#281612', // Coffee brown
  '#FFD700', // Gold
  '#FFA500', // Orange
];

export default function MilestoneCelebration() {
  const canvasRef = useRef(null);
  const [activeMilestone, setActiveMilestone] = useState(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const handleMilestone = (e) => {
      const { milestone, title } = e.detail || {};
      if (!milestone) return;

      if (milestone === 'confetti-only') {
        initConfetti();
        return;
      }

      if (!title) return;

      // Gate using localStorage to prevent spamming celebrations
      const celebratedKey = `caffevibes-celebrated-${milestone.toLowerCase().replace(/\s+/g, '-')}`;
      if (localStorage.getItem(celebratedKey)) {
        return; // Already celebrated!
      }

      // Mark as celebrated
      localStorage.setItem(celebratedKey, 'true');

      // Set active milestone state to trigger the overlay
      setActiveMilestone({ milestone, title });

      // Trigger the canvas confetti
      initConfetti();
    };

    window.addEventListener('caffevibes-milestone-reached', handleMilestone);
    return () => {
      window.removeEventListener('caffevibes-milestone-reached', handleMilestone);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const initConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = [];

    // Spawn 150 particles from the bottom corners / center
    const particleCount = 150;
    for (let i = 0; i < particleCount; i++) {
      const isLeft = Math.random() < 0.5;
      
      particlesRef.current.push({
        x: isLeft ? 50 : canvas.width - 50,
        y: canvas.height + 20,
        size: Math.random() * 8 + 4,
        color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
        velocityX: (isLeft ? Math.random() * 12 + 6 : -Math.random() * 12 - 6),
        velocityY: -Math.random() * 20 - 15,
        gravity: 0.4,
        drag: 0.98,
        spin: Math.random() * 360,
        spinSpeed: Math.random() * 10 - 5,
        opacity: 1,
        fadeSpeed: Math.random() * 0.005 + 0.005,
      });
    }

    // Start render loop
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    tick();
  };

  const tick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Handle resizing on the fly
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    let activeParticlesCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.opacity <= 0) continue;

      activeParticlesCount++;

      // Physics
      p.velocityX *= p.drag;
      p.velocityY = (p.velocityY + p.gravity) * p.drag;
      p.x += p.velocityX;
      p.y += p.velocityY;
      p.spin += p.spinSpeed;
      p.opacity -= p.fadeSpeed;

      // Draw
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.spin * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);

      // Random particle shapes (circles, squares, triangles)
      if (i % 3 === 0) {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (i % 3 === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (activeParticlesCount > 0) {
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <>
      {/* Canvas Overlay for Confetti Particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-[9999]"
      />

      {/* Glassmorphic Celebration Notification Card */}
      <AnimatePresence>
        {activeMilestone && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] w-[90%] max-w-md"
          >
            <div className="relative overflow-hidden rounded-[2rem] border border-orange-500/30 
                            bg-background/80 backdrop-blur-2xl p-6 shadow-[0_20px_50px_rgba(212,163,115,0.25)]
                            flex flex-col items-center text-center gap-4 group"
            >
              {/* Gold light burst backplate */}
              <div className="absolute -inset-10 bg-radial-gradient from-orange-500/10 to-transparent blur-2xl pointer-events-none" />

              {/* Glowing Award Icon */}
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-amber-400 to-orange-600 
                           flex items-center justify-center text-background shadow-lg shadow-orange-500/30"
              >
                <Award size={32} className="stroke-[2.5]" />
              </motion.div>

              <div className="flex flex-col gap-1.5 z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center justify-center gap-1">
                  <Sparkles size={10} className="fill-current animate-pulse" />
                  Milestone Achieved
                  <Sparkles size={10} className="fill-current animate-pulse" />
                </span>
                <h2 className="text-xl font-display font-black text-text-main leading-tight">
                  {activeMilestone.title}
                </h2>
                <p className="text-xs text-text-muted/70 font-semibold tracking-wide">
                  You unlocked this special engagement reward! Keep vibrating on CaffeVibes ☕
                </p>
              </div>

              {/* Action Button to close */}
              <button
                onClick={() => setActiveMilestone(null)}
                className="z-10 mt-2 px-6 py-2 bg-primary hover:bg-primary-dark hover:scale-105 active:scale-95 
                           text-background font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md"
              >
                Awesome!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
