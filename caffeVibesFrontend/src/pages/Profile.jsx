import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import EditProfileModal from '../components/EditProfileModal';
import SkeletonLoader from '../components/SkeletonLoader';
import { 
  Loader2, Pencil, Play, MessageSquare, ListMusic, Heart, Users, Mail, Coffee, 
  Trophy, Crown, Star, PenTool, CheckCircle, Lock, Camera, Share2, Palette, Search, X, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import VideoCard from '../components/VideoCard';
import TweetCard from '../components/TweetCard';
import StreakBadge from '../components/StreakBadge';

const COVER_GRADIENTS = {
  espresso: {
    name: 'Espresso Dark',
    style: 'bg-gradient-to-t from-background via-black/40 to-black/80',
    color: 'bg-[#1C1311]'
  },
  mocha: {
    name: 'Warm Mocha',
    style: 'bg-gradient-to-t from-background via-amber-950/20 to-primary/40',
    color: 'bg-[#4E3629]'
  },
  caramel: {
    name: 'Caramel Macchiato',
    style: 'bg-gradient-to-t from-background via-amber-900/10 to-[#D4A373]/40',
    color: 'bg-[#D4A373]'
  },
  irish: {
    name: 'Irish Coffee',
    style: 'bg-gradient-to-t from-background via-emerald-950/10 to-emerald-800/30',
    color: 'bg-[#1A3A2A]'
  },
  cappuccino: {
    name: 'Vanilla Latte',
    style: 'bg-gradient-to-t from-background via-[#E6CCB2]/10 to-[#CCD5AE]/30',
    color: 'bg-[#E6CCB2]'
  }
};

export default function Profile() {
  let { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('Videos');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const [videos, setVideos] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  // Advanced features state
  const [coverGradient, setCoverGradient] = useState('espresso');
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  
  // Followers & Following Lists & Modals
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [showFollowersHover, setShowFollowersHover] = useState(false);
  const [showFollowingHover, setShowFollowingHover] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [followersSearch, setFollowersSearch] = useState('');
  const [followingSearch, setFollowingSearch] = useState('');

  const isOwnProfile = currentUser && (currentUser.username === id || currentUser._id === id);

  // Parallax scroll hooks
  const { scrollY } = useScroll();
  const coverY = useTransform(scrollY, [0, 400], [0, 150]);
  const coverScale = useTransform(scrollY, [-100, 0, 300], [1.15, 1, 0.95]);

  useEffect(() => {
    // Load custom cover preference if any
    const savedGrad = localStorage.getItem(`caffevibes-cover-gradient-${id}`);
    if (savedGrad && COVER_GRADIENTS[savedGrad]) {
      setCoverGradient(savedGrad);
    } else {
      setCoverGradient('espresso');
    }
  }, [id]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/users/c/${id}`);
        const profData = response.data.data;
        setProfile(profData);
        setIsSubscribed(profData.isSubscribed);

        // Fetch videos
        try {
          const vids = await api.get(`/videos?userId=${profData._id}`);
          setVideos(vids.data.data?.docs || vids.data.data?.videos || []);
        } catch (e) { setVideos([]); }

        // Fetch tweets
        try {
          const tws = await api.get(`/tweets/user/${profData._id}`);
          const tweetData = tws.data.data;
          const profileOwner = {
            _id: profData._id,
            username: tweetData.username || profData.username,
            fullName: tweetData.fullName || profData.fullName,
            avatar: tweetData.avatar || profData.avatar,
          };
          const tweetsArray = (tweetData.tweets || []).map(t => ({
            ...t,
            ownerDetails: t.ownerDetails || profileOwner
          }));
          setTweets(tweetsArray);
        } catch (e) { setTweets([]); }

        // Fetch playlists
        try {
          const pLists = await api.get(`/playlist/user/${profData._id}`);
          setPlaylists(pLists.data.data || []);
        } catch (e) { setPlaylists([]); }
        
      } catch (error) {
        toast.error('Failed to load profile details');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  // Fetch list of followers and following once profile _id is resolved
  useEffect(() => {
    if (!profile?._id) return;
    const fetchSubscribersAndFollowing = async () => {
      try {
        const followersRes = await api.get(`/subscriptions/u/${profile._id}`);
        setFollowersList(followersRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch followers list", err);
      }
      try {
        const followingRes = await api.get(`/subscriptions/c/${profile._id}`);
        setFollowingList(followingRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch following list", err);
      }
    };
    fetchSubscribersAndFollowing();
  }, [profile?._id, profile?.subscribersCount]);

  useEffect(() => {
    if (activeTab === 'Liked' && isOwnProfile && likedVideos.length === 0) {
      api.get('/likes/videos').then(res => {
        const items = (res.data.data || []).map(item => {
          const v = item.videoDetails;
          const ch = item.channel;
          return {
            id: v?._id,
            thumbnail: v?.thumbnail,
            title: v?.title,
            duration: Math.floor((v?.duration || 0) / 60) + ':' + Math.floor((v?.duration || 0) % 60).toString().padStart(2, '0'),
            views: Array.isArray(v?.views) ? v.views.length : (v?.views || 0),
            createdAt: new Date(v?.createdAt).toLocaleDateString(),
            owner: { id: ch?._id, name: ch?.fullName || ch?.username || 'Unknown', avatar: ch?.avatar, username: ch?.username }
          };
        }).filter(v => v.id);
        setLikedVideos(items);
      }).catch(() => setLikedVideos([]));
    }
  }, [activeTab, isOwnProfile]);

  useEffect(() => {
    if (!socket || !profile) return;
    const handleSubUpdate = ({ channelId, subscribersCount, isSubscribed: newSub, byUserId }) => {
      if (channelId === profile._id || channelId === profile._id?.toString()) {
        setProfile(prev => ({ ...prev, subscribersCount }));
        if (currentUser && byUserId === currentUser._id) {
          setIsSubscribed(newSub);
        }
      }
    };
    socket.on('subscriptionUpdate', handleSubUpdate);
    return () => socket.off('subscriptionUpdate', handleSubUpdate);
  }, [socket, profile, currentUser]);

  useEffect(() => {
    if (isOwnProfile && profile) {
      const hasTweet = tweets.some(t => t.type === 'tweet' || !t.type || t.type === 'TWEET');
      if (hasTweet) {
        window.dispatchEvent(new CustomEvent('caffevibes-milestone-reached', {
          detail: { milestone: 'first-post', title: 'First Post Milestone Unlocked! 📝' }
        }));
      }
      if (profile.subscribersCount >= 10) {
        window.dispatchEvent(new CustomEvent('caffevibes-milestone-reached', {
          detail: { milestone: '10-followers', title: '10 Subscribers Milestone! 🚀' }
        }));
      }
      const has100Views = videos.some(v => v.views >= 100);
      if (has100Views) {
        window.dispatchEvent(new CustomEvent('caffevibes-milestone-reached', {
          detail: { milestone: '100-views', title: 'Rising Star: 100+ Views! ⭐' }
        }));
      }
    }
  }, [profile, tweets, videos, isOwnProfile]);

  const handleSubscribe = async () => {
    if (!currentUser) return toast.error('Please log in to subscribe');
    if (isSubscribing) return;
    setIsSubscribing(true);
    try {
      const res = await api.post(`/subscriptions/c/${profile._id}`);
      const data = res.data.data;
      setIsSubscribed(data.isSubscribed);
      setProfile(prev => ({ ...prev, subscribersCount: data.subscribersCount }));
      toast.success(data.isSubscribed ? 'Subscribed!' : 'Unsubscribed');
      if (data.isSubscribed) {
        window.dispatchEvent(new CustomEvent('caffevibes-milestone-reached', {
          detail: { milestone: 'confetti-only' }
        }));
      }
    } catch (e) {
      toast.error('Failed to update subscription');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(prev => ({ ...prev, ...updatedProfile }));
  };

  const handleTweetDelete = (tweetId) => setTweets(prev => prev.filter(t => t._id !== tweetId));
  const handleTweetUpdate = (tweetId, newContent) => setTweets(prev => prev.map(t => t._id === tweetId ? { ...t, content: newContent } : t));

  const handleCoverUploadDirect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsCoverUploading(true);
    const toastId = toast.loading('Uploading new cover banner...');
    try {
      const fd = new FormData();
      fd.append('coverImage', file);
      const res = await api.patch('/users/cover-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, coverImage: res.data.data.coverImage }));
      toast.success('Cover image updated! ☕', { id: toastId });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update cover image', { id: toastId });
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile URL copied to clipboard! ☕');
  };

  const handleMessageClick = () => {
    toast.success('Chat feature coming soon! ☕');
  };

  const changeGradientPreference = (gradKey) => {
    setCoverGradient(gradKey);
    localStorage.setItem(`caffevibes-cover-gradient-${profile._id}`, gradKey);
    setShowGradientPicker(false);
    toast.success(`Theme preference set to ${COVER_GRADIENTS[gradKey].name}! ☕`);
  };

  const renderBioWithLinks = (bioText) => {
    if (!bioText) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = bioText.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-bold inline-flex items-center gap-0.5"
          >
            {part.replace(/^https?:\/\/(www\.)?/, '')}
            <ExternalLink size={10} className="inline shrink-0" />
          </a>
        );
      }
      return part;
    });
  };

  if (isLoading) {
    return <SkeletonLoader variant="profile" />;
  }

  if (!profile) {
    return <div className="w-full mt-10"><EmptyState type="error" /></div>;
  }

  const hasFirstPost = tweets.some(t => t.type === 'tweet' || !t.type || t.type === 'TWEET');
  const hasRisingStar = videos.some(v => v.views >= 100);
  const hasInfluencer = profile.subscribersCount >= 100;
  const hasCoffeeLover = (profile.watchHistoryCount || 0) >= 10;

  const badgeItems = [
    {
      title: "First Post",
      description: "Unlocked by writing your first tweet or joke",
      icon: PenTool,
      earned: hasFirstPost,
      progress: hasFirstPost ? "Earned! 🎉" : "0 / 1 Post"
    },
    {
      title: "Rising Star",
      description: "Unlocked when one of your videos hits 100+ views",
      icon: Star,
      earned: hasRisingStar,
      progress: hasRisingStar 
        ? "Earned! ⭐" 
        : `${videos.length > 0 ? Math.max(...videos.map(v => v.views || 0)) : 0} / 100 Views`
    },
    {
      title: "Influencer",
      description: "Unlocked when your channel hits 100+ subscribers",
      icon: Crown,
      earned: hasInfluencer,
      progress: hasInfluencer ? "Earned! 🚀" : `${profile.subscribersCount || 0} / 100 Subs`
    },
    {
      title: "Coffee Lover",
      description: "Unlocked by watching 10 or more delicious videos",
      icon: Coffee,
      earned: hasCoffeeLover,
      progress: hasCoffeeLover ? "Earned! ☕" : `${profile.watchHistoryCount || 0} / 10 Watched`
    }
  ];

  const stats = [
    { 
      label: 'Videos', 
      value: videos.length, 
      onClick: () => setActiveTab('Videos'),
      isClickable: true
    },
    { 
      label: 'Followers', 
      value: profile.subscribersCount || 0,
      onClick: () => setIsFollowersModalOpen(true),
      isClickable: true,
      onMouseEnter: () => setShowFollowersHover(true),
      onMouseLeave: () => setShowFollowersHover(false),
      hoverState: showFollowersHover,
      list: followersList
    },
    { 
      label: 'Following', 
      value: profile.channelsSubscribedToCount || 0,
      onClick: () => setIsFollowingModalOpen(true),
      isClickable: true,
      onMouseEnter: () => setShowFollowingHover(true),
      onMouseLeave: () => setShowFollowingHover(false),
      hoverState: showFollowingHover,
      list: followingList
    },
  ];

  const tabs = isOwnProfile
    ? ['Videos', 'Playlists', 'Liked', 'About']
    : ['Videos', 'Playlists', 'About'];

  const joinDate = new Date(profile.createdAt);
  const formattedJoinDate = joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Modal Render Helper
  const renderUserListModal = (isOpen, onClose, title, list, searchVal, setSearchVal) => {
    if (!isOpen) return null;
    const filteredList = list.filter(user =>
      user.username?.toLowerCase().includes(searchVal.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchVal.toLowerCase())
    );
    return (
      <AnimatePresence>
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-surface/90 border border-white/10 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <h3 className="text-sm font-black text-text-main uppercase tracking-wider">{title}</h3>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors text-text-muted hover:text-text-main"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/50" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full bg-background/50 border border-white/5 rounded-2xl pl-10 pr-4 py-2 text-text-main focus:outline-none focus:border-primary/60 transition-colors text-xs"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {filteredList.length > 0 ? (
                filteredList.map((user, idx) => (
                  <Link
                    key={idx}
                    to={`/profile/${user.username}`}
                    onClick={() => {
                      onClose();
                      setSearchVal('');
                    }}
                    className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group"
                  >
                    <img 
                      src={user.avatar} 
                      alt={user.username} 
                      className="w-9 h-9 rounded-full object-cover border border-white/10 group-hover:scale-105 transition-transform" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-text-main group-hover:text-primary transition-colors truncate">
                        {user.fullName || user.username}
                      </p>
                      <p className="text-[10px] text-text-muted/50 truncate">@{user.username}</p>
                    </div>
                    <ExternalLink size={12} className="text-text-muted/30 group-hover:text-primary transition-colors" />
                  </Link>
                ))
              ) : (
                <div className="py-10 text-center flex flex-col items-center justify-center text-text-muted">
                  <Coffee size={28} className="text-text-muted/30 mb-2 animate-bounce" />
                  <p className="font-bold text-xs">No coffee buddies found</p>
                  <p className="text-[10px] mt-1">Try another keyword</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  return (
    <div className="animate-fade-in relative pb-10">
      
      {/* Cover Image Container with Parallax scrolling */}
      <div className="w-full h-40 sm:h-48 md:h-64 rounded-2xl overflow-hidden relative group">
        <motion.div
          style={{ y: coverY, scale: coverScale }}
          className="w-full h-full bg-cover bg-center absolute inset-0"
          backgroundImage={profile.coverImage ? `url('${profile.coverImage}')` : undefined}
        >
          {profile.coverImage ? (
            <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-surface to-background" />
          )}
          
          {/* Custom Preference Gradient Overlay Layer */}
          <div className={`absolute inset-0 transition-all duration-700 ${COVER_GRADIENTS[coverGradient]?.style}`} />
        </motion.div>

        {/* Change Cover Hover Trigger Button (Owner Only) */}
        {isOwnProfile && (
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 gap-3">
            <label className="flex items-center gap-2 font-black py-2 px-4 rounded-xl border border-white/10 bg-black/60 hover:bg-black/80 backdrop-blur-md transition-all text-[9px] uppercase tracking-wider text-white shadow-xl cursor-pointer active:scale-95">
              {isCoverUploading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Camera size={13} />
              )}
              Change Cover
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleCoverUploadDirect} 
                className="hidden" 
                disabled={isCoverUploading}
              />
            </label>

            {/* Preference Gradient Color Selector */}
            <div className="relative">
              <button
                onClick={() => setShowGradientPicker(prev => !prev)}
                className="flex items-center justify-center p-2 rounded-xl border border-white/10 bg-black/60 hover:bg-black/80 backdrop-blur-md transition-all text-white shadow-xl active:scale-95"
                title="Customize cover overlay gradient"
              >
                <Palette size={13} />
              </button>

              <AnimatePresence>
                {showGradientPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 mt-2 z-30 bg-background/95 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-md w-48 space-y-1.5"
                  >
                    <p className="text-[8px] font-black uppercase tracking-widest text-text-muted/60 mb-1 border-b border-white/5 pb-1">
                      Choose Gradient
                    </p>
                    {Object.entries(COVER_GRADIENTS).map(([key, grad]) => (
                      <button
                        key={key}
                        onClick={() => changeGradientPreference(key)}
                        className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-[10px] font-bold text-left hover:bg-white/5 transition-all
                          ${coverGradient === key ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}
                        `}
                      >
                        <span className={`w-3 h-3 rounded-full shrink-0 border border-white/10 ${grad.color}`} />
                        <span className="flex-1 truncate">{grad.name}</span>
                        {coverGradient === key && <span className="text-primary text-[8px]">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Glassmorphic Overlapping Profile Description Card */}
      <div className="mx-3 sm:mx-4 lg:mx-6 -mt-20 relative z-20 rounded-3xl border border-white/5 bg-surface/50 backdrop-blur-xl shadow-2xl p-5 sm:p-7 md:p-8 flex flex-col lg:flex-row items-center lg:items-end gap-6">
        
        {/* Animated Avatar Box */}
        <div className="relative group shrink-0">
          <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full p-[3px] bg-gradient-to-tr from-primary via-[#E6CCB2] to-primary/20 transition-transform duration-700 group-hover:rotate-180 relative shadow-2xl">
            <div className="w-full h-full rounded-full border-4 border-background/80 overflow-hidden bg-surface transition-transform duration-500 group-hover:scale-95">
              <img 
                src={profile.avatar} 
                alt="Profile" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
            </div>
          </div>
        </div>

        {/* Profile Info Details block */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left min-w-0 w-full gap-2.5 pb-2">
          
          <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
            <h1 className="text-fluid-4xl lg:text-4xl font-display font-black text-text-main tracking-tighter max-w-full bg-gradient-to-r from-text-main to-text-main/40 bg-clip-text text-transparent flex items-center gap-2.5">
              {profile.fullName || profile.username}
              
              {/* Premium verified badge */}
              {(profile.subscribersCount >= 1 || profile.isVerified) && (
                <span className="inline-flex items-center justify-center text-primary relative group/tooltip cursor-default" title="Verified Brewmaster Creator ☕">
                  <Crown size={22} className="fill-primary/20 stroke-[2] animate-pulse shrink-0" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-background/95 border border-primary/20 text-primary text-[9px] font-black rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl backdrop-blur-md z-30">
                    Verified Brewmaster ☕
                  </div>
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center lg:justify-start">
            <span className="text-xs font-bold text-primary tracking-widest uppercase whitespace-nowrap">@{profile.username}</span>
            {profile.streak > 0 && <StreakBadge count={profile.streak} />}
            {isOwnProfile && profile.email && (
              <span className="hidden md:flex items-center gap-1.5 text-[10px] text-text-muted/40 font-black uppercase tracking-wider whitespace-nowrap">
                <Mail size={11} /> {profile.email}
              </span>
            )}
            
            {/* Join date layout */}
            <div className="flex items-center gap-1 text-[10px] text-text-muted/50 font-black uppercase tracking-wider whitespace-nowrap">
              <span>Brewing since {formattedJoinDate} ☕</span>
            </div>
          </div>

          {/* Clickable Rich Bio description */}
          {profile.bio ? (
            <p className="text-xs text-text-muted/80 max-w-xl leading-relaxed text-center lg:text-left mt-0.5">
              {renderBioWithLinks(profile.bio)}
            </p>
          ) : (
            <p className="text-xs text-text-muted/40 italic max-w-xl text-center lg:text-left mt-0.5">
              No bio yet. Brewing something nice... ☕
            </p>
          )}

          {/* Upgraded Statistics Counter with Hover Previews */}
          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
            <div className="overflow-x-auto scrollbar-hide shrink-0">
              <div className="flex bg-text-main/[0.03] border border-text-main/10 rounded-2xl shadow-xl px-2 py-1.5 w-auto min-w-max">
                {stats.map((stat, i) => (
                  <div
                    key={stat.label}
                    onClick={stat.isClickable ? stat.onClick : undefined}
                    onMouseEnter={stat.onMouseEnter}
                    onMouseLeave={stat.onMouseLeave}
                    className={`flex flex-col items-center justify-center px-4 md:px-5 group relative ${
                      stat.isClickable ? 'cursor-pointer hover:bg-white/[0.02] rounded-xl' : 'cursor-default'
                    } ${
                      i < stats.length - 1 ? 'border-r border-text-main/5' : ''
                    }`}
                  >
                    {/* Hover Avatar Stack preview floating balloon */}
                    <AnimatePresence>
                      {stat.hoverState && stat.list && stat.list.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 bg-background/95 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 min-w-[140px] pointer-events-none"
                        >
                          <div className="flex -space-x-2">
                            {stat.list.slice(0, 3).map((user, idx) => (
                              <img
                                key={idx}
                                src={user.avatar}
                                alt={user.username}
                                className="w-6 h-6 rounded-full border border-background object-cover shadow"
                              />
                            ))}
                            {stat.list.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-surface border border-background flex items-center justify-center text-[8px] font-black text-primary">
                                +{stat.list.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] font-black text-text-muted/60 uppercase tracking-widest text-center whitespace-nowrap">
                            {stat.list.slice(0, 2).map(u => u.fullName || u.username).join(', ')}
                            {stat.list.length > 2 ? '...' : ''}
                          </span>
                          <span className="text-[7px] font-black text-primary uppercase tracking-wider">Click to view list</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <span className="font-display font-black text-lg sm:text-xl text-text-main group-hover:text-primary transition-colors leading-tight tabular-nums">
                      {stat.value}
                    </span>
                    <span className="text-[8px] font-black text-text-muted/30 uppercase tracking-wider leading-tight whitespace-nowrap mt-0.5">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Action button columns */}
            <div className="shrink-0 flex justify-center sm:justify-start sm:ml-auto">
              {isOwnProfile ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2 font-black py-2.5 px-5 rounded-2xl border border-text-main/5 bg-text-main/[0.02] hover:bg-text-main/[0.05] backdrop-blur-3xl transition-all text-[10px] uppercase tracking-widest shadow-xl active:scale-95 whitespace-nowrap touch-target"
                  >
                    <Pencil size={13} /> Customize
                  </button>
                  <button
                    onClick={handleShareProfile}
                    className="flex items-center justify-center p-2.5 rounded-2xl border border-white/5 bg-surface/40 hover:bg-surface/80 text-text-muted hover:text-text-main transition-all shadow-xl active:scale-95 touch-target"
                    title="Share Profile"
                  >
                    <Share2 size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleSubscribe}
                    disabled={isSubscribing}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`font-black py-2.5 px-5 sm:px-6 rounded-2xl transition-all shadow-2xl text-[10px] uppercase tracking-widest border whitespace-nowrap touch-target flex items-center gap-1.5 ${
                      isSubscribed
                        ? 'bg-text-main/[0.02] text-text-main border-text-main/10 hover:bg-text-main/[0.05]'
                        : 'bg-primary border-primary text-background shadow-primary/20 hover:shadow-primary/45'
                    }`}
                  >
                    {isSubscribing ? (
                      <Loader2 size={13} className="animate-spin inline" />
                    ) : isSubscribed ? (
                      '✓ Subscribed'
                    ) : (
                      'Subscribe'
                    )}
                  </motion.button>

                  <button
                    onClick={handleMessageClick}
                    className="flex items-center justify-center p-2.5 rounded-2xl border border-white/5 bg-surface/40 hover:bg-surface/80 text-text-muted hover:text-text-main transition-all shadow-xl active:scale-95 touch-target"
                    title="Message User"
                  >
                    <MessageSquare size={13} />
                  </button>

                  <button
                    onClick={handleShareProfile}
                    className="flex items-center justify-center p-2.5 rounded-2xl border border-white/5 bg-surface/40 hover:bg-surface/80 text-text-muted hover:text-text-main transition-all shadow-xl active:scale-95 touch-target"
                    title="Share Profile"
                  >
                    <Share2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Tab bar Navigation */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 py-3.5 mt-8 mx-3 sm:mx-4 lg:mx-6 overflow-x-auto scrollbar-hide">
        <div className="inline-flex items-center p-1 bg-text-main/[0.02] border border-text-main/5 rounded-full min-w-max">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 sm:px-5 lg:px-6 py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 whitespace-nowrap rounded-full ${
                activeTab === tab ? 'text-background' : 'text-text-muted/40 hover:text-text-main'
              }`}
            >
              <span className="relative z-10">{tab}</span>
              {activeTab === tab && (
                <motion.div
                  layoutId="active-profile-tab"
                  className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents loaded with custom skeleton and fade transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="py-8 px-4 md:px-8"
        >
          {activeTab === 'Videos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.length > 0 ? videos.map((v, i) => (
                <VideoCard key={v._id || i} video={{
                  id: v._id,
                  thumbnail: v.thumbnail,
                  title: v.title,
                  duration: Math.floor(v.duration / 60) + ':' + (Math.floor(v.duration % 60)).toString().padStart(2, '0'),
                  views: Array.isArray(v.views) ? v.views.length : (v.views || 0),
                  createdAt: new Date(v.createdAt).toLocaleDateString(),
                  owner: { id: profile._id, name: profile.fullName || profile.username, username: profile.username, avatar: profile.avatar }
                }} index={i} />
              )) : (
                <div className="col-span-full py-10 text-center"><EmptyState type="profileVideos" action={isOwnProfile ? undefined : null} /></div>
              )}
            </div>
          )}

          {activeTab === 'Playlists' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlists.length > 0 ? playlists.map((pl, i) => (
                <Link
                  key={pl._id || i}
                  to={`/playlist/${pl._id}`}
                  className="bg-surface rounded-xl overflow-hidden border border-surface-hover hover:border-primary/30 transition-all group hover:-translate-y-1 hover:shadow-xl relative block"
                >
                  {isOwnProfile && pl.isPublic === false && (
                    <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-md text-[10px] text-white font-bold px-2 py-0.5 rounded-full border border-text-main/20">
                      Private
                    </div>
                  )}
                  <div className="bg-surface-hover h-40 relative overflow-hidden">
                    {pl.videos?.length > 0 && pl.videos[0]?.thumbnail ? (
                      <img src={pl.videos[0].thumbnail} alt="thumbnail" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic size={32} className="text-text-muted" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-center text-white scale-90 group-hover:scale-100 transition-transform">
                        <Play size={28} className="mx-auto mb-1" fill="currentColor" />
                        <span className="font-bold text-sm">Play All</span>
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {pl.videos?.length || 0} VIDEOS
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-bold text-text-main line-clamp-1 group-hover:text-primary transition-colors">{pl.name}</h3>
                    <p className="text-xs text-text-muted line-clamp-2 mt-1">{pl.description || 'No description'}</p>
                  </div>
                </Link>
              )) : (
                <div className="col-span-full"><EmptyState type="playlists" action={isOwnProfile ? undefined : null} /></div>
              )}
            </div>
          )}

          {activeTab === 'Liked' && isOwnProfile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {likedVideos.length > 0 ? likedVideos.map((v, i) => (
                <VideoCard key={v.id || i} video={v} index={i} />
              )) : (
                <div className="col-span-full py-10 text-center text-text-muted">
                  <Heart size={40} className="mx-auto mb-3 text-text-muted/40" />
                  <p className="font-semibold">No liked videos yet</p>
                  <p className="text-sm mt-1">Videos you like will appear here</p>
                </div>
              )}
            </div>
          )}

          {/* About Tab incorporating Credentials, Achievements, and Tweets Timeline */}
          {activeTab === 'About' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Info Card and Achievements */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Biography Details Card */}
                <div className="bg-surface/50 border border-white/5 backdrop-blur-xl p-6 rounded-3xl shadow-xl">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3">
                    Channel Identity
                  </h3>
                  <div className="space-y-3.5 text-xs text-text-muted/80 leading-relaxed">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="font-semibold text-text-muted/40">USERNAME</span>
                      <span className="font-bold text-text-main">@{profile.username}</span>
                    </div>
                    {profile.email && (
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="font-semibold text-text-muted/40">EMAIL</span>
                        <span className="font-bold text-text-main truncate max-w-[200px]">{profile.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="font-semibold text-text-muted/40">CREATION DATE</span>
                      <span className="font-bold text-text-main">Brewing since {formattedJoinDate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="font-semibold text-text-muted/40">STREAK RATING</span>
                      <span className="font-bold text-text-main flex items-center gap-1">
                        {profile.streak > 0 ? `${profile.streak} Days 🔥` : 'No Active Streak ☕'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Achievements block */}
                <div className="bg-surface/50 border border-white/5 backdrop-blur-xl p-6 rounded-3xl shadow-xl">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-1.5">
                    <Trophy size={14} /> Achievements & Badges
                  </h3>
                  <div className="flex flex-col gap-3">
                    {badgeItems.map((badge, idx) => {
                      const Icon = badge.icon;
                      return (
                        <div
                          key={badge.title}
                          className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300
                            ${badge.earned 
                              ? 'bg-surface border-primary/20 shadow-[0_4px_12px_rgba(212,163,115,0.04)]' 
                              : 'bg-surface/20 border-text-main/5 opacity-50'
                            }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative
                            ${badge.earned 
                              ? 'bg-primary/20 text-primary border border-primary/20' 
                              : 'bg-text-main/[0.03] text-text-muted/40 border border-text-main/5'
                            }`}
                          >
                            <Icon size={16} className="stroke-[2.5]" />
                            <div className="absolute -bottom-1 -right-1 rounded-full border border-background shadow">
                              {badge.earned ? (
                                <div className="bg-primary text-background rounded-full p-0.5">
                                  <CheckCircle size={8} className="stroke-[3]" />
                                </div>
                              ) : (
                                <div className="bg-text-main/10 text-text-muted/60 rounded-full p-0.5">
                                  <Lock size={8} className="stroke-[2.5]" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="font-display font-black text-xs text-text-main leading-none">
                              {badge.title}
                            </span>
                            <span className="text-[9px] text-text-muted/50 font-semibold tracking-wide leading-tight mt-1 line-clamp-1">
                              {badge.description}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Tweet timeline */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Tweets & Jokes Subheading */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
                    <PenTool size={14} /> Shared Musings & Jokes
                  </h3>
                  <span className="text-[10px] text-text-muted/40 font-bold uppercase tracking-wider">
                    {tweets.length} updates published
                  </span>
                </div>

                <div className="space-y-4">
                  {tweets.length > 0 ? (
                    tweets.map((t, i) => {
                      const tweetOwner = t.ownerDetails || t.owner || {};
                      return (
                        <TweetCard
                          key={t._id || i}
                          tweet={{
                            id: t._id,
                            type: t.type || 'tweet',
                            content: t.content,
                            likes: t.likesCount || 0,
                            isLiked: t.isLiked || (currentUser && t.likes?.some(l => (l.likedBy || l) === currentUser._id || (l.likedBy || l)?.toString() === currentUser._id)),
                            comments: t.commentsCount || 0,
                            createdAt: t.createdAt,
                            owner: {
                              id: tweetOwner._id || profile._id,
                              name: tweetOwner.fullName || tweetOwner.username || profile.fullName || profile.username,
                              username: tweetOwner.username || profile.username,
                              avatar: tweetOwner.avatar || profile.avatar
                            }
                          }}
                          index={i}
                          onDelete={handleTweetDelete}
                          onUpdate={handleTweetUpdate}
                        />
                      );
                    })
                  ) : (
                    <EmptyState type="tweets" action={isOwnProfile ? undefined : null} />
                  )}
                </div>

              </div>

            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onUpdated={handleProfileUpdated}
        />
      )}

      {/* Searchable Followers Modal */}
      {renderUserListModal(
        isFollowersModalOpen,
        () => {
          setIsFollowersModalOpen(false);
          setFollowersSearch('');
        },
        'Followers List',
        followersList,
        followersSearch,
        setFollowersSearch
      )}

      {/* Searchable Following Modal */}
      {renderUserListModal(
        isFollowingModalOpen,
        () => {
          setIsFollowingModalOpen(false);
          setFollowingSearch('');
        },
        'Following Channels',
        followingList,
        followingSearch,
        setFollowingSearch
      )}
    </div>
  );
}