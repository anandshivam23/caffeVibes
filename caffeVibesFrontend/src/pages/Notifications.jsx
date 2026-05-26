import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Trash2, Link as LinkIcon, MessageSquare, Heart, UserPlus, 
  Video, Loader2, CheckCheck, AtSign, Info, Eye 
} from 'lucide-react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';

/**
 * Custom Swipeable Notification Card
 */
const SwipeNotificationItem = ({ 
  notif, onMarkRead, onDelete, getRedirectLink, getIcon, getActionText, getRelativeTime 
}) => {
  const [startX, setStartX] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Touch handlers
  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    // Cap swipe delta between -140px and +140px
    if (diff > 140) setSwipeOffset(140);
    else if (diff < -140) setSwipeOffset(-140);
    else setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (swipeOffset > 90) {
      onMarkRead(notif._id);
    } else if (swipeOffset < -90) {
      onDelete(notif._id);
    }
    setSwipeOffset(0);
  };

  // Mouse drag handlers for desktop support
  const handleMouseDown = (e) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    if (diff > 140) setSwipeOffset(140);
    else if (diff < -140) setSwipeOffset(-140);
    else setSwipeOffset(diff);
  };

  const handleMouseUpOrLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (swipeOffset > 90) {
      onMarkRead(notif._id);
    } else if (swipeOffset < -90) {
      onDelete(notif._id);
    }
    setSwipeOffset(0);
  };

  const displayOffset = isDragging ? swipeOffset : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-background border border-text-main/5 select-none w-full">
      {/* Background Swipe Actions Indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-8 text-xs font-black uppercase tracking-widest pointer-events-none z-0">
        <div className={`flex items-center gap-2 ${swipeOffset > 20 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 text-primary`}>
          <CheckCheck size={16} /> Mark Read
        </div>
        <div className={`flex items-center gap-2 ${swipeOffset < -20 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 text-red-400`}>
          <Trash2 size={16} /> Delete
        </div>
      </div>

      {/* Foreground Interactive Card */}
      <motion.div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ 
          transform: `translateX(${displayOffset}px)`, 
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)' 
        }}
        className={`group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 rounded-3xl border z-10 cursor-grab active:cursor-grabbing w-full
                   ${notif.isRead 
                     ? 'bg-text-main/[0.01] border-text-main/5 opacity-60' 
                     : 'bg-text-main/[0.03] border-primary/20 shadow-xl shadow-primary/5'}`}
      >
        {/* Sender Avatar */}
        <div className="flex-shrink-0 relative pointer-events-none">
          <Link to={`/profile/${notif.senderDetails?.username}`} onClick={e => e.stopPropagation()}>
            <img 
              src={notif.senderDetails?.avatar || "https://i.pravatar.cc/150?img=32"} 
              alt={notif.senderDetails?.username} 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-text-main/10 shadow-lg"
            />
          </Link>
          <div className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-background border border-text-main/10 rounded-xl shadow-2xl">
            {getIcon(notif.type)}
          </div>
        </div>

        {/* Content Details */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-display font-black text-sm text-text-main group-hover:text-primary transition-colors">
              @{notif.senderDetails?.username || 'user'}
            </span>
            <span className="text-xs text-text-muted/60 font-medium">
              {getActionText(notif.type)}
            </span>
            {!notif.isRead && (
              <span className="bg-primary/20 text-primary border border-primary/20 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full select-none animate-pulse">
                New
              </span>
            )}
          </div>
          {notif.content && (
            <p className="text-xs text-text-muted/40 italic font-medium line-clamp-1 mb-1">"{notif.content}"</p>
          )}
          <p className="text-[10px] text-text-muted/30 font-black uppercase tracking-widest mt-1">
            {getRelativeTime(notif.createdAt)}
          </p>
        </div>

        {/* Inline Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto ml-auto shrink-0 relative z-30">
          {!notif.isRead && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notif._id);
              }}
              className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-background transition-all touch-target"
              title="Mark as read"
            >
              <CheckCheck size={16} />
            </button>
          )}
          <Link 
            to={getRedirectLink(notif)}
            onClick={(e) => {
              e.stopPropagation();
              if (!notif.isRead) onMarkRead(notif._id);
            }}
            className="p-3 rounded-xl bg-text-main/[0.05] text-text-muted hover:text-primary hover:bg-text-main/[0.1] transition-all touch-target"
            title="View target"
          >
            <Eye size={18} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default function Notifications() {
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const categories = [
    { name: 'All', icon: <Bell size={12} /> },
    { name: 'Likes', icon: <Heart size={12} /> },
    { name: 'Comments', icon: <MessageSquare size={12} /> },
    { name: 'Followers', icon: <UserPlus size={12} /> },
    { name: 'Mentions', icon: <AtSign size={12} /> },
    { name: 'System', icon: <Info size={12} /> },
  ];

  // Load notifications
  const fetchNotifications = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
      
      // Calculate and save initial unread count
      const unreadCount = (res.data.data || []).filter(n => !n.isRead).length;
      localStorage.setItem('caffevibes-unread-count', String(unreadCount));
      window.dispatchEvent(new CustomEvent('caffevibes-unread-notifications', { detail: unreadCount }));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load notifications');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  // Real-time updates via WebSockets
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewNotif = (newNotif) => {
      // Prepend to notifications
      setNotifications(prev => [newNotif, ...prev]);

      // Count unread
      const unreadCount = parseInt(localStorage.getItem('caffevibes-unread-count') || '0', 10) + 1;
      localStorage.setItem('caffevibes-unread-count', String(unreadCount));
      window.dispatchEvent(new CustomEvent('caffevibes-unread-notifications', { detail: unreadCount }));
    };

    socket.on(`notification:${currentUser._id}`, handleNewNotif);
    return () => socket.off(`notification:${currentUser._id}`, handleNewNotif);
  }, [socket, currentUser]);

  // Clear unread badge on panel opening (when they land on the notifications list)
  useEffect(() => {
    if (notifications.length > 0) {
      // Optional: Auto-mark all as read on landing, or keep unread but clear navigation badge count
      // Let's clear the navigation badge unread count as requested
      localStorage.setItem('caffevibes-unread-count', '0');
      window.dispatchEvent(new CustomEvent('caffevibes-unread-notifications', { detail: 0 }));
    }
  }, [notifications]);

  // Relative Time Helper
  const getRelativeTime = (date) => {
    if (!date) return 'Recently';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      
      // Update unread count badge
      const currentUnread = Math.max(0, notifications.filter(n => !n.isRead && n._id !== id).length);
      localStorage.setItem('caffevibes-unread-count', String(currentUnread));
      window.dispatchEvent(new CustomEvent('caffevibes-unread-notifications', { detail: currentUnread }));
      
      toast.success('Vibe cleared!', { icon: '☕', style: { borderRadius: '1rem', background: '#281612', color: '#F3EBE1', fontSize: '11px', fontWeight: 'bold' } });
    } catch (e) {
      toast.error('Sync failed. Try again.');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      localStorage.setItem('caffevibes-unread-count', '0');
      window.dispatchEvent(new CustomEvent('caffevibes-unread-notifications', { detail: 0 }));
      toast.success('All vibrations cleared! ☕', { icon: '🧹', style: { borderRadius: '1rem', background: '#281612', color: '#F3EBE1', fontSize: '11px', fontWeight: 'bold' } });
    } catch (e) {
      toast.error('Could not clear notifications.');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      
      // Re-calculate and save unread count
      const nextUnread = Math.max(0, notifications.filter(n => !n.isRead && n._id !== id).length);
      localStorage.setItem('caffevibes-unread-count', String(nextUnread));
      window.dispatchEvent(new CustomEvent('caffevibes-unread-notifications', { detail: nextUnread }));

      toast.success('Vibe deleted');
    } catch (e) {
      toast.error('Failed to delete notification');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Wipe your entire activity pulse?')) return;
    try {
      await api.delete('/notifications/clear');
      setNotifications([]);
      localStorage.setItem('caffevibes-unread-count', '0');
      window.dispatchEvent(new CustomEvent('caffevibes-unread-notifications', { detail: 0 }));
      toast.success('Pulse neutralized', { icon: '🧹', style: { borderRadius: '1rem', background: '#281612', color: '#F3EBE1', fontSize: '11px', fontWeight: 'bold' } });
    } catch (e) {
      toast.error('Could not clear.');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'LIKE': return <Heart className="text-red-400 fill-red-400" size={14} />;
      case 'COMMENT':
      case 'REPLY': return <MessageSquare className="text-blue-400" size={14} />;
      case 'SUBSCRIPTION': return <UserPlus className="text-green-400" size={14} />;
      case 'VIDEO_UPLOAD': return <Video className="text-primary" size={14} />;
      case 'TWEET_POST': return <LinkIcon className="text-primary" size={14} />;
      default: return <Bell size={14} />;
    }
  };

  const getActionText = (type) => {
    switch (type) {
      case 'LIKE': return 'liked your vibe';
      case 'COMMENT': return 'commented on your video';
      case 'REPLY': return 'replied to your thread';
      case 'SUBSCRIPTION': return 'subscribed to your channel';
      case 'VIDEO_UPLOAD': return 'uploaded a new video';
      case 'TWEET_POST': return 'shared a new vibe';
      default: return 'interacted with you';
    }
  };

  const getRedirectLink = (notif) => {
    if (notif.video) return `/video/${notif.video}`;
    if (notif.tweet) return `/tweets`;
    if (notif.senderDetails?.username) return `/profile/${notif.senderDetails.username}`;
    return '/';
  };

  // Filter logic based on active tab
  const getFilteredNotifications = () => {
    if (activeTab === 'All') return notifications;
    return notifications.filter(notif => {
      const type = notif.type;
      if (activeTab === 'Likes') return type === 'LIKE';
      if (activeTab === 'Comments') return type === 'COMMENT' || type === 'REPLY';
      if (activeTab === 'Followers') return type === 'SUBSCRIPTION';
      if (activeTab === 'Mentions') {
        // Classify MENTIONS or @ mentions in the content text
        return type === 'MENTION' || (notif.content && notif.content.includes('@'));
      }
      if (activeTab === 'System') {
        return type === 'SYSTEM' || type === 'VIDEO_UPLOAD' || type === 'TWEET_POST';
      }
      return true;
    });
  };

  const filteredNotifs = getFilteredNotifications();

  if (!currentUser) return (
    <div className="py-24 flex justify-center w-full">
      <EmptyState type="login" />
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-8 md:py-12 animate-fade-in relative">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full animate-pulse-slow" />
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-text-main tracking-tighter bg-gradient-to-r from-text-main to-text-main/30 bg-clip-text text-transparent">
            Activity Pulse
          </h1>
          <p className="text-xs sm:text-sm font-bold text-text-muted/40 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Your community interactions</p>
        </div>

        <div className="flex items-center gap-3">
          {notifications.some(n => !n.isRead) && (
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-background font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 border border-primary/20"
            >
              <CheckCheck size={14} /> Clear Unread
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={clearAll}
              className="flex items-center gap-2 px-5 py-3 bg-red-400/10 hover:bg-red-400 text-red-400 hover:text-background font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl border border-red-400/20 active:scale-95"
            >
              <Trash2 size={14} /> Delete All
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setActiveTab(cat.name)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 border flex items-center gap-2 shrink-0 ${
              activeTab === cat.name
                ? 'bg-primary text-background border-primary shadow-lg shadow-primary/10'
                : 'bg-text-main/[0.02] hover:bg-text-main/[0.05] text-text-muted border-text-main/5'
            }`}
          >
            {cat.icon}
            {cat.name}
          </button>
        ))}
      </div>

      {/* List Container */}
      <div className="grid gap-4 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-sm font-black text-text-muted/20 uppercase tracking-widest">Syncing your vibrations...</p>
          </div>
        ) : filteredNotifs.length > 0 ? (
          <div className="flex flex-col gap-4 w-full">
            <AnimatePresence initial={false}>
              {filteredNotifs.map((notif, idx) => (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <SwipeNotificationItem 
                    notif={notif}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    getRedirectLink={getRedirectLink}
                    getIcon={getIcon}
                    getActionText={getActionText}
                    getRelativeTime={getRelativeTime}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty caught-up coffee cup state */
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4 animate-fade-in bg-text-main/[0.01] border-2 border-dashed border-text-main/5 rounded-[2.5rem] p-8 max-w-2xl mx-auto w-full">
            <div className="relative w-24 h-24 flex items-center justify-center bg-primary/10 rounded-full text-primary border border-primary/20 shadow-xl mb-2">
              <span className="text-4xl">☕</span>
              <div className="absolute inset-0 rounded-full border border-primary/10 animate-ping pointer-events-none" />
            </div>
            <div>
              <h3 className="text-xl font-display font-black text-text-main tracking-tight">All caught up! ☕</h3>
              <p className="text-xs text-text-muted/50 font-bold uppercase tracking-widest mt-1 max-w-[280px] mx-auto leading-relaxed">
                {activeTab === 'All' 
                  ? 'Your notification grid is clean. Sipping some hot espresso.'
                  : `No notifications in ${activeTab} category.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}