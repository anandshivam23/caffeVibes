import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { 
  Loader2, Search, User, Video as VideoIcon, ListMusic, MessageSquare, 
  SlidersHorizontal, Calendar, Clock, ArrowUpDown, Grid, List, 
  Sparkles, Flame, Coffee, Compass, CheckCircle2, ChevronRight, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCard from '../components/VideoCard';
import TweetCard from '../components/TweetCard';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  // Tab and Filters State
  const [activeTab, setActiveTab] = useState('All');
  const [sortBy, setSortBy] = useState('relevance'); // relevance, recent, popular
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [durationFilter, setDurationFilter] = useState('all'); // all, short (<4m), medium (4-20m), long (>20m)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid, list (for videos)

  // Fetch Results State
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Recommendations state
  const [recommendedVideos, setRecommendedVideos] = useState([]);

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(8);
  const [isInfiniteLoading, setIsInfiniteLoading] = useState(false);
  const infiniteSentinelRef = useRef(null);

  // Fetch search results
  useEffect(() => {
    if (!query.trim()) return;
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const [videosRes, usersRes, playlistsRes, tweetsRes, recommendationsRes] = await Promise.all([
          api.get(`/videos?query=${encodeURIComponent(query)}&limit=40`).catch(() => ({ data: { data: { docs: [] } } })),
          api.get(`/users/search?q=${encodeURIComponent(query)}&limit=20`).catch(() => ({ data: { data: [] } })),
          api.get(`/playlist/search?query=${encodeURIComponent(query)}`).catch(() => ({ data: { data: [] } })),
          api.get(`/tweets?type=tweet&query=${encodeURIComponent(query)}`).catch(() => ({ data: { data: [] } })),
          api.get('/videos?limit=8').catch(() => ({ data: { data: { docs: [] } } })) // popular regional / AI seeds
        ]);

        setVideos(videosRes.data.data?.docs || videosRes.data.data?.videos || []);
        setUsers(usersRes.data.data || []);
        setPlaylists(playlistsRes.data.data || []);
        setTweets(tweetsRes.data.data || []);
        setRecommendedVideos(recommendationsRes.data.data?.docs || recommendationsRes.data.data?.videos || []);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Reset paging count
    setVisibleCount(8);
    fetchResults();
  }, [query]);

  // Infinite Scroll observer
  useEffect(() => {
    if (isLoading) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isInfiniteLoading) {
        setIsInfiniteLoading(true);
        setTimeout(() => {
          setVisibleCount(prev => prev + 6);
          setIsInfiniteLoading(false);
        }, 800);
      }
    }, { threshold: 0.1 });

    const sentinel = infiniteSentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }
    
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [isLoading, isInfiniteLoading]);

  // Date check helper
  const matchesDate = (dateStr) => {
    if (dateFilter === 'all') return true;
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const oneDay = 1000 * 60 * 60 * 24;

    if (dateFilter === 'today') return diff <= oneDay;
    if (dateFilter === 'week') return diff <= oneDay * 7;
    if (dateFilter === 'month') return diff <= oneDay * 30;
    return true;
  };

  // Video duration check helper
  const matchesDuration = (durationSec) => {
    if (durationFilter === 'all') return true;
    const durMin = (durationSec || 0) / 60;
    if (durationFilter === 'short') return durMin < 4;
    if (durationFilter === 'medium') return durMin >= 4 && durMin <= 20;
    if (durationFilter === 'long') return durMin > 20;
    return true;
  };

  // Sorting helper
  const sortItems = (items, type) => {
    const list = [...items];
    if (sortBy === 'recent') {
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sortBy === 'popular') {
      if (type === 'video') return list.sort((a, b) => (b.views || 0) - (a.views || 0));
      if (type === 'tweet') return list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      if (type === 'playlist') return list.sort((a, b) => (b.videos?.length || 0) - (a.videos?.length || 0));
      if (type === 'user') return list.sort((a, b) => (b.subscribersCount || 0) - (a.subscribersCount || 0));
    }
    return list; // relevance (default backend query order)
  };

  // Filter items based on selected parameters
  const filteredVideos = sortItems(videos.filter(v => matchesDate(v.createdAt) && matchesDuration(v.duration)), 'video');
  const filteredUsers = sortItems(users.filter(u => matchesDate(u.createdAt)), 'user');
  const filteredPlaylists = sortItems(playlists.filter(p => matchesDate(p.createdAt)), 'playlist');
  const filteredTweets = sortItems(tweets.filter(t => matchesDate(t.createdAt)), 'tweet');

  // Sum results matching filters
  const totalResultsCount = 
    (activeTab === 'All' || activeTab === 'Videos' ? filteredVideos.length : 0) +
    (activeTab === 'All' || activeTab === 'Users' ? filteredUsers.length : 0) +
    (activeTab === 'All' || activeTab === 'Playlists' ? filteredPlaylists.length : 0) +
    (activeTab === 'All' || activeTab === 'Tweets' ? filteredTweets.length : 0);

  const tabs = ['All', 'Videos', 'Users', 'Playlists', 'Tweets'];

  const trendingExplanations = [
    "AI Brew likes this track: full of dark-roast energy and 0 latency compile times! ☕",
    "A smooth velvety blend. Recommended by our algorithmic coffee sommeliers for morning coding.",
    "A golden blend overflowing with creamy notes. Best served hot at 1080p stream speed."
  ];

  return (
    <div className="max-w-[90rem] mx-auto px-3 sm:px-4 lg:px-8 py-6 animate-fade-in relative pb-20">
      
      {/* Top Banner and Count Display */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.2rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Search size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-text-main tracking-tight">
              Search Results
            </h1>
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mt-1">
              Found <span className="text-primary font-bold">{totalResultsCount}</span> matches for <span className="text-primary font-bold">"{query}"</span>
            </p>
          </div>
        </div>

        {/* Action Toggles: Filters & Grid/List View */}
        <div className="flex items-center gap-2">
          {activeTab === 'Videos' && (
            <div className="flex bg-text-main/[0.03] border border-text-main/10 rounded-xl p-1 shrink-0 shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-background' : 'text-text-muted hover:text-text-main'}`}
                title="Grid view"
              >
                <Grid size={15} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-background' : 'text-text-muted hover:text-text-main'}`}
                title="List view"
              >
                <List size={15} />
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border transition-all active:scale-95 shadow-sm
                       ${showFiltersPanel 
                         ? 'bg-primary border-primary text-background' 
                         : 'bg-text-main/[0.02] border-text-main/5 hover:bg-text-main/[0.05] text-text-muted'}`}
          >
            <SlidersHorizontal size={14} />
            Filters {showFiltersPanel ? 'Active' : ''}
          </button>
        </div>
      </div>

      {/* Advanced Glassmorphism Filters Panel Drawer */}
      <AnimatePresence>
        {showFiltersPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-surface border border-surface-hover/80 rounded-[1.8rem] p-5 shadow-2xl flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Sort By Column */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted/40 flex items-center gap-1.5">
                    <ArrowUpDown size={11} className="text-primary" /> Sort Matches By
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: 'relevance', label: 'Relevance ☕' },
                      { id: 'recent', label: 'Recent Uploads' },
                      { id: 'popular', label: 'Popularity & Views' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id)}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all
                                   ${sortBy === opt.id 
                                     ? 'bg-primary/10 text-primary border border-primary/20' 
                                     : 'bg-text-main/[0.01] border border-transparent hover:bg-text-main/[0.03] text-text-muted'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Date Column */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted/40 flex items-center gap-1.5">
                    <Calendar size={11} className="text-primary" /> Publication Date
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: 'today', label: 'Today (Last 24h)' },
                      { id: 'week', label: 'This Week' },
                      { id: 'month', label: 'This Month' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setDateFilter(opt.id)}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all
                                   ${dateFilter === opt.id 
                                     ? 'bg-primary/10 text-primary border border-primary/20' 
                                     : 'bg-text-main/[0.01] border border-transparent hover:bg-text-main/[0.03] text-text-muted'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Duration Column */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted/40 flex items-center gap-1.5">
                    <Clock size={11} className="text-primary" /> Video Duration
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: 'all', label: 'Any Duration' },
                      { id: 'short', label: 'Short (< 4 mins)' },
                      { id: 'medium', label: 'Medium (4 - 20 mins)' },
                      { id: 'long', label: 'Long (> 20 mins)' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setDurationFilter(opt.id)}
                        disabled={activeTab !== 'All' && activeTab !== 'Videos'}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40
                                   ${durationFilter === opt.id 
                                     ? 'bg-primary/10 text-primary border border-primary/20' 
                                     : 'bg-text-main/[0.01] border border-transparent hover:bg-text-main/[0.03] text-text-muted'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Filter Reset Indicator */}
              {(sortBy !== 'relevance' || dateFilter !== 'all' || durationFilter !== 'all') && (
                <div className="flex justify-end pt-2 border-t border-text-main/5">
                  <button
                    onClick={() => { setSortBy('relevance'); setDateFilter('all'); setDurationFilter('all'); }}
                    className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Tabs Row */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide border-b border-surface-hover/30 pb-px">
        {tabs.map((tab) => {
          let count = 0;
          if (tab === 'Videos') count = filteredVideos.length;
          if (tab === 'Users') count = filteredUsers.length;
          if (tab === 'Playlists') count = filteredPlaylists.length;
          if (tab === 'Tweets') count = filteredTweets.length;

          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setVisibleCount(8); }}
              className={`relative px-5 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 min-w-max border-b-2
                         ${activeTab === tab
                           ? 'border-primary text-primary'
                           : 'border-transparent text-text-muted/50 hover:text-text-main'}`}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                {tab}
                {count > 0 && (
                  <span className="text-[9px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-black font-mono">
                    {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Column and AI Sidebar Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Search Content Column */}
        <div className="lg:col-span-8 space-y-12">
          {isLoading ? (
            <div className="space-y-8">
              {activeTab === 'Videos' && <SkeletonLoader variant="feed" />}
              {activeTab === 'Users' && (
                <div className="space-y-4">
                  {[1, 2, 3].map(n => <SkeletonLoader key={n} variant="tweet" />)}
                </div>
              )}
              {activeTab === 'All' && <SkeletonLoader variant="profile" />}
            </div>
          ) : totalResultsCount > 0 ? (
            <div className="space-y-12">
              
              {/* Users Section */}
              {(activeTab === 'All' || activeTab === 'Users') && filteredUsers.length > 0 && (
                <section className="bg-surface/10 border border-text-main/5 rounded-[2rem] p-4 sm:p-6 shadow-sm">
                  <h2 className="text-xs font-black text-text-muted/40 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                    <User size={14} className="text-primary" /> Channels & Profiles
                  </h2>
                  <div className="flex flex-col gap-3">
                    {filteredUsers.slice(0, activeTab === 'All' ? 4 : visibleCount).map((user, i) => (
                      <motion.div
                        key={user._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          to={`/profile/${user.username}`}
                          className="flex items-center justify-between p-4 bg-surface/50 border border-text-main/5 rounded-2xl hover:border-primary/30 hover:bg-surface transition-all group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-text-main/10 group-hover:border-primary transition-colors flex-shrink-0">
                              <img
                                src={user.avatar || 'https://i.pravatar.cc/150?img=32'}
                                alt={user.username}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-display font-black text-sm text-text-main truncate group-hover:text-primary transition-all">
                                {user.fullName || user.username}
                              </p>
                              <p className="text-xs font-bold text-text-muted/40">@{user.username}</p>
                            </div>
                          </div>
                          
                          <ChevronRight size={16} className="text-text-muted/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Playlists Section */}
              {(activeTab === 'All' || activeTab === 'Playlists') && filteredPlaylists.length > 0 && (
                <section>
                  <h2 className="text-xs font-black text-text-muted/40 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                    <ListMusic size={14} className="text-primary" /> Playlists & Compilations
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredPlaylists.slice(0, activeTab === 'All' ? 4 : visibleCount).map((pl, i) => (
                      <motion.div
                        key={pl._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          to={`/playlist/${pl._id}`}
                          className="flex gap-4 p-3 bg-surface/50 border border-text-main/5 rounded-2xl hover:border-primary/30 transition-all group"
                        >
                          <div className="w-20 h-20 bg-surface-hover rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border border-text-main/10">
                            {pl.videos?.length > 0 && pl.videos[0]?.thumbnail ? (
                              <img src={pl.videos[0].thumbnail} alt="thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <ListMusic size={24} className="text-text-muted/40" />
                            )}
                            <div className="absolute bottom-1 right-1 bg-black/60 text-[8px] font-black text-white px-1.5 py-0.5 rounded">
                              {pl.videos?.length || 0} VIDS
                            </div>
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                            <span className="font-display font-black text-xs text-text-muted/40 uppercase tracking-widest">
                              @{pl.owner?.username || 'user'}
                            </span>
                            <span className="font-display font-black text-sm text-text-main truncate group-hover:text-primary transition-colors mt-0.5">
                              {pl.name}
                            </span>
                            <span className="text-[10px] text-text-muted/60 mt-1 line-clamp-1">
                              {pl.description || 'Vibe compilation'}
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Videos Section */}
              {(activeTab === 'All' || activeTab === 'Videos') && filteredVideos.length > 0 && (
                <section>
                  <h2 className="text-xs font-black text-text-muted/40 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                    <VideoIcon size={14} className="text-primary" /> Dynamic Videos
                  </h2>

                  {/* Dynamic Grid / List layout view toggle */}
                  <div className={
                    viewMode === 'list' && activeTab === 'Videos' 
                      ? "flex flex-col gap-6" 
                      : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  }>
                    {filteredVideos.slice(0, activeTab === 'All' ? 6 : visibleCount).map((v, i) => {
                      const durString = Math.floor((v.duration || 0) / 60) + ':' + Math.floor((v.duration || 0) % 60).toString().padStart(2, '0');
                      
                      if (viewMode === 'list' && activeTab === 'Videos') {
                        // YouTube-style list row view
                        return (
                          <motion.div 
                            key={v._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col sm:flex-row gap-5 p-4 bg-surface border border-text-main/5 rounded-[2rem] hover:border-primary/20 hover:shadow-xl transition-all group"
                          >
                            <Link to={`/video/${v._id}`} className="relative shrink-0 w-full sm:w-60 h-36 rounded-2xl overflow-hidden border border-text-main/10">
                              <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-103 transition-transform" />
                              <span className="absolute bottom-2 right-2 bg-black/85 text-[9px] font-black text-white px-2 py-0.5 rounded-md tracking-wider">{durString}</span>
                            </Link>
                            <div className="flex-1 flex flex-col min-w-0 justify-center">
                              <Link to={`/video/${v._id}`} className="font-display font-black text-base text-text-main hover:text-primary transition-colors line-clamp-2">
                                {v.title}
                              </Link>
                              <span className="text-[10px] text-text-muted/40 font-bold uppercase tracking-wider mt-1.5">
                                {v.views || 0} views · {new Date(v.createdAt).toLocaleDateString()}
                              </span>
                              <Link to={`/profile/${v.owner?.username}`} className="flex items-center gap-2 mt-3 hover:text-primary transition-colors w-max">
                                <div className="w-6 h-6 rounded-lg overflow-hidden border border-text-main/15">
                                  <img src={v.owner?.avatar} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs font-black text-text-muted/70">@{v.owner?.username}</span>
                              </Link>
                            </div>
                          </motion.div>
                        );
                      }

                      // Standard Grid view card
                      return (
                        <VideoCard
                          key={v._id}
                          index={i}
                          video={{
                            id: v._id,
                            thumbnail: v.thumbnail,
                            title: v.title,
                            duration: durString,
                            views: v.views || 0,
                            createdAt: new Date(v.createdAt).toLocaleDateString(),
                            owner: {
                              id: v.owner?._id,
                              name: v.owner?.fullName || v.owner?.username || 'Unknown',
                              avatar: v.owner?.avatar || 'https://i.pravatar.cc/150?img=32',
                              username: v.owner?.username,
                            },
                          }}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Tweets & Jokes Section */}
              {(activeTab === 'All' || activeTab === 'Tweets') && filteredTweets.length > 0 && (
                <section>
                  <h2 className="text-xs font-black text-text-muted/40 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                    <MessageSquare size={14} className="text-primary" /> Micro-Posts & Tweets
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredTweets.slice(0, activeTab === 'All' ? 4 : visibleCount).map((t, i) => (
                      <TweetCard
                        key={t._id}
                        index={i}
                        tweet={{
                          id: t._id,
                          content: t.content,
                          likes: t.likesCount || 0,
                          comments: t.commentsCount || 0,
                          createdAt: t.createdAt,
                          owner: {
                            id: t.ownerDetails?._id,
                            name: t.ownerDetails?.fullName || t.ownerDetails?.username || 'Unknown',
                            avatar: t.ownerDetails?.avatar || 'https://i.pravatar.cc/150?img=32',
                            username: t.ownerDetails?.username
                          }
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Infinite Scroll Trigger Sentinel */}
              {activeTab !== 'All' && totalResultsCount > visibleCount && (
                <div 
                  ref={infiniteSentinelRef} 
                  className="py-10 flex flex-col items-center justify-center"
                >
                  {isInfiniteLoading ? (
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                      <Loader2 size={16} className="animate-spin" /> Loading more vibes...
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-muted/20 font-black uppercase tracking-widest">Scroll to load more results</span>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="py-24"><EmptyState type="search" /></div>
          )}
        </div>

        {/* AI-Powered Recommendations Sidebar Column */}
        <div className="lg:col-span-4 flex flex-col gap-8 bg-surface/30 border border-text-main/5 p-5 rounded-[2.5rem] sticky top-20 shadow-2xl backdrop-blur-xl">
          
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-1.5">
              <Sparkles size={11} className="fill-current animate-pulse" /> Brew AI Recommendation Panel
            </span>
            <h2 className="text-xl font-display font-black text-text-main tracking-tight mt-1">
              Curated Brews for You
            </h2>
          </div>

          <div className="flex flex-col gap-6">

            {/* Recommendation block 1: AI handpicked */}
            <div className="flex flex-col gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-text-muted/40 flex items-center gap-1.5 pl-1">
                <Coffee size={11} className="text-primary" /> Recommended by Brew AI
              </span>
              <div className="flex flex-col gap-3">
                {recommendedVideos.slice(0, 2).map((v, i) => (
                  <div 
                    key={v._id} 
                    className="p-3 bg-background border border-text-main/5 rounded-2xl hover:border-primary/20 transition-all flex flex-col gap-2.5"
                  >
                    <Link to={`/video/${v._id}`} className="relative h-28 rounded-xl overflow-hidden border border-text-main/15 block shrink-0">
                      <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-[8px] font-black text-white px-1.5 py-0.5 rounded">AI Choice</span>
                    </Link>
                    <div className="flex flex-col">
                      <Link to={`/video/${v._id}`} className="font-display font-black text-xs text-text-main hover:text-primary transition-colors line-clamp-1">
                        {v.title}
                      </Link>
                      <p className="text-[9px] text-primary font-semibold tracking-wide leading-relaxed mt-1 flex items-start gap-1">
                        <span>💡</span>
                        <span>{trendingExplanations[i % trendingExplanations.length]}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation block 2: Popular regional */}
            <div className="flex flex-col gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-text-muted/40 flex items-center gap-1.5 pl-1">
                <Compass size={11} className="text-primary" /> Popular in your Region
              </span>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide flex-nowrap">
                {recommendedVideos.slice(2, 5).map(v => (
                  <Link 
                    key={v._id} 
                    to={`/video/${v._id}`}
                    className="w-36 shrink-0 flex flex-col gap-1.5 hover:opacity-90 group"
                  >
                    <div className="relative h-20 bg-surface-hover rounded-xl overflow-hidden border border-text-main/5 shrink-0">
                      <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-primary text-background rounded-full p-0.5">
                        <Flame size={8} className="fill-current" />
                      </div>
                    </div>
                    <span className="font-display font-black text-[10px] text-text-main truncate group-hover:text-primary leading-tight pl-0.5">
                      {v.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recommendation block 3: Because you liked */}
            <div className="flex flex-col gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-text-muted/40 flex items-center gap-1.5 pl-1">
                <Award size={11} className="text-primary" /> Because you Liked Vibes
              </span>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide flex-nowrap">
                {recommendedVideos.slice(5, 8).map(v => (
                  <Link 
                    key={v._id} 
                    to={`/video/${v._id}`}
                    className="w-36 shrink-0 flex flex-col gap-1.5 hover:opacity-90 group"
                  >
                    <div className="relative h-20 bg-surface-hover rounded-xl overflow-hidden border border-text-main/5 shrink-0">
                      <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-[#F4A261] text-background rounded-full p-0.5">
                        <CheckCircle2 size={8} className="fill-current" />
                      </div>
                    </div>
                    <span className="font-display font-black text-[10px] text-text-main truncate group-hover:text-primary leading-tight pl-0.5">
                      {v.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}