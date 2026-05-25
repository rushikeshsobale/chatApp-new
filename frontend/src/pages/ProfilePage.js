import React, { useState, useEffect, useContext, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaUserEdit, FaUserFriends, FaPlus, FaSearch, FaBell, FaHome, FaCompass, FaVideo, FaStore, FaGamepad, FaBookmark, FaPen, FaAmazon, FaCamera } from "react-icons/fa";
import { IoMdNotifications } from "react-icons/io";
import { RiMessengerLine } from "react-icons/ri";
import EditProfile from "../components/EditProfile";
import CustomModal from "../components/customModal";
import PostDetail from "../components/PostDetail";
import { useParams, useLocation } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";
import { IoGridSharp } from "react-icons/io5";
import { PiSlideshowFill } from "react-icons/pi";
import { GiSouthAfricaFlag } from "react-icons/gi";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useNavigate } from "react-router-dom";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";


import StoryViewer from "../components/StoryViewer";
import FriendSuggestion from "../components/FriendSuggestion";
import { fetchSuggestions, getPostById } from "../services/profileService";
import FollowModal from "../components/FollowModal";
import CreateStory from "../components/CreateStory";
import { createNotification, getNotifications, updateNotification } from "../services/notificationService";
import { UserContext } from "../contexts/UserContext";
import BirthdaysCard from "../components/BirthdaysCard";
import { getuser, getProfileuser, getUserPosts, getNotifications as getProfileNotifications, getStories, getTrendingTopics, getEvents, createStory, updateUserProfile, likePost, unlikePost, sharePost, savePost, followUser, unfollowUser, addComment, deleteComment, } from "../services/profileService";
import Loader from '../components/Loader';
import NotificationModal from '../components/Notification';
import SavedPosts from "./SavedPosts";
import { getFollowers, getFollowing, } from '../services/relationships'
import ResponsiveStoryCarousel from "../components/ResponsiveStoryCarousel";
import { getMe } from "../services/authService";
import Navbar from "../components/Nav";
import moment from "moment";
const ProfilePage = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { isDark } = useContext(ThemeContext);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [media, setMedia] = useState(null);
  const { userProfileId } = useParams();
  const location = useLocation();
  const [friends, setFriends] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("slideshow");
  const [stories, setStories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [events, setEvents] = useState([]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const token = localStorage.getItem("token");
  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const { socket, setFlag, unseenMessages, setUserId } = useContext(UserContext);
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [showCommentInputs, setShowCommentInputs] = useState({});
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user } = useContext(UserContext)
  const userId = user?._id;
  const loadData = async () => {

    const res = await getFollowers(userId);
    setFollowers(res);
    const res1 = await getFollowing(userId);
    setFollowing(res1);
  }
  useEffect(() => {
    console.log("Checking login status on ProfilePage mount...");
    const loggedIn = JSON.parse(localStorage.getItem('user'));
    if (!loggedIn) {
      console.log("User is not logged in: going to login", loggedIn);
      navigate('/login')
    }
  }, []);
  useEffect(() => {

    if (userId) {
      loadData()
    }

  }, [userId])
  // ... inside your component
  const lastScrollY = useRef(0); // Create the ref
  const scrollContainerRef = useRef(null);


  // Fetch User Data
  useEffect(() => {

    if (location.pathname === "/profile" || location.pathname === "/") {
      fetchuser();
    } else {
    }
    fetchPosts()
  }, [location.pathname]);


  useEffect(() => {
    if (user !== null) {
      fetchNotifications(user);
    }
  }, [])

  const fetchuser = async () => {
    console.log('')
  };

  const fetchPosts = async () => {
    if (!userId) return;

    try {
      const data = await getUserPosts(userId);
      setPosts(data.posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }

  };
  const fetchPostById = async (postId, dataType) => {
    const response = await getPostById(postId);
    const currentPost = response.post;
    setPosts(prevPosts =>
      prevPosts?.map(post => {
        if (post._id !== currentPost._id) return post; // unchanged posts
        if (dataType === "comment") {
          const latestComment =
            currentPost.comments[currentPost.comments.length - 1];
          return {
            ...post,
            latestComment,
            comments: currentPost.comments, // optional if you also want full comments updated
          };
        }

        if (dataType === "like") {
          return {
            ...post,
            likes: currentPost.likes, // or `likeCount` depending on your schema
          };
        }
        // default → full replace
        return { ...currentPost };
      })
    );
  };

  const fetchNotifications = async () => {

    if (!user) return;
    setLoadingNotifications(true);
    try {
      const notifications = await getProfileNotifications(user?._id);
      setNotifications(notifications || []);
      setUnreadCount(notifications?.filter(notification => !notification.read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
    setLoadingNotifications(false);
  };
  const [storyGroups, setStoryGroups] = useState([]); // Initialize as empty array


  const fetchTrendingTopics = async () => {
    try {
      const data = await getTrendingTopics();
      setTrendingTopics(data.topics);
    } catch (error) {
      console.error("Error fetching trending topics:", error);
    }
  };
  useEffect(() => {
    if (!socket) return;
    socket.on('got_a_notification', (data) => {

      fetchNotifications();
      if (data.type == 'comment') {
        fetchPostById(data.postId, data.type)
      }
      else if (data.type == 'like') {
        fetchPostById(data.postId, data.type)
      }

    });
    // Optional: Cleanup listener on unmount
    return () => {
      socket.off('got_a_notification');
    };
  }, [socket]);
  const fetchEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data.events);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };
  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMedia({ url, type: file.type, file });
    }
  };
  const handleRemoveMedia = () => {
    setMedia(null);
  };
  const handleAddPost = async (text, media) => {
    try {
      // This API is not in profileService, so keep as is or move if needed
      const userId = user?._id;
      const formData = new FormData();
      formData.append("userId", userId)
      if (text) {
        formData.append("text", text)
      }
      if (media) {
        formData.append("media", media.file);
      }
      const response = await fetch(`${apiUrl}/post/mediaPost`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        console.log(posts, 'posts before adding new one');
        setPosts((prevPosts) => [...(prevPosts || []), data.post]);
        setNewPost("");
        setMedia(null);
        setShowModal(false);
      } else {
        console.error("Failed to post:", data.message);
      }
    } catch (error) {
      console.error("Error adding post:", error);
    }
  };


  const handleToggleLike = async (index, post, isLiked) => {
    const postId = post._id

    try {
      if (isLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
      const updatedPosts = setPosts(prevPosts => prevPosts?.map((post, i) =>
        i === index ? { ...post, likes: isLiked ? post.likes.filter(like => like.userId._id !== user?._id) : [...post.likes, { userId: { _id: user?._id } }] } : post
      ));
      // // const notificationData = {
      // //   recipient: post.userId._id,
      // //   sender: userId,
      // //   type: 'like',
      // //   message: `${user?.userName || 'Someone'} liked your post`,
      // //   createdAt: new Date().toISOString(),
      // //   read: false
      // };
      // if (isLiked) {
      //   await createNotification(notificationData);
      //   socket.emit('emit_notification', notificationData)
      // }

    } catch (error) {
      console.error("Error toggling like:", error);
    }

  };
  const handleAddComment = async (post, commentText) => {
    const postId = post._id;
    try {
      const response = await addComment(postId, commentText); // returns { success, comment }
      const newComment = response.comment;

      // Clear input and hide box
      setCommentInputs(prev => ({
        ...prev,
        [postId]: ''
      }));
      setShowCommentInputs(prev => ({
        ...prev,
        [postId]: false
      }));

      // Update only the matching post's comments
      setPosts(prevPosts =>
        prevPosts?.map(post =>
          post._id === postId
            ? { ...post, comments: [...post.comments, newComment] }
            : post
        )
      );

      // const notificationData = {
      //   recipient: postId,
      //   sender: user._id,
      //   type: 'comment',
      //   message: `${user.userName} has commented on you post `,
      //   createdAt: new Date().toISOString(),
      //   read: false
      // };
      // await createNotification(notificationData);
      // socket.emit('emit_notification', notificationData)
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };


  const handleDeleteComment = async (postId, commentId) => {
    try {
      await deleteComment(postId, commentId);

      // Update posts state locally without refetching
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? {
              ...post,
              comments: post.comments.filter(comment => comment._id !== commentId)
            }
            : post
        )
      );

    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleCommentInputChange = (postId, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: value
    }));
  };

  const handleShowCommentInput = (postId) => {
    setShowCommentInputs(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleSubmitComment = (post) => {
    const commentText = commentInputs[post._id]?.trim();
    if (commentText) {
      handleAddComment(post, commentText);
    }
  };

  const handleSharePost = async (postId) => {
    try {
      await sharePost(postId);
      // Handle successful share
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  const handleSavePost = async (postId) => {
    try {
      await savePost(postId);
      // Handle successful save
    } catch (error) {
      console.error("Error saving post:", error);
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      await followUser(userId);
      fetchuser(); // Refresh user data
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await updateNotification(notificationId, true);
      setNotifications(prevNotifications =>
        prevNotifications?.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`${apiUrl}/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setNotifications(prevNotifications =>
          prevNotifications.filter(notification => notification._id !== notificationId)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };
  const handleShowFollowers = () => {
    setShowFollowersModal(true);
  };
  const handleShowFollowing = () => {
    setShowFollowingModal(true);
  };
  const handleUnfollowUser = async (userId) => {
    try {
      await unfollowUser(userId);
      fetchuser(); // Refresh user data
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };
  const filteredPosts = posts?.filter(
    (post) =>
      post?.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredFriends = friends?.filter(
    (friend) =>
      `${friend?.friendId.firstName} ${friend?.friendId.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      friend.friendId.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const tabs = [
    { id: "slideshow", label: "Slideshow", icon: <PiSlideshowFill size={16} /> },
    { id: "grid", label: "Grid", icon: <IoGridSharp size={16} /> },
    { id: "saved", label: "Saved", icon: <GiSouthAfricaFlag size={16} /> },
  ];
  const handlePostClick = (postId) => {
    navigate(`/postDetails/${postId}`);
  };
  const handleCreateStory = async (storyData) => {
    try {
      const data = await createStory(storyData);
      setStories(prev => [data.story, ...prev]);
      setShowCreateStory(false)
      const notificationData = {
        sender: user?._id,
        type: 'story',
        message: `${user?.userName} has added story`,
        createdAt: new Date().toISOString(),
        read: false
      };

      if (data) {

        socket.emit('emit_notification', notificationData)
      }
    } catch (error) {
      console.error('Error creating story:', error);
    }
  };

  const [selectedUserId, setSelectedUserId] = useState(null);
  const handleStoryClick = (userId) => {
    setSelectedUserId(userId);
    setShowStoryViewer(true);
  };

  const handleScroll = (e) => {
    const currentScrollY = e.target.scrollTop;
    if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
      setIsVisible(false); // scrolling down → hide
    } else {
      setIsVisible(true); // scrolling up → show
    }
    lastScrollY.current = currentScrollY;
  };

  const handleSave = async (profileData) => {
    try {
      const userId = user?._id;
      const updatedUser = await updateUserProfile(userId, profileData);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowEditProfile(false);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };
  const logOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };


  return (
    <div
      className={`profile-page min-vh-100 ${isDark ? ' bg-dark text-light' : 'text-dark'}`}
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: isDark ? '#000000' : '#f4f6f9',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}
    >
      {showProfileModal && user && (
        <EditProfile show={showProfileModal} onHide={() => setShowProfileModal(false)} user={user} onSave={handleSave} onSettings={() => { navigate('/settings'); setShowProfileModal(false); }} onLogout={logOut} theme={isDark ? 'dark' : 'light'} />
      )}


      {/* Main Content */}
      <div className="container-fluid pt-3">
        <div className="row g-4">

          {/* Left Sidebar */}
          <div className="col-lg-3 d-none d-lg-block">
            <div className="sticky-top" style={{ top: "85px" }}>

              {/* Contacts Card */}
              <div className={`card border ${isDark ? 'border-secondary' : 'border-light-subtle'} mb-3`} style={{ background: isDark ? '#1f2833' : '#ffffff' }}>
                <div className={`card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-3 ${isDark ? 'border-secondary' : 'border-light-subtle'}`}>
                  <h6 className={`mb-0 fw-bold ${isDark ? 'text-light' : 'text-dark'}`}>Contacts</h6>
                  <div>
                    <button className={`btn btn-sm p-0 me-2 ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}><i className="bi bi-search"></i></button>
                    <button className={`btn btn-sm p-0 ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}><i className="bi bi-three-dots"></i></button>
                  </div>
                </div>
                <div className="card-body p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <ul className="list-unstyled mb-0">
                    {friends?.slice(0, 5).map((friend) => (
                      <li key={friend._id} className={`p-3 border-bottom highlight-row ${isDark ? 'border-secondary-subtle' : 'border-light-subtle'}`}>
                        <a href={`/profile/${friend.friendId._id}`} className="d-flex align-items-center text-decoration-none">
                          {friend.friendId.profilePicture ? (
                            <img
                              src={friend.friendId.profilePicture}
                              alt="Profile"
                              className="rounded-circle me-3"
                              style={{ width: "35px", height: "35px", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                              style={{
                                width: "35px",
                                height: "35px",
                                backgroundColor: isDark ? "#45f3ff" : "#008080",
                                color: isDark ? '#0b0c10' : '#ffffff',
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
                            >
                              {friend.friendId.firstName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`small fw-medium ${isDark ? 'text-light' : 'text-dark'}`}>{friend.friendId.firstName} {friend.friendId.lastName}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Notifications Card Area */}

            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-lg-6 col-12"
            onScroll={handleScroll}
            style={{
              height: "calc(100vh - 90px)",
              overflowY: "auto",
              scrollbarWidth: "none"
            }}>

            {/* User Profile Header banner */}
            {user && (
              <div
                className={`profile-header rounded-4 p-1 py-3 p-md-4 mb-4 border ${isDark ? 'border-secondary' : 'border-light-subtle'}`}
                style={{ background: isDark ? 'linear-gradient(135deg, #000000 0%, #050505 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f1f3f5 100%)' }}
              >
                <div className="d-flex w-100 align-items-center  justify-content-center">
                  <div className=" col-4 justify-content-center position-relative">
                    {user?.profilePicture ? (
                      <img
                        src={user?.profilePicture}
                        alt="Profile"
                        className={`rounded-circle img-thumbnail bg-transparent ${isDark ? 'border-secondary' : 'border-light-subtle'}`}
                        style={{
                          width: "110px",
                          height: "110px",
                          objectFit: "cover",
                          boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.1)"
                        }}
                      />
                    ) : (
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center border ${isDark ? 'border-secondary text-white' : 'border-light-subtle text-dark'}`}
                        style={{
                          width: "110px",
                          height: "110px",
                          fontSize: "32px",
                          fontWeight: "bold",
                          background: isDark ? '#2c3540' : '#e9ecef'
                        }}
                      >
                        {user?.userName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h5 className={` fs-sm my-1 ${isDark ? 'text-white' : 'text-dark'}`}>{user?.userName}</h5>
                  </div>

                  <div className="col-8 p-1 text-center flex-grow-1 text-center text-sm-start">

                    <p className={`small mb-3  style-bio ${isDark ? 'text-secondary' : 'text-muted'}`}>{user?.bio || "Tell your story... "}</p>

                    <div className="d-flex justify-content-center justify-content-sm-start align-items-center gap-4">
                      <div className="cursor-pointer" onClick={handleShowFollowers}>
                        <h6 className={`mb-0 fw-bold ${isDark ? 'text-light' : 'text-dark'}`}>{followers.length || 0}</h6>
                        <small className="text-muted">Followers</small>
                      </div>
                      <div className={`opacity-25 ${isDark ? 'bg-secondary' : 'bg-dark'}`} style={{ width: '1px', height: '24px' }}></div>
                      <div className="cursor-pointer" onClick={handleShowFollowing}>
                        <h6 className={`mb-0 fw-bold ${isDark ? 'text-light' : 'text-dark'}`}>{following.length || 0}</h6>
                        <small className="text-muted">Following</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* <div className='d-block d-md-none mt-2 mb-3'>
            <FriendSuggestion suggestions={suggestions} loadData={loadData} onFollow={handleFollowUser} theme={isDark ? 'dark' : 'light'} />
          </div> */}

            {/* Navigation Tabs */}
            <div className={` mb-4 ${isDark ? 'border-secondary' : 'border-light-subtle'}`} style={{ background: isDark ? '#121212' : '#ffffff' }}>
              <div className=" p-0">
                <div className="d-flex justify-content-around">
                  {tabs?.map((tab) => (
                    <button
                      key={tab.id}
                      className={`py-2 flex-grow-1 border-0 bg-transparent text-center position-relative ${activeTab === tab.id ? "text-info fw-bold" : "text-muted"}`}
                      onClick={() => setActiveTab(tab.id)}
                      style={{ transition: "all 0.2s ease" }}
                    >
                      <div className="fs-5">{tab.icon}</div>
                      {activeTab === tab.id && (
                        <div className="position-absolute bottom-0 start-0 w-100 bg-info" style={{ height: "2px" }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Views Content */}


            <div className="mb-4 rounded">
              {(!posts || posts?.length == 0) && (
                <div className="text-center py-5 bounce-in">
                  <img src="/no-posts.png" alt="No posts" style={{ width: "120px", marginBottom: "20px" }} />
                  <h3 className={`fw-bold ${isDark ? 'text-light' : 'text-dark'}`}>It's awfully quiet in here...</h3>
                  <p className="text-muted mb-4">Be the hero this feed needs. Share your very first post!</p>
                  <button className="btn  btn-lg rounded-pill px-4 shadow">
                    ✨ Create First Post
                  </button>
                </div>
              )}
              {activeTab === "grid" && (
                <div className="row g-3">
                  {loadingPosts ? <Loader text="Loading posts..." /> : filteredPosts?.reverse().map((post) => (
                    <div key={post._id} className="col-4">
                      <div
                        className={`card overflow-hidden position-relative post-grid-card border ${isDark ? 'border-secondary' : 'border-light-subtle'}`}
                        style={{ borderRadius: "8px", cursor: "pointer", aspectRatio: "1/1" }}
                        onClick={() => handlePostClick(post._id)}
                      >
                        <div
                          className="w-100 h-100 grid-image"
                          style={{
                            backgroundImage: `url(${post.media})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "slideshow" && (
                <div className="row justify-content-center">
                  {loadingPosts ? <Loader text="Loading posts..." /> : posts?.reverse().map((post, index) => (
                    <div key={post._id} className="col-12 mb-4">
                      <div className={`card border ${isDark ? 'border-secondary' : 'border-light-subtle'}`} style={{ background: isDark ? '#121212' : '#ffffff' }}>
                        {/* Post Header */}
                        <div className={`card-header border-bottom d-flex align-items-center justify-content-between p-3 bg-transparent ${isDark ? 'border-secondary' : 'border-light-subtle'}`}>
                          <div className="d-flex align-items-center">
                            <img
                              src={post.userId.profilePicture || "https://via.placeholder.com/40"}
                              alt="User"
                              className={`rounded-circle me-3 border ${isDark ? 'border-secondary' : 'border-light-subtle'}`}
                              style={{ width: "42px", height: "42px", objectFit: "cover" }}
                            />
                            <div>
                              <h6 className={`mb-0 small fw-bold ${isDark ? 'text-light' : 'text-dark'}`}>{post.userId.userName}</h6>
                              <small className="text-muted" style={{ fontSize: '0.75rem' }}>{moment(post.createdAt).fromNow()}</small>
                            </div>
                          </div>
                          <button className={`btn p-0 ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}>
                            <i className="bi bi-three-dots"></i>
                          </button>
                        </div>

                        {/* Post Media Container */}
                        <div
                          className="w-100 bg-dark"
                          style={{
                            aspectRatio: "1/1",
                            backgroundImage: `url(${post.media})`,
                            backgroundSize: "contain",
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: "center"
                          }}
                        />

                        {/* Actions & Description Footer */}
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex gap-3">
                              <button className={`btn p-0 ${isDark ? 'text-light' : 'text-dark'}`} onClick={() => handleToggleLike(index, post, post.likes?.some(like => like.userId._id == userId))}>
                                <i className={`bi ${post.likes?.some(like => like.userId._id == userId) ? "bi-heart-fill text-danger" : "bi-heart"} fs-5`}></i>
                              </button>
                              <button className={`btn p-0 ${isDark ? 'text-light' : 'text-dark'}`} onClick={() => handleShowCommentInput(post._id)}>
                                <i className="bi bi-chat fs-5"></i>
                              </button>
                              <button className={`btn p-0 ${isDark ? 'text-light' : 'text-dark'}`} onClick={() => handleSharePost(post._id)}>
                                <i className="bi bi-send fs-5"></i>
                              </button>
                            </div>
                            <button className={`btn p-0 ${isDark ? 'text-light' : 'text-dark'}`} onClick={() => handleSavePost(post._id)}>
                              <i className={`bi ${post.savedBy?.includes(user?._id) ? "bi-bookmark-fill text-info" : "bi-bookmark"} fs-5`}></i>
                            </button>
                          </div>

                          <p className={`fw-bold mb-2 small ${isDark ? 'text-light' : 'text-dark'}`}>
                            {post.likes?.length > 0 ? `${post.likes.length.toLocaleString()} likes` : "Be the first to like this"}
                          </p>

                          <p className={`mb-2 small ${isDark ? 'text-light' : 'text-dark'}`}>
                            <span className="fw-bold me-2">{post.userId.firstName}</span>
                            {post.text}
                          </p>

                          {post?.comments?.length > 0 && (
                            <div className={`mt-2 border-top pt-2 ${isDark ? 'border-secondary-subtle' : 'border-light-subtle'}`}>
                              <p className="text-muted small mb-2 cursor-pointer" onClick={() => handlePostClick(post._id)}>
                                View all {post?.comments.length} comments
                              </p>
                              {post?.comments.slice(-2).map((comment, idx) => (
                                <div key={comment._id || idx} className="d-flex align-items-start mb-1 justify-content-between">
                                  <p className={`small mb-0 ${isDark ? 'text-light' : 'text-dark'}`}>
                                    <span className="fw-bold me-2">{comment.userId?.firstName}:</span>
                                    <span className="text-secondary-subtle">{comment.text}</span>
                                  </p>
                                  {(comment.userId?._id === user?._id || post.userId._id === user?._id) && (
                                    <button className="btn btn-sm text-danger p-0 border-0 bg-transparent" onClick={() => handleDeleteComment(post._id, comment._id)}>
                                      <i className="bi bi-trash" style={{ fontSize: '0.75rem' }}></i>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {showCommentInputs[post._id] && (
                            <div className="mt-3">
                              <div className="d-flex align-items-center gap-2">
                                <input
                                  type="text"
                                  className={`form-control form-control-sm ${isDark ? 'border-secondary bg-dark text-light' : 'border-light-subtle bg-light text-dark'}`}
                                  placeholder="Add a comment..."
                                  value={commentInputs[post._id] || ''}
                                  onChange={(e) => handleCommentInputChange(post._id, e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment(post)}
                                />
                                <button className="btn btn-info btn-sm fw-medium px-3 text-dark" onClick={() => handleSubmitComment(post)} disabled={!commentInputs[post._id]?.trim()}>
                                  Post
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "saved" && (
                <div className={`card border ${isDark ? 'border-secondary' : 'border-light-subtle'}`} style={{ background: isDark ? '#121212' : '#ffffff' }}>
                  <div className="card-body text-center py-5">
                    <FaBookmark size={40} className="text-muted mb-3" />
                    <SavedPosts theme={isDark ? 'dark' : 'light'} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-lg-3 d-none d-lg-block">
            <div className="sticky-top d-flex flex-column gap-3" style={{ top: "85px" }}>
              <div className={`p-1 rounded border ${isDark ? 'border-secondary' : 'border-light-subtle'}`} style={{ background: isDark ? '#1f2833' : '#ffffff' }}>
                <BirthdaysCard userId={userId} theme={isDark ? 'dark' : 'light'} />
              </div>
              {/* {loadingSuggestions ? <Loader text="Loading suggestions..." /> : suggestions &&
              <div className={`p-1 rounded border ${isDark ? 'border-secondary' : 'border-light-subtle'}`} style={{ background: isDark ? '#1f2833' : '#ffffff' }}>
                <FriendSuggestion suggestions={suggestions} loadData={loadData} onFollow={handleFollowUser} theme={isDark ? 'dark' : 'light'} />
              </div>
            } */}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Mobile Dock */}
      <div
        className="position-fixed bottom-0 start-50 translate-middle-x mb-3 d-lg-none d-flex rounded-pill justify-content-center align-items-center gap-4 px-4 py-2 shadow-lg"
        style={{
          border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)',
          background: isDark ? 'rgba(18, 18, 18, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out, background 0.3s ease',
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
      >
        {/* Action 1: Create Story */}
        <div
          className={`cursor-pointer ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}
          onClick={() => setShowCreateStory(true)}
          title="Create Story"
        >
          <FaCamera size={18} />
        </div>

        <div className={`opacity-25 ${isDark ? 'bg-secondary' : 'bg-dark'}`} style={{ width: '1px', height: '16px' }} />

        {/* Action 2: Create Post */}
        <div
          className={`cursor-pointer ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}
          onClick={() => setShowModal(true)}
          title="Create Post"
        >
          <i className="bi bi-pencil-square" style={{ fontSize: '18px' }}></i>
        </div>

        <div className={`opacity-25 ${isDark ? 'bg-secondary' : 'bg-dark'}`} style={{ width: '1px', height: '16px' }} />

        {/* Action 3: Edit Profile Shortcut */}
        <div
          className={`cursor-pointer ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}
          onClick={() => setShowProfileModal(true)}
          title="Edit Profile"
        >
          <i className="bi bi-person-gear" style={{ fontSize: '19px' }}></i>
        </div>
      </div>

      {/* Modals Container */}
      {showModal && <CustomModal handleAddPost={handleAddPost} showModal={showModal} onClose={() => setShowModal(false)} theme={isDark ? 'dark' : 'light'} />}

      <FollowModal show={showFollowersModal} onHide={() => setShowFollowersModal(false)} title="Followers" users={followers} currentUserId={userId} theme={isDark ? 'dark' : 'light'} />
      <FollowModal show={showFollowingModal} onHide={() => setShowFollowingModal(false)} title="Following" users={following} currentUserId={userId} theme={isDark ? 'dark' : 'light'} />
      <CreateStory show={showCreateStory} onHide={() => setShowCreateStory(false)} onCreateStory={handleCreateStory} user={user} theme={isDark ? 'dark' : 'light'} />
      <StoryViewer show={isStoryViewerOpen} onHide={() => setIsStoryViewerOpen(false)} setStoryGroups={setStoryGroups} storyGroups={storyGroups} initialGroup={selectedStoryGroup} theme={isDark ? 'dark' : 'light'} />
      {showPostDetail && selectedPostId && <PostDetail postId={selectedPostId} show={showPostDetail} onHide={() => setShowPostDetail(false)} onPostUpdated={fetchPosts} theme={isDark ? 'dark' : 'light'} />}

      {/* Global Performance Styles Rule updates */}
      <style jsx global>{`
      .text-gradient {
        background: linear-gradient(45deg, #45f3ff, #00ff87);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .text-hover-light:hover {
        color: #ffffff !important;
      }
      .text-hover-dark:hover {
        color: #121212 !important;
      }
      .text-hover-danger:hover {
        color: #dc3545 !important;
      }
      .highlight-row:hover {
        background-color: ${isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'};
      }
      .custom-notification-item:hover {
        background-color: ${isDark ? 'rgba(255, 255, 255, 0.05) !important' : 'rgba(0, 0, 0, 0.05) !important'};
      }
      .post-grid-card:hover .grid-image {
        transform: scale(1.04);
      }
      .grid-image {
        transition: transform 0.3s ease;
      }
      /* Scrollbar treatment */
      div::-webkit-scrollbar {
        width: 5px;
      }
      div::-webkit-scrollbar-track {
        background: transparent;
      }
      div::-webkit-scrollbar-thumb {
        background: ${isDark ? '#2c3540' : '#ced4da'};
        border-radius: 4px;
      }
    `}</style>
    </div>
  );
};

export default ProfilePage;