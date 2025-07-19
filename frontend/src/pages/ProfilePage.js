import React, { useState, useEffect, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaUserEdit, FaUserFriends, FaPlus, FaSearch, FaBell, FaHome, FaCompass, FaVideo, FaStore, FaGamepad, FaBookmark, FaPen } from "react-icons/fa";
import { IoMdNotifications } from "react-icons/io";
import { RiMessengerLine } from "react-icons/ri";
import EditProfile from "../components/EditProfile";
import CustomModal from "../components/customModal";
import PostDetail from "../components/PostDetail";
import { useParams, useLocation } from "react-router-dom";
import ChatComponent from "./Chat";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import { IoGridSharp } from "react-icons/io5";
import { PiSlideshowFill } from "react-icons/pi";
import { GiSouthAfricaFlag } from "react-icons/gi";
import { motion } from "framer-motion";
import LikesCommentsPreview from "../components/LikesCommentsPreview";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useNavigate } from "react-router-dom";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import moment from "moment";
import StoryCircle from "../components/StoryCircle";
import StoryViewer from "../components/StoryViewer";
import FriendSuggestion from "../components/FriendSuggestion";
import TrendingTopics from "../components/TrendingTopics";
import EventCard from "../components/EventCard";
import { fetchSuggestions } from "../services/profileService";
import FollowModal from "../components/FollowModal";
import CreateStory from "../components/CreateStory";
import { getNotifications, updateNotification } from "../services/notificationService";
import { UserContext } from "../contexts/UserContext";
import BirthdaysCard from "../components/BirthdaysCard";
const ProfilePage = () => {
  const [newPost, setNewPost] = useState("");
  const [media, setMedia] = useState(null);
  // const { userId } = useParams();
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
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.userId;
  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const { socket, setFlag } = useContext(UserContext);
  // Fetch User Data
  useEffect(() => {
    setFlag(true)
    if (location.pathname === "/profile" || location.pathname === "/") {
      fetchUserData();
    } else {
      fetchUser2Data();
    }
    fetchNotifications();
    getSuggestions();
    fetchStories();
    fetchPosts()
    // fetchTrendingTopics();
    // fetchEvents();

  }, [location.pathname]);
  const getSuggestions = async () => {
    const suggestions = await fetchSuggestions(); // Wait for the data
    setSuggestions(suggestions); // Update state
  };
  const fetchUserData = async () => {
    try {
      const response = await fetch(`${apiUrl}/getUser`, {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();

        setUserData(data);
        setFriends(data.friends);
        const userId = data._id;
        const friends = data.followers;

      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchUser2Data = async () => {
    try {
      const response = await fetch(`${apiUrl}/getProfileUser/${userId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setFriends(data.friends);
      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };
  const fetchPosts = async () => {
    try {
      const response = await fetch(`${apiUrl}/post/getPosts/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      } else {
        console.error("Failed to fetch posts:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const notifications = await getNotifications(userId);
      setNotifications(notifications || []);
      setUnreadCount(notifications?.filter(notification => !notification.read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchStories = async () => {
    try {
      const response = await fetch(`${apiUrl}/stories/feed`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
    }
  };
  const fetchTrendingTopics = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/trending`);
      if (response.ok) {
        const data = await response.json();
        setTrendingTopics(data.topics);
      }
    } catch (error) {
      console.error("Error fetching trending topics:", error);
    }
  };

  useEffect(() => {
    if (!socket) return;
    socket.on('got_a_notification', (data) => {

      fetchNotifications();
    });

    // Optional: Cleanup listener on unmount
    return () => {
      socket.off('got_a_notification');
    };
  }, [socket]);


  const fetchEvents = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/events`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
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

  const handleAddPost = (text, media) => {
    const userId = userData._id;
    const formData = new FormData();
    formData.append("userId", userId)
    if (text) {
      formData.append("text", text)
    }
    if (media) {
      formData.append("media", media.file);
    }
    fetch(`${apiUrl}/post/mediaPost`, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setPosts((prevPosts) => [...prevPosts, data.post]);
          setNewPost("");
          setMedia(null);
          setShowModal(false);
        } else {
          console.error("Failed to post:", data.message);
        }
      })
      .catch((error) => {
        console.error("Error adding post:", error);
      });
  };

  const handleSave = async (profileData) => {
    try {
      const userId = userData._id;
      const formData = new FormData();
      formData.append("firstName", profileData.firstName);
      formData.append("lastName", profileData.lastName);
      formData.append("bio", profileData.bio);
      if (profileData.profilePicture) {
        formData.append("profilePicture", profileData.profilePicture);
      }
      const response = await fetch(`${apiUrl}/profile/updateUser/${userId}`, {
        method: "PUT",
        body: formData,
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setUserData(updatedUser?.user);
        setShowEditProfile(false);
      } else {
        const errorData = await response.json();
        console.error("Error updating user:", errorData.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error during PUT request:", error);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const response = await fetch(`${apiUrl}/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        fetchPosts(); // Refresh posts
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  // const handleAddComment = async (postId, commentText) => {
  //   try {
  //     const response = await fetch(`${apiUrl}/api/posts/${postId}/comment`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ text: commentText }),
  //     });
  //     if (response.ok) {
  //       fetchPosts(); // Refresh posts
  //     }
  //   } catch (error) {
  //     console.error("Error adding comment:", error);
  //   }
  // };

  const handleSharePost = async (postId) => {
    try {
      const response = await fetch(`${apiUrl}/api/posts/${postId}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        // Handle successful share
      }
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  const handleSavePost = async (postId) => {
    try {
      const response = await fetch(`${apiUrl}/api/posts/${postId}/save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        // Handle successful save
      }
    } catch (error) {
      console.error("Error saving post:", error);
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      const response = await fetch(`${apiUrl}/api/users/${userId}/follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchUserData(); // Refresh user data
      }
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
      const response = await fetch(`${apiUrl}/api/users/${userId}/unfollow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchUserData(); // Refresh user data
      }
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
    { id: "grid", label: "Grid", icon: <IoGridSharp size={24} /> },
    { id: "slideshow", label: "Slideshow", icon: <PiSlideshowFill size={24} /> },
    { id: "saved", label: "Saved", icon: <GiSouthAfricaFlag size={24} /> },
  ];

  const handlePostClick = (postId) => {
    navigate(`/postDetails/${postId}`);
  };

  const handleCreateStory = async (storyData) => {
    try {
      const formData = new FormData();
      formData.append('media', storyData.media);
      formData.append('caption', storyData.caption);
      const response = await fetch(`${apiUrl}/stories/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        setStories(prev => [data.story, ...prev]);
        setShowCreateStory(false);
      }
    } catch (error) {
      console.error('Error creating story:', error);
    }
  };
  const handleStoryClick = (story) => {
    const storyIndex = stories.findIndex(s => s._id === story._id);
    setSelectedStoryIndex(storyIndex);
    setShowStoryViewer(true);
  };
  return (
    <div className="profile-page" style={{ fontFamily: "'Poppins', sans-serif", background: "#f5f5f5" }}>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
        <div className="container">
          <a className="navbar-brand fw-bold text-primary" href="/" style={{ fontSize: "1.8rem" }}>
            HiBUDDY
          </a>
          <div className="align-items-center">
            <div className="d-none d-lg-flex gap-4 mx-3">
              <a href="/home" className="text-dark"><FaHome size={22} /></a>
              <a href="/friends" className="text-dark"><FaUserFriends size={22} /></a>
              <a href="/watch" className="text-dark"><FaVideo size={22} /></a>
              {/* <a href="/marketplace" className="text-dark"><FaStore size={22} /></a>
              <a href="/games" className="text-dark"><FaGamepad size={22} /></a> */}
              <button className="btn p-0" onClick={() => navigate('/chats')}>
                <RiMessengerLine size={24} className="text-dark" />
              </button>
              <div className="dropdown">
                <button
                  className="btn p-0 dropdown-toggle"
                  id="profileDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <img
                    src={userData?.profilePicture || "https://via.placeholder.com/30"}
                    alt="Profile"
                    className="rounded-circle"
                    style={{ width: "30px", height: "30px", objectFit: "cover" }}
                  />
                </button>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="profileDropdown">
                  <li><a className="dropdown-item" href="/profile">Your Profile</a></li>
                  <li><a className="dropdown-item" href="/saved">Saved</a></li>
                  <li><a className="dropdown-item" href="/settings">Settings</a></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><a className="dropdown-item" href="/logout">Log Out</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <div className="container-fluid mt-3 ">
        <div className="row">
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
                          <img
                            src={friend.friendId.profilePicture || "https://via.placeholder.com/40"}
                            alt="Profile"
                            className="rounded-circle me-3"
                            style={{ width: "35px", height: "35px", objectFit: "cover" }}
                          />
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
              height: "100vh",
              backgroundColor: "white",
              overflow: "auto",
            }}>
            {/* Stories */}
            {userData && (
              <div
                className="profile-header position-relative overflow-hidden mb-3"
              >
                <div className="container">
                  <div className="row align-items-center">
                    <div className="col-md-8 d-flex flex-column flex-md-row align-items-center gap-4">
                      <div className="position-relative hover-3d">
                        <img
                          src={userData.profilePicture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
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
                          onMouseEnter={e => e.currentTarget.style.transform = "perspective(500px) rotateY(5deg) scale(1.05)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "perspective(500px) rotateY(-5deg)"}
                        />
                        <label
                          className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 cursor-pointer"
                          style={{
                            cursor: 'pointer',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid white',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                          }}
                          onClick={() => setShowEditProfile(true)}
                        >
                          <FaPen size={12} />
                        </label>
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
                            fontSize: "1.1rem",
                            opacity: 0.9,
                            maxWidth: "500px"
                          }}
                        >
                          {userData?.bio || "Tell your story..."}
                        </p>
                      </div>
                    </div>

                    <div className="col-md-4 mt-4 mt-md-0">
                      <div className="d-flex justify-content-around align-items-center">
                        {/* Followers Stats */}
                        <div className="text-center cursor-pointer" style={{ cursor: 'pointer' }} onClick={handleShowFollowers}>
                          <h3 className="mb-0 fw-bold" style={{ fontSize: '1.5rem' }}>
                            {userData?.followers?.length || 0}
                          </h3>
                          <p className="mb-0 " style={{ fontSize: '0.9rem' }}>
                            Followers
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="mx-2" style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }}></div>

                        {/* Following Stats */}
                        <div className="text-center cursor-pointer" style={{ cursor: 'pointer' }} onClick={handleShowFollowing}>
                          <h3 className="mb-0 fw-bold" style={{ fontSize: '1.5rem' }}>
                            {userData?.following?.length || 0}
                          </h3>
                          <p className="mb-0 " style={{ fontSize: '0.9rem' }}>
                            Following
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <Swiper
                  slidesPerView={8}
                  spaceBetween={6}
                  pagination={{ clickable: true }}
                  modules={[Pagination]}
                  className="stories-swiper "
                >
                  {/* Add Story Button */}
                  {/* Other users' stories */}
                  {Array.from(
                    new Map(
                      stories
                        // .filter(story => story.userId._id !== userId)
                        .map(story => [story.userId._id, story])
                    ).values()
                  ).map((story) => (
                    <SwiperSlide key={story._id} style={{ justifyItems: "center" }}>
                      <span className="d-block m-auto">{story.userId.userName}</span>
                      <StoryCircle
                        story={story}
                        onClick={handleStoryClick}
                        currentUserId={userId}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
            <button
              className="btn btn-primary rounded-circle position-fixed"
              style={{
                bottom: "30px",
                right: "30px",
                width: "60px",
                height: "60px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease"
              }}
              onClick={() => setShowModal(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
            >
              <FaPlus size={24} />
            </button>
            {/* Create Post Card - Enhanced */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                {/* <div className="d-flex align-items-center mb-3">
                  <img
                    src={userData?.profilePicture || "https://via.placeholder.com/40"}
                    alt="Profile"
                    className="rounded-circle me-3"
                    style={{ width: "40px", height: "40px", objectFit: "cover" }}
                  />
                  <button
                    className="btn btn-light flex-grow-1 text-start rounded-pill"
                    onClick={() => setShowModal(true)}
                    style={{
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
                  </button>
                </div> */}
                <div className="d-flex justify-content-between border-top pt-3">
                  <button
                    className="btn btn-sm btn-light rounded-pill d-flex align-items-center fs-sm"
                    onClick={() => setShowCreateStory(true)}
                    style={{
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
                    <i className="bi bi-camera-video-fill text-danger me-2"></i>
                    Create Story
                  </button>
                  <button
                    className="btn btn-light rounded-pill d-flex align-items-center"
                    onClick={() => setShowModal(true)}
                    style={{
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
                    <i className="bi bi-images text-success me-2"></i>
                    Photo/Video
                  </button>
                  <button
                    className="btn btn-light rounded-pill d-flex align-items-center"
                    onClick={() => setShowModal(true)}
                    style={{
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
                    <i className="bi bi-emoji-smile text-warning me-2"></i>
                    Feeling/Activity
                  </button>
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
                  {filteredPosts.map((post) => (
                    <div key={post._id} className="col-lg-4 col-md-6 col-6">
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
                  {posts.map((post) => (
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
                                onClick={() => handleLikePost(post._id)}
                              >
                                <i className={`bi ${post.likes?.includes(userData?._id) ? "bi-heart-fill text-danger" : "bi-heart"} fs-4`}></i>
                              </button>
                              <button
                                className="btn p-0 me-3"
                                onClick={() => handlePostClick(post._id)}
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
                            <p className="text-muted small mb-0">
                              View all {post.comments.length} comments
                            </p>
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
                    <h5>Saved Items</h5>
                    <p className="text-muted">Save photos and videos to your collection</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-lg-3 d-none d-lg-block">
            <div className="sticky-top" style={{ top: "70px", zIndex:10 }}>
              {suggestions &&
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

      {showEditProfile && userData && (
        <EditProfile
          show={showEditProfile}
          onHide={() => setShowEditProfile(false)}
          userData={userData}
          onSave={handleSave}
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
        stories={stories}
        currentStoryIndex={selectedStoryIndex}
      />

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
