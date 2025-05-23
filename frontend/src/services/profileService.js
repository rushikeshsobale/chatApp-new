import api from '../api';
import { getAccessToken } from './authService';
const apiUrl = process.env.REACT_APP_API_URL;
// Get user data
export const getUserData = async (token) => {
    const response = await fetch(`${apiUrl}/getUser`, {
        method: "GET",
        credentials: "include",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error("Failed to fetch user data");
    }
    return response.json();
};
// Get profile user data
export const getProfileUserData = async (userId, currentUserId) => {
    try {
      const response = await api.get(`/profile/userProfile/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch profile user data:", error.message);
      throw new Error("Could not fetch profile data. Please try again later.");
    }
  };
// Get user posts
export const getUserPosts = async (userId) => {
    const response = await fetch(`${apiUrl}/post/getPosts/${userId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch posts");
    }
    return response.json();
};

// Get notifications
export const getNotifications = async (token) => {
    const response = await fetch(`${apiUrl}/api/notifications`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error("Failed to fetch notifications");
    }
    return response.json();
};

// Get stories
export const getStories = async (token) => {
    const response = await fetch(`${apiUrl}/stories/feed`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        throw new Error("Failed to fetch stories");
    }
    return response.json();
};

// Get trending topics
export const getTrendingTopics = async () => {
    const response = await fetch(`${apiUrl}/api/trending`);
    if (!response.ok) {
        throw new Error("Failed to fetch trending topics");
    }
    return response.json();
};

// Get events
export const getEvents = async () => {
    const response = await fetch(`${apiUrl}/api/events`);
    if (!response.ok) {
        throw new Error("Failed to fetch events");
    }
    return response.json();
};

// Create story
export const createStory = async (storyData, token) => {
    const formData = new FormData();
    formData.append('media', storyData.media);
    formData.append('caption', storyData.caption);

    const response = await fetch(`${apiUrl}/stories/create`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });
    if (!response.ok) {
        throw new Error("Failed to create story");
    }
    return response.json();
};

// Update user profile
export const updateUserProfile = async (userId, profileData, token) => {
    const formData = new FormData();
    formData.append("firstName", profileData.firstName);
    formData.append("lastName", profileData.lastName);
    formData.append("bio", profileData.bio);
    if (profileData.profilePicture) {
        formData.append("profilePicture", profileData.profilePicture);
    }

    const response = await fetch(`${apiUrl}/profile/updateUser/${userId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });
    if (!response.ok) {
        throw new Error("Failed to update profile");
    }
    return response.json();
};

// Like post
export const likePost = async (postId, token) => {
    const response = await fetch(`${apiUrl}/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error("Failed to like post");
    }
    return response.json();
};

// Add comment
export const addComment = async (postId, commentText, token) => {
    const response = await fetch(`${apiUrl}/api/posts/${postId}/comment`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: commentText }),
    });
    if (!response.ok) {
        throw new Error("Failed to add comment");
    }
    return response.json();
};

// Share post
export const sharePost = async (postId, token) => {
    const response = await fetch(`${apiUrl}/api/posts/${postId}/share`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error("Failed to share post");
    }
    return response.json();
};

// Save post
export const savePost = async (postId, token) => {
    const response = await fetch(`${apiUrl}/api/posts/${postId}/save`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error("Failed to save post");
    }
    return response.json();
};

// Follow user
export const followUser = async (userId, token) => {
    const response = await fetch(`${apiUrl}/api/users/${userId}/follow`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error("Failed to follow user");
    }
    return response.json();
};

// Unfollow user
export const unfollowUser = async (userId, token) => {
    const response = await fetch(`${apiUrl}/api/users/${userId}/unfollow`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error("Failed to unfollow user");
    }
    return response.json();
};

// Mark notifications as read
export const markNotificationsAsRead = async (token) => {
    const response = await fetch(`${apiUrl}/api/notifications/markAsRead`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error("Failed to mark notifications as read");
    }
    return response.json();
};

export const fetchSuggestions = async () => {
  try {
     const token = getAccessToken();
     
    const response = await fetch(`${apiUrl}/profile/suggestions`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch suggestions");
    }
    
    const data = await response.json();
    
    return data|| [];
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    throw error;
  }
};
  
// Send follow request
export const sendFollowRequest = async (userId, token) => {

    try {
        const response = await api.post(`/profile/follow/${userId}`, {}, {
        });
        return response.data;
    } catch (error) {
        console.error("Error sending follow request:", error);
        return null;
    }
};

// Accept or deny follow request
export const handleFollowRequest = async (requesterId, action) => {
    try {
        const response = await api.post(`/profile/follow-request/${requesterId}`, { action }, {
        });
        return response.data;
    } catch (error) {
        console.error("Error handling follow request:", error);
        return null;
    }
};


