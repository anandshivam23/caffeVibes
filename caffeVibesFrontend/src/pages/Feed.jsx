import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import TweetCard from '../components/TweetCard';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { Loader2, Send, Play, Heart, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import VideoUploadModal from '../components/VideoUploadModal';
import RightSidebar from '../components/RightSidebar';
export default function Feed() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const isRoot = location.pathname === '/';
  const isTweetsPage = location.pathname === '/tweets';
  const isLikedPage = location.pathname === '/liked';
  const isDislikedPage = location.pathname === '/disliked';
  const [activeTab, setActiveTab] = useState(isTweetsPage ? 'Tweets' : 'All Vibes');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categories = ['All Vibes', 'Videos', 'Tweets', 'Jokes'];
  const fetchContent = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      let fetchedContent = [];
      if (isLikedPage) {
        if (!currentUser) { setItems([]); setIsLoading(false); return; }
        const res = await api.get('/likes/videos');
        const likedItems = res.data.data || [];
        fetchedContent = likedItems.map(item => {
          const v = item.videoDetails || item;
          const ownerObj = item.channel || v.owner || {};
          return formatVideo(v, ownerObj);
        }).filter(v => v.id);
      }
      else if (isDislikedPage) {
        if (!currentUser) { setItems([]); setIsLoading(false); return; }
        const res = await api.get('/dislikes/videos');
        const dislikedItems = res.data.data || [];
        fetchedContent = dislikedItems.map(item => {
          const v = item.videoDetails || item;
          const ownerObj = item.channel || v.owner || {};
          return formatVideo(v, ownerObj);
        }).filter(v => v.id);
      }
      else {
        const fetchTab = (isTweetsPage && (activeTab === 'All Vibes' || activeTab === 'Videos')) ? 'Tweets' : activeTab;
        if (fetchTab === 'All Vibes') {
          const [videosRes, tweetsRes] = await Promise.all([
            api.get('/videos').catch(() => ({ data: { data: { docs: [] } } })),
            api.get('/tweets').catch(() => ({ data: { data: [] } }))
          ]);
          const vids = (videosRes.data.data?.docs || videosRes.data.data?.videos || []).map(v => formatVideo(v, v.owner || v.channel));
          const tws = (tweetsRes.data.data || []).map(t => formatTweet(t));
          fetchedContent = [...vids, ...tws].sort((a, b) => new Date(b.createdAtRaw) - new Date(a.createdAtRaw));
        }
        else if (fetchTab === 'Videos') {
          const res = await api.get('/videos');
          fetchedContent = (res.data.data?.docs || res.data.data?.videos || []).map(v => formatVideo(v, v.owner || v.channel));
        }
        else if (fetchTab === 'Tweets') {
          const res = await api.get('/tweets?type=tweet');
          fetchedContent = (res.data.data || []).map(t => formatTweet(t));
        }
        else if (fetchTab === 'Jokes') {
          const res = await api.get('/tweets?type=joke');
          fetchedContent = (res.data.data || []).map(t => formatTweet(t));
        }
        if (isTweetsPage && activeTab !== 'Tweets' && activeTab !== 'Jokes') {
          setActiveTab('Tweets');
        }
      }
      setItems(fetchedContent);
      localStorage.setItem('caffevibes-cached-feed', JSON.stringify(fetchedContent));
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 404) {
        setItems([]);
      } else {
        const cached = localStorage.getItem('caffevibes-cached-feed');
        if (cached) {
          setItems(JSON.parse(cached));
          toast.success("Loaded cached feeds offline! ☕", { icon: '📝' });
        } else {
          setIsError(true);
          toast.error("Could not load content.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (isTweetsPage) {
      setActiveTab('Tweets');
    }
    setItems([]);
    fetchContent();
  }, [activeTab, location.pathname]);
  useEffect(() => {
    if (!socket) return;
    const handleNewPost = (post) => {
      if (activeTab === 'All Vibes' || (activeTab === 'Tweets' && post.type === 'tweet') || (activeTab === 'Jokes' && post.type === 'joke')) {
        setItems(prev => [formatTweet(post), ...prev]);
      }
    };
    const handleNewVideo = (video) => {
      if (activeTab === 'All Vibes' || activeTab === 'Videos') {
        setItems(prev => [formatVideo(video, video.owner), ...prev]);
      }
    };
    const handlePostLiked = ({ targetId, liked, type }) => {
      setItems(prev => prev.map(item => {
        if (item.id === targetId && item.type === type) {
          return { ...item, likes: liked ? (item.likes || 0) + 1 : Math.max(0, (item.likes || 0) - 1) };
        }
        return item;
      }));
    };
    socket.on('newPost', handleNewPost);
    socket.on('newVideo', handleNewVideo);
    socket.on('postLiked', handlePostLiked);
    return () => {
      socket.off('newPost', handleNewPost);
      socket.off('newVideo', handleNewVideo);
      socket.off('postLiked', handlePostLiked);
    };
  }, [socket, activeTab]);
  const formatVideo = (v, ownerObj) => {
    if (!v) return null;
    const owner = ownerObj || v.owner || {};
    const viewCount = Array.isArray(v.views) ? v.views.length : (typeof v.views === 'number' ? v.views : 0);
    return {
      id: v._id,
      type: 'video',
      thumbnail: v.thumbnail,
      title: v.title,
      duration: `${Math.floor((v.duration || 0)/60)}:${Math.floor((v.duration || 0)%60).toString().padStart(2,'0')}`,
      views: viewCount,
      createdAt: v.createdAt,
      createdAtRaw: v.createdAt,
      owner: {
        id: owner._id,
        name: owner.fullName || owner.username || 'Unknown',
        avatar: owner.avatar || 'https://i.pravatar.cc/150?img=32',
        username: owner.username
      }
    };
  };
  const formatTweet = (t) => {
    const likes = Array.isArray(t.likes) ? t.likes : [];
    const isLiked = currentUser && likes.some(l => (l.likedBy || l) === currentUser._id || (l.likedBy || l)?.toString() === currentUser._id);
    return {
      id: t._id,
      type: 'tweet',
      content: t.content,
      likes: t.likesCount || 0,
      isLiked,
      isDisliked: t.isDisliked || false,
      comments: 0,
      createdAt: t.createdAt,
      createdAtRaw: t.createdAt,
      postType: t.type,
      owner: {
        id: t.ownerDetails?._id,
        name: t.ownerDetails?.fullName || t.ownerDetails?.username || "Unknown",
        avatar: t.ownerDetails?.avatar || "https://i.pravatar.cc/150?img=32",
        handle: '@' + (t.ownerDetails?.username || 'user'),
        username: t.ownerDetails?.username
      }
    };
  };
  const handleCreatePost = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser) return toast.error("Please log in to post.");
    if (!newPostContent.trim()) return;
    try {
      setIsSubmitting(true);
      const type = activeTab === 'Jokes' ? 'joke' : 'tweet';
      await api.post('/tweets', { content: newPostContent, type });
      setNewPostContent('');
      toast.success(`${type === 'joke' ? 'Joke' : 'Tweet'} posted!`);
      
      // Trigger First Post celebration event
      window.dispatchEvent(new CustomEvent('caffevibes-milestone-reached', {
        detail: { milestone: 'first-post', title: 'First Post Milestone Unlocked! 📝' }
      }));

      fetchContent();
    } catch (err) {
      toast.error("Failed to post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const getEmptyStateType = () => {
    if (!currentUser && (isLikedPage || isDislikedPage)) return 'login';
    if (location.pathname === '/liked') return 'liked';
    if (location.pathname === '/disliked') return 'disliked';
    if (location.pathname === '/playlists') return 'playlists';
    if (location.pathname === '/subscriptions') return 'subscriptions';
    if (activeTab === 'Tweets') return 'tweets';
    if (activeTab === 'Jokes') return 'jokes';
    return 'feed';
  };
  const handleTweetDelete = (tweetId) => setItems(prev => prev.filter(item => item.id !== tweetId));
  const handleTweetUpdate = (tweetId, newContent) => setItems(prev => prev.map(item => item.id === tweetId ? { ...item, content: newContent } : item));
  return (
    <div className="min-h-screen w-full relative">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary-hover/5 blur-[180px] rounded-full animate-pulse-slow animation-delay-2000" />
      </div>
      <div className="w-full max-w-screen-xl mx-auto pb-6 animate-fade-in">
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            {isRoot && (
             <div className="flex flex-col gap-1 mb-5 sm:mb-8">
                 <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-text-main tracking-tighter bg-gradient-to-r from-text-main to-text-main/30 bg-clip-text text-transparent">
                   Latest Feed
                 </h1>
                 <p className="text-text-muted/40 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[9px] ml-1">The pulse of the universe</p>
               </div>
            )}
            {!isRoot && (
              <h2 className="text-xl md:text-2xl font-black font-display text-text-main mb-6 md:mb-8 capitalize tracking-tight pt-1">
                {location.pathname.substring(1)} Insights
              </h2>
            )}
            {isRoot && (
              <div className="flex items-center gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setActiveTab(cat); setNewPostContent(''); }}
                    className={`whitespace-nowrap px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 border-2 flex-shrink-0 ${
                      activeTab === cat
                        ? 'bg-primary text-background border-primary shadow-md'
                        : 'bg-text-main/[0.02] hover:bg-text-main/[0.05] text-text-muted border-text-main/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            {isRoot && currentUser && (
              <div className="mb-6 sm:mb-8 w-full">
                {activeTab === 'Videos' ? (
                  <div 
                    onClick={() => setIsVideoModalOpen(true)}
                    className="bg-text-main/[0.01] backdrop-blur-3xl border border-text-main/5 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-text-main/[0.03] transition-all duration-300 shadow-lg border-dashed"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 shadow-md">
                      <Play size={24} fill="currentColor" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-display font-black text-text-main tracking-tight">Got a vibe to share?</h3>
                      <p className="text-text-muted/40 font-bold uppercase tracking-[0.2em] text-[7px] mt-1">Broadcast your story</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreatePost} className="bg-text-main/[0.01] backdrop-blur-3xl border border-text-main/5 rounded-3xl p-4 md:p-6 flex flex-col gap-5 shadow-lg focus-within:bg-text-main/[0.03] transition-all">
                    <div className="flex gap-5 items-start">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-surface-hover border border-text-main/10 shadow-lg">
                        <img src={currentUser?.avatar || "https://i.pravatar.cc/150?img=32"} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder={
                          activeTab === 'Jokes' ? "Brewing a world-class pun? ☕" : 
                          activeTab === 'Tweets' ? "Spill the tea. What's on your mind?" : 
                          "Don't just watch—be the pulse..."
                        }
                        className="flex-1 bg-transparent border-none focus:outline-none text-text-main placeholder-text-muted/20 text-base md:text-lg py-1.5 resize-none h-14 md:h-16 scrollbar-hide font-display font-medium tracking-tight"
                        maxLength={500}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-5 border-t border-text-main/[0.05]">
                      <div className="flex items-center gap-3">
                        {(activeTab === 'All Vibes') && (
                          <>
                            <div onClick={() => setIsVideoModalOpen(true)} className="p-2.5 rounded-xl bg-text-main/[0.02] hover:bg-text-main/[0.05] text-text-muted hover:text-primary transition-colors cursor-pointer border border-transparent hover:border-text-main/5 group/icon">
                              <Play size={16} />
                            </div>
                            <div onClick={() => handleCreatePost()} className="p-2.5 rounded-xl bg-text-main/[0.02] hover:bg-text-main/[0.05] text-text-muted hover:text-primary transition-colors cursor-pointer border border-transparent hover:border-text-main/5 group/icon">
                              <Send size={16} className="rotate-45" />
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={!newPostContent.trim() || isSubmitting}
                        className="px-8 py-3 bg-primary text-background font-black rounded-lg text-[9px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <>Publish Now <Send size={12} /></>}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {isLoading ? (
              <SkeletonLoader 
                variant={(isLikedPage || isDislikedPage || activeTab === 'Videos') ? 'video' : 'tweet'} 
                count={6}
                compact={(isLikedPage || isDislikedPage || activeTab === 'Videos')}
              />
            ) : isError ? (
              <EmptyState type="error" />
            ) : items.length > 0 ? (
              <div className={`w-full ${
                (isLikedPage || isDislikedPage || activeTab === 'Videos')
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4'
                  : 'flex flex-col gap-3 sm:gap-4 max-w-2xl'
              }`}>
                {items.map((item, index) => {
                  if (item.type === 'video') {
                    return (
                      <div key={`${item.id}-${index}`} className="animate-slide-up w-full" style={{ animationDelay: `${index * 50}ms` }}>
                        <VideoCard video={item} index={index} compact={(isLikedPage || isDislikedPage || activeTab === 'Videos')} />
                      </div>
                    );
                  }
                  return (
                    <div key={`${item.id}-${index}`} className="animate-slide-up w-full" style={{ animationDelay: `${index * 50}ms` }}>
                      <TweetCard
                        tweet={item}
                        index={index}
                        onDelete={handleTweetDelete}
                        onUpdate={handleTweetUpdate}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center py-20">
                <EmptyState type={getEmptyStateType()} />
              </div>
            )}
          </div>
          <div className="hidden xl:block w-80 xl:w-96 shrink-0 sticky top-4 self-start">
            <RightSidebar />
          </div>
        </div>
      </div>
      <VideoUploadModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onUploadSuccess={() => { setIsVideoModalOpen(false); fetchContent(); }}
      />
    </div>
  );
}