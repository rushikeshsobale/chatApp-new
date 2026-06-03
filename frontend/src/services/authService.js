// src/services/authService.js
import api from '../api';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('auth/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Registration failed';
  }
};
export const getMe = async () => {
  try {    const response = await api.get('auth/getUser');
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Failed to fetch user data';
  } 
};
export const login = async (credentials) => {
  console.log(credentials, 'credentials')
  try {
    const response = await api.post('auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Login failed';
  }
};
export const verifyEmail = async ({ email, code }) => {
  try {
    const response = await api.post('auth/verify-email', { email, code });
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Email verification failed';
  }
};
export const sendVerification = async (email) => {
  try {
    const response = await api.post('auth/send-verification',{email});
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Failed to send verification code';
  }
};
export const completeProfile = async (formData) => {
  try {
    const response = await api.put(
      "/auth/complete-profile",
      formData
    
    );

    return response.data;
  } catch (error) {
    console.error("Complete profile error:", error);

    throw (
      error?.response?.data?.error ||
      "Profile completion failed"
    );
  }
};
export const refreshToken = async () => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('auth/refresh-token', {
      refreshToken
    });

    const { accessToken, newRefreshToken } = response.data;
    setTokens(accessToken, newRefreshToken);
    return accessToken;
  } catch (error) {
    // Clear tokens on refresh failure
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    throw error.response?.data?.error || 'Failed to refresh token';
  }
};

 export const handleForgotPassword = async (email) => {
  try {
    const response = await api.post('auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to send reset link';
  }
};

export const resetPassword = async (token, newPassword) => {
  const response = await api.post('auth/reset-password', {
    token,
    newPassword
  });
  return response.data;
};

export const setPassword = async (password) => {
  try {
    const response = await api.post(
      "auth/set-password",
      { password },
      { withCredentials: true } // IMPORTANT
    );
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || "Failed to set password";
  }
};
