import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Video, Feather, LogOut, X, Menu, Coffee, Loader2 } from 'lucide-react';
import CoffeeLoader from './CoffeeLoader';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import VideoUploadModal from './VideoUploadModal';
import TweetModal from './TweetModal';
export default function TopNav({ onMenuClick }) {
  const [isUploading, setIsUploading] = useState(false);
  const { currentUser, logout } = useAuth();

  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(parseInt(localStorage.getItem('caffevibes-unread-count') || '0', 10));
  const [shouldPulse, setShouldPulse] = useState(false);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored! Syncing offline activities... ☕", { icon: '✨' });
      flushOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Offline mode activated. Interactions will be queued! ⚠️", { duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      flushOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flushOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('caffevibes-offline-actions') || '[]');
    if (queue.length === 0) return;

    let successCount = 0;
    for (const action of queue) {
      try {
        if (action.method === 'POST') {
          await api.post(action.url, action.body || {});
          successCount++;
        }
      } catch (err) {
        console.error('Failed to sync offline action:', action, err);
      }
    }

    localStorage.setItem('caffevibes-offline-actions', '[]');
    if (successCount > 0) {
      toast.success(`Successfully synchronized ${successCount} offline activities! ✨`, {
        style: {
          background: '#1C1311',
          color: '#D4A373',
          border: '1px solid rgba(212,163,115,0.3)'
        }
      });
      window.dispatchEvent(new CustomEvent('caffevibes-offline-synced'));
    }
  };

  // Fetch initial notifications count on mount/login
  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      localStorage.setItem('caffevibes-unread-count', '0');
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications');
        const unread = (res.data.data || []).filter(n => !n.isRead).length;
        setUnreadCount(unread);
        localStorage.setItem('caffevibes-unread-count', String(unread));
      } catch (e) {
        console.error("Failed to sync initial unread count", e);
      }
    };

    fetchUnreadCount();
  }, [currentUser]);

  // Sync unread counts between Notifications.jsx and TopNav.jsx
  useEffect(() => {
    const handleCountUpdate = (e) => {
      const count = e.detail;
      setUnreadCount(count);
      localStorage.setItem('caffevibes-unread-count', String(count));
      if (count > unreadCount) {
        setShouldPulse(true);
        setTimeout(() => setShouldPulse(false), 2000);
      }
    };

    window.addEventListener('caffevibes-unread-notifications', handleCountUpdate);
    return () => window.removeEventListener('caffevibes-unread-notifications', handleCountUpdate);
  }, [unreadCount]);

  // Real-time socket notification handler
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewNotif = (newNotif) => {
      // Show elegant toast message for real-time alerts
      const sender = newNotif.senderDetails?.fullName || newNotif.senderDetails?.username || "Someone";
      let alertMsg = `${sender} interacted with your page.`;
      if (newNotif.type === 'LIKE') {
        alertMsg = `☕ ${sender} liked your vibe!`;
      } else if (newNotif.type === 'COMMENT') {
        alertMsg = `💬 ${sender} commented on your video!`;
      } else if (newNotif.type === 'SUBSCRIPTION') {
        alertMsg = `🎉 ${sender} subscribed to your channel!`;
      } else if (newNotif.type === 'REPLY') {
        alertMsg = `🔁 ${sender} replied to your thread!`;
      }

      toast.success(alertMsg, {
        duration: 4000,
        position: 'bottom-right',
        style: {
          borderRadius: '1rem',
          background: '#281612',
          border: '1px solid rgba(212,163,115,0.3)',
          color: '#F3EBE1',
          fontSize: '12px',
          fontWeight: 'bold',
        }
      });

      // Update state
      setUnreadCount(prev => {
        const next = prev + 1;
        localStorage.setItem('caffevibes-unread-count', String(next));
        return next;
      });

      // Pulse the bell icon
      setShouldPulse(true);
      setTimeout(() => setShouldPulse(false), 2500);
    };

    socket.on(`notification:${currentUser._id}`, handleNewNotif);
    return () => socket.off(`notification:${currentUser._id}`, handleNewNotif);
  }, [socket, currentUser]);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isTweetModalOpen, setIsTweetModalOpen] = useState(false);
  const searchRef = useRef(null);
  const desktopSearchRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState(JSON.parse(localStorage.getItem('caffevibes-recent-searches') || '[]'));
  const dropdownRef = useRef(null);

  const TRENDING_TOPICS = ['#latteart', '#espresso', '#brewai', '#morningvibe', '#codingtime'];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) && 
        (!searchRef.current || !searchRef.current.contains(e.target)) &&
        (!desktopSearchRef.current || !desktopSearchRef.current.contains(e.target))
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search suggestions fetch
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setIsSearchingSuggestions(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const [videosRes, playlistsRes] = await Promise.all([
          api.get(`/videos?query=${encodeURIComponent(searchQuery)}&limit=3`).catch(() => ({ data: { data: { docs: [] } } })),
          api.get(`/playlist/search?query=${encodeURIComponent(searchQuery)}`).catch(() => ({ data: { data: [] } }))
        ]);

        const videoItems = (videosRes.data.data?.docs || videosRes.data.data?.videos || []).map(v => ({
          id: v._id,
          title: v.title,
          type: 'video'
        }));

        const playlistItems = (playlistsRes.data.data || []).map(p => ({
          id: p._id,
          title: p.name,
          type: 'playlist'
        }));

        // Limit suggestions to top 5
        setSuggestions([...videoItems, ...playlistItems].slice(0, 5));
      } catch (err) {
        console.error('Suggestions error:', err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const saveRecentSearch = (q) => {
    if (!q || !q.trim()) return;
    const clean = q.trim();
    const updated = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('caffevibes-recent-searches', JSON.stringify(updated));
  };

  const handleSuggestionClick = (title) => {
    setSearchQuery(title);
    saveRecentSearch(title);
    navigate(`/search?q=${encodeURIComponent(title)}`);
    setShowDropdown(false);
    setShowMobileSearch(false);
  };

  const handleClearRecent = (e, index) => {
    e.stopPropagation();
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem('caffevibes-recent-searches', JSON.stringify(updated));
  };

  const handleCreateTweetClick = () => {
    if (!currentUser) { navigate('/login'); return; }
    setIsTweetModalOpen(true);
  };
  const handleUploadVideoClick = () => {
    if (!currentUser) { navigate('/login'); return; }
    setIsVideoModalOpen(true);
  };
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    saveRecentSearch(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setShowDropdown(false);
    setShowMobileSearch(false);
  };
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderSuggestionsDropdown = () => {
    if (!showDropdown) return null;

    return (
      <div 
        ref={dropdownRef}
        className="absolute left-0 right-0 top-12 mt-1 bg-surface/95 border border-surface-hover rounded-2xl shadow-3xl z-[100] p-4 flex flex-col gap-4 animate-scale-up backdrop-blur-md"
      >
        {/* Suggestion list */}
        {searchQuery.trim() ? (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-text-muted/40">Suggestions</span>
            {isSearchingSuggestions ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-primary" />
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSuggestionClick(s.title)}
                  className="flex items-center justify-between text-left px-3 py-2 rounded-xl text-xs font-bold text-text-main hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <span className="truncate">{s.title}</span>
                  <span className="text-[8px] uppercase tracking-widest text-text-muted/30 px-2 py-0.5 rounded border border-text-main/5">{s.type}</span>
                </button>
              ))
            ) : (
              <span className="text-xs text-text-muted/60 pl-3">No suggestions found. Press enter to search anyway.</span>
            )}
          </div>
        ) : (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-text-muted/40">Recent Searches</span>
                <div className="flex flex-col gap-1">
                  {recentSearches.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSuggestionClick(s)}
                      className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-primary/5 hover:text-primary cursor-pointer transition-all"
                    >
                      <span className="text-xs font-bold text-text-main">{s}</span>
                      <button
                        type="button"
                        onClick={(e) => handleClearRecent(e, idx)}
                        className="text-text-muted/40 hover:text-red-400 p-1 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Topics */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-text-muted/40">Trending Now 🔥</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {TRENDING_TOPICS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSuggestionClick(tag)}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-text-main/[0.03] border border-text-main/5 rounded-full hover:bg-primary hover:text-background hover:scale-105 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };
  return (
    <>
      <CoffeeLoader isLoading={isUploading} fullScreen={true} />
      {showMobileSearch && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex items-start p-4 pt-5">
          <form onSubmit={handleSearch} className="w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
              <input
                ref={searchRef}
                autoFocus
                type="text"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vibes..."
                className="w-full bg-surface/60 border border-surface-hover/60 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all text-text-main placeholder-text-muted/40"
              />
              {renderSuggestionsDropdown()}
            </div>
            <button
              type="button"
              onClick={() => { setShowMobileSearch(false); setShowDropdown(false); }}
              className="p-2.5 text-text-muted hover:text-primary rounded-xl bg-surface/50"
            >
              <X size={20} />
            </button>
          </form>
        </div>
      )}
      <header className="h-14 sm:h-16 border-b border-surface-hover/30 bg-background/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-2 sm:px-4 lg:px-8 gap-2 w-full">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          <button
            onClick={onMenuClick}
            id="hamburger-btn"
            aria-label="Open menu"
            className="lg:hidden p-2 text-text-muted hover:text-primary transition-colors rounded-xl hover:bg-surface/50"
          >
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-1.5 lg:hidden" aria-label="Caffe Vibes Home">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-background shadow-lg shadow-primary/20 shrink-0">
              <Coffee size={14} className="sm:hidden" />
              <Coffee size={16} className="hidden sm:block" />
            </div>
            <span className="font-display font-black text-sm sm:text-base tracking-tight text-text-main hidden xs:block">Caffe Vibes</span>
          </Link>
        </div>
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative group hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted/60 group-focus-within:text-primary transition-colors">
            <Search size={16} />
          </div>
          <input
            ref={desktopSearchRef}
            type="text"
            value={searchQuery}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vibes..."
            className="w-full bg-surface/40 border border-surface-hover/50 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-surface/80 transition-all placeholder-text-muted/40 text-text-main"
          />
          {renderSuggestionsDropdown()}
        </form>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-display font-black text-[8px] sm:text-[9px] uppercase tracking-widest animate-pulse shadow-sm shrink-0"
              title="Offline Mode ☕ - activities will queue and sync when reconnected"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Offline
            </motion.div>
          )}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="sm:hidden w-8 h-8 flex items-center justify-center text-text-muted hover:text-primary transition-all rounded-xl"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          <button
            onClick={handleCreateTweetClick}
            className="hidden md:flex w-9 h-9 rounded-xl bg-surface/40 border border-surface-hover/60 items-center justify-center text-text-muted hover:bg-surface hover:text-primary transition-all group"
            title="Create Post"
            aria-label="Create post"
          >
            <Feather size={16} className="group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={handleUploadVideoClick}
            className="hidden sm:flex w-9 h-9 rounded-xl bg-surface/40 border border-surface-hover/60 items-center justify-center text-text-muted hover:bg-surface hover:text-primary transition-all group"
            title="Upload Video"
            aria-label="Upload video"
          >
            <Video size={16} className="group-hover:scale-110 transition-transform" />
          </button>
          <Link
            to="/notifications"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-surface/40 border border-surface-hover/60 flex items-center justify-center text-text-muted hover:bg-surface hover:text-primary transition-all relative group ${shouldPulse ? 'animate-pulse' : ''}`}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={16} className={`group-hover:rotate-12 transition-transform ${shouldPulse ? 'text-primary animate-wiggle' : ''}`} />
            {currentUser && unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-background font-mono font-black text-[8px] sm:text-[9px] w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center border border-background shadow-lg leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-text-main/10">
              <Link
                to={`/profile/${currentUser.username}`}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-surface-hover/60 hover:border-primary shadow-lg hover:scale-105 active:scale-95 transition-all shrink-0"
                aria-label="My profile"
              >
                <img
                  src={currentUser.avatar || 'https://i.pravatar.cc/150?img=32'}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2 sm:px-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 border border-red-500/20 active:scale-95 shrink-0"
                aria-label="Log out"
              >
                <LogOut size={14} />
                <span className="hidden lg:inline">Vibe Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-text-main/10">
              <Link
                to="/login"
                className="hidden sm:flex items-center justify-center h-8 sm:h-9 px-3 sm:px-4 text-[12px] sm:text-[13px] font-bold text-text-muted hover:text-primary transition-all rounded-xl hover:bg-surface/50 whitespace-nowrap"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-center h-8 sm:h-9 px-3 sm:px-5 text-[11px] sm:text-[13px] font-black bg-primary hover:bg-primary-hover text-background rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>
      <VideoUploadModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onUploadSuccess={(newVideo) => navigate(`/video/${newVideo._id}`)}
      />
      <TweetModal
        isOpen={isTweetModalOpen}
        onClose={() => setIsTweetModalOpen(false)}
      />
    </>
  );
}