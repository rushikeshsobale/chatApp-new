import api from '../api';
export const fetchSuggestions = async () => {
    try {
      const response = await api.get("/suggestions");
      console.log(response.data, 'from sd')
      return response.data; // Ensure the function returns data
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      throw error; // Propagate the error for better handling
    }
  };
  
// Send follow request
export const sendFollowRequest = async (userId) => {
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
