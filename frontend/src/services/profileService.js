import api from '../api';

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
export const getUserProfilePage = async (userId) => {
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

// Get posts related to a post (same author first, then rest of the feed), paginated
export const getRelatedPosts = async (postId, page = 1) => {
    try {
        const response = await api.get(`/post/related/${postId}`, { params: { page } });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch related posts");
    }
};

// Edit a post's caption
export const editPost = async (postId, text) => {
    try {
        const response = await api.put(`/post/${postId}`, { text });
        return response.data;
    } catch (error) {
        throw new Error("Failed to edit post");
    }
};

// Delete a post
export const deletePost = async (postId) => {
    try {
        const response = await api.delete(`/post/${postId}`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to delete post");
    }
};

// Get home feed (own posts + following), paginated
export const getFeed = async (page = 1) => {
    try {
        const response = await api.get('/post/feed', { params: { page } });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch feed");
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
// Get stories
export const getStories = async (followers) => {
    try {
        const response = await api.get('/stories/feed', {
            params: { followers }
        });
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch stories");
    }
};

// Get a single user's stories
export const getUserStories = async (userId) => {
    try {
        const response = await api.get(`/stories/user/${userId}`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch user stories");
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

export const updateStoryViewer = async (storyId) => {
    console.log(storyId, 'storyId from services')
    try {  const response = await api.post(`/stories/view/${storyId}`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to update story viewer");
    }       
};


// Update user profile
export const updateUserProfile = async (userId, profileData) => {
    console.log('updateUserProfile', userId , profileData)
    const formData = new FormData();
    if(profileData.firstName){
        formData.append("firstName", profileData.firstName);
    }
    if(profileData.lastName){
        formData.append("lastName", profileData.lastName);
    }
    if(profileData.bio){
        formData.append("bio", profileData.bio);                                             
    }
   
   // New (correct way to send complex object)
if (profileData.interests) { // Renamed to 'interests' for clarity, but 'interest' works too
    // **MUST convert the JavaScript object to a JSON string**
    formData.append("interest", JSON.stringify(profileData.interests));
    formData.append("onboardingComplete", 'true'); // Send as string
}
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
    // try {
    //     console.log(userId, 'userID from services')
    //     const response = await api.get('/profile/getBirthDays', {
    //         params: { userId },
    //     });
    //     return response.data;
    // } catch (error) {
    //     console.error('Error fetching birthdays:', error);
    //     return null;
    // }
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

// Unsave post
export const unsavePost = async (postId) => {
    try {
        const response = await api.post(`/post/unsavePost/${postId}`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to unsave post");
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