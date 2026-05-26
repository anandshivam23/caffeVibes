import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
export default function TweetModal({ isOpen, onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [type, setType] = useState('tweet');
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/tweets', { content, type });
      toast.success(`${type === 'joke' ? 'Joke' : 'Tweet'} posted!`);
      
      // Trigger First Post celebration event
      window.dispatchEvent(new CustomEvent('caffevibes-milestone-reached', {
        detail: { milestone: 'first-post', title: 'First Post Milestone Unlocked! 📝' }
      }));

      setContent('');
      setType('tweet');
      onSuccess?.(res.data.data);
      onClose();
    } catch (e) {
      toast.error('Failed to post. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-16">
      <div className="bg-surface border border-surface-hover rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center p-4 border-b border-surface-hover">
          <h2 className="text-lg font-bold">New {type === 'joke' ? 'Joke' : 'Tweet'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <img src={currentUser?.avatar || 'https://i.pravatar.cc/150?img=32'} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={type === 'joke' ? "Drop a coffee pun or dev joke here..." : "What's brewing in your mind today?"}
              className="flex-1 bg-transparent border-none focus:outline-none text-text-main placeholder-text-muted text-base resize-none min-h-[100px]"
              maxLength={280}
              autoFocus
            />
          </div>
          <div className="text-right text-xs text-text-muted">{content.length}/280</div>
          <div className="flex items-center justify-between pt-2 border-t border-surface-hover">
            <div className="flex gap-2">
              {['tweet', 'joke'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${type === t ? 'bg-primary text-background' : 'bg-surface-hover text-text-muted hover:text-text-main'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-background font-semibold px-5 py-2 rounded-full text-sm transition-colors"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> Post</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}