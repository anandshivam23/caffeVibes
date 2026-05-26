import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, BookmarkPlus, Loader2, Pencil, Trash2, X, Check, Send, Reply, CornerDownRight, Play, Pause, Maximize, Minimize, Settings, ExternalLink, Volume2, Volume1, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PlaylistModal from '../components/PlaylistModal';
import { toast } from 'react-hot-toast';
const CommentItem = ({ comment, depth = 0, onReply, onDelete, onUpdate, allComments }) => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const isOwner = currentUser && (
    currentUser._id === (comment.commentor?._id || comment.owner?._id) ||
    currentUser._id === comment.commentor ||
    currentUser._id === comment.owner ||
    currentUser._id?.toString() === comment.commentor?._id?.toString() ||
    currentUser._id?.toString() === comment.owner?._id?.toString()
  );
  const handleLike = async () => {
    if (!currentUser) return toast.error("Login to like");
    const originalLiked = isLiked;
    setIsLiked(!isLiked);
    setLikesCount(prev => originalLiked ? Math.max(0, prev - 1) : prev + 1);

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('caffevibes-offline-actions') || '[]');
      queue.push({
        url: `/likes/toggle/c/${comment._id}`,
        method: 'POST',
        body: {}
      });
      localStorage.setItem('caffevibes-offline-actions', JSON.stringify(queue));
      toast.success("Comment liked offline! Queued for auto-sync ☕", { icon: '📝' });
      return;
    }

    try {
      await api.post(`/likes/toggle/c/${comment._id}`);
    } catch (e) {
      setIsLiked(originalLiked);
      setLikesCount(comment.likesCount || 0);
      toast.error("Failed to toggle like");
    }
  };
  const handleUpdate = async () => {
    if (!editText.trim()) return;
    setIsSaving(true);
    try {
      await api.patch(`/comments/c/${comment._id}`, { content: editText });
      onUpdate(comment._id, editText);
      setIsEditing(false);
      toast.success("Comment updated");
    } catch (e) {
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };
  const handlePostReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const res = await onReply(comment._id, replyText);
      setReplyText('');
      setShowReplyInput(false);
      toast.success("Reply posted!");
    } catch (e) {
      toast.error("Failed to reply");
    } finally {
      setIsSubmittingReply(false);
    }
  };
  const replies = allComments.filter(c => c.parentComment === comment._id);
  const commentor = comment.commentor || comment.owner;
  return (
    <div className={`flex flex-col ${depth > 0 ? 'ml-5 sm:ml-8 mt-2' : 'mt-6'}`}>
      <div className="flex gap-4 group/comment">
        <Link to={`/profile/${commentor?.username || commentor?._id}`} className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-surface-hover hover:border-primary transition-all">
          <img src={commentor?.avatar || "https://i.pravatar.cc/150?img=32"} alt={commentor?.username} className="w-full h-full object-cover" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/profile/${commentor?.username || commentor?._id}`} className="font-semibold text-sm hover:text-primary transition-colors truncate">
              {commentor?.fullName || commentor?.username}
            </Link>
            <span className="text-[10px] text-text-muted">{new Date(comment.createdAt).toLocaleDateString()}</span>
            {isOwner && (
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                {isEditing ? (
                  <>
                    <button onClick={handleUpdate} disabled={isSaving} className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"><Check size={14} /></button>
                    <button onClick={() => setIsEditing(false)} className="p-1 rounded hover:bg-surface-hover transition-colors"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setIsEditing(true); setEditText(comment.content); }} className="p-1.5 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text-main"><Pencil size={13} /></button>
                    <button onClick={() => onDelete(comment._id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-text-muted hover:text-red-400"><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full bg-background border border-primary/50 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none min-h-[60px] animate-fade-in"
              autoFocus
            />
          ) : (
            <p className="text-sm text-text-main leading-relaxed break-words">{comment.content}</p>
          )}
          <div className="flex items-center mt-3 gap-5">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all ${isLiked ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
            >
              <ThumbsUp size={ depth > 0 ? 14 : 16} className={isLiked ? 'fill-primary' : ''} />
              <span>{likesCount}</span>
            </button>
            <button
              onClick={() => {
                if(!currentUser) return toast.error("Login to reply");
                setShowReplyInput(!showReplyInput);
              }}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all ${showReplyInput ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
            >
              <Reply size={depth > 0 ? 14 : 16} /> Reply
            </button>
          </div>
          <AnimatePresence>
            {showReplyInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Reply to ${commentor?.username}...`}
                    className="flex-1 bg-background border-b border-surface-hover focus:border-primary text-sm p-1.5 focus:outline-none transition-all placeholder:text-text-muted/60"
                    onKeyDown={e => e.key === 'Enter' && handlePostReply()}
                  />
                  <button onClick={handlePostReply} disabled={isSubmittingReply || !replyText.trim()} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all disabled:opacity-30">
                    {isSubmittingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="flex flex-col">
          {replies.map(reply => (
            <CommentItem
              key={reply._id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onDelete={onDelete}
              onUpdate={onUpdate}
              allComments={allComments}
            />
          ))}
        </div>
      )}
    </div>
  );
};
export default function VideoPlayer() {
  let { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const videoMenuRef = useRef(null);
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isVideoMenuOpen, setIsVideoMenuOpen] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const isVideoOwner = currentUser && video && currentUser._id === video.owner?._id;

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const shortcutOverlayTimeoutRef = useRef(null);

  // Custom Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(parseFloat(localStorage.getItem('caffevibes-volume') || '1'));
  const [isMuted, setIsMuted] = useState(localStorage.getItem('caffevibes-muted') === 'true');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeQuality, setActiveQuality] = useState(localStorage.getItem('caffevibes-quality') || 'Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverChapter, setHoverChapter] = useState(null);

  // Time formatter (MM:SS or HH:MM:SS)
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Chapter Parser
  const parseChapters = (desc, dur) => {
    if (!desc || !dur) return [];
    const lines = desc.split('\n');
    const parsed = [];
    const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})/;
    
    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        const hrs = match[1] ? parseInt(match[1], 10) : 0;
        const mins = parseInt(match[2], 10);
        const secs = parseInt(match[3], 10);
        const seconds = hrs * 3600 + mins * 60 + secs;
        
        if (seconds < dur) {
          const title = line.replace(match[0], '').replace(/^[-\s:|()\[\]]+|[-\s:|()\[\]]+$/g, '').trim();
          parsed.push({
            seconds,
            title: title || `Chapter at ${match[0]}`
          });
        }
      }
    }
    
    parsed.sort((a, b) => a.seconds - b.seconds);
    return parsed.filter((ch, idx, self) => self.findIndex(t => t.seconds === ch.seconds) === idx);
  };

  const chapters = video ? parseChapters(video.description, duration) : [];
  const currentChapter = chapters.length > 0 
    ? [...chapters].reverse().find(ch => currentTime >= ch.seconds)
    : null;

  // Custom Controls Handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleTimelineClick = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const handleTimelineHover = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const hoverSecs = pos * duration;
    
    // Find chapter for this hovered percent
    const hoverPercent = pos * 100;
    const ch = [...chapters].reverse().find(c => hoverSecs >= c.seconds) || chapters[0];
    setHoverChapter({
      seconds: hoverSecs,
      percent: hoverPercent,
      title: ch ? ch.title : 'Vibe Timeline'
    });
  };

  const jumpToChapter = (secs) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = secs;
    if (!isPlaying) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('caffevibes-muted', String(nextMuted));
  };

  const handleVolumeChange = (e) => {
    if (!videoRef.current) return;
    const val = parseFloat(e.target.value);
    videoRef.current.volume = val;
    setVolume(val);
    if (val > 0 && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      localStorage.setItem('caffevibes-muted', 'false');
    }
    localStorage.setItem('caffevibes-volume', String(val));
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        if (document.pictureInPictureEnabled || videoRef.current.requestPictureInPicture) {
          await videoRef.current.requestPictureInPicture();
        } else {
          toast.error("Picture-in-Picture not supported by this browser.");
        }
      }
    } catch (e) {
      toast.error("Picture-in-Picture failed to open.");
    }
  };

  const changeQuality = (q) => {
    setActiveQuality(q);
    localStorage.setItem('caffevibes-quality', q);
    setShowQualityMenu(false);
    toast.success(`Quality set to ${q}`);
  };

  // Keyboard shortcut triggers
  const triggerShortcutsOverlay = (forceShow = false) => {
    setShowShortcuts(true);
    if (shortcutOverlayTimeoutRef.current) clearTimeout(shortcutOverlayTimeoutRef.current);
    
    if (!forceShow) {
      shortcutOverlayTimeoutRef.current = setTimeout(() => {
        setShowShortcuts(false);
      }, 3000);
    }
  };

  const seekRelative = (secs) => {
    if (!videoRef.current) return;
    let nextTime = videoRef.current.currentTime + secs;
    if (nextTime < 0) nextTime = 0;
    if (nextTime > duration) nextTime = duration;
    videoRef.current.currentTime = nextTime;
  };

  const changeVolumeRelative = (delta) => {
    let nextVolume = volume + delta;
    if (nextVolume < 0) nextVolume = 0;
    if (nextVolume > 1) nextVolume = 1;
    if (videoRef.current) {
      videoRef.current.volume = nextVolume;
      videoRef.current.muted = nextVolume === 0;
    }
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
    localStorage.setItem('caffevibes-volume', String(nextVolume));
  };

  // Autohide controls logic
  const handleMouseMoveControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2500);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted, video]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || 
        document.activeElement.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      
      if (key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        triggerShortcutsOverlay();
      } else if (key === 'm') {
        e.preventDefault();
        toggleMute();
        triggerShortcutsOverlay();
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
        triggerShortcutsOverlay();
      } else if (key === 'arrowleft') {
        e.preventDefault();
        seekRelative(-5);
        triggerShortcutsOverlay();
      } else if (key === 'arrowright') {
        e.preventDefault();
        seekRelative(5);
        triggerShortcutsOverlay();
      } else if (key === 'arrowup') {
        e.preventDefault();
        changeVolumeRelative(0.1);
        triggerShortcutsOverlay();
      } else if (key === 'arrowdown') {
        e.preventDefault();
        changeVolumeRelative(-0.1);
        triggerShortcutsOverlay();
      } else if (e.key === '?' || key === 'k') {
        e.preventDefault();
        triggerShortcutsOverlay(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (shortcutOverlayTimeoutRef.current) clearTimeout(shortcutOverlayTimeoutRef.current);
    };
  }, [isPlaying, volume, isMuted, isFullscreen, duration, currentTime]);

  useEffect(() => {
    const handler = (e) => {
      if (videoMenuRef.current && !videoMenuRef.current.contains(e.target)) {
        setIsVideoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  useEffect(() => {
    if (!socket || !video) return;
    const handlePostLiked = ({ targetId, liked, type, byUserId }) => {
      if (type === 'video' && targetId === video._id) {
        if (currentUser && byUserId === currentUser._id?.toString()) return;
        setVideo(prev => ({
          ...prev,
          likesCount: liked
            ? (prev.likesCount || 0) + 1
            : Math.max(0, (prev.likesCount || 0) - 1)
        }));
      }
    };
    const handleSubUpdate = ({ channelId, subscribersCount }) => {
      if (video.owner && channelId?.toString() === video.owner._id?.toString()) {
        setVideo(prev => ({ ...prev, owner: { ...prev.owner, subscribersCount } }));
      }
    };
    socket.on('postLiked', handlePostLiked);
    socket.on('subscriptionUpdate', handleSubUpdate);
    return () => {
      socket.off('postLiked', handlePostLiked);
      socket.off('subscriptionUpdate', handleSubUpdate);
    };
  }, [socket, video, currentUser]);
  useEffect(() => {
    const fetchVideoData = async () => {
      setIsLoading(true);
      try {
        const videoRes = await api.get(`/videos/${id}`);
        setVideo(videoRes.data.data);
        setIsSubscribed(videoRes.data.data.owner?.isSubscribed);
        setIsLiked(videoRes.data.data.isLiked || false);
        setIsDisliked(videoRes.data.data.isDisliked || false);
        const commentsRes = await api.get(`/comments/${id}`);
        setComments(commentsRes.data.data?.docs || commentsRes.data.data || []);
      } catch (error) {
        toast.error('Error loading video');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchVideoData();
  }, [id]);
  const handleAddComment = async (parentComment = null, content = null) => {
    const text = content || newComment;
    if (!currentUser) return toast.error('Login to comment');
    if (!text.trim()) return;

    if (!navigator.onLine) {
      const offlineComment = {
        _id: `offline-${Date.now()}`,
        content: text,
        parentComment,
        createdAt: new Date().toISOString(),
        commentor: currentUser,
        owner: currentUser
      };
      
      setComments(prev => [offlineComment, ...prev]);
      if (!parentComment) setNewComment('');

      const queue = JSON.parse(localStorage.getItem('caffevibes-offline-actions') || '[]');
      queue.push({
        url: `/comments/${video._id}`,
        method: 'POST',
        body: { content: text, parentComment }
      });
      localStorage.setItem('caffevibes-offline-actions', JSON.stringify(queue));
      toast.success("Comment posted offline! Queued for auto-sync ☕", { icon: '📝' });
      return offlineComment;
    }

    try {
      const res = await api.post(`/comments/${video._id}`, { content: text, parentComment });
      const newCommentData = res.data.data;
      const normalized = {
        ...newCommentData,
        commentor: newCommentData.commentor || newCommentData.owner,
        owner: newCommentData.owner || newCommentData.commentor,
      };
      setComments(prev => [normalized, ...prev]);
      if (!parentComment) setNewComment('');
      return normalized;
    } catch (e) {
      toast.error('Failed to post comment');
      throw e;
    }
  };
  const handleLike = async () => {
    if (!currentUser) return toast.error('Login to like');
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    if (!wasLiked && isDisliked) setIsDisliked(false);
    setVideo(prev => ({
      ...prev,
      likesCount: wasLiked
        ? Math.max(0, (prev.likesCount || 0) - 1)
        : (prev.likesCount || 0) + 1
    }));

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('caffevibes-offline-actions') || '[]');
      queue.push({
        url: `/likes/toggle/v/${video._id}`,
        method: 'POST',
        body: {}
      });
      localStorage.setItem('caffevibes-offline-actions', JSON.stringify(queue));
      toast.success("Video liked offline! Queued for auto-sync ☕", { icon: '📝' });
      return;
    }

    try {
      await api.post(`/likes/toggle/v/${video._id}`);
    } catch (e) {
      setIsLiked(wasLiked);
      setVideo(prev => ({
        ...prev,
        likesCount: wasLiked
          ? (prev.likesCount || 0) + 1
          : Math.max(0, (prev.likesCount || 0) - 1)
      }));
      toast.error('Failed to like');
    }
  };
  const handleDislike = async () => {
    if (!currentUser) return toast.error('Login to dislike');
    const wasDisliked = isDisliked;
    setIsDisliked(!wasDisliked);
    if (!wasDisliked && isLiked) {
      setIsLiked(false);
      setVideo(prev => ({
        ...prev,
        likesCount: Math.max(0, (prev.likesCount || 0) - 1)
      }));
    }

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('caffevibes-offline-actions') || '[]');
      queue.push({
        url: `/dislikes/toggle/v/${video._id}`,
        method: 'POST',
        body: {}
      });
      localStorage.setItem('caffevibes-offline-actions', JSON.stringify(queue));
      toast.success("Video disliked offline! Queued for auto-sync ☕", { icon: '📝' });
      return;
    }

    try {
      await api.post(`/dislikes/toggle/v/${video._id}`);
    } catch (e) {
      setIsDisliked(wasDisliked);
      toast.error('Failed to dislike');
    }
  };
  const handleSubscribe = async () => {
    if (!currentUser) return toast.error('Please log in to subscribe');
    if (isSubscribing) return;
    setIsSubscribing(true);
    try {
      const res = await api.post(`/subscriptions/c/${video.owner._id}`);
      const data = res.data.data;
      setIsSubscribed(data.isSubscribed);
      setVideo(prev => ({ ...prev, owner: { ...prev.owner, subscribersCount: data.subscribersCount } }));
      toast.success(data.isSubscribed ? 'Subscribed!' : 'Unsubscribed');
      if (data.isSubscribed) {
        window.dispatchEvent(new CustomEvent('caffevibes-milestone-reached', {
          detail: { milestone: 'confetti-only' }
        }));
      }
    } catch (e) {
      toast.error('Failed to subscribe');
    } finally {
      setIsSubscribing(false);
    }
  };
  const handleDeleteVideo = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeletingVideo(true);
    try {
      await api.delete(`/videos/${video._id}`);
      toast.success('Deleted');
      navigate('/');
    } catch (e) {
      toast.error('Failed delete');
      setIsDeletingVideo(false);
    }
  };
  const handleTogglePublish = async () => {
    try {
      const res = await api.patch(`/videos/toggle/publish/${video._id}`);
      setVideo(prev => ({ ...prev, isPublished: res.data.data.isPublished }));
      toast.success(res.data.data.isPublished ? 'Video Published' : 'Video Unpublished');
      setIsVideoMenuOpen(false);
    } catch (e) { toast.error('Failed to toggle publish status'); }
  };
  const openEditModal = () => {
    setEditTitle(video.title);
    setEditDesc(video.description);
    setIsEditingVideo(true);
    setIsVideoMenuOpen(false);
  };
  const handleUpdateVideo = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return toast.error('Title is required');
    setIsSavingVideo(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDesc);
      const res = await api.patch(`/videos/${video._id}`, formData);
      setVideo(prev => ({ ...prev, title: res.data.data.title, description: res.data.data.description }));
      setIsEditingVideo(false);
      toast.success('Video updated');
    } catch (e) {
      toast.error('Failed to update video');
    } finally {
      setIsSavingVideo(false);
    }
  };
  if (isLoading) return <SkeletonLoader variant="videoplayer" />;
  if (!video) return <div className="w-full mt-10"><EmptyState type="error" /></div>;
  const topLevelComments = comments.filter(c => !c.parentComment);
  return (
    <div className="animate-fade-in pb-12 w-full max-w-7xl mx-auto">
      <motion.div 
        ref={playerContainerRef}
        layoutId={`video-thumbnail-${id}`}
        onMouseMove={handleMouseMoveControls}
        onMouseLeave={() => setShowControls(false)}
        className="w-full aspect-video bg-black rounded-xl md:rounded-2xl overflow-hidden shadow-2xl mb-6 relative group select-none"
      >
        {/* Video Element */}
        <video 
          ref={videoRef}
          src={video.videoFile} 
          className="w-full h-full object-contain cursor-pointer" 
          poster={video.thumbnail}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Center Hover Play/Pause Overlay */}
        <div 
          onClick={togglePlay}
          className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity duration-300 ${!isPlaying ? 'bg-black/45' : 'bg-transparent opacity-0 group-hover:opacity-100'}`}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/95 text-background flex items-center justify-center shadow-3xl backdrop-blur-sm border border-primary/20"
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" className="text-background" />
            ) : (
              <Play size={28} fill="currentColor" className="text-background translate-x-0.5" />
            )}
          </motion.div>
        </div>

        {/* Custom Video Controls Bar */}
        <div 
          className={`absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-4 px-4 flex flex-col gap-3 transition-opacity duration-300 z-20 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Custom Progress Bar / Timeline */}
          <div className="flex flex-col gap-1 relative">
            <div 
              onClick={handleTimelineClick}
              onMouseMove={handleTimelineHover}
              onMouseLeave={() => setHoverChapter(null)}
              className="relative h-1.5 sm:h-2 bg-white/20 rounded-full cursor-pointer hover:h-2.5 transition-all duration-200 group/timeline flex items-center"
            >
              {/* Progress Played Fill */}
              <div 
                className="absolute left-0 top-0 h-full bg-primary rounded-full" 
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />

              {/* Chapter dots */}
              {chapters.map((ch, index) => {
                const percent = (ch.seconds / (duration || 1)) * 100;
                return (
                  <div
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToChapter(ch.seconds);
                    }}
                    className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white border border-primary hover:bg-primary-hover hover:scale-150 transition-all duration-150 cursor-pointer -translate-x-1/2"
                    style={{ left: `${percent}%` }}
                  />
                );
              })}

              {/* Playhead Handle */}
              <div 
                className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-primary border-2 border-white opacity-0 group-hover/timeline:opacity-100 transition-opacity -translate-x-1/2"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
              />
            </div>

            {/* Hover Chapter Tooltip */}
            {hoverChapter && (
              <div 
                className="absolute bottom-7 bg-surface/95 backdrop-blur-md border border-surface-hover/80 text-[10px] text-text-main font-bold px-2.5 py-1.5 rounded-xl shadow-2xl -translate-x-1/2 z-30 animate-fade-in pointer-events-none flex flex-col items-center gap-0.5"
                style={{ left: `${hoverChapter.percent}%` }}
              >
                <span className="text-primary truncate max-w-[120px]">{hoverChapter.title}</span>
                <span className="text-text-muted/60 font-mono">{formatTime(hoverChapter.seconds)}</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-4">
              {/* Play / Pause Toggle */}
              <button 
                onClick={togglePlay}
                className="text-text-main hover:text-primary transition-colors p-1"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              {/* Mute & Volume Bar */}
              <div className="flex items-center gap-1.5 group/volume p-1">
                <button 
                  onClick={toggleMute}
                  className="text-text-main hover:text-primary transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={18} />
                  ) : volume < 0.5 ? (
                    <Volume1 size={18} />
                  ) : (
                    <Volume2 size={18} />
                  )}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-12 sm:w-16 h-1 rounded-full cursor-pointer bg-white/20 accent-primary group-hover/volume:w-20 transition-all duration-300"
                />
              </div>

              {/* Elapsed Time / Total Time */}
              <span className="text-[11px] sm:text-xs font-mono text-text-main/80 select-none">
                {formatTime(currentTime)} <span className="text-text-muted/40">/</span> {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              {/* Active Chapter Label */}
              {currentChapter && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 max-w-[160px] truncate">
                  <span className="animate-pulse">📍</span> {currentChapter.title}
                </span>
              )}

              {/* PiP Button */}
              <button 
                onClick={togglePiP}
                className="text-text-main hover:text-primary transition-colors p-1 relative group/pip"
              >
                <ExternalLink size={18} />
                <span className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-surface border border-surface-hover text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl opacity-0 group-hover/pip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Picture in Picture
                </span>
              </button>

              {/* Quality Settings Toggler */}
              <div className="relative">
                <button 
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="flex items-center gap-1.5 text-text-main hover:text-primary transition-colors p-1"
                >
                  <Settings size={18} className={showQualityMenu ? 'rotate-45 transition-transform duration-300' : 'transition-transform duration-300'} />
                  <span className="text-[9px] font-black uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20 select-none">{activeQuality}</span>
                </button>

                {showQualityMenu && (
                  <div className="absolute right-0 bottom-8 bg-surface border border-surface-hover rounded-xl shadow-2xl py-1.5 min-w-[100px] z-50 animate-fade-in flex flex-col">
                    {['Auto', '1080p', '720p', '360p', '144p'].map((q) => (
                      <button 
                        key={q} 
                        onClick={() => changeQuality(q)} 
                        className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest ${activeQuality === q ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text-main hover:bg-surface-hover'}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button 
                onClick={toggleFullscreen}
                className="text-text-main hover:text-primary transition-colors p-1"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Overlay (Glassmorphism, bottom-left) */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div 
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className="absolute bottom-20 sm:bottom-24 left-4 bg-surface/75 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-3xl z-40 max-w-[240px] pointer-events-none"
            >
              <div className="flex flex-col gap-2">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Keyboard Shortcuts</h4>
                <div className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-main/90">
                  <div className="flex justify-between items-center gap-6">
                    <span className="text-text-muted/60">Play / Pause</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-[8px] font-mono">Space</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-6">
                    <span className="text-text-muted/60">Mute Toggle</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-[8px] font-mono">M</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-6">
                    <span className="text-text-muted/60">Fullscreen</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-[8px] font-mono">F</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-6">
                    <span className="text-text-muted/60">Seek 5s</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-[8px] font-mono">← →</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-6">
                    <span className="text-text-muted/60">Volume 10%</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-[8px] font-mono">↑ ↓</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-6">
                    <span className="text-text-muted/60">Show Guide</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-[8px] font-mono">K or ?</kbd>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="px-2 md:px-0">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-main mb-4 leading-tight">
          {video.title}
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-surface-hover/60">
          <div className="flex items-center gap-4">
            <Link to={`/profile/${video.owner.username}`} className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-all">
              <img src={video.owner.avatar} className="w-full h-full object-cover" />
            </Link>
            <div className="flex flex-col">
              <Link to={`/profile/${video.owner.username}`} className="font-bold text-base hover:text-primary transition-colors">{video.owner.fullName || video.owner.username}</Link>
              <span className="text-xs text-text-muted">{video.owner.subscribersCount || 0} subscribers</span>
            </div>
            {currentUser?._id !== video.owner._id && (
              <button
                disabled={isSubscribing}
                onClick={handleSubscribe}
                className={`ml-4 font-bold py-2 px-6 rounded-full text-sm transition-all ${isSubscribed ? 'bg-surface-hover text-text-main border border-surface-hover' : 'bg-primary hover:bg-primary-hover text-background shadow-lg shadow-primary/20'}`}
              >
                {isSubscribing ? <Loader2 size={15} className="animate-spin inline" /> : isSubscribed ? '✓ Subscribed' : 'Subscribe'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-surface rounded-full border border-surface-hover overflow-hidden shadow-sm">
              <button onClick={handleLike} className={`flex items-center gap-2 px-5 py-2.5 hover:bg-surface-hover transition-all border-r border-surface-hover ${isLiked ? 'text-primary' : ''}`}>
                <ThumbsUp size={18} className={isLiked ? 'fill-primary' : ''} />
                <span className="text-sm font-bold">{video.likesCount || 0}</span>
              </button>
              <button onClick={handleDislike} className={`px-5 py-2.5 hover:bg-surface-hover transition-all ${isDisliked ? 'text-primary' : ''}`}>
                <ThumbsDown size={18} className={isDisliked ? 'fill-primary' : ''} />
              </button>
            </div>
            <button onClick={() => setIsPlaylistModalOpen(true)} className="flex items-center gap-2 bg-surface hover:bg-surface-hover border border-surface-hover px-5 py-2.5 rounded-full transition-all shadow-sm">
              <BookmarkPlus size={18} /> <span className="text-sm font-bold hidden md:inline">Save</span>
            </button>
            {isVideoOwner && (
              <div className="relative" ref={videoMenuRef}>
                <button onClick={() => setIsVideoMenuOpen(!isVideoMenuOpen)} className="bg-surface hover:bg-surface-hover border border-surface-hover w-10 h-10 flex items-center justify-center rounded-full transition-all">
                  <MoreHorizontal size={18} />
                </button>
                {isVideoMenuOpen && (
                  <div className="absolute right-0 top-12 bg-surface border border-surface-hover rounded-xl shadow-2xl z-30 min-w-[160px] overflow-hidden animate-fade-in">
                    <button onClick={openEditModal} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-text-main hover:bg-surface-hover transition-colors border-b border-surface-hover/50">
                      <Pencil size={16} /> Edit Details
                    </button>
                    <button onClick={handleTogglePublish} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-text-main hover:bg-surface-hover transition-colors border-b border-surface-hover/50">
                      <Share2 size={16} /> {video.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => { setIsDeleteModalOpen(true); setIsVideoMenuOpen(false); setDeleteConfirmText(''); }} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={16} /> Delete Video
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="bg-surface/40 border border-surface-hover p-5 rounded-2xl mt-6 text-sm">
          <p className="text-text-muted mb-4">{video.views} views • {new Date(video.createdAt).toDateString()}</p>
          <p className="text-text-main leading-relaxed whitespace-pre-wrap font-light">{video.description}</p>
        </div>
        <div className="mt-10">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            {comments.length} Comments
          </h3>
          <div className="flex gap-4 mb-10">
            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 border-surface-hover">
              <img src={currentUser?.avatar || 'https://i.pravatar.cc/150?img=32'} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a friendly comment..."
                className="w-full bg-transparent border-b-2 border-surface-hover focus:border-primary pb-3 text-sm focus:outline-none transition-all pr-12"
              />
              <button
                onClick={() => handleAddComment()}
                disabled={!newComment.trim()}
                className="absolute right-0 bottom-3 text-primary p-2 hover:bg-primary/10 rounded-full disabled:opacity-30 transition-all"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {topLevelComments.length > 0 ? (
              topLevelComments.map(comment => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  allComments={comments}
                  onReply={handleAddComment}
                  onDelete={async (id) => {
                    try {
                      await api.delete(`/comments/c/${id}`);
                      setComments(prev => prev.filter(c => c._id !== id && c.parentComment !== id));
                      toast.success("Comment deleted");
                    } catch (e) {
                      toast.error(e?.response?.data?.message || "Failed to delete comment");
                    }
                  }}
                  onUpdate={(id, content) => setComments(prev => prev.map(c => c._id === id ? { ...c, content } : c))}
                />
              ))
            ) : (
              <div className="py-10 text-center text-text-muted bg-surface/20 rounded-2xl border border-dashed border-surface-hover">
                No comments yet. Share your thoughts!
              </div>
            )}
          </div>
        </div>
      </div>
      <PlaylistModal isOpen={isPlaylistModalOpen} onClose={() => setIsPlaylistModalOpen(false)} videoId={video._id} />
      <AnimatePresence>
        {isEditingVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-surface border border-surface-hover w-full max-w-lg rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Edit Video</h2>
                <button onClick={() => setIsEditingVideo(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateVideo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Title</label>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-background border border-surface-hover focus:border-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full bg-background border border-surface-hover focus:border-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all min-h-[120px] resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-surface-hover/50">
                  <button type="button" onClick={() => setIsEditingVideo(false)} className="px-5 py-2 font-bold hover:bg-surface-hover rounded-full transition-colors">Cancel</button>
                  <button type="submit" disabled={isSavingVideo} className="px-5 py-2 bg-primary hover:bg-primary-hover text-background font-bold rounded-full transition-colors disabled:opacity-50">
                    {isSavingVideo ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        {isDeleteModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-surface border border-surface-hover w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-red-500 flex items-center gap-2"><Trash2 size={24}/> Delete Video</h2>
                <button onClick={() => setIsDeleteModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors"><X size={20} /></button>
              </div>
              <p className="text-text-muted text-sm mb-4">This action cannot be undone. To confirm deletion, type <strong className="text-red-400 select-all">DELETE</strong> below.</p>
              <form onSubmit={(e) => { e.preventDefault(); handleDeleteVideo(); }} className="space-y-4">
                <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE to confirm" className="w-full bg-background border border-surface-hover focus:border-red-500 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-all text-center text-red-400 uppercase" required />
                <div className="flex gap-3 pt-2 border-t border-surface-hover/50 mt-4">
                  <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2 font-bold hover:bg-surface-hover border border-surface-hover rounded-full transition-colors">Cancel</button>
                  <button type="submit" disabled={isDeletingVideo || deleteConfirmText !== 'DELETE'} className="flex-1 py-2 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-full transition-colors disabled:opacity-50">
                    {isDeletingVideo ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Delete It'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}