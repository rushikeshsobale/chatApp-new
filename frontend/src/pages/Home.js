import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/homeFeed.css';
import moment from 'moment';
import {
  FaHeart, FaRegHeart, FaComment, FaPaperPlane,
  FaBookmark, FaRegBookmark, FaEllipsisH, FaBell,
  FaUser, FaHome, FaPlus, FaTrash,
  FaTh, FaStream, FaPlay, FaSearch, FaUserFriends,
} from 'react-icons/fa';
import { Spinner, Alert, Badge, Toast, ToastContainer } from 'react-bootstrap';

import {
  getFeed,
  getRelatedPosts,
  getPostById,
  likePost,
  unlikePost,
  addComment,
  deleteComment,
  savePost,
  unsavePost,
  sharePost,
  createStory,
  getStories,
} from '../services/profileService';
import { selectUnreadNotificationCount } from '../store/notificationSlice';
import StoryCircle from '../components/StoryCircle';
import StoryViewer from '../components/StoryViewer';
import CreateStory from '../components/CreateStory';
import PostViewer from '../components/PostViewer';
import { ThemeContext } from '../contexts/ThemeContext';
import FriendSuggestion from '../components/FriendSuggestion';
import { UserContext } from '../contexts/UserContext';

// Older posts predate the mediaType field, so fall back to sniffing the
// file extension off the (signed) media url.
const isVideoPost = (post) =>
  post.mediaType ? post.mediaType === 'video' : /\.(mp4|mov|webm|ogg)(\?|$)/i.test(post.media || '');

// ---------------------------------------------------------------------------
// Sub-component: PostCard
// Isolated so HomePage doesn't re-render every card on unrelated state changes
// ---------------------------------------------------------------------------
const PostCard = React.memo(({ post, userId, currentUserAvatar, theme, onLike, onComment, onDeleteComment, onSave, onShare, onNavigate }) => {
  const [commentText, setCommentText] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);

  const hasLiked = post.likes?.some(l => (l.userId?._id || l.userId) === userId);
  const isSaved = post.savedBy?.includes(userId);
  const comments = post.comments || [];
  const isPostAuthor = (post.userId?._id || post.userId) === userId;

  const handleCommentKeyDown = (e) => {
    if (e.key === 'Enter') submitComment();
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post, commentText);
    setCommentText('');
  };

  const toggleCommentBox = () => {
    setShowCommentBox(prev => !prev);
  };

  return (
    <div
      className={`${theme.card} hb-post-card rounded-4 overflow-hidden shadow-sm`}
      onClick={() => onNavigate(`/postDetails/${post._id}`)}
      style={{ cursor: 'pointer' }}
      role="article"
      aria-label={`Post by ${post.userId?.userName || 'Anonymous'}`}
    >
      {/* Header */}
      <div className={`card-header d-flex align-items-center justify-content-between bg-transparent py-2 border-bottom ${theme.border}`}>
        <button
          className="btn btn-text p-0 d-flex align-items-center gap-2 text-inherit"
          style={{ color: 'inherit' }}
          onClick={(e) => { e.stopPropagation(); onNavigate(`/ProfilePage/${post.userId?._id}`); }}
          aria-label={`Go to ${post.userId?.userName}'s profile`}
        >
          <span className="hb-avatar-ring">
            <img
              src={post.userId?.profilePicture || '/assets/default-avatar.svg'}
              alt={`${post.userId?.userName}'s profile picture`}
              className="rounded-circle object-fit-cover"
              width="36"
              height="36"
              loading="lazy"
            />
          </span>
          <div className="text-start">
            <div className="fw-bold small">{post.userId?.userName || 'Anonymous'}</div>
            <div className={theme.subtext} style={{ fontSize: '0.70rem' }}>{moment(post.createdAt).fromNow()}</div>
          </div>
        </button>
        <button
          className="btn btn-sm text-inherit hb-icon-btn"
          style={{ color: 'inherit', width: 32, height: 32 }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Post options"
        >
          <FaEllipsisH size={15} />
        </button>
      </div>

      {/* Media */}
      {post.media && (
        <div className="hb-post-media d-flex align-items-center justify-content-center" style={{ maxHeight: 500, overflow: 'hidden' }}>
          {isVideoPost(post) ? (
            <video
              src={post.media}
              className="w-100 h-100 object-fit-contain"
              style={{ minHeight: 280, maxHeight: 500 }}
              controls
              playsInline
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={post.media}
              className="w-100 h-100 object-fit-contain"
              alt={post.text || 'Post image'}
              style={{ minHeight: 280, maxHeight: 500 }}
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <div className="d-flex gap-1">
            <button
              className={`btn btn-sm text-inherit hb-icon-btn ${hasLiked ? 'liked' : ''}`}
              style={{ color: 'inherit' }}
              onClick={(e) => { e.stopPropagation(); onLike(post); }}
              aria-label={hasLiked ? 'Unlike post' : 'Like post'}
            >
              {hasLiked ? <FaHeart className="text-danger" size={19} /> : <FaRegHeart size={19} />}
            </button>
            <button
              className="btn btn-sm text-inherit hb-icon-btn"
              style={{ color: 'inherit' }}
              aria-label={showCommentBox ? 'Hide comment box' : 'Comment on post'}
              onClick={(e) => { e.stopPropagation(); toggleCommentBox(); }}
            >
              <FaComment size={19} />
            </button>
            <button
              className="btn btn-sm text-inherit hb-icon-btn"
              style={{ color: 'inherit' }}
              aria-label="Share post"
              onClick={(e) => { e.stopPropagation(); onShare(post._id); }}
            >
              <FaPaperPlane size={18} />
            </button>
          </div>
          <button
            className="btn btn-sm text-inherit hb-icon-btn"
            style={{ color: 'inherit' }}
            aria-label={isSaved ? 'Unsave post' : 'Save post'}
            onClick={(e) => { e.stopPropagation(); onSave(post); }}
          >
            {isSaved ? <FaBookmark size={18} /> : <FaRegBookmark size={18} />}
          </button>
        </div>
        <div className={`mb-1 small ${theme.subtext}`}>
          {post.likes?.length || 0} likes
          {comments.length > 0 && <> &middot; {comments.length} comment{comments.length === 1 ? '' : 's'}</>}
        </div>
        {post.text && (
          <div className="small">
            <span className="fw-medium me-2">{post.userId?.userName}</span>{post.text}
          </div>
        )}
      </div>

      {/* Comments preview */}
      {comments.length > 0 && (
        <div
          className={`hb-comments px-3 pb-2 border-top ${theme.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          {comments.length > 2 && (
            <button
              className="btn btn-sm hb-view-comments mt-2"
              onClick={() => onNavigate(`/postDetails/${post._id}`)}
            >
              View all {comments.length} comments
            </button>
          )}
          {comments.slice(-2).map((comment) => {
            const canDelete = (comment.userId?._id || comment.userId) === userId || isPostAuthor;
            return (
              <div key={comment._id} className="hb-comment-row small">
                <img
                  src={comment.userId?.profilePicture || '/assets/default-avatar.svg'}
                  alt=""
                  className="hb-comment-avatar"
                  loading="lazy"
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
      )}

      {/* Comment input */}
      {showCommentBox && (
        <div
          className={`card-footer bg-transparent py-2 border-top ${theme.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="hb-comment-bar d-flex align-items-center">
            <img
              src={currentUserAvatar || '/assets/default-avatar.svg'}
              alt=""
              className="hb-comment-avatar"
            />
            <input
              id={`comment-${post._id}`}
              type="text"
              className="hb-comment-input"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleCommentKeyDown}
              aria-label="Write a comment"
              autoFocus
            />
            <button
              className={`hb-send-btn ${commentText.trim() ? 'active' : ''}`}
              onClick={submitComment}
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

PostCard.displayName = 'PostCard';

// ---------------------------------------------------------------------------
// Custom hooks
// ---------------------------------------------------------------------------

const FEED_PAGE_SIZE = 20;

function usePosts(userId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFeed(1);
      const firstPage = data?.posts || [];
      setPosts(firstPage);
      setPage(1);
      setHasMore(firstPage.length === FEED_PAGE_SIZE);
    } catch {
      setError('Could not load your feed. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchMorePosts = useCallback(async () => {
    if (!userId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await getFeed(nextPage);
      const newPosts = data?.posts || [];
      setPosts(prev => [...prev, ...newPosts]);
      setPage(nextPage);
      setHasMore(newPosts.length === FEED_PAGE_SIZE);
    } catch {
      // Non-critical — user can retry via the button
    } finally {
      setLoadingMore(false);
    }
  }, [userId, page, loadingMore, hasMore]);

  // Sync a single post from the server (e.g. after a socket event)
  const refreshPost = useCallback(async (postId, field) => {
    try {
      const response = await getPostById(postId);
      const updated = response?.post;
      if (!updated) return;
      setPosts(prev => prev.map(p => p._id === updated._id
        ? field === 'comments' ? { ...p, comments: updated.comments }
          : field === 'likes' ? { ...p, likes: updated.likes }
            : updated
        : p
      ));
    } catch {
      // Non-critical — feed is still usable
    }
  }, []);

  const toggleLike = useCallback(async (post) => {
    const postId = post._id;
    const isLiked = post.likes?.some(l => (l.userId?._id || l.userId) === userId);
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p._id !== postId) return p;
      return isLiked
        ? { ...p, likes: p.likes.filter(l => (l.userId?._id || l.userId) !== userId) }
        : { ...p, likes: [...(p.likes || []), { userId: { _id: userId } }] };
    }));
    try {
      if (isLiked) await unlikePost(postId);
      else await likePost(postId);
    } catch {
      // Revert on failure
      setPosts(prev => prev.map(p => p._id === postId ? post : p));
    }
  }, [userId]);

  const submitComment = useCallback(async (post, text) => {
    const postId = post._id;
    try {
      const response = await addComment(postId, text);
      setPosts(prev => prev.map(p =>
        p._id === postId
          ? { ...p, comments: [...(p.comments || []), response?.comment] }
          : p
      ));
    } catch {
      // Comment failed — input is already cleared locally so user can retry
    }
  }, []);

  const removeComment = useCallback(async (postId, commentId) => {
    // Optimistic update
    setPosts(prev => prev.map(p => p._id === postId
      ? { ...p, comments: (p.comments || []).filter(c => c._id !== commentId) }
      : p
    ));
    try {
      await deleteComment(postId, commentId);
    } catch {
      // Revert: refetch just this post
      refreshPost(postId, 'all');
    }
  }, [refreshPost]);

  const toggleSave = useCallback(async (post) => {
    const postId = post._id;
    const isSaved = post.savedBy?.includes(userId);
    // Optimistic update
    setPosts(prev => prev.map(p => p._id === postId ? {
      ...p,
      savedBy: isSaved
        ? p.savedBy.filter(id => id !== userId)
        : [...(p.savedBy || []), userId],
    } : p));
    try {
      if (isSaved) await unsavePost(postId);
      else await savePost(postId);
    } catch {
      // Revert: refetch just this post
      refreshPost(postId, 'all');
    }
  }, [userId, refreshPost]);

  return { posts, setPosts, loading, loadingMore, hasMore, error, fetchPosts, fetchMorePosts, refreshPost, toggleLike, submitComment, removeComment, toggleSave };
}

function useStories(userId) {
  const [storyGroups, setStoryGroups] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchStories = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getStories(userId);
      setStoryGroups(data?.stories || data || []);
    } catch {
      // Non-critical
    }
  }, [userId]);

  const createNewStory = useCallback(async (storyData, { onSuccess, onError } = {}) => {
    setUploading(true);
    try {
      await createStory(storyData);
      await fetchStories();
      onSuccess?.();
    } catch {
      onError?.();
    } finally {
      setUploading(false);
      
    }
  }, [fetchStories]);

  return { storyGroups, setStoryGroups, uploading, fetchStories, createNewStory };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const HomePage = () => {
  const navigate = useNavigate();
  const { isDark } = useContext(ThemeContext);
  const { user, socket } = useContext(UserContext);
  const userId = user?._id;
  const unreadCount = useSelector(selectUnreadNotificationCount);

  const [searchTerm, setSearchTerm] = useState('');
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [storyError, setStoryError] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'feed'
  const [viewerPost, setViewerPost] = useState(null);

  const { posts, setPosts, loading, loadingMore, hasMore, error, fetchPosts, fetchMorePosts, refreshPost, toggleLike, submitComment, removeComment, toggleSave } = usePosts(userId);
  const { storyGroups, setStoryGroups, uploading, fetchStories, createNewStory } = useStories(userId);

  // Auth guard
  useEffect(() => {
    const loggedIn = JSON.parse(localStorage.getItem('user'));
    if (!loggedIn) navigate('/login');
  }, [navigate]);

  // Initial data load
  useEffect(() => {
    if (!userId) return;
    fetchPosts();
    fetchStories();
  }, [userId, fetchPosts, fetchStories]);

  // A live "like"/"comment" notification means that post's data changed
  // under us — refresh just that post. The notification itself is already
  // handled globally (UserContext dispatches it into Redux).
  useEffect(() => {
    if (!socket) return;

    const handleSocketNotification = (data) => {
      if (data.type === 'comment' || data.type === 'like') {
        refreshPost(data.post, data.type);
      }
    };

    socket.on('got_a_notification', handleSocketNotification);
    return () => socket.off('got_a_notification', handleSocketNotification);
  }, [socket, refreshPost]);

  // Filtered feed — memoised
  const filteredPosts = useMemo(() =>
    posts.filter(post =>
      post?.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post?.userId?.userName?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [posts, searchTerm]);

  // Theme — memoised so it doesn't rebuild every render
  const theme = useMemo(() => ({
    bg: isDark ? 'bg-black text-light' : 'bg-light text-dark',
    card: isDark ? '  border-secondary  text-light' : 'card bg-white border-light-subtle  text-dark',
    border: isDark ? 'border-secondary' : 'border-light-subtle',
    input: isDark ? 'form-control bg-dark border-secondary text-light shadow-none' : 'form-control bg-white border-light-subtle text-dark shadow-none',
    subtext: isDark ? 'text-muted' : 'text-secondary',
    stickyTopNav: isDark ? 'bg-black border-bottom border-secondary' : 'bg-white border-bottom border-light-subtle',
  }), [isDark]);

  const handleStoryClick = (group) => {
    setSelectedStoryGroup(group);
    setShowStoryViewer(true);
  };

  const handleCreateStory = (storyData) => {
    setStoryError(null);
    createNewStory(storyData, {
      onSuccess: () => setShowCreateStory(false),
      onError: () => setStoryError('Could not upload story. Please try again.'),
    });
  };

  const showToast = (message, variant = 'success') => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 2500);
  };

  const handleShare = async (postId) => {
    try {
      await sharePost(postId);
      showToast('Post shared!');
    } catch {
      showToast('Could not share post.', 'danger');
    }
  };

  return (
    <div className={` ${theme.bg} m-1`}>
      {/* Toast notifications */}
      <ToastContainer position="bottom-center" className="mb-3">
        {toast && (
          <Toast bg={toast.variant} autohide delay={2500} onClose={() => setToast(null)}>
            <Toast.Body className="text-white fw-semibold text-center">{toast.message}</Toast.Body>
          </Toast>
        )}
      </ToastContainer>
        <div className="  row mx-0 ">
          {/* ===== LEFT RAIL ===== */}
          <div className="col-lg-3 d-none d-lg-block position-sticky" style={{ top: 80, height: 'fit-content' }}>
            <div className={`${theme.card} p-3 rounded-3`}>
              <div className="d-flex flex-column gap-2">
                <button
                  className="btn btn-text text-start d-flex align-items-center gap-3 py-2 px-3 rounded fw-bold text-inherit"
                  style={{ color: 'inherit' }}
                  onClick={() => navigate('/')}
                  aria-current="page"
                >
                  <FaHome className="text-primary" size={18} /> Home
                </button>
                <button
                  className="btn btn-text text-start d-flex align-items-center gap-3 py-2 px-3 rounded text-inherit"
                  style={{ color: 'inherit' }}
                  onClick={() => navigate(`/ProfilePage/${userId}`)}
                >
                  <FaUser size={18} /> Profile
                </button>
                <button
                  className="btn btn-text text-start d-flex align-items-center gap-3 py-2 px-3 rounded text-inherit position-relative"
                  style={{ color: 'inherit' }}
                  onClick={() => navigate('/notifications')}
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                  <FaBell size={18} /> Notifications
                  {unreadCount > 0 && (
                    <Badge bg="danger" className="ms-auto">{unreadCount}</Badge>
                  )}
                </button>
              </div>
              <hr className={theme.border} />
              <div className="px-3 py-1">
                <small className={theme.subtext}>
                  Logged in as <b className="text-inherit">{user?.userName}</b>
                </small>
              </div>
            </div>
          </div>

          {/* ===== CENTER RAIL ===== */}
          <div className="col-12 mx-auto col-md-8 col-lg-6 p-0">

            {/* Story rail */}
            <div className={`${theme.card} p-3 m-1`}>
              <div
                className="d-flex  overflow-auto pb-1 align-items-center"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                role="region"
                aria-label="Stories"
              >
                {/* Your story button */}
                <div className="flex-shrink-0 text-center" style={{ width: 68 }}>
                  <button
                    className="btn p-0 position-relative mx-auto mb-1 rounded-circle d-flex align-items-center justify-content-center border border-2 border-secondary"
                    style={{ width: 56, height: 56, background: '#222' }}
                    onClick={() => setShowCreateStory(true)}
                    aria-label="Add your story"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Spinner animation="border" size="sm" variant="primary" />
                    ) : (
                      <>
                        <img
                          src={user?.profilePicture || '/assets/default-avatar.svg'}
                          className="rounded-circle object-fit-cover w-100 h-100 opacity-50"
                          alt="Your avatar"
                        />
                        <span
                          className="position-absolute top-50 start-50 translate-middle bg-primary rounded-circle d-flex align-items-center justify-content-center border border-2 border-black"
                          style={{ width: 22, height: 22 }}
                          aria-hidden="true"
                        >
                          <FaPlus size={10} className="text-white" />
                        </span>
                      </>
                    )}
                  </button>
                  <div
                    className="text-truncate px-1 fw-medium"
                    style={{ fontSize: '0.72rem', color: isDark ? '#aaa' : '#555' }}
                  >
                    Your story
                  </div>
                </div>

                {/* Other users' stories */}
                {storyGroups.map((group) => (
                  <div key={group.user?._id} className="flex-shrink-0">
                    <StoryCircle group={group} userId={userId} onClick={handleStoryClick} />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile friend suggestions */}
            <div className="d-block d-md-none mt-2">
              <FriendSuggestion theme={theme} />
            </div>

            {/* View toggle */}
            <div className="d-flex justify-content-end gap-1 mb-2 px-1">
              <button
                className={`btn btn-sm hb-view-toggle ${viewMode === 'grid' ? 'active' : ''} ${theme.subtext}`}
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
              >
                <FaTh size={14} />
              </button>
              <button
                className={`btn btn-sm hb-view-toggle ${viewMode === 'feed' ? 'active' : ''} ${theme.subtext}`}
                onClick={() => setViewMode('feed')}
                aria-pressed={viewMode === 'feed'}
                aria-label="Feed view"
              >
                <FaStream size={14} />
              </button>
            </div>

            {/* Feed */}
            {loading && filteredPosts.length === 0 ? (
              <div className="d-flex justify-content-center my-5">
                <Spinner animation="border" variant={isDark ? 'light' : 'dark'} />
              </div>
            ) : error ? (
              <Alert variant="danger" className="text-center">
                {error}
                <button className="btn btn-sm btn-outline-danger ms-3" onClick={fetchPosts}>Retry</button>
              </Alert>
            ) : filteredPosts.length === 0 ? (
              <div className={`${theme.card} p-5 text-center rounded-4 hb-empty-state`}>
                {searchTerm ? (
                  <>
                    <span className="hb-empty-icon"><FaSearch /></span>
                    <h5 className="mb-1">No results for &ldquo;{searchTerm}&rdquo;</h5>
                    <p className={theme.subtext}>Try a different name or keyword.</p>
                    <button
                      className="btn btn-sm btn-outline-secondary hb-load-more mt-1"
                      onClick={() => setSearchTerm('')}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <span className="hb-empty-icon"><FaUserFriends /></span>
                    <h5 className="mb-1">Your feed is quiet</h5>
                    <p className={theme.subtext}>Follow more people to see their posts show up here.</p>
                    <button className="btn btn-primary btn-sm mt-2" onClick={() => navigate('/explore')}>
                      Discover people
                    </button>
                  </>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="d-flex flex-column">
                <div className="hb-grid">
                  {filteredPosts.filter(p => p.media).map(post => (
                    <div
                      key={post._id}
                      className="hb-grid-tile"
                      onClick={() => setViewerPost(post)}
                      role="button"
                      aria-label={`Open post by ${post.userId?.userName || 'Anonymous'}`}
                    >
                      {isVideoPost(post) ? (
                        <video src={post.media} muted preload="metadata" />
                      ) : (
                        <img src={post.media} alt={post.text || 'Post'} loading="lazy" />
                      )}
                      {isVideoPost(post) && (
                        <span className="hb-grid-video-badge"><FaPlay size={12} /></span>
                      )}
                      <div className="hb-grid-overlay">
                        <span><FaHeart size={13} /> {post.likes?.length || 0}</span>
                        <span><FaComment size={13} /> {post.comments?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      className="btn btn-outline-secondary btn-sm hb-load-more"
                      onClick={fetchMorePosts}
                      disabled={loadingMore}
                    >
                      {loadingMore ? <Spinner animation="border" size="sm" /> : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="d-flex flex-column">
                {filteredPosts.map(post => (
                  <PostCard
                    key={post._id}
                    post={post}
                    userId={userId}
                    currentUserAvatar={user?.profilePicture}
                    theme={theme}
                    onLike={toggleLike}
                    onComment={submitComment}
                    onDeleteComment={removeComment}
                    onSave={toggleSave}
                    onShare={handleShare}
                    onNavigate={navigate}
                  />
                ))}
                {hasMore && (
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      className="btn btn-outline-secondary btn-sm hb-load-more"
                      onClick={fetchMorePosts}
                      disabled={loadingMore}
                    >
                      {loadingMore ? <Spinner animation="border" size="sm" /> : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== RIGHT RAIL ===== */}
          <div className="col-lg-3 d-none d-lg-block position-sticky" style={{ top: 80, height: 'fit-content' }}>

              <FriendSuggestion theme={theme} />
          </div>

        </div>
   

      {/* Story viewer overlay */}
      <StoryViewer
        show={showStoryViewer}
        onHide={() => setShowStoryViewer(false)}
        storyGroups={storyGroups}
        setStoryGroups={setStoryGroups}
        initialGroup={selectedStoryGroup}
      />

      {/* Create story modal */}
      <CreateStory
        show={showCreateStory}
        onHide={() => setShowCreateStory(false)}
        onCreateStory={handleCreateStory}
        isSubmitting={uploading}
        error={storyError}
        currentUser={user}
      />

      {/* Full-screen post viewer (grid tap-through) */}
      {viewerPost && (
        <PostViewer
          initialPost={viewerPost}
          userId={userId}
          currentUserAvatar={user?.profilePicture}
          onClose={() => setViewerPost(null)}
          onNavigateProfile={(uid) => { setViewerPost(null); navigate(`/ProfilePage/${uid}`); }}
          onPostUpdated={(updated) => setPosts(prev => prev.map(p => p._id === updated._id ? { ...p, ...updated } : p))}
          onPostDeleted={(postId) => setPosts(prev => prev.filter(p => p._id !== postId))}
        />
      )}
    </div>
  );
};

export default HomePage;