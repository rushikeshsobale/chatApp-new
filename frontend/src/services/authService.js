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
export const login = async (credentials) => {
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
export const completeProfile = async (userId, profileData) => {
  try {
    const formData = new FormData();
    for (const key in profileData) {
      if (key === "profilePicture" && profileData[key] instanceof File) {
        formData.append("profilePicture", profileData[key]);
      } else if (typeof profileData[key] === "object") {
        formData.append(key, JSON.stringify(profileData[key])); // Ensure objects are stringified
      } else {
        formData.append(key, profileData[key]);
      }
    }

    const response = await api.put(`auth/complete-profile/${userId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Profile completion failed";
  }
};
