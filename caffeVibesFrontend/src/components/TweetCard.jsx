import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { 
  MessageSquare, Heart, Share2, MoreHorizontal, Pencil, Trash2, Check, X, 
  Send, CornerDownRight, ThumbsDown, ChevronDown, ChevronUp, Loader2, Smile 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { AnimatedCounter } from './VideoCard';

const CHAR_THRESHOLD = 180;

export default function TweetCard({ tweet, index, onDelete, onUpdate, isReply = false }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [likesCount, setLikesCount] = useState(tweet.likes || tweet.likesCount || 0);
  const [isLiked, setIsLiked] = useState(tweet?.isLiked || false);
  const [isDisliked, setIsDisliked] = useState(tweet?.isDisliked || false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(tweet.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef(null);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [myReaction, setMyReaction] = useState(localStorage.getItem(`caffevibes-react-${tweet.id || tweet._id}`) || null);
  const [reactionCounts, setReactionCounts] = useState({
    '😂': Math.floor((tweet.likes || tweet.likesCount || 0) * 0.2),
    '❤️': Math.floor((tweet.likes || tweet.likesCount || 0) * 0.5) + ((tweet.likes || tweet.likesCount || 0) % 2),
    '😮': 0,
    '😢': 0,
    '🔥': Math.floor((tweet.likes || tweet.likesCount || 0) * 0.3),
  });

  // Inline particle explosion list
  const [heartParticles, setHeartParticles] = useState([]);

  // 3D Tilt Coordinates
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const tiltXSpring = useSpring(0, { stiffness: 320, damping: 24 });
  const tiltYSpring = useSpring(0, { stiffness: 320, damping: 24 });

  useEffect(() => {
    tiltXSpring.set(tilt.x);
    tiltYSpring.set(tilt.y);
  }, [tilt, tiltXSpring, tiltYSpring]);

  const handleMouseMove = (e) => {
    if (isReply) return; // disable 3D on replies to keep thread lines straight
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    const rX = -(mouseY / height) * 6;
    const rY = (mouseX / width) * 6;

    setTilt({ x: rX, y: rY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Spark a concentric color circle burst
  const triggerHeartBurst = () => {
    const burst = Array.from({ length: 8 }).map((_, i) => {
      const deg = (i * 360) / 8;
      const rad = (deg * Math.PI) / 180;
      const speed = Math.random() * 20 + 15;
      return {
        id: Date.now() + i,
        x: Math.cos(rad) * speed,
        y: Math.sin(rad) * speed,
        color: ['#D4A373', '#FF4B4B', '#FFD700', '#FFA500'][Math.floor(Math.random() * 4)],
        size: Math.random() * 4 + 3.5
      };
    });
    setHeartParticles(burst);
    setTimeout(() => setHeartParticles([]), 650);
  };

  const handleReactionSelect = async (emoji) => {
    setShowEmojiPicker(false);
    if (!currentUser) return toast.error('Please login to react');
    
    const originalReaction = myReaction;
    
    // Trigger pop burst on love or reactions
    triggerHeartBurst();

    if (originalReaction === emoji) {
      setMyReaction(null);
      localStorage.removeItem(`caffevibes-react-${tweet.id || tweet._id}`);
      setReactionCounts(prev => ({
        ...prev,
        [emoji]: Math.max(0, prev[emoji] - 1)
      }));
      setLikesCount(prev => Math.max(0, prev - 1));
      
      try {
        await api.post(`/likes/toggle/t/${tweet.id || tweet._id}`);
        setIsLiked(false);
      } catch (err) {
        setMyReaction(originalReaction);
        setReactionCounts(prev => ({
          ...prev,
          [emoji]: prev[emoji] + 1
        }));
        setLikesCount(prev => prev + 1);
        toast.error('Reaction update failed');
      }
    } else {
      setReactionCounts(prev => {
        const next = { ...prev };
        if (originalReaction) {
          next[originalReaction] = Math.max(0, next[originalReaction] - 1);
        }
        next[emoji] = (next[emoji] || 0) + 1;
        return next;
      });
      setMyReaction(emoji);
      localStorage.setItem(`caffevibes-react-${tweet.id || tweet._id}`, emoji);
      
      if (!isLiked) {
        setLikesCount(prev => prev + 1);
        setIsLiked(true);

        if (!navigator.onLine) {
          const queue = JSON.parse(localStorage.getItem('caffevibes-offline-actions') || '[]');
          queue.push({
            url: `/likes/toggle/t/${tweet.id || tweet._id}`,
            method: 'POST',
            body: {}
          });
          localStorage.setItem('caffevibes-offline-actions', JSON.stringify(queue));
          toast.success("Reaction liked offline! Queued for auto-sync ☕", { icon: '📝' });
          return;
        }

        try {
          await api.post(`/likes/toggle/t/${tweet.id || tweet._id}`);
          const totalLikes = likesCount + 1;
          if (totalLikes === 100) {
            window.dispatchEvent(new CustomEvent('caffevibes-milestone-reached', { detail: '100 views' }));
          }
        } catch (err) {
          setMyReaction(originalReaction);
          setReactionCounts(prev => {
            const next = { ...prev };
            next[emoji] = Math.max(0, next[emoji] - 1);
            if (originalReaction) {
              next[originalReaction] = (next[originalReaction] || 0) + 1;
            }
            return next;
          });
          setLikesCount(prev => Math.max(0, prev - 1));
          setIsLiked(false);
          toast.error('Reaction update failed');
        }
      }
    }
  };

  const isOwner = currentUser && (
    currentUser._id === (tweet.owner?.id || tweet.owner?._id || tweet.ownerDetails?._id || tweet.owner) ||
    currentUser._id?.toString() === (tweet.owner?.id || tweet.owner?._id || tweet.ownerDetails?._id || tweet.owner)?.toString()
  );
  
  const isLong = tweet.content && tweet.content.length > CHAR_THRESHOLD;
  
  useEffect(() => {
    setLikesCount(tweet.likes || tweet.likesCount || 0);
  }, [tweet.likes, tweet.likesCount]);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLike = async () => {
    if (!currentUser) return toast.error('Please login to interact');
    
    // Spark bouncy burst
    triggerHeartBurst();

    const originalLiked = isLiked;
    setIsLiked(!isLiked);
    if (isDisliked) setIsDisliked(false);
    setLikesCount(prev => originalLiked ? Math.max(0, prev - 1) : prev + 1);

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('caffevibes-offline-actions') || '[]');
      queue.push({
        url: `/likes/toggle/t/${tweet.id || tweet._id}`,
        method: 'POST',
        body: {}
      });
      localStorage.setItem('caffevibes-offline-actions', JSON.stringify(queue));
      toast.success("Vibe liked offline! Queued for auto-sync ☕", { icon: '📝' });
      return;
    }

    try {
      await api.post(`/likes/toggle/t/${tweet.id || tweet._id}`);
    } catch (err) {
      setIsLiked(originalLiked);
      setLikesCount(tweet.likes || tweet.likesCount || 0);
      toast.error('Failed to toggle like');
    }
  };

  const handleDislike = async () => {
    if (!currentUser) return toast.error('Please login to interact');
    const originalDisliked = isDisliked;
    setIsDisliked(!isDisliked);
    if (isLiked) { setIsLiked(false); setLikesCount(prev => Math.max(0, prev - 1)); }

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('caffevibes-offline-actions') || '[]');
      queue.push({
        url: `/dislikes/toggle/t/${tweet.id || tweet._id}`,
        method: 'POST',
        body: {}
      });
      localStorage.setItem('caffevibes-offline-actions', JSON.stringify(queue));
      toast.success("Vibe disliked offline! Queued for auto-sync ☕", { icon: '📝' });
      return;
    }

    try {
      await api.post(`/dislikes/toggle/t/${tweet.id || tweet._id}`);
    } catch (err) {
      setIsDisliked(originalDisliked);
      toast.error('Failed to toggle dislike');
    }
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!window.confirm('Delete this tweet?')) return;
    try {
      await api.delete(`/tweets/${tweet.id || tweet._id}`);
      toast.success('Tweet deleted');
      onDelete?.(tweet.id || tweet._id);
    } catch (e) {
      toast.error('Failed to delete tweet');
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await api.patch(`/tweets/${tweet.id || tweet._id}`, { content: editContent });
      toast.success('Tweet updated');
      onUpdate?.(tweet.id || tweet._id, editContent);
      setIsEditing(false);
    } catch (e) {
      toast.error('Failed to update tweet');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchReplies = async () => {
    if (showReplies) { setShowReplies(false); return; }
    setIsLoadingReplies(true);
    try {
      const res = await api.get(`/tweets/${tweet.id || tweet._id}/replies`);
      setReplies(res.data.data || []);
      setShowReplies(true);
    } catch (err) {
      toast.error('Failed to load replies');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handlePostReply = async () => {
    if (!replyContent.trim() || !currentUser) return;
    setIsSubmittingReply(true);
    try {
      const res = await api.post('/tweets', {
        content: replyContent,
        parentTweet: tweet.id || tweet._id,
        type: tweet.type || 'tweet'
      });
      toast.success('Reply posted!');
      setReplyContent('');
      setShowReplyInput(false);
      setReplies(prev => [...prev, res.data.data]);
      setShowReplies(true);
    } catch (err) {
      toast.error('Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const ownerData = tweet.ownerDetails || tweet.owner;
  const displayContent = isExpanded || !isLong
    ? tweet.content
    : tweet.content.slice(0, CHAR_THRESHOLD) + '…';

  const formatDate = (date) => {
    if (!date) return 'Just now';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`flex flex-col w-full h-full ${isReply ? 'mt-1' : 'mb-px'}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 15 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        whileHover={isReply ? undefined : {
          scale: 1.015,
          boxShadow: "0px 15px 30px rgba(212, 163, 115, 0.12)",
          borderColor: "rgba(212, 163, 115, 0.25)"
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={isReply ? undefined : {
          perspective: 1000,
          rotateX: tiltXSpring,
          rotateY: tiltYSpring,
          transformStyle: 'preserve-3d'
        }}
        className={`relative group transition-all duration-300 overflow-hidden flex flex-col h-full
                   ${isReply ? 'ml-0 p-0 pl-3 sm:pl-5' : 'bg-surface border border-text-main/5 p-3 sm:p-5 md:p-7 rounded-2xl md:rounded-[2.2rem] shadow-lg hover:shadow-xl'}`}
      >
        <div className="flex gap-3 sm:gap-5 h-full flex-1" style={{ transform: isReply ? undefined : 'translateZ(10px)' }}>
          <div className="flex flex-col items-center flex-shrink-0 relative">
            <Link to={`/profile/${ownerData?.username}`} className="relative z-10">
              <div className={`rounded-xl overflow-hidden border border-text-main/10 group-hover:border-primary/40 transition-all 
                             ${isReply ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'}`}>
                <img src={ownerData?.avatar} alt={ownerData?.username} className="w-full h-full object-cover" />
              </div>
              {!isReply && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />}
            </Link>
            {((showReplies && replies.length > 0) || isReply) && (
              <div className={`absolute top-0 bottom-0 w-px bg-text-main/10 group-hover:bg-primary/20 transition-colors -z-10
                              ${isReply ? 'h-full' : 'top-14 h-[5000px]'}`} />
            )}
            {isReply && (
              <div className="absolute -left-4 top-5 w-4 h-px bg-text-main/10" />
            )}
          </div>

          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link to={`/profile/${ownerData?.username}`} className="font-display font-bold text-sm md:text-base text-text-main hover:text-primary transition-colors truncate">
                    {ownerData?.fullName || ownerData?.username}
                  </Link>
                  <span className="text-xs text-text-muted/60 font-medium truncate">@{ownerData?.username}</span>
                  <span className="text-[10px] text-text-muted/40 font-bold uppercase tracking-tighter">· {formatDate(tweet.createdAt || tweet.createdAtRaw)}</span>
                </div>
              </div>
              
              {isOwner && (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 rounded-xl border border-transparent hover:border-text-main/5 hover:bg-text-main/[0.02] text-text-muted transition-all">
                    <MoreHorizontal size={18} />
                  </button>
                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-12 bg-background/90 backdrop-blur-xl border border-text-main/10 rounded-2xl shadow-3xl z-30 min-w-[160px] p-1.5"
                      >
                        <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-primary hover:bg-text-main/[0.02] rounded-xl transition-all">
                          <Pencil size={14} /> Edit
                        </button>
                        <button onClick={handleDelete} className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                          <Trash2 size={14} /> Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className={`text-text-main leading-relaxed tracking-wide font-light break-words overflow-wrap-anywhere whitespace-pre-wrap
                            ${isReply ? 'text-sm' : 'text-sm sm:text-base'}`}>
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={editContent} onChange={e => setEditContent(e.target.value)}
                    className="w-full bg-surface/40 border border-primary/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 resize-none min-h-[120px]"
                    maxLength={500} autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setIsEditing(false); setEditContent(tweet.content); }} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-text-main/5">Cancel</button>
                    <button onClick={handleSaveEdit} disabled={isSaving} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-background flex items-center gap-2">
                       {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {displayContent}
                  {isLong && (
                    <button onClick={() => setIsExpanded(p => !p)} className="block mt-2 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80">
                      {isExpanded ? 'Show Less' : 'Read Full Thread'}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-6 pt-2 mt-auto flex-nowrap overflow-hidden z-10">
              <div className="relative flex items-center gap-2">
                
                {/* Like/Reaction Trigger Button */}
                <motion.button 
                  onClick={() => handleReactionSelect(myReaction || '❤️')}
                  onMouseEnter={() => setShowEmojiPicker(true)}
                  whileTap={{ scale: 1.35 }}
                  className={`flex items-center gap-1.5 group/btn text-[10px] sm:text-[11px] font-bold shrink-0 relative ${myReaction ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
                >
                  <div className={`p-2 rounded-lg transition-all ${myReaction ? 'bg-primary/10' : 'group-hover/btn:bg-primary/10'}`}>
                    {myReaction ? <span className="text-sm leading-none">{myReaction}</span> : <Heart size={15} className={isLiked ? 'fill-red-400 text-red-400' : ''} />}
                  </div>
                  
                  {/* Concentric Burst Particles */}
                  {heartParticles.map(p => (
                    <motion.span
                      key={p.id}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        left: '40%',
                        top: '50%',
                        marginLeft: -p.size / 2,
                        marginTop: -p.size / 2,
                        zIndex: 50
                      }}
                    />
                  ))}

                  <span>{myReaction ? 'Reacted' : 'Like'}</span>
                </motion.button>

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div 
                    onMouseLeave={() => setShowEmojiPicker(false)}
                    className="absolute left-0 bottom-10 bg-surface/95 border border-surface-hover rounded-2xl shadow-3xl p-2 z-50 flex gap-2.5 animate-scale-up backdrop-blur-md"
                  >
                    {['😂', '❤️', '😮', '😢', '🔥'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactionSelect(emoji);
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Compact Reaction Counts Badge */}
                {Object.keys(reactionCounts).some(k => reactionCounts[k] > 0) && (
                  <div className="flex items-center gap-1.5 bg-text-main/[0.03] px-2 py-0.5 rounded-full border border-text-main/5 shadow-sm shrink-0">
                    {Object.keys(reactionCounts).map(emoji => {
                      const count = reactionCounts[emoji];
                      if (count <= 0) return null;
                      return (
                        <button 
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactionSelect(emoji);
                          }}
                          className={`flex items-center gap-0.5 text-[9px] font-black hover:scale-115 transition-transform ${myReaction === emoji ? 'text-primary bg-primary/10 px-1 rounded-md' : 'text-text-muted'}`}
                        >
                          <span>{emoji}</span>
                          <span className="font-mono">
                            <AnimatedCounter value={count} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => { if (!currentUser) return toast.error('Login to reply'); setShowReplyInput(!showReplyInput); }}
                className={`flex items-center gap-1.5 group/btn text-[10px] sm:text-[11px] font-bold shrink-0 ${showReplyInput ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
              >
                <div className={`p-2 rounded-lg transition-all ${showReplyInput ? 'bg-primary/10' : 'group-hover/btn:bg-primary/10'}`}>
                  <MessageSquare size={15} />
                </div>
                <span>
                  <AnimatedCounter value={tweet.repliesCount || tweet.comments || replies.length} />
                </span>
              </button>

              <div className="flex-1" />
              
              <button
                onClick={fetchReplies}
                className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-text-muted/40 hover:text-primary transition-colors whitespace-nowrap shrink-0"
              >
                {isLoadingReplies ? '...' : showReplies ? 'Collapse' : 'Thread'}
              </button>
            </div>

            <AnimatePresence>
              {showReplyInput && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-4 border-t border-text-main/[0.03] mt-2 flex flex-col gap-4">
                    <textarea
                      value={replyContent} onChange={e => setReplyContent(e.target.value)}
                      placeholder="Contribute to the vibe..."
                      className="w-full bg-surface/20 border-none focus:outline-none text-sm py-2 resize-none h-20 placeholder-text-muted/40 font-medium"
                      autoFocus
                    />
                    <div className="flex justify-end gap-3 pb-2">
                       <button onClick={() => setShowReplyInput(false)} className="text-[10px] font-black uppercase tracking-widest text-text-muted">Discard</button>
                       <button onClick={handlePostReply} disabled={isSubmittingReply || !replyContent.trim()} className="px-6 py-2.5 bg-primary text-background rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50">
                          {isSubmittingReply ? 'Sending...' : 'Post Reply'}
                       </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showReplies && (
                <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-text-main/[0.03]">
                  {replies.map((reply, i) => (
                    <TweetCard
                      key={reply._id} tweet={reply} isReply={true} index={i}
                      onDelete={(rid) => setReplies(prev => prev.filter(r => r._id !== rid))}
                      onUpdate={(rid, content) => setReplies(prev => prev.map(r => r._id === rid ? { ...r, content } : r))}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}