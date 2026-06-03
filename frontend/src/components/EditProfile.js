import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCamera,
  FaCheckCircle,
  FaUserEdit
} from "react-icons/fa";
import { completeProfile } from "../services/authService";

const CONFIG_THEME = {
  bgApp: "#09090b",
  bgCard: "#141416",
  bgInput: "#1d1d21",
  border: "#2a2a30",
  textMain: "#f4f4f5",
  textMuted: "#a1a1aa",
  accent: "#8b5cf6",
  error: "#ef4444"
};

const FOOD_CUISINES = [
  "Italian", "Indian", "Chinese", "Mexican", "Japanese", 
  "Thai", "French", "Mediterranean", "American", "Other"
];

export default function EditProfile({ setUser, initialData = null }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  // Changed from profilePic to profilePicture to match your DB schema
  const [profilePicture, setProfilePicture] = useState(null);
  const [bio, setBio] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [userData, setUserData] = useState({
    favorites: { singer: "", sportsperson: "", movie: "", book: "", food: "", cuisine: "" }
  });

  useEffect(() => {
    let savedUser = null;
    try {
      const localData = localStorage.getItem("user");
      if (localData) savedUser = JSON.parse(localData);
    } catch (e) {
      console.error("Failed to parse cached local user object:", e);
    }

    const sourceData = initialData || savedUser;

    if (sourceData) {
      if (sourceData.userName) setUserName(sourceData.userName);
      if (sourceData.bio) setBio(sourceData.bio);
      // Maps db key 'profilePicture' into state context
      if (sourceData.profilePicture) setProfilePicture(sourceData.profilePicture);
      if (sourceData.favorites) {
        setUserData({
          favorites: {
            singer: sourceData.favorites.singer || "",
            sportsperson: sourceData.favorites.sportsperson || "",
            movie: sourceData.favorites.movie || "",
            book: sourceData.favorites.book || "",
            food: sourceData.favorites.food || "",
            cuisine: sourceData.favorites.cuisine || ""
          }
        });
      }
    }
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setUserData((prev) => ({
      ...prev,
      favorites: { ...prev.favorites, [field]: value }
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      // Saves string to profilePicture state
      reader.onloadend = () => setProfilePicture(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!userName.trim()) {
      setShowErrors(true);
      return;
    }

    setLoading(true);
    try {
      // Constructs payload with correct database structure key 'profilePicture'
      const payload = { profilePicture, bio, userName: userName.trim(), ...userData };
      const response = await completeProfile(userId, payload);
      
      if (response.success) {
        localStorage.setItem("user", JSON.stringify(response.user));
        if (setUser) {
          setUser(response.user);
        }
        navigate("/");
      }
    } catch (err) {
      console.error("Profile updates failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="p-3 d-flex flex-column justify-content-center align-items-center"
      style={{
        backgroundColor: CONFIG_THEME.bgApp,
        color: CONFIG_THEME.textMain,
        minHeight: "100vh",
        width: "100vw",
        overflowX: "hidden"
      }}
    >
      <div className="w-100" style={{ maxWidth: "600px" }}>
        
        <header className="text-center mb-4">
          <h2 className="fw-bold text-white mb-1 d-flex align-items-center justify-content-center gap-2">
            Edit Profile <FaUserEdit style={{ color: CONFIG_THEME.accent }} size={24} />
          </h2>
          <p className="small mb-0" style={{ color: CONFIG_THEME.textMuted }}>
            Modify your user details and platform preference criteria settings.
          </p>
        </header>

        <div 
          className="p-4 p-md-5"
          style={{
            backgroundColor: CONFIG_THEME.bgCard,
            border: `1px solid ${CONFIG_THEME.border}`,
            borderRadius: "24px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)"
          }}
        >
          {/* Avatar Area */}
          <div className="text-center mb-4">
            <label htmlFor="edit-avatar-input" className="d-inline-block" style={{ cursor: "pointer" }}>
              <div 
                className="rounded-circle d-flex flex-column align-items-center justify-content-center overflow-hidden mx-auto"
                style={{ 
                  width: "130px", 
                  height: "130px", 
                  backgroundColor: CONFIG_THEME.bgInput, 
                  border: `2px dashed ${CONFIG_THEME.accent}`,
                }}
              >
                {profilePicture ? (
                  <img src={profilePicture} alt="Current profile" className="w-100 h-100 object-fit-cover" />
                ) : (
                  <div className="d-flex flex-column align-items-center gap-2" style={{ color: CONFIG_THEME.textMuted }}>
                    <FaCamera size={20} style={{ color: CONFIG_THEME.accent }} />
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>Change Photo</span>
                  </div>
                )}
              </div>
              <input id="edit-avatar-input" type="file" accept="image/*" className="d-none" onChange={handleFileChange} />
            </label>
          </div>

          {/* Username handle Field */}
          <div className="text-start mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label small fw-semibold text-uppercase tracking-wider mb-0" style={{ color: CONFIG_THEME.textMuted, fontSize: "11px" }}>Username Handle *</label>
              {showErrors && !userName.trim() && (
                <span className="small fw-medium" style={{ color: CONFIG_THEME.error, fontSize: "11px" }}>This field is required</span>
              )}
            </div>
            <input
              type="text"
              className="form-control shadow-none p-3"
              placeholder="Username cannot be empty..."
              value={userName}
              onChange={(e) => setUserName(e.target.value.replace(/\s+/g, ''))}
              style={{ 
                backgroundColor: CONFIG_THEME.bgInput, 
                color: CONFIG_THEME.textMain, 
                fontSize: "14px", 
                borderRadius: "12px",
                border: showErrors && !userName.trim() ? `1px solid ${CONFIG_THEME.error}` : `1px solid transparent`
              }}
            />
          </div>

          {/* Bio text block field */}
          <div className="text-start mb-4">
            <label className="form-label small fw-semibold text-uppercase tracking-wider" style={{ color: CONFIG_THEME.textMuted, fontSize: "11px" }}>Bio Summary</label>
            <textarea
              className="form-control shadow-none border-0 p-3"
              rows="3"
              maxLength="300"
              placeholder="Tell your story here..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ backgroundColor: CONFIG_THEME.bgInput, color: CONFIG_THEME.textMain, fontSize: "14px", borderRadius: "12px", resize: "none" }}
            />
            <div className="text-end mt-1 small" style={{ color: CONFIG_THEME.textMuted, fontSize: "11px" }}>{bio.length}/300</div>
          </div>

          <hr style={{ borderTop: `1px solid ${CONFIG_THEME.border}`, margin: "1.5rem 0" }} />

          {/* Preferences Grid Panel */}
          <h5 className="fw-bold mb-3 small text-uppercase tracking-wider" style={{ color: CONFIG_THEME.accent }}>Personal Preferences</h5>
          <div className="row g-3">
            {[
              { key: "singer", name: "Favorite Singer / Band", hint: "e.g., Daft Punk" },
              { key: "sportsperson", name: "Favorite Athlete", hint: "e.g., Serena Williams" },
              { key: "movie", name: "Favorite Movie", hint: "e.g., Inception" },
              { key: "book", name: "Favorite Novel / Book", hint: "e.g., Dune" },
              { key: "food", name: "Favorite Dish", hint: "e.g., Sushi" }
            ].map((fieldItem) => (
              <div className="col-12 col-sm-6" key={fieldItem.key}>
                <label className="form-label mb-1 small" style={{ color: CONFIG_THEME.textMuted, fontSize: "12px" }}>{fieldItem.name}</label>
                <input
                  type="text"
                  className="form-control shadow-none border-0"
                  placeholder={fieldItem.hint}
                  value={userData.favorites[fieldItem.key]}
                  onChange={(e) => handleInputChange(fieldItem.key, e.target.value)}
                  style={{ backgroundColor: CONFIG_THEME.bgInput, color: CONFIG_THEME.textMain, fontSize: "14px", padding: "0.6rem 0.8rem", borderRadius: "8px" }}
                />
              </div>
            ))}

            <div className="col-12 col-sm-6">
              <label className="form-label mb-1 small" style={{ color: CONFIG_THEME.textMuted, fontSize: "12px" }}>Favorite Cuisine</label>
              <select
                className="form-select shadow-none border-0"
                value={userData.favorites.cuisine}
                onChange={(e) => handleInputChange("cuisine", e.target.value)}
                style={{ backgroundColor: CONFIG_THEME.bgInput, color: CONFIG_THEME.textMain, fontSize: "14px", padding: "0.6rem 0.8rem", borderRadius: "8px" }}
              >
                <option value="">Select choice...</option>
                {FOOD_CUISINES.map((cuisineOption) => (
                  <option key={cuisineOption} value={cuisineOption} style={{ backgroundColor: CONFIG_THEME.bgCard }}>
                    {cuisineOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <footer className="d-flex justify-content-between align-items-center mt-5 pt-3" style={{ borderTop: `1px solid ${CONFIG_THEME.border}` }}>
            <button
              type="button"
              className="btn btn-link text-decoration-none p-0 small shadow-none"
              onClick={() => navigate("/")}
              style={{ color: CONFIG_THEME.textMuted, fontSize: "13px" }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn text-white px-4 py-2 fw-semibold d-flex align-items-center gap-2 shadow-none"
              onClick={handleSaveChanges}
              disabled={loading}
              style={{ backgroundColor: CONFIG_THEME.accent, border: "none", borderRadius: "8px", fontSize: "14px" }}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <>Save Changes <FaCheckCircle size={12} /></>
              )}
            </button>
          </footer>

        </div>
      </div>
    </div>
  );
}