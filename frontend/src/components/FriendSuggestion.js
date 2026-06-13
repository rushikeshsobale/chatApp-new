
import React, { useContext, useState, useEffect } from "react";
import { FaUserPlus, FaUserCheck, FaUserClock } from "react-icons/fa";
import { createNotification } from "../services/notificationService";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { sendFollowRequest, getRelationshipStatus } from "../services/relationships";
import { fetchSuggestions } from "../services/profileService";

import { ThemeContext } from '../contexts/ThemeContext';
/* ─── design tokens ───────────────────────────────────────────── */
const t = {
  surface:   (d) => (d ? "#141414" : "#ffffff"),
  surfaceAlt:(d) => (d ? "#1e1e1e" : "#f5f5f7"),
  border:    (d) => (d ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
  text:      (d) => (d ? "#f0f0f0" : "#111111"),
  textMuted: (d) => (d ? "#888" : "#6b7280"),
  accent:    "#378ADD",
  accentBg:  (d) => (d ? "rgba(55,138,221,0.12)" : "#EBF3FC"),
  accentText:(d) => (d ? "#85B7EB" : "#1565C0"),
  warning:   "#EF9F27",
  warningBg: (d) => (d ? "rgba(239,159,39,0.12)" : "#FEF4E6"),
  success:   "#1D9E75",
  successBg: (d) => (d ? "rgba(29,158,117,0.12)" : "#E6F6F1"),
  radius: { sm: "6px", md: "10px", lg: "14px", full: "9999px" },
};

/* ─── avatar ─────────────────────────────────────────────────── */
const Avatar = ({ src, name, size = 40, dark }) => {
  const initials = (name || "?").charAt(0).toUpperCase();
  const base = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 600, fontSize: size * 0.38,
    background: t.accentBg(dark), color: t.accentText(dark),
    objectFit: "cover",
  };
  return src
    ? <img src={src} alt={name} style={base} />
    : <div style={base}>{initials}</div>;
};

/* ─── button config ──────────────────────────────────────────── */
const btnConfig = (status, dark) => {
  switch (status) {
    case "requested":
      return {
        label: "Requested", disabled: true,
        icon: <FaUserClock size={11} />,
        style: { background: t.warningBg(dark), color: t.warning, border: `1px solid ${t.warning}33` },
      };
    case "following":
      return {
        label: "Following", disabled: true,
        icon: <FaUserCheck size={11} />,
        style: { background: t.successBg(dark), color: t.success, border: `1px solid ${t.success}33` },
      };
    case "follow_back":
      return {
        label: "Follow back", disabled: false,
        icon: <FaUserPlus size={11} />,
        style: { background: t.accentBg(dark), color: t.accentText(dark), border: `1px solid ${t.accent}33` },
      };
    default:
      return {
        label: "Follow", disabled: false,
        icon: <FaUserPlus size={11} />,
        style: { background: t.accentBg(dark), color: t.accentText(dark), border: `1px solid ${t.accent}33` },
      };
  }
};

/* ─── main component ─────────────────────────────────────────── */
const FriendSuggestion = ({ loadData }) => {
    const { isDark } = useContext(ThemeContext);

  const dark = isDark;
  const [suggestions, setSuggestions] = useState([]);
  const [followStatus, setFollowStatus] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 992);
  const [loadingId, setLoadingId] = useState(null);

  const { socket } = useContext(UserContext);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const userId = currentUser?._id || currentUser?.userId;

  /* fetch suggestions */
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await fetchSuggestions();
        setSuggestions(res ? [...res].reverse() : []);
      } catch (e) {
        console.error("Error fetching suggestions:", e);
      }
    })();

    const onResize = () => setIsDesktop(window.innerWidth >= 992);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* fetch relationship statuses */
  useEffect(() => {
    if (!suggestions.length) return;
    (async () => {
      const map = {};
      await Promise.all(
        suggestions.map(async (u) => {
          try {
            const res = await getRelationshipStatus(u._id);
            map[u._id] = res.state;
          } catch {
            map[u._id] = "none";
          }
        })
      );
      setFollowStatus(map);
    })();
  }, [suggestions]);

  /* follow handler */
  const handleFollow = async (user) => {
    if (loadingId) return;
    setLoadingId(user._id);
    try {
      const result = await sendFollowRequest(user._id, "follow");
      if (!result) return;
      const newState = result.status === "pending" ? "requested" : "following";
      setFollowStatus((prev) => ({ ...prev, [user._id]: newState }));

      const notif = {
        recipient: user._id, sender: userId,
        type: user.isPrivate ? "follow_request" : "follow",
        message: user.isPrivate
          ? `${currentUser?.userName || "Someone"} sent you a follow request`
          : `${currentUser?.userName || "Someone"} started following you`,
        createdAt: new Date().toISOString(), read: false,
      };
      await createNotification(notif);
      socket?.emit("emit_notification", notif);
      loadData?.();
    } catch (e) {
      console.error("Follow error:", e);
    } finally {
      setLoadingId(null);
    }
  };

  const displayed = isDesktop && !showAll ? suggestions.slice(0, 5) : suggestions;
  if (!suggestions.length) return null;

  /* ── desktop list view ── */
  const DesktopList = () => (
    <div>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.7px", textTransform: "uppercase", color: t.textMuted(dark) }}>
          Suggested for you
        </span>
        {suggestions.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{ fontSize: 11, fontWeight: 500, color: t.accentText(dark), background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {showAll ? "Show less" : "See all"}
          </button>
        )}
      </div>

      {/* list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {displayed.map((user) => {
          const status = followStatus[user._id] || "none";
          const cfg = btnConfig(status, dark);
          const isLoading = loadingId === user._id;

          return (
            <div
              key={user._id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: t.radius.md,
                transition: "background 0.15s",
                cursor: "default",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = t.surfaceAlt(dark)}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {/* avatar */}
              <div style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => navigate(`/userProfile/${user._id}`)}>
                <Avatar src={user.profilePicture} name={user.userName} size={38} dark={dark} />
              </div>

              {/* name */}
              <div
                style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                onClick={() => navigate(`/userProfile/${user._id}`)}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: t.text(dark), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.userName}
                </div>
                {user.mutualFollowers > 0 && (
                  <div style={{ fontSize: 11, color: t.textMuted(dark), marginTop: 1 }}>
                    {user.mutualFollowers} mutual{user.mutualFollowers > 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* follow button */}
              <button
                disabled={cfg.disabled || isLoading}
                onClick={(e) => { e.stopPropagation(); handleFollow(user); }}
                style={{
                  ...cfg.style,
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: t.radius.full,
                  fontSize: 12, fontWeight: 500, cursor: cfg.disabled ? "default" : "pointer",
                  flexShrink: 0, transition: "opacity 0.15s",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading
                  ? <span style={{ width: 11, height: 11, border: `1.5px solid currentColor`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  : cfg.icon
                }
                {cfg.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ── mobile horizontal scroll ── */
  const MobileScroll = () => (
    <div>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.7px", textTransform: "uppercase", color: t.textMuted(dark) }}>
          Suggested for you
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
        {suggestions.map((user) => {
          const status = followStatus[user._id] || "none";
          const cfg = btnConfig(status, dark);
          const isLoading = loadingId === user._id;

          return (
            <div
              key={user._id}
              style={{
                flexShrink: 0, width: 110,
                background: t.surfaceAlt(dark),
                border: `1px solid ${t.border(dark)}`,
                borderRadius: t.radius.lg,
                padding: "14px 10px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              }}
            >
              <div style={{ cursor: "pointer" }} onClick={() => navigate(`/userProfile/${user._id}`)}>
                <Avatar src={user.profilePicture} name={user.userName} size={44} dark={dark} />
              </div>
              <div
                style={{ fontSize: 12, fontWeight: 500, color: t.text(dark), textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                onClick={() => navigate(`/userProfile/${user._id}`)}
              >
                {user.userName}
              </div>
              <button
                disabled={cfg.disabled || isLoading}
                onClick={(e) => { e.stopPropagation(); handleFollow(user); }}
                style={{
                  ...cfg.style,
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "5px 10px", borderRadius: t.radius.full,
                  fontSize: 11, fontWeight: 500, cursor: cfg.disabled ? "default" : "pointer",
                  width: "100%", justifyContent: "center",
                  opacity: isLoading ? 0.6 : 1, transition: "opacity 0.15s",
                }}
              >
                {isLoading
                  ? <span style={{ width: 10, height: 10, border: `1.5px solid currentColor`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  : cfg.icon
                }
                {cfg.label}
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .fs-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      {isDesktop ? <DesktopList /> : <MobileScroll />}
    </>
  );
};

export default FriendSuggestion;