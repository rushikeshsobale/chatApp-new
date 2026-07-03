import React, { useState, useRef, useEffect, useCallback } from 'react';
import moment from 'moment';
import {
  FaTimes, FaHeart, FaRegHeart, FaComment, FaPaperPlane,
  FaBookmark, FaRegBookmark, FaTrash,
} from 'react-icons/fa';
import { Spinner } from 'react-bootstrap';
import {
  getRelatedPosts,
  likePost,
  unlikePost,
  addComment,
  deleteComment,
  savePost,
  unsavePost,
  sharePost,
  deletePost,
} from '../services/profileService';
import '../css/homeFeed.css';
import '../css/postViewer.css';

const isVideoPost = (post) =>
  post.mediaType ? post.mediaType === 'video' : /\.(mp4|mov|webm|ogg)(\?|$)/i.test(post.media || '');

// Mirrors the backend's FEED_PAGE_SIZE — used only to guess whether another
// page might exist (a full page back means there could be more).
const RELATED_PAGE_SIZE = 20;

// One full-viewport slide: media + action rail + caption + comment sheet
const ViewerItem = React.memo(({
  post, userId, currentUserAvatar, isActive, onNavigateProfile,
  onToggleLike, onToggleSave, onShare, onSubmitComment, onDeleteComment, onDeletePost,
}) => {
  const videoRef = useRef(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  const hasLiked = post.likes?.some(l => (l.userId?._id || l.userId) === userId);
  const isSaved = post.savedBy?.includes(userId);
  const comments = post.comments || [];
  const isPostAuthor = (post.userId?._id || post.userId) === userId;

  const submit = () => {
    if (!commentText.trim()) return;
    onSubmitComment(post, commentText);
    setCommentText('');
  };

  return (
    <div className="pv-slide">
      <div className="pv-media">
        {isVideoPost(post) ? (
          <video
            ref={videoRef}
            src={post.media}
            muted
            loop
            playsInline
            preload="metadata"
            onClick={(e) => e.stopPropagation()}
          />
        ) : post.media ? (
          <img src={post.media} alt={post.text || 'Post'} />
        ) : (
          <div className="pv-text-only">{post.text}</div>
        )}
      </div>

      {/* Author row */}
      <button className="pv-author" onClick={() => onNavigateProfile(post.userId?._id)}>
        <img src={post.userId?.profilePicture || '/assets/default-avatar.svg'} alt="" className="pv-author-avatar" />
        <div className="text-start">
          <div className="pv-author-name">{post.userId?.userName || 'Anonymous'}</div>
          <div className="pv-author-time">{moment(post.createdAt).fromNow()}</div>
        </div>
      </button>

      {isPostAuthor && onDeletePost && (
        <button className="pv-delete-post" onClick={() => onDeletePost(post)} aria-label="Delete post">
          <FaTrash size={15} />
        </button>
      )}

      {/* Action rail */}
      <div className="pv-actions">
        <button className="pv-action-btn" onClick={() => onToggleLike(post)} aria-label={hasLiked ? 'Unlike' : 'Like'}>
          {hasLiked ? <FaHeart color="#ed4956" size={26} /> : <FaRegHeart size={26} />}
          <span>{post.likes?.length || 0}</span>
        </button>
        <button className="pv-action-btn" onClick={() => setShowComments(true)} aria-label="Comments">
          <FaComment size={24} />
          <span>{comments.length}</span>
        </button>
        <button className="pv-action-btn" onClick={() => onShare(post._id)} aria-label="Share">
          <FaPaperPlane size={22} />
        </button>
        <button className="pv-action-btn" onClick={() => onToggleSave(post)} aria-label={isSaved ? 'Unsave' : 'Save'}>
          {isSaved ? <FaBookmark size={22} /> : <FaRegBookmark size={22} />}
        </button>
      </div>

      {/* Caption */}
      {post.text && (
        <div className="pv-caption">
          <span className="fw-medium me-2">{post.userId?.userName}</span>{post.text}
        </div>
      )}

      {/* Comment sheet */}
      {showComments && (
        <div className="pv-comment-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="pv-comment-sheet-header">
            <span>Comments</span>
            <button className="pv-close-sheet" onClick={() => setShowComments(false)} aria-label="Close comments">
              <FaTimes />
            </button>
          </div>
          <div className="pv-comment-list">
            {comments.length === 0 && <div className="pv-no-comments">No comments yet.</div>}
            {comments.map((comment) => {
              const canDelete = (comment.userId?._id || comment.userId) === userId || isPostAuthor;
              return (
                <div key={comment._id} className="hb-comment-row small">
                  <img
                    src={comment.userId?.profilePicture || '/assets/default-avatar.svg'}
                    alt=""
                    className="hb-comment-avatar"
                  />
                  <div className="hb-comment-bubble">
                    <span className="fw-medium me-2">{comment.userId?.userName || 'Anonymous'}</span>
                    {comment.text}
                  </div>
                  {canDelete && (
                    <button
                      className="btn btn-sm hb-comment-delete text-danger"
                      aria-label="Delete comment"
                      onClick={() => onDeleteComment(post._id, comment._id)}
                    >
                      <FaTrash size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hb-comment-bar d-flex align-items-center m-2">
            <img src={currentUserAvatar || '/assets/default-avatar.svg'} alt="" className="hb-comment-avatar" />
            <input
              type="text"
              className="hb-comment-input"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              aria-label="Write a comment"
            />
            <button
              className={`hb-send-btn ${commentText.trim() ? 'active' : ''}`}
              onClick={submit}
              disabled={!commentText.trim()}
              aria-label="Post comment"
            >
              <FaPaperPlane size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

ViewerItem.displayName = 'ViewerItem';

// Full-screen tap-through viewer opened from the grid: plays the tapped
// post immediately, then continues into a vertically-scrollable feed of
// related content (same author first, then the rest of the user's feed).
const PostViewer = ({ initialPost, userId, currentUserAvatar, onClose, onNavigateProfile, onPostUpdated, onPostDeleted }) => {
  const [items, setItems] = useState([initialPost]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await getRelatedPosts(initialPost._id, nextPage);
      const newPosts = (data?.posts || []).filter(p => p._id !== initialPost._id);
      setItems(prev => {
        const existingIds = new Set(prev.map(p => p._id));
        return [...prev, ...newPosts.filter(p => !existingIds.has(p._id))];
      });
      setPage(nextPage);
      setHasMore(newPosts.length === RELATED_PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, initialPost._id]);

  // First page of related content, right after opening
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPost._id]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / el.clientHeight);
    if (index !== activeIndex) setActiveIndex(index);
    if (index >= items.length - 2) loadMore();
  };

  const updateItem = (postId, updater) => {
    setItems(prev => prev.map(p => {
      if (p._id !== postId) return p;
      const next = updater(p);
      onPostUpdated?.(next);
      return next;
    }));
  };

  const handleToggleLike = async (post) => {
    const isLiked = post.likes?.some(l => (l.userId?._id || l.userId) === userId);
    updateItem(post._id, p => isLiked
      ? { ...p, likes: p.likes.filter(l => (l.userId?._id || l.userId) !== userId) }
      : { ...p, likes: [...(p.likes || []), { userId: { _id: userId } }] });
    try {
      if (isLiked) await unlikePost(post._id);
      else await likePost(post._id);
    } catch {
      updateItem(post._id, () => post);
    }
  };

  const handleToggleSave = async (post) => {
    const isSaved = post.savedBy?.includes(userId);
    updateItem(post._id, p => ({
      ...p,
      savedBy: isSaved ? p.savedBy.filter(id => id !== userId) : [...(p.savedBy || []), userId],
    }));
    try {
      if (isSaved) await unsavePost(post._id);
      else await savePost(post._id);
    } catch {
      updateItem(post._id, () => post);
    }
  };

  const handleShare = async (postId) => {
    try { await sharePost(postId); } catch { /* non-critical */ }
  };

  const handleSubmitComment = async (post, text) => {
    try {
      const response = await addComment(post._id, text);
      updateItem(post._id, p => ({ ...p, comments: [...(p.comments || []), response?.comment] }));
    } catch { /* input already cleared locally; user can retry */ }
  };

  const handleDeleteComment = async (postId, commentId) => {
    updateItem(postId, p => ({ ...p, comments: (p.comments || []).filter(c => c._id !== commentId) }));
    try {
      await deleteComment(postId, commentId);
    } catch { /* non-critical drift; refreshed on next open */ }
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    try {
      await deletePost(post._id);
      onPostDeleted?.(post._id);
      setItems(prev => {
        const next = prev.filter(p => p._id !== post._id);
        if (next.length === 0) onClose();
        return next;
      });
      setActiveIndex(i => Math.min(i, Math.max(items.length - 2, 0)));
    } catch {
      window.alert('Could not delete post. Please try again.');
    }
  };

  return (
    <div className="pv-overlay" onClick={onClose}>
      <button className="pv-close" onClick={onClose} aria-label="Close viewer">
        <FaTimes size={20} />
      </button>
      <div className="pv-scroll" ref={containerRef} onScroll={handleScroll} onClick={(e) => e.stopPropagation()}>
        {items.map((post, index) => (
          <ViewerItem
            key={post._id}
            post={post}
            userId={userId}
            currentUserAvatar={currentUserAvatar}
            isActive={index === activeIndex}
            onNavigateProfile={onNavigateProfile}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onShare={handleShare}
            onSubmitComment={handleSubmitComment}
            onDeleteComment={handleDeleteComment}
            onDeletePost={handleDeletePost}
          />
        ))}
        {loadingMore && (
          <div className="pv-loading-more">
            <Spinner animation="border" size="sm" variant="light" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostViewer;
