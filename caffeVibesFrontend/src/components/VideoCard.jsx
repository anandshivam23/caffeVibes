import React, { useState, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';
import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

// Animated Rolling Count component for view hits
export function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = parseInt(value, 10) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    
    let start = 0;
    const duration = 1.2; // count-up duration in seconds
    const totalFrames = 30;
    const increment = end / totalFrames;
    const stepTime = (duration * 1000) / totalFrames;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span className="tabular-nums font-semibold">{count.toLocaleString()}</span>;
}

export default function VideoCard({ video, index, compact }) {
  // 3D Tilt Coordinates
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Spring physics for tilt rotations
  const rotateXSpring = useSpring(0, { stiffness: 300, damping: 25 });
  const rotateYSpring = useSpring(0, { stiffness: 300, damping: 25 });

  useEffect(() => {
    rotateXSpring.set(tilt.x);
    rotateYSpring.set(tilt.y);
  }, [tilt, rotateXSpring, rotateYSpring]);

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Mouse coordinates relative to card center
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Calculate rotation angles (max 10 degrees)
    const degX = -(mouseY / height) * 10;
    const degY = (mouseX / width) * 10;

    setTilt({ x: degX, y: degY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 35, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{
        scale: 1.025,
        borderColor: "rgba(212, 163, 115, 0.35)",
        boxShadow: "0px 15px 35px rgba(212, 163, 115, 0.18)",
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 280, 
        damping: 22,
        boxShadow: { duration: 0.25 }
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000,
        rotateX: rotateXSpring,
        rotateY: rotateYSpring,
        transformStyle: 'preserve-3d'
      }}
      className={`group flex flex-col cursor-pointer bg-surface/10 border border-text-main/5 p-2 rounded-[1.8rem] transition-colors duration-300 hover:bg-surface/30 ${
        compact ? 'gap-2 sm:gap-3 mb-2' : 'gap-3 sm:gap-5 mb-4 sm:mb-6'
      }`}
    >
      <Link 
        to={`/video/${video.id}`} 
        className={`relative aspect-video overflow-hidden bg-surface border border-text-main/5 shadow-lg transition-all duration-300 hover:shadow-xl ${
          compact ? 'rounded-xl sm:rounded-2xl' : 'rounded-2xl sm:rounded-[1.4rem]'
        }`}
        style={{ transform: 'translateZ(15px)' }} // Lift item in 3D perspective
      >
        {/* Shared Element Transition Image */}
        <motion.img
          layoutId={`video-thumbnail-${video.id}`}
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-90 transition-opacity duration-300"></div>
        
        {/* Hover Center Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-background/10 backdrop-blur-[1px]">
          <motion.div 
            className={`${compact ? 'w-10 h-10 rounded-xl' : 'w-14 h-14 rounded-2xl'} bg-primary shadow-xl flex items-center justify-center text-background`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play fill="currentColor" size={compact ? 16 : 24} className="translate-x-0.5" />
          </motion.div>
        </div>

        <span className={`absolute bottom-3 right-3 bg-background/90 backdrop-blur-md font-bold uppercase tracking-widest rounded-lg text-text-main shadow-lg border border-text-main/10 ${
          compact ? 'text-[9px] px-2 py-1' : 'text-[11px] px-3 py-1'
        }`}>
          {video.duration}
        </span>
      </Link>

      <div className={`flex items-start gap-4 ${compact ? 'px-1' : 'px-2'}`} style={{ transform: 'translateZ(10px)' }}>
        {!compact && (
          <Link to={`/profile/${video.owner.username || video.owner.id}`} className="flex-shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-surface-hover border-2 border-transparent group-hover:border-primary/40 transition-all duration-500 shadow-xl group-hover:rotate-6">
              <img src={video.owner.avatar} alt={video.owner.name} loading="lazy" className="w-full h-full object-cover" />
            </div>
          </Link>
        )}

        <div className="flex flex-col overflow-hidden py-1">
          <Link 
            to={`/video/${video.id}`} 
            className={`font-display font-black text-text-main line-clamp-2 leading-tight group-hover:text-primary transition-colors tracking-tight ${
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base md:text-lg'
            }`}
          >
            {video.title}
          </Link>
          
          <div className={`flex flex-wrap items-center gap-2 mt-2 ${compact ? 'hidden sm:flex' : 'flex'}`}>
             <Link 
               to={`/profile/${video.owner.username || video.owner.id}`} 
               className={`font-bold text-text-muted/60 hover:text-primary transition-colors uppercase tracking-[0.1em] ${
                 compact ? 'text-[9px]' : 'text-[11px]'
               }`}
             >
               {video.owner.name}
             </Link>
             
             <div className="w-1 h-1 rounded-full bg-text-main/5" />
             
             <div className={`text-text-muted/30 font-black uppercase tracking-widest flex items-center gap-1.5 ${
               compact ? 'text-[8px]' : 'text-[10px]'
             }`}>
               <span>
                 <AnimatedCounter value={video.views} /> hits
               </span>
               
               {compact && <div className="hidden lg:block w-1 h-1 rounded-full bg-text-main/5" />}
               {!compact && <div className="w-1 h-1 rounded-full bg-text-main/5" />}
               
               <span className={compact ? 'hidden lg:inline' : 'inline'}>
                 {video.createdAt ? new Date(video.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'}
               </span>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}