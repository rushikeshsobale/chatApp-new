import React, { useState, useEffect, useContext, useRef } from "react";
import {
  FaCamera, FaBookmark, FaRegBookmark, FaUserEdit, FaBell, FaPencilAlt, FaUserCog, FaLock, FaPlay,
  FaHeart, FaRegHeart, FaComment, FaPaperPlane, FaTrash, FaEllipsisH,
} from "react-icons/fa";
import { IoGridSharp } from "react-icons/io5";
import { PiSlideshowFill } from "react-icons/pi";
import { useParams, useNavigate } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";
import { UserContext } from "../contexts/UserContext";
import moment from "moment";

import EditProfile from "../components/EditProfile";
import CustomModal from "../components/customModal";
import PostViewer from "../components/PostViewer";
import StoryViewer from "../components/StoryViewer";
import FollowModal from "../components/FollowModal";
import CreateStory from "../components/CreateStory";
import BirthdaysCard from "../components/BirthdaysCard";
import SavedPosts from "./SavedPosts";

import {
  getPostById,
  getUserPosts,
  getNotifications as getProfileNotifications,
  getUserStories,
  createStory,
  updateUserProfile,
  likePost,
  unlikePost,
  sharePost,
  savePost,
  unsavePost,
  addComment,
  deleteComment,
  editPost,
  deletePost,
  fetchSuggestions,
  getUserProfilePage,
} from "../services/profileService";
import { updateNotification } from "../services/notificationService";
import { getFollowers, getFollowing, sendFollowRequest, unfollowUser as unfollowRelationship } from "../services/relationships";
import tokens from "../styles/designTokens";

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
    title={label}
    onClick={onClick}
    style={{
      background: "transparent",
      border: tokens.border(dark),
      borderRadius: tokens.radius.md,
      padding: "8px 10px",
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

const PrimaryBtn = ({ children, onClick, dark, disabled, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: "flex", alignItems: "center", gap: 7, background: tokens.accent, color: "#fff",
      border: "none", borderRadius: tokens.radius.md, padding: "9px 18px", fontSize: 13, fontWeight: 600,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap", ...style,
    }}
  >
    {children}
  </button>
);

const GhostBtn = ({ children, onClick, dark, disabled, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: "flex", alignItems: "center", gap: 7, background: "transparent", color: tokens.text(dark),
      border: tokens.border(dark), borderRadius: tokens.radius.md, padding: "9px 18px", fontSize: 13, fontWeight: 600,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap", ...style,
    }}
  >
    {children}
  </button>
);

const Skel = ({ w, h, radius = 6, style }) => (
  <div className="hb-skel" style={{ width: w, height: h, borderRadius: radius, ...style }} />
);

// Older posts predate the mediaType field, so fall back to sniffing the
// file extension off the (signed) media url.
const isVideoPost = (post) =>
  post.mediaType ? post.mediaType === "video" : /\.(mp4|mov|webm|ogg)(\?|$)/i.test(post.media || "");

/* ─── main component ─────────────────────────────────────────────── */
const ProfilePage = () => {
  const { isDark } = useContext(ThemeContext);
  const { socket } = useContext(UserContext);
  const { user, setUser } = useContext(UserContext);
  const loggedInUserId = user?._id;

  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();

  const profileUserId = routeUserId || loggedInUserId;

  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [storyGroups, setStoryGroups] = useState([]);

  const [activeTab, setActiveTab] = useState("grid");
  const [commentInputs, setCommentInputs] = useState({});
  const [showCommentInputs, setShowCommentInputs] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [viewerPost, setViewerPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState(null);
  const [openMenuFor, setOpenMenuFor] = useState(null);

  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const token = localStorage.getItem("token");
  const apiUrl = process.env.REACT_APP_API_URL;

  const d = isDark; // shorthand
  const isOwnProfile = profileUser ? profileUser.isOwnProfile : !routeUserId;
  const isLocked = !!profileUser?.isLocked;

  /* ── data loading ── */
  const loadProfileMeta = async (id) => {
    if (!id) return;
    setProfileLoading(true);
    setProfileNotFound(false);
    try {
      const data = await getUserProfilePage(id);
      setProfileUser(data.user);
    } catch (e) {
      console.error("Error fetching profile:", e);
      setProfileUser(null);
      setProfileNotFound(true);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadFollowData = async () => {
    if (!profileUserId) return;
    const [res, res1] = await Promise.all([getFollowers(profileUserId), getFollowing(profileUserId)]);
    setFollowers(res || []);
    setFollowing(res1 || []);
  };

  const fetchPosts = async () => {
    if (!profileUserId) return;
    setPostsLoading(true);
    try {
      const data = await getUserPosts(profileUserId);
      setPosts(data.posts);
    } catch (e) {
      console.error("Error fetching posts:", e);
    } finally {
      setPostsLoading(false);
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

  const fetchStories = async () => {
    if (!profileUserId) return;
    try {
      const data = await getUserStories(profileUserId);
      const userStories = data?.stories || [];
      setStories(userStories);
      setStoryGroups(
        userStories.length > 0
          ? [{ user: userStories[0].userId, stories: userStories }]
          : []
      );
    } catch (e) {
      console.error("Error fetching stories:", e);
    }
  };

  useEffect(() => {
    const loggedIn = JSON.parse(localStorage.getItem("user"));
    if (!loggedIn) navigate("/login");
  }, []);

  // reset the active tab whenever we navigate to a different profile
  useEffect(() => {
    setActiveTab("grid");
  }, [profileUserId]);

  useEffect(() => {
    loadProfileMeta(profileUserId);
  }, [profileUserId]);

  useEffect(() => {
    if (!profileUserId || !profileUser) return;
    if (profileUser.isLocked) {
      setPosts([]);
      setStories([]);
      setStoryGroups([]);
      setFollowers([]);
      setFollowing([]);
      setPostsLoading(false);
      return;
    }
    fetchPosts();
    fetchStories();
    loadFollowData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId, profileUser?.isLocked]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, []);

  useEffect(() => {
    if (!isOwnProfile) {
      setSuggestions([]);
      return;
    }
    (async () => {
      try {
        const data = await fetchSuggestions();
        setSuggestions(data || []);
      } catch (e) {
        console.error("Error fetching suggestions:", e);
      }
    })();
  }, [isOwnProfile]);

  useEffect(() => {
    if (!socket) return;
    socket.on("got_a_notification", (data) => {
      fetchNotifications();
      if (data.type === "comment" || data.type === "like") fetchPostById(data.postId, data.type);
    });
    return () => socket.off("got_a_notification");
  }, [socket]);

  /* ── handlers ── */
  const handleToggleLike = async (post, isLiked) => {
    try {
      isLiked ? await unlikePost(post._id) : await likePost(post._id);
      setPosts((prev) =>
        prev?.map((p) =>
          p._id === post._id
            ? { ...p, likes: isLiked ? p.likes.filter((l) => l.userId._id !== loggedInUserId) : [...p.likes, { userId: { _id: loggedInUserId } }] }
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

  const handleToggleSave = async (post) => {
    const isSaved = post.savedBy?.includes(loggedInUserId);
    setPosts((prev) =>
      prev?.map((p) => (p._id === post._id
        ? { ...p, savedBy: isSaved ? p.savedBy.filter((id) => id !== loggedInUserId) : [...(p.savedBy || []), loggedInUserId] }
        : p))
    );
    try {
      if (isSaved) await unsavePost(post._id);
      else await savePost(post._id);
    } catch (e) {
      console.error("Error toggling save:", e);
      setPosts((prev) => prev?.map((p) => (p._id === post._id ? post : p)));
    }
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostError(null);
    setShowModal(true);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setProfileUser((p) => (p ? { ...p, postsCount: Math.max(0, (p.postsCount || 0) - 1) } : p));
      if (viewerPost?._id === postId) setViewerPost(null);
    } catch (e) {
      console.error("Error deleting post:", e);
      window.alert("Could not delete post. Please try again.");
    }
  };

  // Close any open post menu on an outside click
  useEffect(() => {
    if (!openMenuFor) return;
    const closeMenu = () => setOpenMenuFor(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openMenuFor]);

  const handleFollowSuggestion = async (uid) => {
    try {
      await sendFollowRequest(uid, "follow");
      setSuggestions((prev) => prev.filter((s) => s._id !== uid));
    } catch (e) { console.error(e); }
  };

  const handleToggleFollowProfile = async () => {
    if (!profileUser || followBusy) return;
    setFollowBusy(true);
    try {
      if (profileUser.isFollowing) {
        await unfollowRelationship(profileUserId);
        setProfileUser((p) => ({ ...p, isFollowing: false, followersCount: Math.max(0, (p.followersCount || 0) - 1) }));
      } else {
        await sendFollowRequest(profileUserId, "follow");
        setProfileUser((p) => ({ ...p, isFollowing: true, followersCount: (p.followersCount || 0) + 1 }));
      }
      loadFollowData();
    } catch (e) {
      console.error("Error toggling follow:", e);
    } finally {
      setFollowBusy(false);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await updateNotification(notificationId, true);
      setNotifications((prev) => prev?.map((n) => (n._id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await fetch(`${apiUrl}/notifications/${notificationId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, credentials: "include" });
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const handleSave = async (profileData) => {
    const { user: updatedUser } = await updateUserProfile(loggedInUserId, profileData);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    setShowProfileModal(false);
    loadProfileMeta(profileUserId);
  };

  const handleCreateStory = async (storyData) => {
    try {
      await createStory(storyData);
      await fetchStories();
      setShowCreateStory(false);
      socket.emit("emit_notification", { sender: loggedInUserId, type: "story", message: `${user?.userName} added a story`, createdAt: new Date().toISOString(), read: false });
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

  const tabs = [
    { id: "grid", label: "Posts", icon: <IoGridSharp size={14} /> },
    { id: "slideshow", label: "Reels", icon: <PiSlideshowFill size={14} /> },
    ...(isOwnProfile ? [{ id: "saved", label: "Saved", icon: <FaBookmark size={13} /> }] : []),
  ];

  const postsCount = isLocked ? (profileUser?.postsCount || 0) : (posts?.length ?? profileUser?.postsCount ?? 0);
  const followersCount = isLocked ? (profileUser?.followersCount || 0) : (followers?.length ?? profileUser?.followersCount ?? 0);
  const followingCount = isLocked ? (profileUser?.followingCount || 0) : (following?.length ?? profileUser?.followingCount ?? 0);

  /* ── styles ── */
  const s = {
    page: { background: tokens.page(d), fontFamily: "'Inter', 'Poppins', sans-serif", color: tokens.text(d), transition: "background 0.3s, color 0.3s" },
    sidebar: { padding: "16px 16px 16px 0", position: "sticky", top: 72, height: "calc(100vh - 88px)", overflowY: "auto", scrollbarWidth: "none", display: "flex", flexDirection: "column", gap: 16 },
    main: {},
    card: { background: tokens.surface(d), border: tokens.border(d), borderRadius: tokens.radius.lg, boxShadow: tokens.shadow(d) },
  };

  /* ── left sidebar ── */
  const LeftSidebar = () => (
    <div style={s.sidebar} className="d-none d-md-block">
      <div style={{ ...s.card, padding: 18 }}>
        <SectionLabel dark={d}>{isOwnProfile ? "Following" : `${profileUser?.userName || "Their"} follows`}</SectionLabel>
        {(following?.length ? following.slice(0, 5) : []).map((f) => (
          <a key={f._id} href={`/ProfilePage/${f.recipient?._id}`} className="hb-row-hover" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", margin: "0 -6px", borderRadius: tokens.radius.md, cursor: "pointer" }}>
            <Avatar src={f.recipient?.profilePicture} name={f.recipient?.userName} size={36} dark={d} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: tokens.text(d), fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.recipient?.userName}</div>
            </div>
          </a>
        ))}
        {following?.length === 0 && <p style={{ fontSize: 13, color: tokens.textMuted(d), margin: 0 }}>Not following anyone yet</p>}
      </div>

      {isOwnProfile && (
        <div style={{ ...s.card, padding: 18 }}>
          <SectionLabel dark={d}>Suggested for you</SectionLabel>
          {suggestions?.slice(0, 3).map((s_) => (
            <div key={s_._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <Avatar src={s_.profilePicture} name={s_.userName} size={36} dark={d} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: tokens.text(d), fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s_.userName}</div>
                <div style={{ fontSize: 11, color: tokens.textMuted(d) }}>Suggested</div>
              </div>
              <button onClick={() => handleFollowSuggestion(s_._id)} style={{ fontSize: 12, fontWeight: 600, color: tokens.accent, background: tokens.accentBg(d), border: "none", borderRadius: tokens.radius.full, padding: "5px 12px", cursor: "pointer", flexShrink: 0 }}>
                Follow
              </button>
            </div>
          ))}
          {suggestions?.length === 0 && <p style={{ fontSize: 13, color: tokens.textMuted(d), margin: 0 }}>No suggestions right now</p>}
        </div>
      )}
    </div>
  );

  /* ── right sidebar ── */
  const RightSidebar = () => (
    <div style={s.sidebar} className="d-none d-md-block">
      <div style={{ ...s.card, padding: 18 }}>
        <SectionLabel dark={d}>Birthdays</SectionLabel>
        <BirthdaysCard userId={loggedInUserId} theme={d ? "dark" : "light"} />
      </div>
    </div>
  );

  /* ── profile header ── */
  const HeaderSkeleton = () => (
    <div style={{ ...s.card, padding: "24px 28px", margin: "10px 0" }}>
      <div style={{ display: "flex", gap: 20 }}>
        <Skel w={80} h={80} radius="50%" />
        <div style={{ flex: 1 }}>
          <Skel w={160} h={18} style={{ marginBottom: 10 }} />
          <Skel w={100} h={12} style={{ marginBottom: 16 }} />
          <Skel w="70%" h={12} />
        </div>
      </div>
    </div>
  );

  const ProfileHeader = () => (
    <div style={{ ...s.card, padding: "10px 28px", margin: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
        {/* avatar with story ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", padding: 3, border: `2px solid ${tokens.accent}`, background: tokens.surface(d) }}>
            <Avatar src={profileUser?.profilePicture} name={profileUser?.userName} size={78} dark={d} />
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setShowProfileModal(true)}
              title="Change photo"
              style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: tokens.accent, color: "#fff", border: `2px solid ${tokens.surface(d)}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12 }}
            >
              <FaCamera />
            </button>
          )}
        </div>

        {/* meta */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: tokens.text(d), letterSpacing: "-0.3px" }}>{profileUser?.userName}</div>
              <div style={{ fontSize: 13, color: tokens.textMuted(d), marginTop: 2 }}>{profileUser?.firstName} {profileUser?.lastName}</div>
            </div>

            {/* actions */}
            <div style={{ display: "flex", gap: 8 }}>
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    style={{ background: 'none', color: "#fff", border: "1px solid #6366f1", borderRadius: tokens.radius.full, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.18s ease" }}
                  >
                    <FaUserEdit /> Edit profile
                  </button>
                  <IconBtn dark={d} icon={<FaUserCog />} label="Settings" onClick={() => navigate("/settings")} />
                </>
              ) : (
                <>
                  {profileUser?.isFollowing ? (
                    <GhostBtn dark={d} disabled={followBusy} onClick={handleToggleFollowProfile}>Following</GhostBtn>
                  ) : (
                    <PrimaryBtn dark={d} disabled={followBusy} onClick={handleToggleFollowProfile}>Follow</PrimaryBtn>
                  )}
                  <GhostBtn dark={d} onClick={() => navigate("/chats")}>Message</GhostBtn>
                </>
              )}
            </div>
          </div>

          <p style={{ fontSize: 13, color: tokens.textMuted(d), marginTop: 10, marginBottom: 0, lineHeight: 1.55, maxWidth: 420 }}>{profileUser?.bio || "No bio yet."}</p>
        </div>
      </div>

      {/* stats row */}
      <div style={{ display: "flex", gap: 28,  paddingTop: 18, borderTop: tokens.border(d) }}>
        <div style={{ cursor: "default" }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: tokens.text(d) }}>{postsCount}</div>
          <div style={{ fontSize: 12, color: tokens.textMuted(d), marginTop: 1 }}>Posts</div>
        </div>
        <div style={{ cursor: isLocked ? "default" : "pointer" }} onClick={() => !isLocked && setShowFollowersModal(true)}>
          <div style={{ fontSize: 17, fontWeight: 600, color: tokens.text(d) }}>{followersCount}</div>
          <div style={{ fontSize: 12, color: tokens.textMuted(d), marginTop: 1 }}>Followers</div>
        </div>
        <div style={{ cursor: isLocked ? "default" : "pointer" }} onClick={() => !isLocked && setShowFollowingModal(true)}>
          <div style={{ fontSize: 17, fontWeight: 600, color: tokens.text(d) }}>{followingCount}</div>
          <div style={{ fontSize: 12, color: tokens.textMuted(d), marginTop: 1 }}>Following</div>
        </div>
      </div>
    </div>
  );

  /* ── private account notice ── */
  const PrivateNotice = () => (
    <div style={{ ...s.card, textAlign: "center", padding: "56px 24px", margin: "10px 0" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: tokens.surfaceAlt(d), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22, color: tokens.textMuted(d) }}>
        <FaLock />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: tokens.text(d), marginBottom: 6 }}>This account is private</div>
      <div style={{ fontSize: 13, color: tokens.textMuted(d) }}>Follow {profileUser?.userName || "this account"} to see their photos and videos.</div>
    </div>
  );

  /* ── story bar ── */
  const StoryBar = () => (
    <div style={{ display: "flex", gap: 14, padding: "4px 28px", border: tokens.border(d), background: tokens.surface(d), overflowX: "auto", scrollbarWidth: "none" }}>
      {/* add story */}
      {isOwnProfile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }} onClick={() => setShowCreateStory(true)}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: tokens.border(d), background: tokens.surfaceAlt(d), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: tokens.textMuted(d) }}>+</div>
          <span style={{ fontSize: 10, color: tokens.textMuted(d), whiteSpace: "nowrap" }}>Your story</span>
        </div>
      )}

      {/* existing stories */}
      {stories?.map((story, i) => (
        <div key={story._id || i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}
          onClick={() => { setSelectedStoryGroup(storyGroups[0]); setIsStoryViewerOpen(true); }}>
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
    <div style={{ display: "flex", justifyContent: "space-between", background: tokens.surface(d), borderBottom: tokens.border(d), padding: "0 28px", margin: "5px 0px" }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "12px 0", marginRight: 28, background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? tokens.text(d) : "transparent"}`, fontSize: 11, fontWeight: 500, letterSpacing: "0.6px", textTransform: "uppercase", color: activeTab === tab.id ? tokens.text(d) : tokens.textMuted(d), cursor: "pointer", transition: "color 0.15s",
        }}>
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );

  /* ── post options menu (edit/delete, own posts only) ── */
  const PostMenu = ({ post }) => {
    if ((post.userId?._id || post.userId) !== loggedInUserId) return null;
    const open = openMenuFor === post._id;
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenMenuFor(open ? null : post._id); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted(d), fontSize: 16 }}
          aria-label="Post options"
        >
          <FaEllipsisH />
        </button>
        {open && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: tokens.surface(d), border: tokens.border(d), borderRadius: tokens.radius.md, boxShadow: tokens.shadow(d), overflow: "hidden", zIndex: 10, minWidth: 120 }}
          >
            <button
              onClick={() => { setOpenMenuFor(null); openEditPost(post); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: tokens.text(d) }}
            >
              Edit
            </button>
            <button
              onClick={() => { setOpenMenuFor(null); handleDeletePost(post._id); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: tokens.danger }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ── post grid ── */
  const PostGridSkeleton = () => (
    <div style={{ padding: "3px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <Skel key={i} radius={2} style={{ aspectRatio: "1/1", width: "100%", height: "auto" }} />
      ))}
    </div>
  );

  const PostGrid = () => (
    <div style={{ padding: "3px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
      {posts?.map((post) => (
        <div key={post._id} onClick={() => setViewerPost(post)} style={{ aspectRatio: "1/1", background: tokens.surfaceAlt(d), borderRadius: 2, overflow: "hidden", cursor: "pointer", position: "relative" }}>
          {post.media ? (
            isVideoPost(post) ? (
              <video src={post.media} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <img src={post.media} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: tokens.textMuted(d) }}>
              <FaCamera />
            </div>
          )}
          {post.media && isVideoPost(post) && (
            <span style={{ position: "absolute", top: 6, right: 6, color: "#fff", fontSize: 13, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}>
              <FaPlay />
            </span>
          )}
          <div className="tile-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", opacity: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, color: "#fff", fontSize: 13, fontWeight: 500, transition: "opacity 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><FaHeart size={13} /> {post.likes?.length || 0}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><FaComment size={13} /> {post.comments?.length || 0}</span>
          </div>
        </div>
      ))}
      {(!posts || posts.length === 0) && (
        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: tokens.textMuted(d) }}>
          <FaCamera style={{ fontSize: 40, display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 500, fontSize: 15, color: tokens.text(d), marginBottom: 6 }}>No posts yet</div>
          {isOwnProfile && (
            <>
              <div style={{ fontSize: 13 }}>Share your first post to get started.</div>
              <button onClick={() => setShowModal(true)} style={{ marginTop: 16, background: tokens.text(d), color: tokens.surface(d), border: "none", borderRadius: tokens.radius.full, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Create post
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  /* ── slideshow / feed ── */
  const PostFeed = () => (
    <div style={{ padding: "16px 16px" }}>
      {posts?.map((post) => (
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
            <PostMenu post={post} />
          </div>

          {/* media */}
          {post.media && (
            isVideoPost(post) ? (
              <video
                src={post.media}
                style={{ background: "#000", width: "100%", aspectRatio: "1/1", objectFit: "contain" }}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div style={{ background: d ? "#000" : "#f0f0f0", aspectRatio: "1/1", backgroundImage: `url(${post.media})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }} />
            )
          )}

          {/* actions */}
          <div style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <button onClick={() => handleToggleLike(post, post.likes?.some((l) => l.userId._id === loggedInUserId))}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: post.likes?.some((l) => l.userId._id === loggedInUserId) ? tokens.danger : tokens.text(d), padding: 0, display: "flex" }}>
                  {post.likes?.some((l) => l.userId._id === loggedInUserId) ? <FaHeart /> : <FaRegHeart />}
                </button>
                <button onClick={() => setShowCommentInputs((prev) => ({ ...prev, [post._id]: !prev[post._id] }))}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: tokens.text(d), padding: 0, display: "flex" }}>
                  <FaComment />
                </button>
                <button onClick={() => handleSharePost(post._id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: tokens.text(d), padding: 0, display: "flex" }}>
                  <FaPaperPlane />
                </button>
              </div>
              <button onClick={() => handleToggleSave(post)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: post.savedBy?.includes(loggedInUserId) ? tokens.accent : tokens.text(d), padding: 0, display: "flex" }}>
                {post.savedBy?.includes(loggedInUserId) ? <FaBookmark /> : <FaRegBookmark />}
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
                <span style={{ fontSize: 12, color: tokens.textMuted(d), cursor: "pointer" }} onClick={() => setViewerPost(post)}>
                  View all {post.comments.length} comments
                </span>
                {post.comments.slice(-2).map((comment, idx) => (
                  <div key={comment._id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 6 }}>
                    <p style={{ fontSize: 13, color: tokens.text(d), margin: 0 }}>
                      <span style={{ fontWeight: 500, marginRight: 6 }}>{comment.userId?.firstName}:</span>{comment.text}
                    </p>
                    {(comment.userId?._id === loggedInUserId || post.userId._id === loggedInUserId) && (
                      <button onClick={() => handleDeleteComment(post._id, comment._id)} style={{ background: "none", border: "none", cursor: "pointer", color: tokens.danger, fontSize: 12, padding: 0, flexShrink: 0, display: "flex" }}>
                        <FaTrash size={12} />
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

  /* ── not found ── */
  if (profileNotFound) {
    return (
      <div style={{ ...s.page, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Profile not found</div>
        <button onClick={() => navigate("/")} style={{ background: tokens.text(d), color: tokens.surface(d), border: "none", borderRadius: tokens.radius.full, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          Go home
        </button>
      </div>
    );
  }

  /* ── render ── */
  return (
    <div style={s.page}>
      {showProfileModal && user && (
        <EditProfile setShowProfileModal={setShowProfileModal} show={showProfileModal} onHide={() => setShowProfileModal(false)} user={user} onSave={handleSave}
          onSettings={() => { navigate("/settings"); setShowProfileModal(false); }} onLogout={logOut} theme={d ? "dark" : "light"} />
      )}

      <div className="row">
        <div className="d-none d-md-block col-md-3 " style={{ padding: "12px 16px", borderBottom: tokens.border(d) }}>
          <LeftSidebar />
        </div>

        {/* main column */}
        <div style={s.main} onScroll={handleScroll} className="main-scroll col-md-6">
          {profileLoading ? <HeaderSkeleton /> : <ProfileHeader />}

          {!profileLoading && isLocked ? (
            <PrivateNotice />
          ) : (
            <>
              {!isLocked && (isOwnProfile || stories.length > 0) && <StoryBar />}
              <TabBar />

              <div>
                {activeTab === "grid" && (postsLoading ? <PostGridSkeleton /> : <PostGrid />)}
                {activeTab === "slideshow" && <PostFeed />}
                {activeTab === "saved" && isOwnProfile && (
                  <div style={{ padding: 28 }}>
                    <SavedPosts theme={d ? "dark" : "light"} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="col-0 col-md-3 " style={{ padding: "12px 16px", borderBottom: tokens.border(d) }}>
          <RightSidebar />
        </div>

      </div>

      {/* mobile floating dock (own profile only) */}
      {isOwnProfile && (
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 20, padding: "10px 24px",
          background: d ? "rgba(17,17,17,0.88)" : "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)", borderRadius: tokens.radius.full, border: tokens.border(d),
          boxShadow: d ? "0 4px 24px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.1)",
          zIndex: 1000, opacity: isNavVisible ? 1 : 0, transition: "opacity 0.25s", pointerEvents: isNavVisible ? "auto" : "none",
        }} className=" d-flex">
          <button onClick={() => setShowCreateStory(true)} title="Create story" style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted(d), fontSize: 18, padding: 0 }}>
            <FaCamera />
          </button>
          <div style={{ width: 1, height: 16, background: d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
          <button onClick={() => setShowModal(true)} title="Create post" style={{ background: "none", border: "none", cursor: "pointer", color: tokens.textMuted(d), fontSize: 18, padding: 0 }}>
            <FaPencilAlt />
          </button>

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
      )}

      {/* modals */}
      {showModal && (
        <CustomModal
          mode={editingPost ? "edit" : "create"}
          initialText={editingPost?.text || ""}
          isSubmitting={postSubmitting}
          error={postError}
          handleAddPost={async (text, media) => {
            setPostSubmitting(true);
            setPostError(null);
            try {
              if (editingPost) {
                const data = await editPost(editingPost._id, text);
                if (data.success) {
                  setPosts((prev) => prev.map((p) => (p._id === editingPost._id ? { ...p, text: data.post.text } : p)));
                  setShowModal(false);
                  setEditingPost(null);
                } else {
                  setPostError(data.message || "Could not save changes.");
                }
                return;
              }
              const formData = new FormData();
              if (text) formData.append("text", text);
              if (media) formData.append("media", media.file);
              const res = await fetch(`${apiUrl}/post/mediaPost`, { method: "POST", body: formData, credentials: "include" });
              const data = await res.json();
              if (res.ok && data.success) {
                setPosts((prev) => [...(prev || []), { ...data.post, userId: user }]);
                setProfileUser((p) => (p ? { ...p, postsCount: (p.postsCount || 0) + 1 } : p));
                setShowModal(false);
              } else {
                setPostError(data.message || "Could not publish post.");
              }
            } catch (e) {
              console.error("Error submitting post:", e);
              setPostError("Something went wrong. Please try again.");
            } finally {
              setPostSubmitting(false);
            }
          }}
          showModal={showModal}
          onClose={() => { setShowModal(false); setEditingPost(null); setPostError(null); }}
          theme={d ? "dark" : "light"}
        />
      )}

      <FollowModal show={showFollowersModal} onHide={() => setShowFollowersModal(false)} title="Followers" users={followers} currentUserId={loggedInUserId} theme={d ? "dark" : "light"} />
      <FollowModal show={showFollowingModal} onHide={() => setShowFollowingModal(false)} title="Following" users={following} currentUserId={loggedInUserId} theme={d ? "dark" : "light"} />
      <CreateStory show={showCreateStory} onHide={() => setShowCreateStory(false)} onCreateStory={handleCreateStory} user={user} theme={d ? "dark" : "light"} />
      <StoryViewer show={isStoryViewerOpen} onHide={() => setIsStoryViewerOpen(false)} setStoryGroups={setStoryGroups} storyGroups={storyGroups} initialGroup={selectedStoryGroup} theme={d ? "dark" : "light"} />
      {viewerPost && (
        <PostViewer
          initialPost={viewerPost}
          userId={loggedInUserId}
          currentUserAvatar={user?.profilePicture}
          onClose={() => setViewerPost(null)}
          onNavigateProfile={(uid) => { setViewerPost(null); if (uid !== profileUserId) navigate(`/ProfilePage/${uid}`); }}
          onPostUpdated={(updated) => setPosts((prev) => prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)))}
          onPostDeleted={(postId) => {
            setPosts((prev) => prev.filter((p) => p._id !== postId));
            setProfileUser((p) => (p ? { ...p, postsCount: Math.max(0, (p.postsCount || 0) - 1) } : p));
          }}
        />
      )}

      <style>{`
        .main-scroll {
          height: calc(100vh - 70px);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .main-scroll::-webkit-scrollbar { display: none; }
        .tile-overlay { opacity: 0 !important; }
        .tile-overlay:hover { opacity: 1 !important; }
        .hb-row-hover:hover { background: ${d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}; }
        .hb-skel {
          background: linear-gradient(90deg, ${d ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} 25%, ${d ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.11)"} 37%, ${d ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} 63%);
          background-size: 400% 100%;
          animation: hb-shimmer 1.4s ease infinite;
        }
        @keyframes hb-shimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
        @media (max-width: 991px) {
          .main-scroll { height: auto; overflow-y: unset; }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
