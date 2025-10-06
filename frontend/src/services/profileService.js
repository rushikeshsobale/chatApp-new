import api from '../api';
import { getAccessToken } from './authService';

// Get user data
export const getUserData = async () => {
    try {
        const response = await api.get('/profile/getUser');
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch user data");
    }
};

// Get profile user data
export const getProfileUserData = async (userId) => {
    console.log(userId, 'sertggffgf')
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
    try {
        const response = await api.get(`/post/getPosts/${userId}`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch posts");
    }
};
export const getPostById =async(postId)=>{
    try{
       const response = await api.get(`/post/${postId}/getPostById`)
       return response.data
    }catch(error){
     throw new Error("failed to fetch the post by id")
    }
}
// Get notifications
export const getNotifications = async (id) => {
    try {
        const response = await api.get(`/notifications/fetch/${id}`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch notifications");
    }
};
// Get stories
export const getStories = async () => {
    try {
        const response = await api.get('/stories/feed');
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch stories");
    }
};
// Get trending topics
export const getTrendingTopics = async () => {
    try {
        const response = await api.get('/api/trending');
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch trending topics");
    }
};

// Get events
export const getEvents = async () => {
    try {
        const response = await api.get('/api/events');
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch events");
    }
};

// Create story
export const createStory = async (storyData) => {
    const formData = new FormData();
    formData.append('media', storyData.media);
    formData.append('caption', storyData.caption);
    try {
        const response = await api.post('/stories/create', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw new Error("Failed to create story");
    }
};

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
    const formData = new FormData();
    formData.append("firstName", profileData.firstName);
    formData.append("lastName", profileData.lastName);
    formData.append("bio", profileData.bio);
    if (profileData.profilePicture) {
        formData.append("profilePicture", profileData.profilePicture);
    }

    try {
        const response = await api.put(`/profile/updateUser/${userId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw new Error("Failed to update profile");
    }
};


// Follow user
export const followUser = async (userId) => {
    try {
        const response = await api.post(`/api/users/${userId}/follow`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to follow user");
    }
};

// Unfollow user
export const unfollowUser = async (userId) => {
    try {
        const response = await api.post(`/api/users/${userId}/unfollow`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to unfollow user");
    }
};

// Mark notifications as read
export const markNotificationsAsRead = async () => {
    try {
        const response = await api.post('/api/notifications/markAsRead');
        return response.data;
    } catch (error) {
        throw new Error("Failed to mark notifications as read");
    }
};

export const fetchSuggestions = async () => {
    try {
        const response = await api.get('/profile/suggestions');
        return response.data || [];
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        throw error;
    }
};

// Send follow request
export const sendFollowRequest = async (userId) => {
    try {
        const response = await api.post(`/profile/follow/${userId}`);
        return response.data;
    } catch (error) {
        console.error("Error sending follow request:", error);
        return null;
    }
};

// Accept or deny follow request
export const handleFollowRequest = async (requesterId, action) => {
    try {
        const response = await api.post(`/profile/follow-request/${requesterId}`, { action });
        return response.data;
    } catch (error) {
        console.error("Error handling follow request:", error);
        return null;
    }
};

export const fetchBirthdays = async (userId) => {
    try {
        console.log(userId, 'userID from services')
        const response = await api.get('/profile/getBirthDays', {
            params: { userId },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching birthdays:', error);
        return null;
    }
};

// Like post
export const likePost = async (postId) => {
    try {
     
        const response = await api.post(`/post/likePost/${postId}`);
        return response.data;
    } catch (error) {
        console.error('Frontend like error:', error);
        throw new Error("Failed to like post");
    }
};

// Unlike post
export const unlikePost = async (postId) => {
    try {
       
        const response = await api.post(`/post/unlikePost/${postId}`);
        return response.data;
    } catch (error) {
        console.error('Frontend unlike error:', error);
        throw new Error("Failed to unlike post");
    }
};

// Add comment
export const addComment = async (postId, commentText) => {
    try {
        
        const response = await api.post(`/post/${postId}/comments`, {
            commentText
        });
        return response.data;
    } catch (error) {
        console.error('Frontend comment error:', error);
        throw new Error("Failed to add comment");
    }
};

// Delete comment
export const deleteComment = async (postId, commentId) => {
    try {
      
        const response = await api.delete(`/post/${postId}/comments/${commentId}`);
        return response.data;
    } catch (error) {
        console.error('Frontend delete comment error:', error);
        throw new Error("Failed to delete comment");
    }
};


export const sharePost = async (postId) => {
    try {
        const response = await api.post(`/posts/${postId}/share`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to share post");
    }
};

// Save post
export const savePost = async (postId) => {
    try {
        const response = await api.post(`/post/savePost/${postId}`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to save post");
    }
};

export const getSavedPost = async(userId)=>{
    try{
        const response = await api.get(`/post/${userId}/savedPosts`)
        return response.data
    }
    catch(error){
        throw new Error("Failed to get saved post");
    }
}