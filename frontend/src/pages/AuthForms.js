import React, { useState } from "react";
import { useDispatch } from 'react-redux';
import {jwtDecode} from 'jwt-decode';
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaPhone,
  FaBirthdayCake,
  FaTransgender,
  FaGoogle,
  FaFacebook,
  FaTwitter,
  FaApple,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import {
  register,
  login,
  verifyEmail,
  sendVerification,
} from "../services/authService";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/AuthForms.css";
import { SET_USER } from "../store/action";
const AuthPage = () => {
  const dispatch = useDispatch();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
    phone: "",
    birthDate: "",
    gender: "other",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    // if (!formData.password && isLogin) {
    //   newErrors.password = "Password is required";
    // } else if (formData.password.length < 8) {
    //   newErrors.password = "Password must be at least 8 characters";
    // }
    if (!isLogin) {
      // if (!formData.username) {
      //   newErrors.username = "Username is required";
      // }

      // if (!formData.fullName) {
      //   newErrors.fullName = 'Full name is required';
      // }

      // if (!formData.birthDate) {
      //   newErrors.birthDate = 'Birth date is required';
      // }
    }
    setErrors(newErrors);
    console.log(Object.keys(newErrors), "seeing");
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate() === false) return;
    setLoading(true);
    try {
      if (isLogin) {
        const {token} = await login({
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem("token", token);
        // if (token) {
          const decodedData = jwtDecode(token);
          dispatch({
            type: SET_USER,
            payload: { user: decodedData }, // Replace with actual userId
          });
          localStorage.setItem("user", JSON.stringify(decodedData));
        navigate("/profile");
      } else {
        if (authStep === 1) {
        const response =   await sendVerification(formData.email);
          setAuthStep(2);
        } else if (authStep === 2) {
          const verified = await verifyEmail({
            email: formData.email,
            code: verificationCode,
          });
          if (verified) {
            setIsVerified(true);
            setAuthStep(3);
          }
        } else {
          const response = await register({
            ...formData,
            verificationCode,
          });
          console.log(response)
          localStorage.setItem('userId',response.userId)
          // if (token) {
          //   const decodedData = jwtDecode(token);
          //   dispatch({
          //     type: SET_USER,
          //     payload: { user: decodedData }, // Replace with actual userId
          //   });
          //   console.log(decodedData, "decodeData");
          //   localStorage.setItem("user", JSON.stringify(decodedData));
            
          // }
         
          navigate("/onboarding");
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setErrors({
        ...errors,
        form: error.message || "Authentication failed",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSocialLogin = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/${provider}`;
  };
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            {isLogin
              ? "Welcome Back"
              : authStep === 1
              ? "Create Account"
              : authStep === 2
              ? "Verify Email"
              : "Complete Profile"}
          </h2>
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              className="auth-toggle"
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthStep(1);
              }}
            >
              {isLogin ? "Sign Up" : "Log In"}
            </span>
          </p>
        </div>
        {errors.form && <div className="alert alert-danger">{errors.form}</div>}
        <form onSubmit={handleSubmit}>
          {authStep === 1 && (
            <>
              <div className="form-group">
                <label>Email</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaEnvelope />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className={`form-control ${
                      errors.email ? "is-invalid" : ""
                    }`}
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>
              </div>
              {isLogin && (
                <div className="form-group">
                  <label>Password</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaLock />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`form-control ${
                        errors.password ? "is-invalid" : ""
                      }`}
                    />
                    <button
                      type="button"
                      className="input-group-text"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    {errors.password && (
                      <div className="invalid-feedback">{errors.password}</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {authStep === 2 && (
            <div className="form-group">
              <label>Verification Code</label>
              <p className="text-muted">
                We sent a 6-digit code to {formData.email}
              </p>
              <div className="input-group">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  className="form-control"
                  maxLength="6"
                />
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={() => setAuthStep(1)}
                >
                  Change Email
                </button>
                <button
                  type="button"
                  className="btn btn-link p-0 ms-3"
                  onClick={() => console.log("Resend code")}
                >
                  Resend Code
                </button>
              </div>
            </div>
          )}

          {authStep === 3 && (
            <>
              <div className="form-group">
                <label>Username</label>
                <div className="input-group">
                  <span className="input-group-text">@</span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="username"
                    className={`form-control ${
                      errors.username ? "is-invalid" : ""
                    }`}
                  />
                  {errors.username && (
                    <div className="invalid-feedback">{errors.username}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaPhone />
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (123) 456-7890"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Birth Date</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaBirthdayCake />
                  </span>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Gender</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaTransgender />
                  </span>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="input-group">
                  <span className="input-group-text"><FaLock /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  />
                  <button 
                    type="button" 
                    className="input-group-text"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                  {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                </div>
              </div>
            </>
          )}

          <div className="form-group mt-4">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : isLogin ? (
                "Log In"
              ) : authStep === 1 ? (
                "Continue"
              ) : authStep === 2 ? (
                "Verify"
              ) : (
                "Complete Registration"
              )}
            </button>
          </div>

          {isLogin && (
            <div className="text-center mt-3">
              <Link to="/forgot-password" className="text-decoration-none">
                Forgot Password?
              </Link>
            </div>
          )}
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="social-auth">
          <button
            className="btn btn-social btn-google"
            onClick={() => handleSocialLogin("google")}
          >
            <FaGoogle /> Continue with Google
          </button>
          <button
            className="btn btn-social btn-facebook"
            onClick={() => handleSocialLogin("facebook")}
          >
            <FaFacebook /> Continue with Facebook
          </button>
          <button
            className="btn btn-social btn-twitter"
            onClick={() => handleSocialLogin("twitter")}
          >
            <FaTwitter /> Continue with Twitter
          </button>
          <button
            className="btn btn-social btn-apple"
            onClick={() => handleSocialLogin("apple")}
          >
            <FaApple /> Continue with Apple
          </button>
        </div>

        <div className="auth-footer">
          <p className="text-muted">
            By {isLogin ? "logging in" : "registering"}, you agree to our
            <Link to="/terms" className="text-decoration-none">
              {" "}
              Terms
            </Link>{" "}
            and
            <Link to="/privacy" className="text-decoration-none">
              {" "}
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
