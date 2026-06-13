import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import moment from 'moment';
import {
  FaHeart, FaRegHeart, FaComment, FaPaperPlane,
  FaBookmark, FaRegBookmark, FaEllipsisH, FaBell,
  FaHashtag, FaCalendarAlt, FaUser, FaHome, FaPlus,
} from 'react-icons/fa';
import { Spinner, Alert, Badge, Toast, ToastContainer } from 'react-bootstrap';

import {
  getUserPosts,
  getPostById,
  likePost,
  unlikePost,
  addComment,
  savePost,
  sharePost,
  getTrendingTopics,
  getEvents,
  createStory,
  getStories,
} from '../services/profileService';
import { createNotification, getNotifications, updateNotification } from '../services/notificationService';
import StoryCircle from '../components/StoryCircle';
import StoryViewer from '../components/StoryViewer';
import CreateStory from '../components/CreateStory';
import { ThemeContext } from '../contexts/ThemeContext';
import FriendSuggestion from '../components/FriendSuggestion';
import { UserContext } from '../contexts/UserContext';

// ---------------------------------------------------------------------------
// Sub-component: PostCard
// Isolated so HomePage doesn't re-render every card on unrelated state changes
// ---------------------------------------------------------------------------
const PostCard = React.memo(({ post, userId, theme, onLike, onComment, onSave, onShare, onNavigate }) => {
  const [commentText, setCommentText] = useState('');

  const hasLiked = post.likes?.some(l => (l.userId?._id || l.userId) === userId);
  const isSaved = post.savedBy?.includes(userId);

  const handleCommentKeyDown = (e) => {
    if (e.key === 'Enter') submitComment();
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post, commentText);
    setCommentText('');
  };

  return (
    <div
      className={`${theme.card} rounded-3 overflow-hidden shadow-sm`}
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
          <img
            src={post.userId?.profilePicture || '/assets/default-avatar.svg'}
            alt={`${post.userId?.userName}'s profile picture`}
            className="rounded-circle object-fit-cover"
            width="38"
            height="38"
            loading="lazy"
          />
          <div className="text-start">
            <div className="fw-bold small">{post.userId?.userName || 'Anonymous'}</div>
            <div className={theme.subtext} style={{ fontSize: '0.70rem' }}>{moment(post.createdAt).fromNow()}</div>
          </div>
        </button>
        <button
          className="btn btn-sm text-inherit"
          style={{ color: 'inherit' }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Post options"
        >
          <FaEllipsisH />
        </button>
      </div>

      {/* Image */}
      <div className="bg-black d-flex align-items-center justify-content-center" style={{ maxHeight: 500, overflow: 'hidden' }}>
        <img
          src={post.media}
          className="w-100 h-100 object-fit-contain"
          alt={post.text || 'Post image'}
          style={{ minHeight: 280, maxHeight: 500 }}
          loading="lazy"
        />
      </div>

      {/* Actions */}
      <div className="card-body py-2">
        <div className="d-flex justify-content-between mb-2">
          <div className="d-flex gap-1">
            <button
              className="btn btn-sm text-inherit"
              style={{ color: 'inherit' }}
              onClick={(e) => { e.stopPropagation(); onLike(post); }}
              aria-label={hasLiked ? 'Unlike post' : 'Like post'}
            >
              {hasLiked ? <FaHeart className="text-danger" size={18} /> : <FaRegHeart size={18} />}
            </button>
            <button
              className="btn btn-sm text-inherit"
              style={{ color: 'inherit' }}
              aria-label="Comment on post"
              onClick={(e) => { e.stopPropagation(); document.getElementById(`comment-${post._id}`)?.focus(); }}
            >
              <FaComment size={18} />
            </button>
            <button
              className="btn btn-sm text-inherit"
              style={{ color: 'inherit' }}
              aria-label="Share post"
              onClick={(e) => { e.stopPropagation(); onShare(post._id); }}
            >
              <FaPaperPlane size={18} />
            </button>
          </div>
          <button
            className="btn btn-sm text-inherit"
            style={{ color: 'inherit' }}
            aria-label={isSaved ? 'Unsave post' : 'Save post'}
            onClick={(e) => { e.stopPropagation(); onSave(post._id); }}
          >
            {isSaved ? <FaBookmark size={18} /> : <FaRegBookmark size={18} />}
          </button>
        </div>
        <div className="mb-1 fw-bold small">{post.likes?.length || 0} likes</div>
        <div className="small">
          <span className="fw-bold me-2">{post.userId?.userName}</span>{post.text}
        </div>
      </div>

      {/* Comment input */}
      <div
        className={`card-footer bg-transparent d-flex py-2 align-items-center border-top ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          id={`comment-${post._id}`}
          type="text"
          className={`${theme.input} form-control-sm`}
          placeholder="Add a comment…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={handleCommentKeyDown}
          aria-label="Write a comment"
        />
        <button
          className="btn btn-sm text-primary fw-semibold ms-2"
          onClick={submitComment}
          disabled={!commentText.trim()}
          aria-label="Post comment"
        >
          Post
        </button>
      </div>
    </div>
  );
});

PostCard.displayName = 'PostCard';

// ---------------------------------------------------------------------------
// Custom hooks
// ---------------------------------------------------------------------------

function usePosts(userId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserPosts(userId);
      setPosts(data?.posts || []);
    } catch {
      setError('Could not load your feed. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  const toggleSave = useCallback(async (postId) => {
    // Optimistic update
    setPosts(prev => prev.map(p => p._id === postId ? {
      ...p,
      savedBy: p.savedBy?.includes(userId)
        ? p.savedBy.filter(id => id !== userId)
        : [...(p.savedBy || []), userId],
    } : p));
    try {
      await savePost(postId);
    } catch {
      // Revert: refetch just this post
      refreshPost(postId, 'all');
    }
  }, [userId, refreshPost]);

  return { posts, setPosts, loading, error, fetchPosts, refreshPost, toggleLike, submitComment, toggleSave };
}

function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getNotifications(userId);
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch {
      // Non-critical
    }
  }, [userId]);

  const markRead = useCallback(async (notificationId) => {
    try {
      await updateNotification(notificationId, true);
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Non-critical
    }
  }, []);

  return { notifications, unreadCount, fetchNotifications, markRead };
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

  const createNewStory = useCallback(async (storyData, { socket, user, onSuccess }) => {
    setUploading(true);
    try {
      const data = await createStory(storyData);
      await fetchStories();
      onSuccess?.();
      if (data && socket) {
        socket.emit('emit_notification', {
          sender: userId,
          type: 'story',
          message: `${user?.userName || 'Someone'} added a story`,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    } catch {
      // Could add a toast here
    } finally {
      setUploading(false);
    }
  }, [userId, fetchStories]);

  return { storyGroups, setStoryGroups, uploading, fetchStories, createNewStory };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const HomePage = ({ socket }) => {
  const navigate = useNavigate();
  const { isDark } = useContext(ThemeContext);
  const { user } = useContext(UserContext);
  const userId = user?._id;

  const [searchTerm, setSearchTerm] = useState('');
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [toast, setToast] = useState(null);

  const { posts, setPosts, loading, error, fetchPosts, refreshPost, toggleLike, submitComment, toggleSave } = usePosts(userId);
  const { unreadCount, fetchNotifications, markRead } = useNotifications(userId);
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
    fetchNotifications();
    fetchStories();
  }, [userId, fetchPosts, fetchNotifications, fetchStories]);

  // Socket sync
  useEffect(() => {
    if (!socket) return;

    const handleSocketNotification = (data) => {
      fetchNotifications();
      if (data.type === 'comment' || data.type === 'like') {
        refreshPost(data.postId, data.type);
      }
      if (data.type === 'story') {
        fetchStories();
      }
    };

    socket.on('got_a_notification', handleSocketNotification);
    return () => socket.off('got_a_notification', handleSocketNotification);
  }, [socket, fetchNotifications, refreshPost, fetchStories]);

  // Filtered feed — memoised
  const filteredPosts = useMemo(() =>
    posts.filter(post =>
      post?.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post?.userId?.userName?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [posts, searchTerm]);

  // Theme — memoised so it doesn't rebuild every render
  const theme = useMemo(() => ({
    bg: isDark ? ' text-light' : 'bg-light text-dark',
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
    createNewStory(storyData, {
      socket,
      user,
      onSuccess: () => setShowCreateStory(false),
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
            <div className={`${theme.card} p-3 `}>
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

            {/* Search */}


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
              <div className={`${theme.card} p-5 text-center rounded-3`}>
                <h5>Nothing here yet.</h5>
                <p className={theme.subtext}>Follow more people or search for something.</p>
              </div>
            ) : (
              <div className="d-flex flex-column">
                {filteredPosts.map(post => (
                  <PostCard
                    key={post._id}
                    post={post}
                    userId={userId}
                    theme={theme}
                    onLike={toggleLike}
                    onComment={submitComment}
                    onSave={toggleSave}
                    onShare={handleShare}
                    onNavigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ===== RIGHT RAIL ===== */}
          <div className="col-lg-3 d-none d-lg-block position-sticky" style={{ top: 80, height: 'fit-content' }}>
           
              <FriendSuggestion theme={theme} />
         

            <div className={`${theme.card} p-3 rounded-3 mb-4`}>
              <h2 className="h6 mb-3 d-flex align-items-center gap-2">
                <FaHashtag className="text-primary" aria-hidden="true" /> Trending
              </h2>
              <p className={`small ${theme.subtext} m-0`}>No trending topics right now.</p>
            </div>

            <div className={`${theme.card} p-3 rounded-3`}>
              <h2 className="h6 mb-3 d-flex align-items-center gap-2">
                <FaCalendarAlt className="text-primary" aria-hidden="true" /> Events
              </h2>
              <p className={`small ${theme.subtext} m-0`}>No upcoming events.</p>
            </div>
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
      />
    </div>
  );
};

export default HomePage;