import React, { useState, useEffect, useContext, useRef } from "react";
import { FaCamera, FaBookmark, FaUserEdit, FaBell, FaPencilAlt, FaUserCog} from "react-icons/fa";
import { IoGridSharp } from "react-icons/io5";
import { PiSlideshowFill } from "react-icons/pi";
import { GiSouthAfricaFlag } from "react-icons/gi";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";
import { UserContext } from "../contexts/UserContext";
import moment from "moment";

import EditProfile from "../components/EditProfile";
import CustomModal from "../components/customModal";
import PostDetail from "../components/PostDetail";
import StoryViewer from "../components/StoryViewer";
import FriendSuggestion from "../components/FriendSuggestion";
import FollowModal from "../components/FollowModal";
import CreateStory from "../components/CreateStory";
import BirthdaysCard from "../components/BirthdaysCard";
import Loader from "../components/Loader";
import SavedPosts from "./SavedPosts";

import {
  getPostById,
  fetchSuggestions,
  getuser,
  getUserPosts,
  getNotifications as getProfileNotifications,
  getStories,
  getTrendingTopics,
  getEvents,
  createStory,
  updateUserProfile,
  likePost,
  unlikePost,
  sharePost,
  savePost,
  followUser,
  unfollowUser,
  addComment,
  deleteComment,
} from "../services/profileService";
import { createNotification, updateNotification } from "../services/notificationService";
import { getFollowers, getFollowing } from "../services/relationships";

/* ─── design tokens ──────────────────────────────────────────────── */
const tokens = {
  radius: { md: "8px", lg: "12px", xl: "16px", full: "9999px" },
  border: (dark) => `0.5px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
  surface: (dark) => (dark ? "#111111" : "#ffffff"),
  page: (dark) => (dark ? "#000000" : "#f4f6f8"),
  surfaceAlt: (dark) => (dark ? "#1a1a1a" : "#f8f9fa"),
  text: (dark) => (dark ? "#f0f0f0" : "#111111"),
  textMuted: (dark) => (dark ? "#888888" : "#6b7280"),
  accent: "#378ADD",
  accentBg: (dark) => (dark ? "#0C447C22" : "#E6F1FB"),
  accentText: (dark) => (dark ? "#85B7EB" : "#185FA5"),
  danger: "#E24B4A",
  success: "#1D9E75",
  warning: "#EF9F27",
};

/* ─── tiny reusable atoms ────────────────────────────────────────── */
const Avatar = ({ src, name, size = 40, ring = false, dark }) => {
  const initials = name?.charAt(0)?.toUpperCase() || "?";
  const base = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    objectFit: "cover",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 500,
    fontSize: size * 0.35,
    background: tokens.accentBg(dark),
    color: tokens.accentText(dark),
    border: ring ? `2px solid ${tokens.accent}` : "none",
  };
  return src ? (
    <img src={src} alt={name} style={{ ...base, padding: ring ? 2 : 0 }} />
  ) : (
    <div style={base}>{initials}</div>
  );
};

const Divider = ({ dark }) => (
  <div style={{ height: "0.5px", background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", margin: "14px 0" }} />
);

const SectionLabel = ({ children, dark }) => (
  <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.8px", textTransform: "uppercase", color: tokens.textMuted(dark), margin: "0 0 10px" }}>
    {children}
  </p>
);

const IconBtn = ({ icon, onClick, dark, label }) => (
  <button
    aria-label={label}
    onClick={onClick}
    style={{
      background: "transparent",
      border: tokens.border(dark),
      borderRadius: tokens.radius.md,
      padding: "7px 10px",
      cursor: "pointer",
      color: tokens.textMuted(dark),
      fontSize: 15,
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
    }}
  >
    {icon}
  </button>
);

/* ─── main component ─────────────────────────────────────────────── */
const ProfilePage = () => {
  const { isDark } = useContext(ThemeContext);
  const { socket, unseenMessages, setFlag, setUserId } = useContext(UserContext);
  const { user } = useContext(UserContext);
  const userId = user?._id;

  const { userProfileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [storyGroups, setStoryGroups] = useState([]);

  const [activeTab, setActiveTab] = useState("grid");
  const [commentInputs, setCommentInputs] = useState({});
  const [showCommentInputs, setShowCommentInputs] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const token = localStorage.getItem("token");
  const apiUrl = process.env.REACT_APP_API_URL;

  const d = isDark; // shorthand

  /* ── data loading ── */
  const loadFollowData = async () => {
    if (!userId) return;
    const [res, res1] = await Promise.all([getFollowers(userId), getFollowing(userId)]);
    setFollowers(res);
    setFollowing(res1);
  };

  const fetchPosts = async () => {
    if (!userId) return;
    try {
      const data = await getUserPosts(userId);
      setPosts(data.posts);
    } catch (e) {
      console.error("Error fetching posts:", e);
    }
  };

  const fetchPostById = async (postId, dataType) => {
    const response = await getPostById(postId);
    const currentPost = response.post;
    setPosts((prev) =>
      prev?.map((post) => {
        if (post._id !== currentPost._id) return post;
        if (dataType === "comment") {
          return { ...post, latestComment: currentPost.comments[currentPost.comments.length - 1], comments: currentPost.comments };
        }
        if (dataType === "like") return { ...post, likes: currentPost.likes };
        return { ...currentPost };
      })
    );
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const notifs = await getProfileNotifications(user?._id);
      setNotifications(notifs || []);
      setUnreadCount(notifs?.filter((n) => !n.read).length || 0);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };

  useEffect(() => {
    const loggedIn = JSON.parse(localStorage.getItem("user"));
    if (!loggedIn) navigate("/login");
  }, []);

  useEffect(() => {
    if (userId) loadFollowData();
  }, [userId]);

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("got_a_notification", (data) => {
      fetchNotifications();
      if (data.type === "comment" || data.type === "like") fetchPostById(data.postId, data.type);
    });
    return () => socket.off("got_a_notification");
  }, [socket]);

  /* ── handlers ── */
  const handleToggleLike = async (index, post, isLiked) => {
    try {
      isLiked ? await unlikePost(post._id) : await likePost(post._id);
      setPosts((prev) =>
        prev?.map((p, i) =>
          i === index
            ? { ...p, likes: isLiked ? p.likes.filter((l) => l.userId._id !== userId) : [...p.likes, { userId: { _id: userId } }] }
            : p
        )
      );
    } catch (e) {
      console.error("Error toggling like:", e);
    }
  };

  const handleAddComment = async (post, commentText) => {
    try {
      const response = await addComment(post._id, commentText);
      setCommentInputs((prev) => ({ ...prev, [post._id]: "" }));
      setShowCommentInputs((prev) => ({ ...prev, [post._id]: false }));
      setPosts((prev) =>
        prev?.map((p) => (p._id === post._id ? { ...p, comments: [...p.comments, response.comment] } : p))
      );
    } catch (e) {
      console.error("Error adding comment:", e);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await deleteComment(postId, commentId);
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, comments: p.comments.filter((c) => c._id !== commentId) } : p))
      );
    } catch (e) {
      console.error("Error deleting comment:", e);
    }
  };

  const handleSharePost = async (postId) => { try { await sharePost(postId); } catch (e) { console.error(e); } };
  const handleSavePost = async (postId) => { try { await savePost(postId); } catch (e) { console.error(e); } };
  const handleFollowUser = async (uid) => { try { await followUser(uid); loadFollowData(); } catch (e) { console.error(e); } };
  const handleUnfollowUser = async (uid) => { try { await unfollowUser(uid); loadFollowData(); } catch (e) { console.error(e); } };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await updateNotification(notificationId, true);
      setNotifications((prev) => prev?.map((n) => (n._id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await fetch(`${apiUrl}/notifications/${notificationId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const handleSave = async (profileData) => {
    try {
      const updated = await updateUserProfile(userId, profileData);
      localStorage.setItem("user", JSON.stringify(updated));
      setShowProfileModal(false);
    } catch (e) { console.error(e); }
  };

  const handleCreateStory = async (storyData) => {
    try {
      const data = await createStory(storyData);
      setStories((prev) => [data.story, ...prev]);
      setShowCreateStory(false);
      socket.emit("emit_notification", { sender: userId, type: "story", message: `${user?.userName} added a story`, createdAt: new Date().toISOString(), read: false });
    } catch (e) { console.error(e); }
  };

  const logOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleScroll = (e) => {
    const cur = e.target.scrollTop;
    setIsNavVisible(cur <= lastScrollY.current || cur <= 50);
    lastScrollY.current = cur;
  };

  const filteredPosts = posts?.filter(
    (p) => p?.text?.toLowerCase().includes(searchTerm.toLowerCase()) || p?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: "grid", label: "Posts", icon: <IoGridSharp size={14} /> },
    { id: "slideshow", label: "Reels", icon: <PiSlideshowFill size={14} /> },
    { id: "saved", label: "Saved", icon: <FaBookmark size={13} /> },
  ];

  /* ── styles ── */
  const s = {
    page: { background: tokens.page(d), fontFamily: "'Inter', 'Poppins', sans-serif", color: tokens.text(d), transition: "background 0.3s, color 0.3s" },
    layout: { display: "grid", gridTemplateColumns: "260px 1fr 240px", gap: 0, maxWidth: 1200, margin: "0 auto",  },
    sidebar: { padding: "20px 16px", position: "sticky", height: "calc(100vh - 70px)", overflowY: "auto", scrollbarWidth: "none" },
    sidebarBorder: (side) => ({ borderRight: side === "left" ? tokens.border(d) : "none", borderLeft: side === "right" ? tokens.border(d) : "none" }),
    main: { borderLeft: tokens.border(d), borderRight: tokens.border(d) },
    card: { background: tokens.surface(d), border: tokens.border(d), borderRadius: tokens.radius.lg },
  };

  /* ── left sidebar ── */
  const LeftSidebar = () => (
    <div style={{ ...s.sidebar, ...s.sidebarBorder("left") }} className="d-none d-md-block">
      <SectionLabel dark={d}>Contacts</SectionLabel>
      {(friends?.length ? friends.slice(0, 5) : []).map((friend) => (
        <a key={friend._id} href={`/profile/${friend.friendId._id}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: tokens.border(d), cursor: "pointer" }}>
          <Avatar src={friend.friendId.profilePicture} name={friend.friendId.firstName} size={34} dark={d} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: tokens.text(d), fontWeight: 400 }}>{friend.friendId.firstName} {friend.friendId.lastName}</div>
            <div style={{ fontSize: 11, color: tokens.textMuted(d) }}>{friend.friendId.email}</div>
          </div>
        </a>
      ))}
      {friends?.length === 0 && <p style={{ fontSize: 13, color: tokens.textMuted(d) }}>No contacts yet</p>}

      <Divider dark={d} />

      <SectionLabel dark={d}>Suggested</SectionLabel>
      {suggestions?.slice(0, 3).map((s_) => (
        <div key={s_._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <Avatar src={s_.profilePicture} name={s_.userName} size={36} dark={d} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: tokens.text(d), fontWeight: 400 }}>{s_.userName}</div>
            <div style={{ fontSize: 11, color: tokens.textMuted(d) }}>Suggested</div>
          </div>
          <button onClick={() => handleFollowUser(s_._id)} style={{ fontSize: 12, fontWeight: 500, color: tokens.accent, background: "none", border: `0.5px solid ${tokens.accent}44`, borderRadius: tokens.radius.md, padding: "4px 10px", cursor: "pointer" }}>
            Follow
          </button>
        </div>
      ))}
    </div>
  );

  /* ── right sidebar ── */
  const RightSidebar = () => (
    <div style={{ ...s.sidebar, ...s.sidebarBorder("right") }} className="d-none d-md-block">
      <SectionLabel dark={d}>Birthdays</SectionLabel>
      <BirthdaysCard userId={userId} theme={d ? "dark" : "light"} />

      <Divider dark={d} />

      <SectionLabel dark={d}>Trending</SectionLabel>
      {trendingTopics?.slice(0, 4).map((topic, i) => (
        <div key={i} style={{ padding: "8px 0", borderBottom: i < 3 ? tokens.border(d) : "none" }}>
          <div style={{ fontSize: 11, color: tokens.textMuted(d) }}>#{topic.category || "Trending"}</div>
          <div style={{ fontSize: 13, color: tokens.text(d), fontWeight: 500, marginTop: 2 }}>{topic.title || topic.name}</div>
          <div style={{ fontSize: 11, color: tokens.textMuted(d), marginTop: 2 }}>{topic.postCount || "—"} posts</div>
        </div>
      ))}
      {trendingTopics?.length === 0 && (
        <p style={{ fontSize: 13, color: tokens.textMuted(d) }}>Nothing trending right now</p>
      )}
    </div>
  );

  /* ── profile header ── */
  const ProfileHeader = () => (
    <div style={{ background: tokens.surface(d), borderBottom: tokens.border(d), padding: "24px 28px 0", margin: "5px 0px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        {/* avatar with story ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", padding: 3, border: `2px solid ${tokens.accent}`, background: tokens.surface(d) }}>
            <Avatar src={user?.profilePicture} name={user?.userName} size={74} dark={d} />
          </div>
        </div>

        {/* meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: tokens.text(d), letterSpacing: "-0.3px" }}>{user?.userName}</div>
          <div style={{ fontSize: 13, color: tokens.textMuted(d), marginTop: 2 }}>{user?.firstName} {user?.lastName}</div>
          <p style={{ fontSize: 13, color: tokens.textMuted(d), marginTop: 8, lineHeight: 1.55, maxWidth: 360 }}>{user?.bio || "No bio yet."}</p>
        </div>

        {/* actions */}
        
      </div>
      
      {/* stats row */}
      <div style={{ display: "flex", gap: 20, marginTop: 20, paddingBottom: 20, textAlign: "center", }}>
        <div style={{ cursor: "default" }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: tokens.text(d) }}>{posts?.length || 0}</div>
          <div style={{ fontSize: 12, color: tokens.textMuted(d), marginTop: 1 }}>Posts</div>
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => setShowFollowersModal(true)}>
          <div style={{ fontSize: 17, fontWeight: 500, color: tokens.text(d) }}>{followers?.length || 0}</div>
          <div style={{ fontSize: 12, color: tokens.textMuted(d), marginTop: 1 }}>Followers</div>
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => setShowFollowingModal(true)}>
          <div style={{ fontSize: 17, fontWeight: 500, color: tokens.text(d) }}>{following?.length || 0}</div>
          <div style={{ fontSize: 12, color: tokens.textMuted(d), marginTop: 1 }}>Following</div>
        </div>
      </div>
    </div>
  );

  /* ── story bar ── */
  const StoryBar = () => (
    <div style={{ display: "flex", gap: 14, padding: "14px 28px", borderBottom: tokens.border(d), background: tokens.surface(d), overflowX: "auto", scrollbarWidth: "none" }}>
      {/* add story */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }} onClick={() => setShowCreateStory(true)}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", border: tokens.border(d), background: tokens.surfaceAlt(d), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: tokens.textMuted(d) }}>+</div>
        <span style={{ fontSize: 10, color: tokens.textMuted(d), whiteSpace: "nowrap" }}>Your story</span>
      </div>

      {/* existing stories */}
      {stories?.map((story, i) => (
        <div key={story._id || i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}
          onClick={() => { setSelectedStoryGroup(story); setIsStoryViewerOpen(true); }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", padding: 2, border: `2px solid ${tokens.accent}`, background: tokens.surface(d) }}>
            <Avatar src={story.userId?.profilePicture} name={story.userId?.userName || "?"} size={44} dark={d} />
          </div>
          <span style={{ fontSize: 10, color: tokens.textMuted(d), maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {story.userId?.firstName || "User"}
          </span>
        </div>
      ))}
    </div>
  );

  /* ── tab bar ── */
  const TabBar = () => (
    <div style={{ display: "flex",justifyContent: "space-between", background: tokens.surface(d), borderBottom: tokens.border(d), padding: "0 28px" }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "12px 0", marginRight: 28, background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? tokens.text(d) : "transparent"}`, fontSize: 11, fontWeight: 500, letterSpacing: "0.6px", textTransform: "uppercase", color: activeTab === tab.id ? tokens.text(d) : tokens.textMuted(d), cursor: "pointer", transition: "color 0.15s",
        }}>
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );

  /* ── post grid ── */
  const PostGrid = () => (
    <div style={{ padding: "3px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
      {filteredPosts?.slice().reverse().map((post) => (
        <div key={post._id} onClick={() => navigate(`/postDetails/${post._id}`)} style={{ aspectRatio: "1/1", background: tokens.surfaceAlt(d), borderRadius: 2, overflow: "hidden", cursor: "pointer", position: "relative" }}>
          {post.media ? (
            <img src={post.media} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: tokens.textMuted(d) }}>
              <i className="bi bi-image" />
            </div>
          )}
          <div className="tile-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", opacity: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, color: "#fff", fontSize: 13, fontWeight: 500, transition: "opacity 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><i className="bi bi-heart-fill" /> {post.likes?.length || 0}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><i className="bi bi-chat-fill" /> {post.comments?.length || 0}</span>
          </div>
        </div>
      ))}
      {(!filteredPosts || filteredPosts.length === 0) && (
        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: tokens.textMuted(d) }}>
          <i className="bi bi-camera" style={{ fontSize: 40, display: "block", marginBottom: 12 }} />
          <div style={{ fontWeight: 500, fontSize: 15, color: tokens.text(d), marginBottom: 6 }}>No posts yet</div>
          <div style={{ fontSize: 13 }}>Share your first post to get started.</div>
          <button onClick={() => setShowModal(true)} style={{ marginTop: 16, background: tokens.text(d), color: tokens.surface(d), border: "none", borderRadius: tokens.radius.full, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Create post
          </button>
        </div>
      )}
    </div>
  );

  /* ── slideshow / feed ── */
  const PostFeed = () => (
    <div style={{ padding: "16px 16px" }}>
      {filteredPosts?.slice().reverse().map((post, index) => (
        <div key={post._id} style={{ ...s.card, marginBottom: 16, overflow: "hidden" }}>
          {/* post header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: tokens.border(d) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar src={post.userId?.profilePicture} name={post.userId?.userName} size={40} dark={d} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: tokens.text(d) }}>{post.userId?.userName}</div>
                <div style={{ fontSize: 11, color: tokens.textMuted(d) }}>{moment(post.createdAt).fromNow()}</div>
              </div>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted(d), fontSize: 16 }}>
              <i className="bi bi-three-dots" />
            </button>
          </div>

          {/* media */}
          {post.media && (
            <div style={{ background: d ? "#000" : "#f0f0f0", aspectRatio: "1/1", backgroundImage: `url(${post.media})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }} />
          )}

          {/* actions */}
          <div style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <button onClick={() => handleToggleLike(index, post, post.likes?.some((l) => l.userId._id === userId))}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: post.likes?.some((l) => l.userId._id === userId) ? tokens.danger : tokens.text(d), padding: 0 }}>
                  <i className={`bi ${post.likes?.some((l) => l.userId._id === userId) ? "bi-heart-fill" : "bi-heart"}`} />
                </button>
                <button onClick={() => setShowCommentInputs((prev) => ({ ...prev, [post._id]: !prev[post._id] }))}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: tokens.text(d), padding: 0 }}>
                  <i className="bi bi-chat" />
                </button>
                <button onClick={() => handleSharePost(post._id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: tokens.text(d), padding: 0 }}>
                  <i className="bi bi-send" />
                </button>
              </div>
              <button onClick={() => handleSavePost(post._id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: post.savedBy?.includes(userId) ? tokens.accent : tokens.text(d), padding: 0 }}>
                <i className={`bi ${post.savedBy?.includes(userId) ? "bi-bookmark-fill" : "bi-bookmark"}`} />
              </button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 500, color: tokens.text(d), marginBottom: 6 }}>
              {post.likes?.length > 0 ? `${post.likes.length.toLocaleString()} likes` : "Be the first to like"}
            </div>

            {post.text && (
              <p style={{ fontSize: 13, color: tokens.text(d), margin: 0 }}>
                <span style={{ fontWeight: 500, marginRight: 6 }}>{post.userId?.firstName}</span>{post.text}
              </p>
            )}

            {post.comments?.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: tokens.border(d) }}>
                <span style={{ fontSize: 12, color: tokens.textMuted(d), cursor: "pointer" }} onClick={() => navigate(`/postDetails/${post._id}`)}>
                  View all {post.comments.length} comments
                </span>
                {post.comments.slice(-2).map((comment, idx) => (
                  <div key={comment._id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 6 }}>
                    <p style={{ fontSize: 13, color: tokens.text(d), margin: 0 }}>
                      <span style={{ fontWeight: 500, marginRight: 6 }}>{comment.userId?.firstName}:</span>{comment.text}
                    </p>
                    {(comment.userId?._id === userId || post.userId._id === userId) && (
                      <button onClick={() => handleDeleteComment(post._id, comment._id)} style={{ background: "none", border: "none", cursor: "pointer", color: tokens.danger, fontSize: 12, padding: 0, flexShrink: 0 }}>
                        <i className="bi bi-trash" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showCommentInputs[post._id] && (
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={commentInputs[post._id] || ""}
                  onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post._id]: e.target.value }))}
                  onKeyPress={(e) => e.key === "Enter" && commentInputs[post._id]?.trim() && handleAddComment(post, commentInputs[post._id])}
                  style={{ flex: 1, background: tokens.surfaceAlt(d), border: tokens.border(d), borderRadius: tokens.radius.md, padding: "7px 12px", fontSize: 13, color: tokens.text(d), outline: "none" }}
                />
                <button
                  onClick={() => commentInputs[post._id]?.trim() && handleAddComment(post, commentInputs[post._id])}
                  disabled={!commentInputs[post._id]?.trim()}
                  style={{ background: tokens.accent, color: "#fff", border: "none", borderRadius: tokens.radius.md, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: commentInputs[post._id]?.trim() ? 1 : 0.5 }}>
                  Post
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  /* ── render ── */
  return (
    <div style={s.page}>
      {showProfileModal && user && (
        <EditProfile setShowProfileModal={setShowProfileModal} show={showProfileModal} onHide={() => setShowProfileModal(false)} user={user} onSave={handleSave}
          onSettings={() => { navigate("/settings"); setShowProfileModal(false); }} onLogout={logOut} theme={d ? "dark" : "light"} />
      )}

      <div className="row">
        <div className="d-none d-md-block col-md-3 " style={{ background: tokens.surface(d), padding: "12px 16px", borderBottom: tokens.border(d) }}>
          <LeftSidebar />
        </div>

        {/* main column */}
        <div style={s.main} onScroll={handleScroll} className="main-scroll col-md-6">
          {user && <div className=" "><ProfileHeader /></div>}
          <StoryBar />
          <TabBar />

          <div>
            {activeTab === "grid" && <PostGrid />}
            {activeTab === "slideshow" && <PostFeed />}
            {activeTab === "saved" && (
              <div style={{ padding: 28 }}>
                <SavedPosts theme={d ? "dark" : "light"} />
              </div>
            )}
          </div>
        </div>
        <div className="col-0 col-md-3 " style={{ background: tokens.surface(d), padding: "12px 16px", borderBottom: tokens.border(d) }}>
          <RightSidebar />
        </div>

      </div>

      {/* mobile floating dock */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 20, padding: "10px 24px",
        background: d ? "rgba(17,17,17,0.88)" : "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)", borderRadius: tokens.radius.full, border: tokens.border(d),
        boxShadow: d ? "0 4px 24px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.1)",
        zIndex: 1000, opacity: isNavVisible ? 1 : 0, transition: "opacity 0.25s", pointerEvents: isNavVisible ? "auto" : "none",
      }} className=" d-flex">
      
          <button onClick={() => setShowProfileModal(true)} style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted(d), fontSize: 18, padding: 0 }} title="Edit profile">
           <FaUserEdit style={{ marginRight: 6 }} />

          </button>
         <div style={{ width: 1, height: 16, background: d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
        <button onClick={() => setShowCreateStory(true)} title="Create story" style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted(d), fontSize: 18, padding: 0 }}>
          <FaCamera />
        </button>
        <div style={{ width: 1, height: 16, background: d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
        <button onClick={() => setShowModal(true)} title="Create post" style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted(d), fontSize: 18, padding: 0 }}>
          <FaPencilAlt />
        </button>
        <div style={{ width: 1, height: 16, background: d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
    
        {unreadCount > 0 && (
          <>
            <div style={{ width: 1, height: 16, background: d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
            <button title="Notifications" style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted(d), fontSize: 18, padding: 0, position: "relative" }}>
              <FaBell />
              <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, background: tokens.danger, borderRadius: "50%", fontSize: 9, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </button>
          </>
        )}
      </div>

      {/* modals */}
      {showModal && <CustomModal handleAddPost={async (text, media) => {
        const formData = new FormData();
        formData.append("userId", userId);
        if (text) formData.append("text", text);
        if (media) formData.append("media", media.file);
        const res = await fetch(`${apiUrl}/post/mediaPost`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) { setPosts((prev) => [...(prev || []), data.post]); setShowModal(false); }
      }} showModal={showModal} onClose={() => setShowModal(false)} theme={d ? "dark" : "light"} />}

      <FollowModal show={showFollowersModal} onHide={() => setShowFollowersModal(false)} title="Followers" users={followers} currentUserId={userId} theme={d ? "dark" : "light"} />
      <FollowModal show={showFollowingModal} onHide={() => setShowFollowingModal(false)} title="Following" users={following} currentUserId={userId} theme={d ? "dark" : "light"} />
      <CreateStory show={showCreateStory} onHide={() => setShowCreateStory(false)} onCreateStory={handleCreateStory} user={user} theme={d ? "dark" : "light"} />
      <StoryViewer show={isStoryViewerOpen} onHide={() => setIsStoryViewerOpen(false)} setStoryGroups={setStoryGroups} storyGroups={storyGroups} initialGroup={selectedStoryGroup} theme={d ? "dark" : "light"} />
      {showPostDetail && selectedPostId && <PostDetail postId={selectedPostId} show={showPostDetail} onHide={() => setShowPostDetail(false)} onPostUpdated={fetchPosts} theme={d ? "dark" : "light"} />}

      <style>{`
        .main-scroll {
          height: calc(100vh - 70px);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .main-scroll::-webkit-scrollbar { display: none; }
        .tile-overlay { opacity: 0 !important; }
        .tile-overlay:hover { opacity: 1 !important; }
        @media (max-width: 991px) {
          .main-scroll { height: auto; overflow-y: unset; }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;