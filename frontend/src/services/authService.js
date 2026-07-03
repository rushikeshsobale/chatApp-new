// src/services/authService.js
import api from '../api';

export const register = async (userData) => {
  try {
    const response = await api.post('auth/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Registration failed';
  }
};
export const getMe = async () => {
  try {
    const response = await api.get('auth/getUser');
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Failed to fetch user data';
  }
};
export const login = async (credentials) => {
  try {
    const response = await api.post('auth/login', credentials);
    return response.data;
  } catch (error) {
    const errData = error.response?.data;
    const err = new Error(errData?.message || 'Login failed');
    err.code = errData?.code;
    throw err;
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
    const response = await api.post('auth/send-verification', { email });
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
