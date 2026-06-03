import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaCamera,
  FaArrowRight,
  FaArrowLeft,
  FaSmile,
  FaHeart,
  FaCheckCircle,
  FaUserAstronaut,
  FaLock
} from "react-icons/fa";
import { completeProfile } from "../services/authService";
import CryptoUtils from "../utils/CryptoUtils"; // 🔹 Importing the CryptoUtils for key management
// UI Style Theme Variables
const CONFIG_THEME = {
  bgApp: "#09090b",
  bgCard: "#141416",
  bgInput: "#1d1d21",
  border: "#2a2a30",
  textMain: "#f4f4f5",
  textMuted: "#a1a1aa",
  accent: "#8b5cf6",
};

const FOOD_CUISINES = [
  "Italian", "Indian", "Chinese", "Mexican", "Japanese",
  "Thai", "French", "Mediterranean", "American", "Other"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fallback state context calculation 
  const targetUserId = localStorage.getItem("userId") || searchParams.get("userId");
  const initialUsername = searchParams.get("username") || "";

  // Flow & Operation State
  const [currentStep, setCurrentStep] = useState(1); // 1 = Identity, 2 = Preferences
  const [profilePic, setProfilePic] = useState(null);
  const [userName, setUserName] = useState(initialUsername);
  const [password, setPassword] = useState(""); // Added password management state
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  // Form Field Allocation Data Model
  const [userData, setUserData] = useState({
    favorites: { singer: "", sportsperson: "", movie: "", book: "", food: "", cuisine: "" }
  });

  // Pre-fill username if provided via Google OAuth redirect parameters
  useEffect(() => {
    if (initialUsername && !userName) {
      setUserName(initialUsername.toLowerCase().replace(/[^a-z0-9_]/g, ""));
    }
  }, [initialUsername]);

  // State update handler
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
      reader.onloadend = () => setProfilePic(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUsernameChange = (e) => {
    const sanitizedValue = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUserName(sanitizedValue);
  };

  const handleFormSubmission = async () => {
  if (
    !profilePic ||
    !userName.trim() ||
    !password.trim()
  ) {
    return;
  }

  setLoading(true);

  try {
    // Generate encryption keys
    const keyPair =
      await CryptoUtils.generateSessionKeyPair();

    const publicKeyString =
      await CryptoUtils.exportPublicKeyString(
        keyPair.publicKey
      );

    await CryptoUtils.saveKeyLocally(
      keyPair.privateKey
    );

    // Build multipart form data
    const formData = new FormData();

    formData.append(
      "userName",
      userName.trim()
    );

    formData.append(
      "password",
      password.trim()
    );

    formData.append(
      "bio",
      bio.trim()
    );

    formData.append(
      "publicKey",
      publicKeyString
    );

    formData.append(
      "profileData",
      JSON.stringify({
        onboarding: {
          preferences:
            userData?.favorites || {},
        },
      })
    );

    // Convert base64 image to blob
    if (
      typeof profilePic === "string" &&
      profilePic.startsWith("data:")
    ) {
      const imageResponse =
        await fetch(profilePic);

      const blob =
        await imageResponse.blob();

      formData.append(
        "profilePicture",
        blob,
        "profile.jpg"
      );
    }

    // Optional debug
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    // API call
    const response =
      await completeProfile(formData);

    if (response.success) {
      localStorage.setItem(
        "userData",
        JSON.stringify(response.user)
      );

      if (response.user?._id) {
        localStorage.setItem(
          "userId",
          response.user._id
        );
      }

      navigate(
        response.redirectTo || "/home",
        {
          replace: true,
        }
      );
    }
  } catch (err) {
    console.error(
      "Submission failed:",
      err
    );
  } finally {
    setLoading(false);
  }
};
  // Step 1 validation check: requires profile image, clear unique handle, and a valid password
  const isStepOneValid = profilePic !== null && userName.trim().length >= 3 && password.trim().length >= 6;

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

        {/* ==================== 1. FIXED HEADER ELEMENT ==================== */}
        <header className="text-center mb-4">
          {/* Progress Bar Track */}
          <div className="d-flex justify-content-center gap-2 mb-3">
            <div style={{ width: "24px", height: "6px", borderRadius: "3px", backgroundColor: currentStep === 1 ? CONFIG_THEME.accent : CONFIG_THEME.border, transition: "background-color 0.3s" }} />
            <div style={{ width: "24px", height: "6px", borderRadius: "3px", backgroundColor: currentStep === 2 ? CONFIG_THEME.accent : CONFIG_THEME.border, transition: "background-color 0.3s" }} />
          </div>

          <h2 className="fw-bold text-white mb-1 d-flex align-items-center justify-content-center gap-2">
            {currentStep === 1 ? (
              <>Create Identity <FaSmile style={{ color: CONFIG_THEME.accent }} size={24} /></>
            ) : (
              <>Personal Preferences <FaHeart style={{ color: CONFIG_THEME.accent }} size={20} /></>
            )}
          </h2>
          <p className="small mb-0" style={{ color: CONFIG_THEME.textMuted }}>
            {currentStep === 1 ? "Upload an avatar photo, claim your handle, and secure your account." : "Tell us a bit about your favorite pastimes below."}
          </p>
        </header>

        {/* ==================== MAIN PROFILE CONTAINER CARD ==================== */}
        <div
          className="p-4 p-md-5"
          style={{
            backgroundColor: CONFIG_THEME.bgCard,
            border: `1px solid ${CONFIG_THEME.border}`,
            borderRadius: "24px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
            overflow: "hidden"
          }}
        >

          {/* ==================== 2. SLIDER VIEWPORT WINDOW ==================== */}
          <main style={{ overflow: "hidden", position: "relative" }}>
            <div
              style={{
                display: "flex",
                width: "200%",
                transform: currentStep === 1 ? "translateX(0%)" : "translateX(-50%)",
                transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
            >

              {/* --- PANEL A: IDENTITY SLIDE (Left) --- */}
              <section style={{ width: "50%", paddingRight: "12px" }}>
                {/* Photo Uploader */}
                <div className="text-center mb-4">
                  <label htmlFor="avatar-file-input" className="d-inline-block" style={{ cursor: "pointer" }}>
                    <div
                      className="rounded-circle d-flex flex-column align-items-center justify-content-center overflow-hidden mx-auto position-relative"
                      style={{
                        width: "140px",
                        height: "140px",
                        backgroundColor: CONFIG_THEME.bgInput,
                        border: profilePic ? `2px solid ${CONFIG_THEME.accent}` : `2px dashed ${CONFIG_THEME.border}`,
                        transition: "border-color 0.3s"
                      }}
                    >
                      {profilePic ? (
                        <img src={profilePic} alt="Uploaded profile" className="w-100 h-100 object-fit-cover" />
                      ) : (
                        <div className="d-flex flex-column align-items-center gap-2" style={{ color: CONFIG_THEME.textMuted }}>
                          <FaCamera size={22} style={{ color: CONFIG_THEME.accent }} />
                          <span style={{ fontSize: "11px", fontWeight: "600" }}>Upload Photo *</span>
                        </div>
                      )}
                    </div>
                    <input id="avatar-file-input" type="file" accept="image/*" className="d-none" onChange={handleFileChange} />
                  </label>
                </div>

                {/* Username Handles Input */}
                <div className="text-start mb-3">
                  <label className="form-label small fw-semibold text-uppercase tracking-wider" style={{ color: CONFIG_THEME.textMuted, fontSize: "11px" }}>
                    Unique Handle / Username *
                  </label>
                  <div className="position-relative d-flex align-items-center">
                    <span className="position-absolute ps-3" style={{ color: CONFIG_THEME.accent }}><FaUserAstronaut size={14} /></span>
                    <input
                      type="text"
                      className="form-control shadow-none border-0 py-3"
                      placeholder="username"
                      maxLength="20"
                      value={userName}
                      onChange={handleUsernameChange}
                      style={{ backgroundColor: CONFIG_THEME.bgInput, color: CONFIG_THEME.textMain, fontSize: "14px", paddingLeft: "42px", borderRadius: "12px" }}
                    />
                  </div>
                </div>

                {/* Password Input Block */}
                <div className="text-start mb-3">
                  <label className="form-label small fw-semibold text-uppercase tracking-wider" style={{ color: CONFIG_THEME.textMuted, fontSize: "11px" }}>
                    Account Password *
                  </label>
                  <div className="position-relative d-flex align-items-center">
                    <span className="position-absolute ps-3" style={{ color: CONFIG_THEME.accent }}><FaLock size={13} /></span>
                    <input
                      type="password"
                      className="form-control shadow-none border-0 py-3"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ backgroundColor: CONFIG_THEME.bgInput, color: CONFIG_THEME.textMain, fontSize: "14px", paddingLeft: "42px", borderRadius: "12px" }}
                    />
                  </div>
                </div>

                {/* Bio Field Input */}
                <div className="text-start mb-1">
                  <label className="form-label small fw-semibold text-uppercase tracking-wider" style={{ color: CONFIG_THEME.textMuted, fontSize: "11px" }}>About Me</label>
                  <textarea
                    className="form-control shadow-none border-0 p-3"
                    rows="2"
                    maxLength="300"
                    placeholder="Tell your story or summary here..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    style={{ backgroundColor: CONFIG_THEME.bgInput, color: CONFIG_THEME.textMain, fontSize: "14px", borderRadius: "12px", resize: "none" }}
                  />
                  <div className="text-end mt-1 small" style={{ color: CONFIG_THEME.textMuted, fontSize: "11px" }}>{bio.length}/300</div>
                </div>
              </section>

              {/* --- PANEL B: PREFERENCES SLIDE (Right) --- */}
              <section style={{ width: "50%", paddingLeft: "12px" }}>
                <div className="row g-3">
                  {[
                    { key: "singer", name: "Favorite Singer / Band", hint: "e.g., Daft Punk, Queen" },
                    { key: "sportsperson", name: "Favorite Athlete", hint: "e.g., Serena Williams" },
                    { key: "movie", name: "Favorite Movie", hint: "e.g., Inception" },
                    { key: "book", name: "Favorite Novel / Book", hint: "e.g., Dune" },
                    { key: "food", name: "Favorite Dish", hint: "e.g., Tacos, Sushi" }
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

                  {/* Cuisine Dropdown Select Selection */}
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
              </section>

            </div>
          </main>

          {/* ==================== 3. ANCHORED ACTION FOOTER ==================== */}
          <footer className="d-flex justify-content-between align-items-center mt-5 pt-3" style={{ borderTop: `1px solid ${CONFIG_THEME.border}` }}>
            {/* Left Button Routing */}
            {currentStep === 1 ? (
              <button
                type="button"
                className="btn btn-link text-decoration-none p-0 small shadow-none"
                onClick={() => navigate("/")}
                style={{ color: CONFIG_THEME.textMuted, fontSize: "13px" }}
              >
                Skip configuration
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-link text-decoration-none p-0 small d-flex align-items-center gap-1 shadow-none"
                onClick={() => setCurrentStep(1)}
                style={{ color: CONFIG_THEME.textMuted, fontSize: "13px" }}
              >
                <FaArrowLeft size={10} /> Slide Back
              </button>
            )}

            {/* Right Action Button Routing */}
            {currentStep === 1 ? (
              <button
                type="button"
                className="btn text-white px-4 py-2 fw-semibold d-flex align-items-center gap-2 shadow-none"
                onClick={() => isStepOneValid && setCurrentStep(2)}
                disabled={!isStepOneValid}
                style={{
                  backgroundColor: CONFIG_THEME.accent,
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  opacity: isStepOneValid ? 1 : 0.5,
                  cursor: isStepOneValid ? "pointer" : "not-allowed",
                  transition: "opacity 0.2s ease"
                }}
              >
                Continue <FaArrowRight size={11} />
              </button>
            ) : (
              <button
                type="button"
                className="btn text-white px-4 py-2 fw-semibold d-flex align-items-center gap-2 shadow-none"
                disabled={loading}
                onClick={handleFormSubmission}
                style={{ backgroundColor: CONFIG_THEME.accent, border: "none", borderRadius: "8px", fontSize: "14px" }}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                ) : (
                  <>Complete Profile <FaCheckCircle size={12} /></>
                )}
              </button>
            )}
          </footer>

        </div>
      </div>
    </div>
  );
}