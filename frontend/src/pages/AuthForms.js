import React, { useState, useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  FaLock,
  FaEnvelope,
  FaGoogle,
  FaEye,
  FaEyeSlash,
  FaSun,
  FaMoon,
} from "react-icons/fa";

import {
  login,
  verifyEmail,
  sendVerification,
} from "../services/authService";
import tokens from "../styles/designTokens";

import "bootstrap/dist/css/bootstrap.min.css";

const badgeStyle = {
  fontSize: "0.72rem",
  fontWeight: 700,
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "999px",
  padding: "6px 12px",
  backdropFilter: "blur(6px)",
};

const AuthPage = () => {
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const response = await login({
          email: formData.email,
          password: formData.password,
        });
        if (response.success) {
          navigate(response.redirectTo || "/home");
        }
      } else if (authStep === 1) {
        await sendVerification(formData.email);
        setAuthStep(2);
      } else if (authStep === 2) {
        if (!verificationCode || verificationCode.length < 6) {
          setErrors({ form: "Please enter the 6-digit code sent to your email." });
          setLoading(false);
          return;
        }

        const response = await verifyEmail({
          email: formData.email,
          code: verificationCode,
        });

        if (response.success) {
          navigate(response.redirectTo || "/onboarding");
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
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/${provider}`;
  };

  const t = tokens;
  const d = isDark;

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: t.page(d) }}
    >
      <div
        className="d-flex w-100 overflow-hidden"
        style={{
          maxWidth: "920px",
          minHeight: "560px",
          borderRadius: "20px",
          background: t.surface(d),
          boxShadow: t.shadow(d),
        }}
      >
        {/* Brand panel */}
        <div
          className="d-none d-md-flex flex-column justify-content-between position-relative"
          style={{ flex: "1 1 45%", background: t.gradient, color: "#fff", padding: "44px 40px", overflow: "hidden" }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none" }}>
            <span style={{ position: "absolute", width: 260, height: 260, right: -90, top: -80, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.35)" }} />
            <span style={{ position: "absolute", width: 170, height: 170, right: 30, bottom: -60, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.35)" }} />
            <span style={{ position: "absolute", width: 110, height: 110, right: -20, bottom: 50, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.22)" }} />
          </div>

          <div style={{ position: "relative", zIndex: 1, fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            HiBuddy
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: "1.7rem", fontWeight: 800, lineHeight: 1.25, marginBottom: 12 }}>
              {isLogin ? (
                <>Real conversations,<br />actually private.</>
              ) : (
                <>Join in under<br />a minute.</>
              )}
            </h2>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, opacity: 0.92, maxWidth: "30ch", margin: 0 }}>
              {isLogin
                ? "End-to-end encrypted chat, stories, and calls with the people you actually talk to."
                : "Email, a quick code, then you're in."}
            </p>
          </div>

          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {isLogin ? (
              <>
                <span style={badgeStyle}>🔒 End-to-end encrypted</span>
                <span style={badgeStyle}>⚡ Real-time</span>
              </>
            ) : (
              <span style={badgeStyle}>Step {authStep} of 2</span>
            )}
          </div>
        </div>

        {/* Form panel */}
        <div
          className="flex-grow-1 position-relative d-flex flex-column justify-content-center"
          style={{ padding: "44px", color: t.text(d) }}
        >
          <button
            onClick={toggleTheme}
            type="button"
            className="btn position-absolute rounded-circle d-flex align-items-center justify-content-center"
            style={{ top: 20, right: 20, width: 36, height: 36, background: t.surfaceAlt(d), border: t.border(d) }}
            aria-label="Toggle theme"
          >
            {d ? <FaSun className="text-warning" size={14} /> : <FaMoon size={14} style={{ color: t.textMuted(d) }} />}
          </button>

          <div className="mb-4">
            <p
              className="mb-1"
              style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.accent }}
            >
              {isLogin ? "Welcome back" : `Step ${authStep} of 2`}
            </p>
            <h3 className="fw-bold mb-1" style={{ fontSize: "1.4rem" }}>
              {isLogin ? "Sign in to HiBuddy" : authStep === 1 ? "Create your account" : "Verify your email"}
            </h3>
            <p className="mb-0" style={{ fontSize: "0.88rem", color: t.textMuted(d) }}>
              {isLogin ? (
                "Pick up your conversations where you left off."
              ) : authStep === 1 ? (
                "We'll send a verification code to this address."
              ) : (
                <>A code was sent to <strong style={{ color: t.text(d) }}>{formData.email}</strong></>
              )}
            </p>
          </div>

          {errors.form && (
            <div
              className="py-2 px-3 small rounded-3 text-center mb-3"
              style={{
                background: errors.form.startsWith("✓") ? "rgba(29,158,117,0.12)" : "rgba(226,75,74,0.12)",
                color: errors.form.startsWith("✓") ? t.success : t.danger,
              }}
            >
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            {(isLogin || authStep === 1) && (
              <div>
                <label className="d-block small fw-bold mb-1" style={{ color: t.textMuted(d) }}>
                  Email address
                </label>
                <div
                  className="d-flex align-items-center gap-2 px-3 py-2"
                  style={{ background: t.surfaceAlt(d), borderRadius: 12, border: errors.email ? `1px solid ${t.danger}` : t.border(d) }}
                >
                  <FaEnvelope size={13} style={{ color: t.textMuted(d) }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="username@domain.com"
                    className="border-0 flex-grow-1"
                    style={{ background: "transparent", outline: "none", fontSize: "0.9rem", color: t.text(d) }}
                  />
                </div>
                {errors.email && <div className="small mt-1" style={{ color: t.danger }}>{errors.email}</div>}
              </div>
            )}

            {isLogin && (
              <div>
                <label className="d-block small fw-bold mb-1" style={{ color: t.textMuted(d) }}>
                  Password
                </label>
                <div
                  className="d-flex align-items-center gap-2 px-3 py-2"
                  style={{ background: t.surfaceAlt(d), borderRadius: 12, border: errors.password ? `1px solid ${t.danger}` : t.border(d) }}
                >
                  <FaLock size={13} style={{ color: t.textMuted(d) }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="border-0 flex-grow-1"
                    style={{ background: "transparent", outline: "none", fontSize: "0.9rem", color: t.text(d) }}
                  />
                  <button
                    type="button"
                    className="btn p-0 border-0"
                    style={{ color: t.textMuted(d) }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                  </button>
                </div>
                {errors.password && <div className="small mt-1" style={{ color: t.danger }}>{errors.password}</div>}
              </div>
            )}

            {!isLogin && authStep === 2 && (
              <div className="text-center py-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength="6"
                  className="text-center fw-bold border-0 w-100 mb-2"
                  style={{ background: t.surfaceAlt(d), borderRadius: 12, padding: "14px", fontSize: "1.5rem", letterSpacing: "6px", color: t.text(d) }}
                />
                <div className="d-flex justify-content-between px-1 mt-2">
                  <button
                    type="button"
                    className="btn btn-link p-0 small fw-bold text-decoration-none"
                    style={{ color: t.accent }}
                    onClick={() => setAuthStep(1)}
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    className="btn btn-link p-0 small fw-bold text-decoration-none"
                    style={{ color: t.textMuted(d) }}
                    onClick={handleResendCode}
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn w-100 fw-bold border-0"
              disabled={loading}
              style={{ background: t.gradient, color: "#fff", borderRadius: 12, padding: "13px" }}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : isLogin ? (
                "Sign In"
              ) : authStep === 1 ? (
                "Send Verification Code"
              ) : (
                "Verify Email"
              )}
            </button>

            <p className="small text-center mb-0" style={{ color: t.textMuted(d) }}>
              {isLogin ? "New to HiBuddy? " : "Already verified? "}
              <span
                className="fw-bold"
                style={{ cursor: "pointer", color: t.accent }}
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthStep(1);
                  setErrors({});
                }}
              >
                {isLogin ? "Create an account" : "Log in"}
              </span>
            </p>
          </form>

          <div className="d-flex align-items-center my-4">
            <div className="flex-grow-1" style={{ borderTop: t.border(d) }} />
            <span
              className="mx-3 small fw-bold text-uppercase"
              style={{ fontSize: "0.68rem", letterSpacing: "0.06em", color: t.textMuted(d) }}
            >
              or continue with
            </span>
            <div className="flex-grow-1" style={{ borderTop: t.border(d) }} />
          </div>

          <button
            type="button"
            className="btn w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
            style={{ background: t.surface(d), border: t.border(d), borderRadius: 12, padding: "11px", color: t.text(d) }}
            onClick={() => handleSocialLogin("google")}
          >
            <FaGoogle className="text-danger" /> Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
