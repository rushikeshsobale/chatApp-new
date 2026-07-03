import React, { useState, useContext } from "react";
import { UserContext } from "../contexts/UserContext";
import { ThemeContext } from "../contexts/ThemeContext";
import { useDispatch } from 'react-redux';
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

import "bootstrap/dist/css/bootstrap.min.css";
import "../css/AuthForms.css";

const AuthPage = () => {
  const dispatch = useDispatch();
  const { setUser } = useContext(UserContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
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
      newErrors.email = "Please enter your email address.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "That doesn't look like a valid email address.";
    }
    if (isLogin && !formData.password) {
      newErrors.password = "Please enter your password.";
    }
    if (authStep === 3) {
      if (!formData.username) newErrors.username = "Please choose a username.";
      if (!formData.password) newErrors.password = "Please set a password.";
      else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
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
        // 1. Submit email/password to the updated backend router
        const response = await login({
          email: formData.email,
          password: formData.password,
        });
        if (response.success) {
          navigate(
            response.redirectTo || "/home"
          );
        }

      } else {
        if (authStep === 1) {
          await sendVerification(formData.email);
          setAuthStep(2);
        } else if (authStep === 2) {
          if (!verificationCode || verificationCode.length < 6) {
            setErrors({ form: "Please enter the 6-digit code sent to your email." });
            setLoading(false);
            return;
          }

          const response =
            await verifyEmail({
              email: formData.email,
              code: verificationCode,
            });

          if (response.success) {
            console.log("Email verified successfully. Proceeding to complete profile.", response);

            navigate(
              response.redirectTo ||
              "/onboarding"
            );
          }
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      const code = error?.code;
      const serverMessage = error?.message;
      const friendlyErrors = {
        ACCOUNT_NOT_FOUND: { form: "No account found with that email. Want to sign up instead?" },
        INVALID_CREDENTIALS: { password: "Incorrect password. Please try again." },
        PASSWORD_NOT_SET: { form: "This account was created with Google. Please use 'Continue with Google' below." },
        EMAIL_ALREADY_EXISTS: { email: "An account with this email already exists. Try logging in." },
        INVALID_VERIFICATION_CODE: { form: "That code doesn't match. Please check your email and try again." },
        EXPIRED_VERIFICATION_CODE: { form: "That code has expired. Please request a new one." },
        SERVER_ERROR: { form: "Something went wrong on our end. Please try again in a moment." },
      };
     
      const mapped = friendlyErrors[code];
      
      if (mapped) {
        setErrors(mapped);
      } else {
        setErrors({
          form: serverMessage || "Something went wrong. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setErrors({});
      await sendVerification(formData.email);
      setErrors({ form: "✓ A new code has been sent to your email." });
    } catch {
      setErrors({ form: "Couldn't resend the code. Please try again." });
    }
  };

  const handleSocialLogin = (provider) => {
    // Hits the passport routing endpoint directly
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/${provider}`;
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary py-5 position-relative">
      <button
        onClick={toggleTheme}
        type="button"
        className={`btn position-absolute top-0 end-0 m-4 shadow-sm border rounded-circle d-flex align-items-center justify-content-center ${isDark ? 'btn-dark border-secondary' : 'btn-white border-muted'}`}
        style={{ width: "42px", height: "42px", transition: "all 0.25s ease" }}
        aria-label="Toggle structural interface theme"
      >
        {isDark ? <FaSun className="text-warning" size={16} /> : <FaMoon className="text-secondary" size={16} />}
      </button>

      <div className={`card border-0 p-4 p-sm-5 ${isDark ? 'shadow-lg bg-dark' : 'shadow-sm bg-white'}`} style={{ maxWidth: "460px", width: "100%", borderRadius: "20px" }}>
        <div className="text-center mb-4">
          <span
            className="badge mb-2 text-uppercase tracking-wider fw-bold px-3 py-15"
            style={{
              fontSize: '0.75rem',
              backgroundColor: isDark ? 'rgba(13, 202, 240, 0.18)' : 'rgba(13, 202, 240, 0.1)',
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

        {errors.form && (
          <div className={`alert py-2 px-3 small border-0 rounded-3 text-center mb-3 ${errors.form.startsWith("✓") ? "alert-success" : "alert-danger"}`}>
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {authStep === 1 && (
            <>
              <div>
                <label className="form-label small fw-semibold text-secondary mb-1">Email Address</label>
                <div className="input-group">
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
                <button type="button" className="btn btn-link p-0 text-muted text-decoration-none small fw-medium" onClick={handleResendCode}>
                  Resend Code
                </button>
              </div>
            </div>
          )}

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
              "Sign In"
            ) : authStep === 1 ? (
              "Send Verification Code"
            ) : authStep === 2 ? (
              "Verify Email"
            ) : (
              "Create Account"
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
        </form>

        <div className="d-flex align-items-center my-4">
          <div className="flex-grow-1" style={{ height: '1px', backgroundColor: 'var(--bs-border-color)' }}></div>
          <span className="mx-3 text-muted extra-small fw-bold text-uppercase tracking-widest" style={{ fontSize: '0.7rem' }}>Third-Party Provider</span>
          <div className="flex-grow-1" style={{ height: '1px', backgroundColor: 'var(--bs-border-color)' }}></div>
        </div>

        <div className="d-grid">
          <button
            type="button"
            className={`btn d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold ${isDark ? 'btn-outline-secondary text-white' : 'btn-outline-muted border text-dark bg-white'}`}
            onClick={() => handleSocialLogin("google")}
            style={{ fontSize: "0.85rem", borderRadius: "8px" }}
          >
            <FaGoogle className="text-danger" /> Connect Google Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;