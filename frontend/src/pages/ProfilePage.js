import React, { useState, useEffect, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaUserEdit, FaUserFriends, FaPlus, FaSearch, FaBell, FaHome, FaCompass, FaVideo, FaStore, FaGamepad, FaBookmark, FaPen } from "react-icons/fa";
import { IoMdNotifications } from "react-icons/io";
import { RiMessengerLine } from "react-icons/ri";
import EditProfile from "../components/EditProfile";
import CustomModal from "../components/customModal";
import PostDetail from "../components/PostDetail";
import { useParams, useLocation } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import { IoGridSharp } from "react-icons/io5";
import { PiSlideshowFill } from "react-icons/pi";
import { GiSouthAfricaFlag } from "react-icons/gi";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useNavigate } from "react-router-dom";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import moment from "moment";
import StoryCircle from "../components/StoryCircle";
import StoryViewer from "../components/StoryViewer";
import FriendSuggestion from "../components/FriendSuggestion";
import { fetchSuggestions, getPostById } from "../services/profileService";
import FollowModal from "../components/FollowModal";
import CreateStory from "../components/CreateStory";
import { createNotification, getNotifications, updateNotification } from "../services/notificationService";
import { UserContext } from "../contexts/UserContext";
import BirthdaysCard from "../components/BirthdaysCard";
import { getUserData, getProfileUserData, getUserPosts, getNotifications as getProfileNotifications, getStories, getTrendingTopics, getEvents, createStory, updateUserProfile, likePost, unlikePost, sharePost, savePost, followUser, unfollowUser, addComment, deleteComment } from "../services/profileService";
import Loader from '../components/Loader';
import NotificationModal from '../components/Notification';
import SavedPosts from "./SavedPosts";
export const StoryButton = ({ userData, hasStory, onClick }) => {
  return (
    <div
      className="position-relative d-inline-block"
      style={{
        cursor: "pointer",
        padding: hasStory ? "3px" : "2px",
        borderRadius: "50%",
        background: hasStory
          ? "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" // active gradient ring
          : "#e0e0e0", // inactive neutral border
        transition: "all 0.3s ease",
      }}
      onClick={onClick}
    >
      {/* Profile Image */}
      <img
        src={userData?.profilePicture || "https://via.placeholder.com/60"}
        alt="Profile"
        className="rounded-circle bg-white"
        style={{
          width: "40px",
          height: "40px",
          objectFit: "cover",
          border: "2px solid white",
          transition: "transform 0.3s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      />

      {/* Small camera icon on the edge */}
      <div
        className="position-absolute bg-danger rounded-circle d-flex align-items-center justify-content-center"
        style={{
          width: "18px",
          height: "18px",
          bottom: "0px",
          right: "0px",
          transform: "translate(25%, 25%)",
          border: "2px solid white",
          boxShadow: "0 0 4px rgba(0,0,0,0.2)",
        }}
      >
        <i className="bi bi-camera-video-fill text-white" style={{ fontSize: "8px" }}></i>
      </div>

    </div>
  );
};
const ProfilePage = () => {
  const [newPost, setNewPost] = useState("");
  const [media, setMedia] = useState(null);
  const { userProfileId } = useParams();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [friends, setFriends] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("grid");
  const [stories, setStories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [events, setEvents] = useState([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.userId;
  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const { socket, setFlag, unseenMessages } = useContext(UserContext);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [commentInputs, setCommentInputs] = useState({});
  const [showCommentInputs, setShowCommentInputs] = useState({});
  const [hasStory, setHasStory] = useState('');
  // Fetch User Data
  useEffect(() => {
    setFlag(true)
    if (location.pathname === "/profile" || location.pathname === "/") {
      fetchUserData();
    } else {
      fetchUser2Data();
    }
    getSuggestions();
    fetchStories();
    fetchPosts()
    // fetchTrendingTopics();
    // fetchEvents();

  }, [location.pathname]);
  useEffect(() => {
    if (user !== null) {
      fetchNotifications(user);
    }
  }, [])
  const getSuggestions = async () => {
    setLoadingSuggestions(true);
    const suggestions = await fetchSuggestions(); // Wait for the data
    setSuggestions(suggestions); // Update state
    setLoadingSuggestions(false);
  };
  const fetchUserData = async () => {
    setLoadingUser(true);
    try {
      const data = await getUserData();
      localStorage.setItem('user3', JSON.stringify(data));
      setUserData(data);
      setFriends(data.friends);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoadingUser(false);
  };
  const fetchUser2Data = async () => {
    console.log(userProfileId, 'userProfileId')
    try {
      const data = await getProfileUserData(userProfileId);
      setUserData(data);
      setFriends(data.friends);
    } catch (error) {
      console.error("Error:", error);
    }
  };
  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const data = await getUserPosts(userId);
      setPosts(data.posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
    setLoadingPosts(false);
  };
  const fetchPostById = async (postId, dataType) => {
    const response = await getPostById(postId);
    console.log(response, "lets see");

    const currentPost = response.post;

    setPosts(prevPosts =>
      prevPosts.map(post => {
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
    setLoadingNotifications(true);
    try {
      const notifications = await getProfileNotifications(user.userId);
      setNotifications(notifications || []);
      setUnreadCount(notifications?.filter(notification => !notification.read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
    setLoadingNotifications(false);
  };
  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const data = await getStories();
      setStories(data.stories);

    } catch (error) {
      console.error("Error fetching stories:", error);
    }
    setLoadingStories(false);
  };
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
      console.log('got a notification, ', data)
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
      const userId = userData._id;
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
        setPosts((prevPosts) => [...prevPosts, data.post]);
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

  const handleSave = async (profileData) => {
    try {
      const userId = userData._id;
      const updatedUser = await updateUserProfile(userId, profileData);
      setUserData(updatedUser?.user);
      setShowEditProfile(false);
    } catch (error) {
      console.error("Error updating user:", error);
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
      const updatedPosts = setPosts(prevPosts => prevPosts.map((post, i) =>
        i === index ? { ...post, likes: isLiked ? post.likes.filter(like => like.userId._id !== userData?._id) : [...post.likes, { userId: { _id: userData?._id } }] } : post
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
        prevPosts.map(post =>
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
      fetchUserData(); // Refresh user data
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await updateNotification(notificationId, true);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
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
      fetchUserData(); // Refresh user data
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
    { id: "grid", label: "Grid", icon: <IoGridSharp size={16} /> },
    { id: "slideshow", label: "Slideshow", icon: <PiSlideshowFill size={16} /> },
    { id: "saved", label: "Saved", icon: <GiSouthAfricaFlag size={16} /> },
  ];
  const handlePostClick = (postId) => {
    navigate(`/postDetails/${postId}`);
  };
  const handleCreateStory = async (storyData) => {
    try {
      const data = await createStory(storyData);
      setStories(prev => [data.story, ...prev]);
      setShowCreateStory(false);
    } catch (error) {
      console.error('Error creating story:', error);
    }
  };
  const [selectedUserStories, setSelectedUserStories] = useState([]);

  const handleStoryClick = (story) => {
    // Get all stories from the clicked user
    const userStories = stories.filter(s => s.userId._id === story.userId._id);

    // Find which one was clicked among that user's stories
    const storyIndex = userStories.findIndex(s => s._id === story._id);

    setSelectedUserStories(userStories);
    setSelectedStoryIndex(storyIndex);
    setShowStoryViewer(true);
  };

  const logOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleOwnStoryClick = () => {
    const story = stories.filter(story => story.userId._id == userId);

    if (story.length > 0) {

      handleStoryClick(story[0])
    }
    else {
      setShowCreateStory(true)
    }

  }

  useEffect(() => {
    console.log(showStoryViewer, ' showStoryViewer')
  }, [showStoryViewer])
  return (
    <div className="profile-page" style={{ fontFamily: "'Poppins', sans-serif", background: "#f5f5f5" }}>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
        <div className="container">
          <a className="navbar-brand fw-bold text-primary" href="/" style={{ fontSize: "1.8rem" }}>
            HiBUDDY
          </a>
          <div className="">
            <div className=" d-flex  ">
              {/* <a href="/home" className="text-dark"><FaHome size={22} /></a> */}
              {/* <a href="/friends" className="text-dark"><FaUserFriends size={22} /></a> */}
              {/* <a href="/watch" className="text-dark"><FaVideo size={22} /></a> */}
              {/* <a href="/marketplace" className="text-dark"><FaStore size={22} /></a>
              <a href="/games" className="text-dark"><FaGamepad size={22} /></a> */}
              <button className="btn p-0 position-relative " onClick={() => navigate('/chats')}>
                <RiMessengerLine size={28} className="text-dark" />
                {unseenMessages.length > 0 &&
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unseenMessages.length}
                  </span>
                }
              </button>
              {console.log(userData, 'userData')}
              <img
                src={userData?.profilePicture}
                alt="Profile"
                className="rounded-circle mx-3"
                style={{ width: "30px", height: "30px", objectFit: "cover", cursor: 'pointer' }}
                onClick={() => setShowProfileModal(true)}
              />

              <NotificationModal
                notifications={notifications}
                unreadCount={unreadCount}
                show={showNotifications}
                onToggle={() => setShowNotifications(!showNotifications)}
                onMarkRead={handleMarkNotificationAsRead}
                onDelete={handleDeleteNotification}
              />
            </div>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <div className="container-fluid mt-1 ">
        <div className="row " >
          {/* Left Sidebar */}
          <div className="col-lg-3 d-none d-lg-block">
            <div className="sticky-top" style={{ top: "70px" }}>
              <BirthdaysCard userId={userId} />
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">Contacts</h6>
                  <div>
                    <button className="btn p-0 me-2"><i className="bi bi-search"></i></button>
                    <button className="btn p-0"><i className="bi bi-three-dots"></i></button>
                  </div>
                </div>
                <div className="card-body p-0">
                  <ul className="list-unstyled mb-0">
                    {friends?.slice(0, 5).map((friend) => (
                      <li key={friend._id} className="p-3 border-bottom">
                        <a href={`/profile/${friend.friendId._id}`} className="d-flex align-items-center text-decoration-none text-dark">
                          {friend.friendId.profilePicture ? (
                            <img
                              src={friend.friendId.profilePicture}
                              alt="Profile"
                              className="rounded-circle me-3"
                              style={{ width: "35px", height: "35px", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              className="rounded-circle me-3 d-flex align-items-center justify-content-center text-white"
                              style={{
                                width: "35px",
                                height: "35px",
                                backgroundColor: "#6c757d", // Bootstrap's secondary color
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
                            >
                              {friend.friendId.firstName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{friend.friendId.firstName} {friend.friendId.lastName}</span>
                        </a>
                      </li>

                    ))}
                  </ul>
                </div>
              </div>
              <div className="position-relative card border-0 shadow-sm mb-3">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">Notifications</h6>
                  <button
                    className="btn p-0 position-relative"
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (showNotifications) handleMarkNotificationAsRead(notifications[0]._id);
                    }}
                  >
                    <IoMdNotifications size={24} className="text-dark" />
                    {unreadCount > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>
                <div className=" end-0 mt-2 p-3">
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <div
                        key={notification._id}
                        className="d-flex align-items-center mb-3 p-2 rounded hover-bg-light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => !notification.read && handleMarkNotificationAsRead(notification._id)}
                      >
                        <img
                          src={notification.sender?.profilePicture || "https://via.placeholder.com/40"}
                          alt="Profile"
                          className="rounded-circle me-3"
                          style={{ width: "40px", height: "40px" }}
                        />
                        <div className="flex-grow-1">
                          <p className="mb-0 small">{notification.message}</p>
                          <small className="text-muted">{moment(notification.createdAt).fromNow()}</small>
                        </div>
                        <div className="d-flex align-items-center">
                          {!notification.read && (
                            <span className="badge bg-primary rounded-circle me-2" style={{ width: "8px", height: "8px" }}></span>
                          )}
                          <button
                            className="btn btn-sm btn-link text-muted p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification._id);
                            }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted small">No new notifications</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Main Content Area */}
          <div className="col-lg-6"
            style={{
              height: "90vh",
              backgroundColor: "white",
              overflow: "auto",
            }}>

            {/* Stories */}
            {loadingStories ? <Loader text="Loading stories..." /> : userData && (
              <div
                className="profile-header position-relative overflow-hidden mb-3"
              >
                <div className="container">
                  <div className="row align-items-center">
                    <div className="col-md-8 d-flex flex-row align-items-center gap-4">
                      <div className="position-relative hover-3d">
                        {userData?.profilePicture ? (
                          <img
                            src={userData.profilePicture}
                            alt="Profile"
                            className="rounded-circle shadow-lg"
                            style={{
                              width: "100px",
                              height: "100px",
                              border: "4px solid rgba(255,255,255,0.8)",
                              objectFit: "cover",
                              transform: "perspective(500px) rotateY(-5deg)",
                              transition: "all 0.5s ease",
                              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                            }}

                            onMouseEnter={e =>
                              e.currentTarget.style.transform =
                              "perspective(500px) rotateY(5deg) scale(1.05)"
                            }
                            onMouseLeave={e =>
                              e.currentTarget.style.transform = "perspective(500px) rotateY(-5deg)"
                            }
                          />
                        ) : (
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-lg"
                            style={{
                              width: "100px",
                              height: "100px",
                              border: "4px solid rgba(255,255,255,0.8)",
                              backgroundColor: "#6c757d",
                              fontSize: "36px",
                              fontWeight: "bold",
                              transform: "perspective(500px) rotateY(-5deg)",
                              transition: "all 0.5s ease",
                              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                            }}
                            onMouseEnter={e =>
                              e.currentTarget.style.transform =
                              "perspective(500px) rotateY(5deg) scale(1.05)"
                            }
                            onMouseLeave={e =>
                              e.currentTarget.style.transform = "perspective(500px) rotateY(-5deg)"
                            }
                          >
                            {userData.userName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="status-indicator"></div>
                      </div>

                      <div>
                        <p
                          className="mb-2"
                        >
                          <span className="text-dark text-sm">{userData?.userName}</span>
                        </p>
                        <p
                          className="mb-0"
                          style={{
                            fontSize: "0.7rem",
                            opacity: 0.9,
                            maxWidth: "500px"
                          }}
                        >
                          {userData?.bio || "Tell your story..."}
                        </p>
                        <div className="d-flex justify-content-around align-items-center">
                          {/* Followers Stats */}
                          <div className="text-center cursor-pointer" style={{ cursor: 'pointer' }} onClick={handleShowFollowers}>
                            <h3 className="mb-0 fw-bold" style={{ fontSize: '0.8rem' }}>
                              {userData?.followers?.length || 0}
                            </h3>
                            <p className="mb-0 " style={{ fontSize: '0.7rem' }}>
                              Followers
                            </p>
                          </div>
                          {/* Divider */}
                          <div className="mx-2" style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }}></div>

                          {/* Following Stats */}
                          <div className="text-center cursor-pointer" style={{ cursor: 'pointer' }} onClick={handleShowFollowing}>
                            <h3 className="mb-0 fw-bold" style={{ fontSize: '0.8rem' }}>
                              {userData?.following?.length || 0}
                            </h3>
                            <p className="mb-0 " style={{ fontSize: '0.7rem' }}>
                              Following
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Create Post Card - Enhanced */}
            <div className="card border-0 shadow-sm ">
              <div className="card-body p-0">
                <div className="d-flex align-items-center justify-content-between mb-1  rounded-pill" style={{ background: 'gainsboro' }}>
                  <div className="d-flex align-items-center w-100 ">
                    <StoryButton
                      userData={userData}
                      hasStory={stories.filter(story => story.userId._id == userId).length > 0 ? true : false} // or false depending on user
                      onClick={() => handleOwnStoryClick()}
                    />
                    {stories.length == 0 ? <button
                      className="btn btn-light flex-grow-1 text-start"
                      onClick={() => setShowModal(true)}
                      style={{
                        fontSize: "0.7rem",
                        height: "40px",
                        transition: "all 0.3s ease",
                        border: "1px solid #e0e0e0"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                        e.currentTarget.style.borderColor = "#dee2e6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#fff";
                        e.currentTarget.style.borderColor = "#e0e0e0";
                      }}
                    >
                      What's on your mind, {userData?.userName}?
                    </button> : <div className=" border-0  w-100">
                      <div className=" p-0">
                        <Swiper
                          slidesPerView={5}
                          spaceBetween={4}
                          pagination={{ clickable: true }}
                          modules={[Pagination]}
                          className="stories-swiper px-2"

                        >
                          {/* Add Story Button */}
                          {/* Other users' stories */}
                          {Array.from(
                            new Map(
                              stories
                                .filter(story => story.userId._id !== userId)
                                .map(story => [story.userId._id, story])
                            ).values()
                          ).map((story) => (
                            <SwiperSlide key={story._id} style={{ justifyItems: "center" }}>

                              <StoryCircle
                                story={story}
                                onClick={handleStoryClick}
                                currentUserId={userId}
                              />
                            </SwiperSlide>
                          ))}
                        </Swiper>
                      </div>
                      {/* <div className='d-block d-md-none'>
                <FriendSuggestion suggestions={suggestions} onFollow={handleFollowUser} />
              </div> */}
                    </div>}
                  </div>
                  <button className="btn btn-light rounded-pill d-flex align-items-center" onClick={() => setShowCreateStory(true)} style={{ transition: "all 0.3s ease", border: "1px solid #e0e0e0" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8f9fa"; e.currentTarget.style.borderColor = "#dee2e6"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e0e0e0"; }} > <i className="bi bi-plus text-danger "></i> </button>

                  <button
                    onClick={() => setShowModal(true)}
                    className="position-fixed d-flex align-items-center justify-content-center"
                    style={{
                      bottom: "25px",
                      justifySelf: 'anchor-center',
                      width: "65px",
                      height: "65px",
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.25)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      boxShadow: "0 4px 20px rgba(255, 0, 90, 0.4)",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      zIndex: 2000,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.08)";
                      e.currentTarget.style.boxShadow = "0 8px 30px rgba(255, 0, 90, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(255, 0, 90, 0.4)";
                    }}
                  >
                    <i className="bi bi-layout-text-window-reverse fs-3"></i>

                  </button>

                </div>
                <div className="d-flex justify-content-around border-bottom">

                </div>
              </div>
            </div>
            {/* Profile Header */}
            {/* Profile Navigation */}
            <div className="card border-0 shadow-sm mb-3  bg-white" style={{ zIndex: 10 }}>
              <div className="card-body p-0">
                <div className="d-flex justify-content-around border-bottom">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`flex flex-column align-items-center  position-relative border-0 bg-transparent 
                        ${activeTab === tab.id ? "text-dark fw-bold" : "text-secondary"}`}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        transition: "all 0.3s ease",
                        width: "100%",
                      }}
                    >
                      <div className="mb-1">{tab.icon}</div>

                      {activeTab === tab.id && (
                        <div
                          className="position-absolute w-100 bg-primary"
                          style={{
                            height: "3px",
                            bottom: "0",
                            left: "0",
                            borderRadius: "3px 3px 0 0"
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Profile Content */}
            <div className="mb-4 p-3">
              {activeTab === "grid" && (
                <div className="row g-3">
                  {loadingPosts ? <Loader text="Loading posts..." /> : filteredPosts.map((post) => (
                    <div key={post._id} className="col-lg-4 col-md-4 col-4">
                      <div
                        className="card border-0 shadow-sm overflow-hidden"
                        style={{
                          borderRadius: "12px",
                          cursor: "pointer",
                          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                          aspectRatio: "1/1",
                        }}
                        onClick={() => handlePostClick(post._id)}
                      >
                        <div
                          className="w-100 h-100"
                          style={{
                            backgroundImage: `url(${post.media})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            transition: "transform 0.5s ease"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "slideshow" && (
                <div className="row justify-content-center">
                  {loadingPosts ? <Loader text="Loading posts..." /> : posts.map((post, index) => (
                    <div key={post._id} className="col-12 mb-4">
                      <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: "16px" }}>
                        {/* Post Header */}
                        <div className="card-header bg-white d-flex align-items-center justify-content-between p-3">
                          <div className="d-flex align-items-center">
                            <img
                              src={post.userId.profilePicture || "https://via.placeholder.com/40"}
                              alt="User"
                              className="rounded-circle me-3"
                              style={{ width: "45px", height: "45px", objectFit: "cover" }}
                            />
                            <div>
                              <h6 className="mb-0 fw-bold">{post.userId.userName} </h6>
                              <small className="text-muted">{moment(post.createdAt).fromNow()}</small>
                            </div>
                          </div>
                          <button className="btn btn-link text-dark">
                            <i className="bi bi-three-dots"></i>
                          </button>
                        </div>
                        {/* Post Image */}
                        <div
                          className="w-100"
                          style={{
                            aspectRatio: "1/1",
                            backgroundImage: `url(${post.media})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center"
                          }}
                        />
                        <div className="card-body">
                          <div className="d-flex justify-content-between mb-3">
                            <div>

                              <button
                                className="btn p-0 me-3"
                                onClick={() => handleToggleLike(index, post, post.likes?.some(like => like.userId._id == userId))}
                              >
                                <i className={`bi ${post.likes?.some(like => like.userId._id == userId) ? "bi-heart-fill text-danger" : "bi-heart"} fs-4`}></i>
                              </button>
                              <button
                                className="btn p-0 me-3"
                                onClick={() => handleShowCommentInput(post._id)}
                              >
                                <i className="bi bi-chat fs-4"></i>
                              </button>
                              <button
                                className="btn p-0"
                                onClick={() => handleSharePost(post._id)}
                              >
                                <i className="bi bi-send fs-4"></i>
                              </button>
                            </div>
                            <button
                              className="btn p-0"
                              onClick={() => handleSavePost(post._id)}
                            >
                              <i className={`bi ${post.savedBy?.includes(userData?._id) ? "bi-bookmark-fill" : "bi-bookmark"} fs-4`}></i>
                            </button>
                          </div>
                          <p className="fw-bold mb-2">
                            {post.likes?.length > 0
                              ? `${post.likes.length.toLocaleString()} likes`
                              : "Be the first to like this"}
                          </p>
                          <p className="mb-2">
                            <span className="fw-bold me-2">{post.userId.firstName}</span>
                            {post.text}
                          </p>
                          {post.comments?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-muted small mb-1">
                                View all {post.comments.length} comments
                              </p>
                              {/* Show last 2 comments */}
                              {post.comments.slice(-2).map((comment, index) => (
                                <div key={comment._id || index} className="d-flex align-items-start mb-1 justify-content-between">
                                  <div className="d-flex align-items-start">
                                    <span className="fw-bold me-2 small">{comment.userId?.firstName}:</span>
                                    <span className="small">{comment.text}</span>
                                  </div>
                                  {/* Show delete button if user is comment author or post author */}
                                  {(comment.userId?._id === userData?._id || post.userId._id === userData?._id) && (
                                    <button
                                      className="btn btn-sm btn-link text-danger p-0 ms-2"
                                      onClick={() => handleDeleteComment(post._id, comment._id)}
                                      title="Delete comment"
                                    >
                                      <i className="bi bi-trash small"></i>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Comment Input Section */}
                          {showCommentInputs[post._id] && (
                            <div className="mt-3">
                              <div className="d-flex align-items-center">
                                <input
                                  type="text"
                                  className="form-control me-2"
                                  placeholder="Add a comment..."
                                  value={commentInputs[post._id] || ''}
                                  onChange={(e) => handleCommentInputChange(post._id, e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSubmitComment(post);
                                    }
                                  }}
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleSubmitComment(post)}
                                  disabled={!commentInputs[post._id]?.trim()}
                                >
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
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center py-5">
                    <FaBookmark size={48} className="text-muted mb-3" />
                    <SavedPosts />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-lg-3 d-lg-block">
            <div className="sticky-top" style={{ top: "70px", zIndex: 10 }}>
              {loadingSuggestions ? <Loader text="Loading suggestions..." /> : suggestions &&
                <FriendSuggestion suggestions={suggestions} onFollow={handleFollowUser} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <CustomModal
          handleAddPost={handleAddPost}
          showModal={showModal}
          onClose={() => setShowModal(false)}
        />
      )}

      {showProfileModal && userData && (
        <EditProfile
          show={showProfileModal}
          onHide={() => setShowProfileModal(false)}
          userData={userData}
          onSave={handleSave}
          onSettings={() => { navigate('/settings'); setShowProfileModal(false); }}
          onLogout={logOut}
        />
      )}

      {/* Followers Modal */}
      <FollowModal
        show={showFollowersModal}
        onHide={() => setShowFollowersModal(false)}
        title="Followers"
        users={userData?.followers || []}
        currentUserId={userData?._id}
        onFollow={handleFollowUser}
        onUnfollow={handleUnfollowUser}
      />

      {/* Following Modal */}
      <FollowModal
        show={showFollowingModal}
        onHide={() => setShowFollowingModal(false)}
        title="Following"
        users={userData?.following || []}
        currentUserId={userData?._id}
        onFollow={handleFollowUser}
        onUnfollow={handleUnfollowUser}
      />

      {/* Create Story Modal */}
      <CreateStory
        show={showCreateStory}
        onHide={() => setShowCreateStory(false)}
        onCreateStory={handleCreateStory}
        userData={userData}
      />

      <StoryViewer
        show={showStoryViewer}
        onHide={() => setShowStoryViewer(false)}
        stories={selectedUserStories}
        currentStoryIndex={selectedStoryIndex}
      />


      {showPostDetail && selectedPostId && (
        <PostDetail
          postId={selectedPostId}
          show={showPostDetail}
          onHide={() => setShowPostDetail(false)}
          // Optionally pass any other props needed, e.g. user info, token, etc.
          onPostUpdated={fetchPosts}
        />
      )}

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-100vh) rotate(360deg); }
        }
        .text-gradient {
          background: linear-gradient(90deg, #fff, #ffccd5);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hover-3d {
          perspective: 1000px;
        }
        .profile-page {
          padding-bottom: 60px;
        }
        @media (max-width: 992px) {
          .profile-page {
            padding-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
