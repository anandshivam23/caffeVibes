import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import ChatbotWidget from './ChatbotWidget'
import { AnimatePresence, motion, useScroll } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

const ROUTE_DEPTHS = {
  '/': 0,
  '/tweets': 1,
  '/subscriptions': 1,
  '/playlists': 1,
  '/notifications': 1,
  '/search': 2,
  '/playlist': 2,
  '/video': 3,
  '/profile': 3,
  '/about': 4,
  '/terms': 4,
};

export default function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const [prevPath, setPrevPath] = useState(location.pathname);
  const [direction, setDirection] = useState(1);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef(null);

  // Scroll Progress Track inside <main> scroll container
  const { scrollYProgress } = useScroll({ container: scrollContainerRef });

  useEffect(() => {
    const getDepth = (path) => {
      const base = '/' + path.split('/')[1];
      return ROUTE_DEPTHS[base] ?? 1;
    };

    const prevDepth = getDepth(prevPath);
    const newDepth = getDepth(location.pathname);

    if (newDepth > prevDepth) {
      setDirection(1);
    } else if (newDepth < prevDepth) {
      setDirection(-1);
    } else {
      setDirection(location.pathname.length > prevPath.length ? 1 : -1);
    }
    setPrevPath(location.pathname);
  }, [location.pathname]);

  const handleScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowBackToTop(scrollTop > 400);
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const transitionVariants = {
    initial: (dir) => ({
      x: dir * 160,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 260, damping: 26 },
        opacity: { duration: 0.25 }
      }
    },
    exit: (dir) => ({
      x: -dir * 160,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 260, damping: 26 },
        opacity: { duration: 0.18 }
      }
    })
  };

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] bg-background overflow-hidden relative">
      {/* Dynamic Scroll Progress Bar */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed top-0 left-0 right-0 h-0.5 bg-primary origin-left z-50 shadow-[0_2px_10px_rgba(212,163,115,0.3)] pointer-events-none"
      />

      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 w-full h-[100dvh] overflow-hidden">
        <TopNav onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 relative"
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={transitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 w-full flex flex-col h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Back-To-Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-[60] w-11 h-11 rounded-2xl bg-primary text-background flex items-center justify-center shadow-2xl border border-primary/20 hover:scale-105 active:scale-95 transition-transform"
            title="Scroll to top"
          >
            <ArrowUp size={20} className="stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>

      <ChatbotWidget />
    </div>
  )
}