import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import moment from "moment";
import { 
  FaHeart, FaRegHeart, FaComment, FaPaperPlane, 
  FaBookmark, FaRegBookmark, FaEllipsisH, FaBell, 
  FaHashtag, FaCalendarAlt, FaUser, FaHome, FaPlus 
} from 'react-icons/fa';
import { Spinner, Alert, Badge } from 'react-bootstrap';

// Custom API Client Abstractions
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
  createStory, // ADDED: Imported your story creation engine
  getStories   // ADDED: Assuming your story fetch function is here
} from '../services/profileService'; 
import { createNotification, getNotifications, updateNotification } from "../services/notificationService";
import StoryCircle from '../components/StoryCircle';
import StoryViewer from '../components/StoryViewer';
import CreateStory from '../components/CreateStory';
import { ThemeContext } from '../contexts/ThemeContext';
const HomePage = ({  socket }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null); // ADDED: Reference for quick story image upload
  const { isDark } = useContext(ThemeContext);
  // --- Core Layout States ---
  const [posts, setPosts] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // --- UI Action States ---
  const [loading, setLoading] = useState(false);
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [error, setError] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // --- Stories UI States ---
  const [storyGroups, setStoryGroups] = useState([]); 
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [uploadingStory, setUploadingStory] = useState(false); // ADDED: Loading spinner for story upload
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  // Local User Setup
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const userId = currentUser?._id || currentUser?.userId;

  // --- 1. Initial Data Pipeline Aggregation ---
  useEffect(() => {
    if (!userId) return;
    
    fetchFeedPosts();
    fetchWidgetData();
    fetchNotifications();
    fetchStoriesData(); // FIXED: Loading stories instead of resetting to empty array
  }, [userId]);

  // --- 2. Live Socket Notification and Data Synchronization ---
  useEffect(() => {
    if (!socket) return;

    const handleLiveNotification = (data) => {
      fetchNotifications();
      if (data.type === 'comment' || data.type === 'like') {
        syncPostState(data.postId, data.type);
      }
      // Re-fetch stories if someone else adds one
      if (data.type === 'story') {
        fetchStoriesData();
      }
    };

    socket.on('got_a_notification', handleLiveNotification);

    return () => {
      socket.off('got_a_notification', handleLiveNotification);
    };
  }, [socket]);

  // --- 3. Core API Invocation Drivers ---

  const fetchStoriesData = async () => {
    try {
      const data = await getStories(userId);
   
      setStoryGroups(data?.stories || data || []);
    } catch (err) {
      console.error("Error loading home feed story groups:", err);
    }
  };

  const fetchFeedPosts = async () => {
    setLoading(true);
    try {
      const data = await getUserPosts(userId);
      setPosts(data?.posts || []);
    } catch (err) {
      console.error("Error reading post stream:", err);
      setError("Unable to update timeline feed at this time.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWidgetData = async () => {
    // setLoadingWidgets(true);
    // try {
    //   const [topicsData, eventsData] = await Promise.all([
    //     getTrendingTopics(),
    //     getEvents()
    //   ]);
    //   setTrendingTopics(topicsData?.topics || []);
    //   setEvents(eventsData?.events || []);
    // } catch (err) {
    //   console.error("Error processing auxiliary sidebar assets:", err);
    // } finally {
    //   setLoadingWidgets(false);
    // }
  };

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications(userId);
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (err) {
      console.error("Error processing system notifications:", err);
    }
  };

  const syncPostState = async (postId, dataType) => {
    try {
      const response = await getPostById(postId);
      const targetPost = response?.post;
      if (!targetPost) return;

      setPosts(prev => prev?.map(p => {
        if (p._id !== targetPost._id) return p;
        if (dataType === "comment") return { ...p, comments: targetPost.comments };
        if (dataType === "like") return { ...p, likes: targetPost.likes };
        return { ...targetPost };
      }));
    } catch (err) {
      console.error("Error patching live modification parameters:", err);
    }
  };

  // --- 4. Engagement Click Handlers ---

  // ADDED: Wired up your handleCreateStory function with socket emitters
 const handleCreateStory = async (storyData) => {
  const { media, caption } = storyData;
  setUploadingStory(true);
  try {
    // Pack the raw modal values into the FormData payload your backend expects
    const data = await createStory(storyData); 
    // Refresh the story timeline UI array
    fetchStoriesData();
    setShowCreateStoryModal(false); // Close the modal on success 
    const notificationData = {
      sender: userId,
      type: 'story',
      message: `${currentUser?.userName || 'Someone'} has added a story`,
      createdAt: new Date().toISOString(),
      read: false
    };
    if (data && socket) {
      socket.emit('emit_notification', notificationData);
    }
  } catch (error) {
    console.error('Error creating story:', error);
  } finally {
    setUploadingStory(false);
  }
};
  // Quick file selector processing event
 

  const handleStoryClick = (group) => {
    setSelectedStoryGroup(group);
    setShowStoryViewer(true);
  };

  const handleToggleLike = async (post) => {
    const postId = post._id;
    const isLiked = post.likes?.some(l => (l.userId?._id || l.userId) === userId);

    try {
      if (isLiked) {
        await unlikePost(postId);
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: p.likes.filter(l => (l.userId?._id || l.userId) !== userId) } : p));
      } else {
        await likePost(postId);
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: [...(p.likes || []), { userId: { _id: userId } }] } : p));
      }
    } catch (err) {
      console.error("Failed to alter target preference metric:", err);
    }
  };

  const handleAddComment = async (post) => {
    const postId = post._id;
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    try {
      const response = await addComment(postId, commentText);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: [...(p.comments || []), response?.comment] } : p));
    } catch (err) {
      console.error("Failed to inject comment modification structural element:", err);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await updateNotification(notificationId, true);
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to update notification state configuration:", err);
    }
  };

  const handleSavePostAction = async (postId, e) => {
    e.stopPropagation();
    try {
      await savePost(postId);
      setPosts(prev => prev.map(p => p._id === postId ? {
        ...p, savedBy: p.savedBy?.includes(userId) ? p.savedBy.filter(id => id !== userId) : [...(p.savedBy || []), userId]
      } : p));
    } catch (err) {
      console.error("Failed to bind target content reference state:", err);
    }
  };

  // --- 5. Interactive Searching Filter Logic ---
  const filteredPosts = posts?.filter(post =>
    post?.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post?.userId?.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Style Theme Configurations Mapping Block
  const theme = {
    bg: isDark ? "bg-dark text-light" : "bg-light text-dark",
    card: isDark ? "card bg-black border-secondary mb-4 text-light" : "card bg-white border-light-subtle mb-4 text-dark",
    border: isDark ? "border-secondary" : "border-light-subtle",
    input: isDark ? "form-control bg-dark border-secondary text-light shadow-none" : "form-control bg-white border-light-subtle text-dark shadow-none",
    subtext: isDark ? "text-muted" : "text-secondary",
    stickyTopNav: isDark ? "bg-black border-bottom border-secondary" : "bg-white border-bottom border-light-subtle"
  };

  return (
    <div className={`home-page-layout min-vh-100 ${theme.bg}`}>
      
      {/* Hidden file selector node for processing images quickly */}
     

      {/* Dynamic Global Top Navigation Bar */}
      <nav className={`d-flex align-items-center justify-content-between px-4 py-2 sticky-top ${theme.stickyTopNav}`} style={{ zIndex: 1020 }}>
        <h4 className="m-0 fw-extrabold text-primary tracking-tight pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          HiBuddy
        </h4>
        <div style={{ maxWidth: "320px" }} className="w-100 d-none d-md-block">
          <input 
            type="text" 
            className={`${theme.input} form-control-sm rounded-pill px-3`} 
            placeholder="Search posts or creators..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="d-flex align-items-center gap-3">
          <button className="btn p-0 position-relative text-inherit" style={{ color: "inherit" }} onClick={() => navigate('/notifications')}>
            <FaBell size={20} />
            {unreadCount > 0 && (
              <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle style={{ fontSize: '0.6rem' }}">
                {unreadCount}
              </Badge>
            )}
          </button>
          <img 
            src={currentUser?.profilePicture || "https://via.placeholder.com/35"} 
            className="rounded-circle object-fit-cover pointer" 
            width="35" height="35" 
            onClick={() => navigate(`/ProfilePage/${userId}`)}
            alt="Current profile view"
          />
        </div>
      </nav>

      {/* Main Structural Three Column Grid Component Wrapper */}
      <div className="container-fluid px-2 px-md-4 py-3">
        <div className="row mx-0 g-4">
          
          {/* ================= LEFT RAIL: NAVIGATION CONTROLS ================= */}
          <div className="col-lg-3 d-none d-lg-block position-sticky" style={{ top: '80px', height: 'fit-content' }}>
            <div className={`${theme.card} p-3 rounded-3`}>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-text text-start d-flex align-items-center gap-3 py-2 px-3 rounded text-inherit fw-bold" style={{ color: "inherit" }} onClick={() => navigate('/')}>
                  <FaHome className="text-primary" size={18} /> Home
                </button>
                <button className="btn btn-text text-start d-flex align-items-center gap-3 py-2 px-3 rounded text-inherit" style={{ color: "inherit" }} onClick={() => navigate(`/ProfilePage/${userId}`)}>
                  <FaUser size={18} /> Profile
                </button>
                <button className="btn btn-text text-start d-flex align-items-center gap-3 py-2 px-3 rounded text-inherit position-relative" style={{ color: "inherit" }} onClick={() => navigate('/notifications')}>
                  <FaBell size={18} /> Notifications
                  {unreadCount > 0 && <Badge bg="danger" className="ms-auto">{unreadCount}</Badge>}
                </button>
              </div>
              <hr className={theme.border} />
              <div className="px-3 py-1">
                <small className={theme.subtext}>Logged in as <b className="text-inherit">{currentUser?.userName}</b></small>
              </div>
            </div>
          </div>

          {/* ================= CENTER RAIL: ACTIVE FEED TIMELINE ================= */}
          <div className="col-12 mx-auto col-md-8 col-lg-6">
            
            {/* Story Groups Horizontal Line Container Component */}
            {/* CHANGED: Always show container so user can view the "Create Story" trigger bubble */}
            <div className={`${theme.card} p-3 rounded-3`}>
              <div 
                className="d-flex gap-3 overflow-auto pb-1 align-items-center" 
                style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
              >
                {/* ADDED: Interactive "Your Story" button slot directly at position 0 */}
                <div className="flex-shrink-0 text-center pointer" style={{ width: '68px' }} >
                  <div className="position-relative mx-auto mb-1 rounded-circle d-flex align-items-center justify-content-center border border-2 border-secondary" style={{ width: '56px', height: '56px', background: '#222' }}>
                    {uploadingStory ? (
                      <Spinner animation="border" size="sm" variant="primary" />
                    ) : (
                      <>
                        <img 
                          src={currentUser?.profilePicture || "https://via.placeholder.com/50"} 
                          className="rounded-circle object-fit-cover w-100 h-100 opacity-50" 
                          alt="Your profile thumb" 
                        />
                        <div   onClick={() => setShowCreateStoryModal(true)} className="position-absolute position-absolute top-50 start-50 translate-middle bg-primary rounded-circle d-flex align-items-center justify-content-center border border-2 border-black" style={{ width: '22px', height: '22px' }}>
                          <FaPlus size={10} className="text-white" />
                        </div>
                        
                      </>
                    )}
                  </div>
                  <div className="text-truncate px-1 fw-medium" style={{ fontSize: '0.72rem', color: isDark ? '#aaa' : '#555' }}>Your Story</div>
                </div>

                {/* Main looping block rendering remote circles */}
                {storyGroups?.map((group) => (
                  <div key={group.user?._id} className="flex-shrink-0">
                    <StoryCircle group={group} currentUserId={userId} onClick={handleStoryClick} />
                  </div>
                ))}
              </div>
            </div>

            {/* Content Status Processing Feed Block */}
            {loading && filteredPosts.length === 0 ? (
              <div className="d-flex justify-content-center my-5 w-100">
                <Spinner animation="border" variant={isDark ? "light" : "dark"} />
              </div>
            ) : error ? (
              <Alert variant="danger" className="text-center">{error}</Alert>
            ) : filteredPosts.length === 0 ? (
              <div className={`${theme.card} p-5 text-center rounded-3`}>
                <h5>No timeline items match your query.</h5>
                <p className={theme.subtext}>Try searching or exploring alternative content descriptions.</p>
              </div>
            ) : (
              <div className="d-flex flex-column">
                {filteredPosts.map(post => {
                  const hasUserLiked = post.likes?.some(l => (l.userId?._id || l.userId) === userId);
                  const isPostSaved = post.savedBy?.includes(userId);

                  return (
                    <div key={post._id} className={`${theme.card} rounded-3 overflow-hidden shadow-sm p-3`} onClick={() => navigate(`/postDetails/${post._id}`)} style={{ cursor: 'pointer' }}>
                      
                      {/* Post Individual Header */}
                      <div className={`card-header d-flex align-items-center justify-content-between bg-transparent py-2 border-bottom ${theme.border}`}>
                        <div className="d-flex align-items-center gap-2" onClick={(e) => { e.stopPropagation(); navigate(`/ProfilePage/${post.userId?._id}`); }}>
                          <img 
                            src={post.userId?.profilePicture || "https://via.placeholder.com/40"} 
                            alt="User thumb" className="rounded-circle object-fit-cover" width="38" height="38" 
                          />
                          <div>
                            <div className="fw-bold small">{post.userId?.userName || 'Anonymous Profile'}</div>
                            <div className={`${theme.subtext}`} style={{ fontSize: '0.70rem' }}>{moment(post.createdAt).fromNow()}</div>
                          </div>
                        </div>
                        <button className="btn btn-sm text-inherit" style={{ color: "inherit" }} onClick={(e) => e.stopPropagation()}>
                          <FaEllipsisH />
                        </button>
                      </div>

                      {/* Timeline Image Content Attachment Container */}
                      <div className="bg-black d-flex align-items-center justify-content-center position-relative" style={{ maxHeight: '500px', overflow: 'hidden' }}>
                        <img src={post.media} className="w-100 h-100 object-fit-contain" alt="Post viewable layout" style={{ minHeight: '280px', maxHeight: '500px' }} />
                      </div>

                      {/* Content Lower Metrics Block */}
                      <div className="card-body py-2">
                        <div className="d-flex justify-content-between mb-2">
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm text-inherit" style={{ color: "inherit" }} onClick={(e) => { e.stopPropagation(); handleToggleLike(post); }}>
                              {hasUserLiked ? <FaHeart className="text-danger" size={18} /> : <FaRegHeart size={18} />}
                            </button>
                            <button className="btn btn-sm text-inherit" style={{ color: "inherit" }}><FaComment size={18} /></button>
                            <button className="btn btn-sm text-inherit" style={{ color: "inherit" }} onClick={(e) => { e.stopPropagation(); sharePost(post._id); }}><FaPaperPlane size={18} /></button>
                          </div>
                          <button className="btn btn-sm text-inherit" style={{ color: "inherit" }} onClick={(e) => handleSavePostAction(post._id, e)}>
                            {isPostSaved ? <FaBookmark size={18} /> : <FaRegBookmark size={18} />}
                          </button>
                        </div>

                        <div className="mb-1 fw-bold small">{post.likes?.length || 0} likes</div>
                        <div className="small">
                          <span className="fw-bold me-2">{post.userId?.userName}</span>{post.text}
                        </div>
                      </div>

                      {/* Quick Comment Triggers */}
                      <div className={`card-footer bg-transparent d-flex py-2 align-items-center border-top ${theme.border}`} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          className={`${theme.input} form-control-sm`}
                          placeholder="Add a comment input text..."
                          value={commentInputs[post._id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post); }}
                        />
                        <button className="btn btn-sm text-primary fw-semibold ms-2" onClick={() => handleAddComment(post)} disabled={!commentInputs[post._id]?.trim()}>
                          Post
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= RIGHT RAIL: DYNAMIC INTERACTIVE WIDGETS ================= */}
          <div className="col-lg-3 d-none d-lg-block position-sticky" style={{ top: '80px', height: 'fit-content' }}>
            
            {/* Trending Dynamic Widget Panel */}
            <div className={`${theme.card} p-3 rounded-3 mb-4`}>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaHashtag className="text-primary" /> Trending Analytics
              </h6>
              {loadingWidgets ? (
                <div className="text-center py-2"><Spinner animation="border" size="sm" variant="primary" /></div>
              ) : trendingTopics.length === 0 ? (
                <p className={`small ${theme.subtext} m-0`}>No active topic records found.</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {trendingTopics.map((topic, i) => (
                    <div key={i} className="pointer p-1 rounded hover-effect">
                      <div className="fw-bold small text-truncate">#{topic.name || topic}</div>
                      <div className={theme.subtext} style={{ fontSize: '0.75rem' }}>{topic.postsCount || '1.2k'} interactions</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Shared Calendar Events Widget Panel */}
            <div className={`${theme.card} p-3 rounded-3`}>
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaCalendarAlt className="text-primary" /> Global Events Calendar
              </h6>
              {loadingWidgets ? (
                <div className="text-center py-2"><Spinner animation="border" size="sm" variant="primary" /></div>
              ) : events.length === 0 ? (
                <p className={`small ${theme.subtext} m-0`}>No active update records found.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {events.slice(0, 4).map((event) => (
                    <div key={event._id} className="d-flex align-items-start gap-2 border-bottom pb-2 last-no-border" style={{ borderColor: theme.border }}>
                      <div className="bg-primary text-white rounded p-1 text-center font-monospace" style={{ minWidth: '42px', fontSize: '0.7rem' }}>
                        {moment(event.date).format('MMM D')}
                      </div>
                      <div className="text-truncate">
                        <div className="fw-bold small text-truncate m-0 p-0" style={{ lineHeight: 1.2 }}>{event.title}</div>
                        <small className={theme.subtext} style={{ fontSize: '0.7rem' }}>{event.location || 'Online Space'}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Shared Interactive Multi-User Story Lightbox Viewer Overlay Component */}
      <StoryViewer 
        show={showStoryViewer} 
        onHide={() => setShowStoryViewer(false)} 
        storyGroups={storyGroups} 
        setStoryGroups={setStoryGroups} 
        initialGroup={selectedStoryGroup} 
      />
      <CreateStory 
        show={showCreateStoryModal}
        onHide={() => setShowCreateStoryModal(false)}
        onCreateStory={handleCreateStory}
      />
    </div>
  );
};

export default HomePage;