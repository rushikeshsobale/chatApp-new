import React, { useState, useEffect, useRef } from "react";
import { FaCamera, FaCheckCircle, FaUserEdit, FaTimes } from "react-icons/fa";
import tokens from "../styles/designTokens";

export default function EditProfile({ show, onHide, user, onSave, onSettings, onLogout, theme }) {
  const isDark = theme === "dark";
  const panelRef = useRef(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /* ── seed from the current user whenever the modal opens ── */
  useEffect(() => {
    if (!show || !user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setBio(user.bio || "");
    setAvatarFile(null);
    setAvatarPreview(user.profilePicture || null);
    setError(null);
  }, [show, user]);

  /* ── revoke the object URL for a picked file once replaced/unmounted ── */
  useEffect(() => {
    return () => { if (avatarFile) URL.revokeObjectURL(avatarPreview); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarFile]);

  /* ── close on outside click / Escape ── */
  useEffect(() => {
    if (!show) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onHide();
    };
    const handleKey = (e) => { if (e.key === "Escape") onHide(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [show, onHide]);

  if (!show) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio,
        ...(avatarFile && { profilePicture: avatarFile }),
      });
    } catch (e) {
      console.error("Profile update failed:", e);
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const s = {
    label: {
      fontSize: 11, fontWeight: 600, color: tokens.textMuted(isDark),
      textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5,
    },
    input: {
      width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14,
      backgroundColor: tokens.surfaceAlt(isDark), color: tokens.text(isDark),
      border: tokens.border(isDark), borderRadius: tokens.radius.md, outline: "none", fontFamily: "inherit",
    },
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        backgroundColor: isDark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        style={{
          backgroundColor: tokens.surface(isDark),
          border: tokens.border(isDark),
          borderRadius: tokens.radius.xl,
          boxShadow: tokens.shadow(isDark),
          width: "100%", maxWidth: 440, maxHeight: "calc(100vh - 32px)",
          overflowY: "auto", display: "flex", flexDirection: "column",
        }}
      >
        {/* header */}
        <div
          style={{
            position: "sticky", top: 0, zIndex: 1, backgroundColor: tokens.surface(isDark),
            borderBottom: tokens.border(isDark), display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FaUserEdit size={16} style={{ color: tokens.accent }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: tokens.text(isDark) }}>Edit profile</span>
          </div>
          <button
            onClick={onHide}
            aria-label="Close"
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 6,
              borderRadius: tokens.radius.md, color: tokens.textMuted(isDark), display: "flex",
            }}
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {error && (
            <div style={{
              background: isDark ? "rgba(226,75,74,0.14)" : "#FDEDED", border: `1px solid ${tokens.danger}`,
              color: tokens.danger, fontSize: 13, padding: "10px 14px", borderRadius: tokens.radius.md, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* avatar */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <label htmlFor="edit-avatar-input" style={{ cursor: "pointer", display: "inline-block" }}>
              <div
                style={{
                  width: 88, height: 88, borderRadius: "50%", overflow: "hidden",
                  backgroundColor: tokens.surfaceAlt(isDark), border: `2px dashed ${tokens.accent}`,
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", position: "relative",
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <FaCamera size={18} style={{ color: tokens.accent }} />
                )}
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s", fontSize: 11, fontWeight: 600,
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                >
                  Change
                </div>
              </div>
              <input id="edit-avatar-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </label>
          </div>

          {/* name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={s.label}>First name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={s.input} disabled={saving} />
            </div>
            <div>
              <label style={s.label}>Last name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={s.input} disabled={saving} />
            </div>
          </div>

          {/* bio */}
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Bio</label>
            <textarea
              rows={3}
              maxLength={300}
              placeholder="Tell your story here…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
              style={{ ...s.input, resize: "none" }}
            />
            <div style={{ textAlign: "right", fontSize: 11, color: tokens.textMuted(isDark), marginTop: 3 }}>
              {bio.length}/300
            </div>
          </div>

          {/* footer actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <button
              type="button"
              onClick={onHide}
              disabled={saving}
              style={{
                background: "none", border: tokens.border(isDark), cursor: "pointer", padding: "9px 18px",
                borderRadius: tokens.radius.md, fontSize: 13, color: tokens.textMuted(isDark), fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: saving ? tokens.textMuted(isDark) : tokens.accent, border: "none",
                cursor: saving ? "not-allowed" : "pointer", padding: "9px 22px", borderRadius: tokens.radius.md,
                fontSize: 13, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
              }}
            >
              {saving ? (
                <span style={{
                  width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                  borderRadius: "50%", display: "inline-block", animation: "edit-profile-spin 0.7s linear infinite",
                }} />
              ) : (
                <>Save changes <FaCheckCircle size={12} /></>
              )}
            </button>
          </div>

          {(onSettings || onLogout) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 18, paddingTop: 16, borderTop: tokens.border(isDark) }}>
              {onSettings && (
                <button type="button" onClick={onSettings} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: tokens.textMuted(isDark) }}>
                  Account settings
                </button>
              )}
              {onLogout && (
                <button type="button" onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: tokens.danger }}>
                  Log out
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes edit-profile-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
