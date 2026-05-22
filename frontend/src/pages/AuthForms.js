import React, { useState, useContext } from "react";
import { UserContext } from "../contexts/UserContext";
import { ThemeContext } from "../contexts/ThemeContext"; // New Import
import { useDispatch } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import { Link, useNavigate } from "react-router-dom";
import {
  FaLock,
  FaEnvelope,
  FaBirthdayCake,
  FaTransgender,
  FaGoogle,
  FaEye,
  FaEyeSlash,
  FaSun,
  FaMoon,
} from "react-icons/fa";

import api from "../api";
import {
  register,
  login,
  verifyEmail,
  sendVerification,
} from "../services/authService";
import { SET_USER } from "../store/action";
import { fetchUserKeys, uploadUserKeys } from "../services/keyse2e";
import CryptoUtils from "../utils/CryptoUtils";

import "bootstrap/dist/css/bootstrap.min.css";
import "../css/AuthForms.css";

const AuthPage = () => {
  const dispatch = useDispatch();
  const { setUser, setUserId } = useContext(UserContext);
  const { isDark, toggleTheme } = useContext(ThemeContext); // Use Theme Context
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [authStep, setAuthStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
    phone: "",
    birthDate: "",
    gender: "other",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (isLogin && !formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { token, hasKeys } = await login({
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem("token", token);
        const decodedData = jwtDecode(token);
        
        dispatch({ type: SET_USER, payload: { user: decodedData } });
        setUser(decodedData);
        setUserId(decodedData._id);
        localStorage.setItem("user", JSON.stringify(decodedData));

        if (!hasKeys) {
          const keyPair = await crypto.subtle.generateKey(
            { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true,
            ["encrypt", "decrypt"]
          );
          const { encrypted, salt, iv } = await CryptoUtils.encryptPrivateKey(keyPair.privateKey, formData.password);
          const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);

          await uploadUserKeys({
            publicKey: new Uint8Array(publicKey),
            encryptedPrivateKey: new Uint8Array(encrypted),
            salt: new Uint8Array(salt),
            iv: new Uint8Array(iv),
          });
          await CryptoUtils.saveKeyLocally(keyPair.privateKey);
        } else {
          let localKey = await CryptoUtils.loadKeyLocally();
          if (!localKey) {
            const dbKeys = await fetchUserKeys();
            const unlockedKey = await CryptoUtils.getPrivateKeyFromBackup(dbKeys, formData.password);
            await CryptoUtils.saveKeyLocally(unlockedKey);
          }
        }
        navigate("/profile");
      } else {
        if (authStep === 1) {
          await sendVerification(formData.email);
          setAuthStep(2);
        } else if (authStep === 2) {
          const verified = await verifyEmail({ email: formData.email, code: verificationCode });
          if (verified) setAuthStep(3);
        } else {
          const response = await register({ ...formData, verificationCode });
          localStorage.setItem('userId', response.userId);
          navigate("/onboarding");
        }
      }
    } catch (error) {
      console.error("Authentication system failure:", error);
      setErrors({ ...errors, form: error.message || "Authentication process failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/${provider}`;
  };

  return (
    // Changed bg-light to bg-body-tertiary to naturally fall back on dark backgrounds
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary py-5 position-relative">
      
      {/* Floating Theme Toggle Switch Button */}
      <button
        onClick={toggleTheme}
        className={`btn position-absolute top-0 end-0 m-4 shadow-sm border rounded-circle d-flex align-items-center justify-content-center ${isDark ? 'btn-dark border-secondary' : 'btn-white border-muted'}`}
        style={{ width: "42px", height: "42px", transition: "all 0.25s ease" }}
        aria-label="Toggle structural interface theme"
      >
        {isDark ? <FaSun className="text-warning animate-spin" size={16} /> : <FaMoon className="text-secondary" size={16} />}
      </button>

      {/* Surface Card: shadow adapts contextually to dark layouts */}
      <div className={`card border-0 p-4 p-sm-5 ${isDark ? 'shadow-lg bg-dark' : 'shadow-sm bg-white'}`} style={{ maxWidth: "460px", width: "100%", borderRadius: "20px" }}>
        
        {/* Step-by-Step Context Tracker Header */}
        <div className="text-center mb-4">
          <span 
            className="badge mb-2 text-uppercase tracking-wider fw-bold px-3 py-15" 
            style={{ 
              fontSize: '0.75rem', 
              backgroundColor: isDark ? 'rgba(13, 202, 240, 0.18)' : 'rgba(13, 202, 240, 0.1)' ,
              color: '#0dcaf0'
            }}
          >
            {isLogin ? "Secure Entry" : `Step ${authStep} of 3`}
          </span>
          <h2 className="fw-bold h3 mt-1">
            {isLogin ? "Welcome Back" : authStep === 1 ? "Create Account" : authStep === 2 ? "Verify Email" : "Complete Profile"}
          </h2>
          <p className="text-muted small">
            {isLogin ? "Please sign in to continue your session." : authStep === 3 ? "Just a few more details to customize your dashboard." : "Get started with your security credentials."}
          </p>
        </div>

        {errors.form && <div className="alert alert-danger py-2.5 px-3 small border-0 rounded-3 text-center mb-3">{errors.form}</div>}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          
          {/* STEP 1: Core Credentials */}
          {authStep === 1 && (
            <>
              <div>
                <label className="form-label small fw-semibold text-secondary mb-1">Email Address</label>
                <div className="input-group">
                  {/* Changed standard bg-light/text-muted classes to adaptive theme semantics */}
                  <span className="input-group-text bg-body border-end-0 text-secondary">
                    <FaEnvelope size={14} />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="username@domain.com"
                    className={`form-control bg-body border-start-0 py-2 ${errors.email ? "is-invalid" : ""}`}
                    style={{ fontSize: "0.9rem" }}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
              </div>

              {isLogin && (
                <div>
                  <label className="form-label small fw-semibold text-secondary mb-1">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-body border-end-0 text-secondary">
                      <FaLock size={14} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`form-control bg-body border-start-0 border-end-0 py-2 ${errors.password ? "is-invalid" : ""}`}
                      style={{ fontSize: "0.9rem" }}
                    />
                    <button
                      type="button"
                      className="input-group-text bg-body border-start-0 text-secondary px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: One-Time Password Verification Block */}
          {authStep === 2 && (
            <div className="text-center py-2">
              <p className="text-muted small mb-3">
                A verification code was sent to <strong className="text-body d-block">{formData.email}</strong>
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                className="form-control form-control-lg text-center tracking-widest fw-bold bg-body border-0 py-2.5 mb-2"
                maxLength="6"
                style={{ fontSize: "1.5rem", letterSpacing: "6px" }}
              />
              <div className="d-flex justify-content-between px-1 mt-3">
                <button type="button" className="btn btn-link p-0 text-info text-decoration-none small fw-medium" onClick={() => setAuthStep(1)}>
                  Change Email
                </button>
                <button type="button" className="btn btn-link p-0 text-muted text-decoration-none small fw-medium" onClick={() => console.log("Resend code integration trigger")}>
                  Resend Code
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Extensive Profile Setup Details */}
          {authStep === 3 && (
            <div className="d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-semibold text-secondary mb-1">Username</label>
                <div className="input-group">
                  <span className="input-group-text bg-body border-end-0 text-secondary fw-bold">@</span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="unique_handle"
                    className={`form-control bg-body border-start-0 py-2 ${errors.username ? "is-invalid" : ""}`}
                    style={{ fontSize: "0.9rem" }}
                  />
                  {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold text-secondary mb-1">Birth Date</label>
                <div className="input-group">
                  <span className="input-group-text bg-body border-end-0 text-secondary">
                    <FaBirthdayCake size={14} />
                  </span>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="form-control bg-body border-start-0 py-2"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold text-secondary mb-1">Gender Identification</label>
                <div className="input-group">
                  <span className="input-group-text bg-body border-end-0 text-secondary">
                    <FaTransgender size={14} />
                  </span>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="form-select bg-body border-start-0 py-2"
                    style={{ fontSize: "0.9rem" }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other Identity</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold text-secondary mb-1">Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-body border-end-0 text-secondary"><FaLock size={14} /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Configure secure password"
                    className={`form-control bg-body border-start-0 border-end-0 py-2 ${errors.password ? 'is-invalid' : ''}`}
                    style={{ fontSize: "0.9rem" }}
                  />
                  <button
                    type="button"
                    className="input-group-text bg-body border-start-0 text-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                  {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-info text-white fw-bold w-100 py-2.5 mt-2 transition-all shadow-sm"
            disabled={loading}
            style={{ borderRadius: '8px', letterSpacing: '0.3px', background: 'linear-gradient(135deg, #0dcaf0, #0aa2c0)', border: 'none' }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : isLogin ? (
              "Access System Account"
            ) : authStep === 1 ? (
              "Continue Processing"
            ) : authStep === 2 ? (
              "Confirm Validation Code"
            ) : (
              "Finalize & Enter Onboarding"
            )}
          </button>

          <p className="small text-center text-secondary mt-2 mb-0">
            {isLogin ? "New to our ecosystem? " : "Already verified? "}
            <span 
              className="text-info fw-bold" 
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthStep(1);
                setErrors({});
              }}
            >
              {isLogin ? "Sign Up" : "Log In"}
            </span>
          </p>

          {isLogin && (
            <div className="text-center">
              <Link to="/forgot-password" className="text-secondary text-decoration-none extra-small text-muted" style={{ fontSize: '0.8rem' }}>
                Forgot Password?
              </Link>
            </div>
          )}
        </form>

        {/* Modular Native Divider Component */}
        <div className="d-flex align-items-center my-4">
          <div className="flex-grow-1" style={{ height: '1px', backgroundColor: 'var(--bs-border-color)' }}></div>
          <span className="mx-3 text-muted extra-small fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.7rem' }}>Third-Party Provider</span>
          <div className="flex-grow-1" style={{ height: '1px', backgroundColor: 'var(--bs-border-color)' }}></div>
        </div>

        {/* Integrated Social Federation Action Row */}
        <div className="d-grid">
          <button
            className={`btn d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold ${isDark ? 'btn-outline-secondary text-white' : 'btn-outline-muted border text-dark bg-white'}`}
            onClick={() => handleSocialLogin("google")}
            style={{ fontSize: "0.85rem", borderRadius: "8px" }}
          >
            <FaGoogle className="text-danger" /> Connect Google Account
          </button>
        </div>

        {/* Absolute Legal Footer Context */}
        <div className="text-center mt-4 pt-1">
          <p className="text-muted mb-0" style={{ fontSize: '0.75rem', lineHeight: '1.5' }}>
            By continuing your authentication query, you endorse our{" "}
            <Link to="/terms" className="text-body fw-semibold text-decoration-none">Terms of Service</Link> &{" "}
            <Link to="/privacy" className="text-body fw-semibold text-decoration-none">Privacy Schema</Link>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;