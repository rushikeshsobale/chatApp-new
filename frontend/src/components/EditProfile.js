import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCamera,
  FaCheckCircle,
  FaUserEdit,
  FaTimes,
  FaChevronDown
} from "react-icons/fa";
import { completeProfile } from "../services/authService";

const FOOD_CUISINES = [
  "Italian", "Indian", "Chinese", "Mexican", "Japanese",
  "Thai", "French", "Mediterranean", "American", "Other"
];

const PREFERENCE_FIELDS = [
  { key: "singer",      name: "Favorite Singer / Band", hint: "e.g., Daft Punk" },
  { key: "sportsperson", name: "Favorite Athlete",       hint: "e.g., Serena Williams" },
  { key: "movie",       name: "Favorite Movie",          hint: "e.g., Inception" },
  { key: "book",        name: "Favorite Novel / Book",   hint: "e.g., Dune" },
  { key: "food",        name: "Favorite Dish",           hint: "e.g., Sushi" }
];

export default function EditProfile({ setUser, initialData = null, setShowProfileModal }) {
  const navigate   = useNavigate();
  const userId     = localStorage.getItem("userId");
  const panelRef   = useRef(null);

  const [profilePicture, setProfilePicture] = useState(null);
  const [bio,            setBio]            = useState("");
  const [userName,       setUserName]       = useState("");
  const [loading,        setLoading]        = useState(false);
  const [showErrors,     setShowErrors]     = useState(false);
  const [prefsOpen,      setPrefsOpen]      = useState(false);
  const [isDark,         setIsDark]         = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const [favorites, setFavorites] = useState({
    singer: "", sportsperson: "", movie: "", book: "", food: "", cuisine: ""
  });

  /* ── listen to OS color-scheme changes ── */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── seed from cache / prop ── */
  useEffect(() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("user")); } catch {}
    const src = initialData || saved;
    if (!src) return;
    if (src.userName)       setUserName(src.userName);
    if (src.bio)            setBio(src.bio);
    if (src.profilePicture) setProfilePicture(src.profilePicture);
    if (src.favorites)      setFavorites({ ...favorites, ...src.favorites });
  }, [initialData]);

  /* ── close on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        navigate("/");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [navigate]);

  /* ── close on Escape ── */
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") navigate("/"); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate]);

  /* ── design tokens (light / dark) ── */
  const T = isDark ? {
    overlay:   "rgba(0,0,0,0.65)",
    panel:     "#141416",
    surface:   "#1d1d21",
    border:    "#2a2a30",
    text:      "#f4f4f5",
    muted:     "#a1a1aa",
    accent:    "#8b5cf6",
    accentHov: "#7c3aed",
    error:     "#ef4444",
    divider:   "#2a2a30",
    inputBg:   "#1d1d21",
    labelBg:   "#2a2a30",
    scrollBar: "#3a3a42"
  } : {
    overlay:   "rgba(0,0,0,0.35)",
    panel:     "#ffffff",
    surface:   "#f4f4f5",
    border:    "#e4e4e7",
    text:      "#18181b",
    muted:     "#71717a",
    accent:    "#7c3aed",
    accentHov: "#6d28d9",
    error:     "#dc2626",
    divider:   "#e4e4e7",
    inputBg:   "#f4f4f5",
    labelBg:   "#e4e4e7",
    scrollBar: "#d4d4d8"
  };

  const handleFavChange  = (key, val) => setFavorites(p => ({ ...p, [key]: val }));
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePicture(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!userName.trim()) { setShowErrors(true); return; }
    setLoading(true);
    try {
      const payload = { profilePicture, bio, userName: userName.trim(), favorites };
      const response = await completeProfile(userId, payload);
      if (response.success) {
        localStorage.setItem("user", JSON.stringify(response.user));
        if (setUser) setUser(response.user);
        navigate("/");
      }
    } catch (err) {
      console.error("Profile update failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const filledPrefs = Object.values(favorites).filter(Boolean).length;

  /* ─────────────────────────────────── render ─────────────────────────────────── */
  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        backgroundColor: T.overlay,
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "flex-end",
        zIndex:         9999,
        padding:        "12px"
      }}
    >
      {/* ── side panel / dropdown sheet ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        style={{
          backgroundColor: T.panel,
          border:          `1px solid ${T.border}`,
          borderRadius:    "20px",
          width:           "100%",
          maxWidth:        "420px",
          maxHeight:       "calc(100vh - 24px)",
          overflowY:       "auto",
          display:         "flex",
          flexDirection:   "column",
          boxSizing:       "border-box",
          scrollbarWidth:  "thin",
          scrollbarColor:  `${T.scrollBar} transparent`
        }}
      >
        {/* ── sticky header ── */}
        <div
          style={{
            position:        "sticky",
            top:             0,
            zIndex:          10,
            backgroundColor: T.panel,
            borderBottom:    `1px solid ${T.divider}`,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "space-between",
            padding:         "16px 20px 14px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaUserEdit size={16} style={{ color: T.accent }} />
            <span style={{ fontWeight: 600, fontSize: "15px", color: T.text }}>
              Edit profile
            </span>
          </div>
          <button
            onClick={() => setShowProfileModal(false)}
            aria-label="Close"
            style={{
              background:   "none",
              border:       "none",
              cursor:       "pointer",
              padding:      "6px",
              borderRadius: "8px",
              color:        T.muted,
              display:      "flex",
              alignItems:   "center",
              lineHeight:   1,
              transition:   "background 0.15s, color 0.15s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none";    e.currentTarget.style.color = T.muted; }}
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>

          {/* ── avatar ── */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <label htmlFor="edit-avatar-input" style={{ cursor: "pointer", display: "inline-block" }}>
              <div
                style={{
                  width:          "88px",
                  height:         "88px",
                  borderRadius:   "50%",
                  backgroundColor: T.inputBg,
                  border:         `2px dashed ${T.accent}`,
                  overflow:       "hidden",
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  margin:         "0 auto 6px",
                  transition:     "border-color 0.15s"
                }}
              >
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: T.muted }}>
                    <FaCamera size={18} style={{ color: T.accent }} />
                    <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Change
                    </span>
                  </div>
                )}
              </div>
              <input id="edit-avatar-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </label>
          </div>

          {/* ── username ── */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Username *
              </label>
              {showErrors && !userName.trim() && (
                <span style={{ fontSize: "11px", color: T.error }}>Required</span>
              )}
            </div>
            <input
              type="text"
              placeholder="Username cannot be empty…"
              value={userName}
              onChange={e => setUserName(e.target.value.replace(/\s+/g, ""))}
              style={{
                width:           "100%",
                boxSizing:       "border-box",
                padding:         "10px 12px",
                fontSize:        "14px",
                backgroundColor: T.inputBg,
                color:           T.text,
                border:          `1px solid ${showErrors && !userName.trim() ? T.error : T.border}`,
                borderRadius:    "10px",
                outline:         "none"
              }}
            />
          </div>

          {/* ── bio ── */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "5px" }}>
              Bio
            </label>
            <textarea
              rows={3}
              maxLength={300}
              placeholder="Tell your story here…"
              value={bio}
              onChange={e => setBio(e.target.value)}
              style={{
                width:           "100%",
                boxSizing:       "border-box",
                padding:         "10px 12px",
                fontSize:        "14px",
                backgroundColor: T.inputBg,
                color:           T.text,
                border:          `1px solid ${T.border}`,
                borderRadius:    "10px",
                resize:          "none",
                outline:         "none",
                fontFamily:      "inherit"
              }}
            />
            <div style={{ textAlign: "right", fontSize: "11px", color: T.muted, marginTop: "3px" }}>
              {bio.length}/300
            </div>
          </div>

          {/* ── preferences accordion ── */}
          <div
            style={{
              border:       `1px solid ${T.border}`,
              borderRadius: "12px",
              overflow:     "hidden",
              marginBottom: "20px"
            }}
          >
            {/* accordion trigger */}
            <button
              type="button"
              onClick={() => setPrefsOpen(o => !o)}
              style={{
                width:           "100%",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "space-between",
                padding:         "12px 14px",
                backgroundColor: T.surface,
                border:          "none",
                cursor:          "pointer",
                color:           T.text,
                fontSize:        "13px",
                fontWeight:      600
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: T.accent, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Personal preferences
                </span>
                {filledPrefs > 0 && (
                  <span style={{
                    fontSize: "10px", fontWeight: 700,
                    backgroundColor: T.accent, color: "#fff",
                    borderRadius: "20px", padding: "1px 7px"
                  }}>
                    {filledPrefs}
                  </span>
                )}
              </span>
              <FaChevronDown
                size={12}
                style={{
                  color:      T.muted,
                  transform:  prefsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s"
                }}
              />
            </button>

            {/* accordion body */}
            {prefsOpen && (
              <div style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {PREFERENCE_FIELDS.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: "11px", color: T.muted, display: "block", marginBottom: "4px" }}>{f.name}</label>
                    <input
                      type="text"
                      placeholder={f.hint}
                      value={favorites[f.key]}
                      onChange={e => handleFavChange(f.key, e.target.value)}
                      style={{
                        width:           "100%",
                        boxSizing:       "border-box",
                        padding:         "8px 10px",
                        fontSize:        "13px",
                        backgroundColor: T.inputBg,
                        color:           T.text,
                        border:          `1px solid ${T.border}`,
                        borderRadius:    "8px",
                        outline:         "none",
                        fontFamily:      "inherit"
                      }}
                    />
                  </div>
                ))}

                {/* cuisine select – full-width on its own row */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "11px", color: T.muted, display: "block", marginBottom: "4px" }}>Favorite Cuisine</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={favorites.cuisine}
                      onChange={e => handleFavChange("cuisine", e.target.value)}
                      style={{
                        width:           "100%",
                        boxSizing:       "border-box",
                        padding:         "8px 32px 8px 10px",
                        fontSize:        "13px",
                        backgroundColor: T.inputBg,
                        color:           favorites.cuisine ? T.text : T.muted,
                        border:          `1px solid ${T.border}`,
                        borderRadius:    "8px",
                        outline:         "none",
                        appearance:      "none",
                        cursor:          "pointer",
                        fontFamily:      "inherit"
                      }}
                    >
                      <option value="">Select choice…</option>
                      {FOOD_CUISINES.map(c => (
                        <option key={c} value={c} style={{ backgroundColor: T.panel, color: T.text }}>{c}</option>
                      ))}
                    </select>
                    <FaChevronDown
                      size={11}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.muted }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── footer actions ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                background:   "none",
                border:       `1px solid ${T.border}`,
                cursor:       "pointer",
                padding:      "9px 18px",
                borderRadius: "9px",
                fontSize:     "13px",
                color:        T.muted,
                fontFamily:   "inherit"
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={{
                backgroundColor: loading ? T.muted : T.accent,
                border:          "none",
                cursor:          loading ? "not-allowed" : "pointer",
                padding:         "9px 22px",
                borderRadius:    "9px",
                fontSize:        "13px",
                fontWeight:      600,
                color:           "#fff",
                display:         "flex",
                alignItems:      "center",
                gap:             "6px",
                transition:      "background 0.15s",
                fontFamily:      "inherit"
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = T.accentHov; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = T.accent; }}
            >
              {loading ? (
                <span
                  style={{
                    width: "14px", height: "14px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite"
                  }}
                />
              ) : (
                <>Save changes <FaCheckCircle size={12} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}