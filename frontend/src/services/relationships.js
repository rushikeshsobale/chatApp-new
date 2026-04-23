import api from "../api";           

export const sendFollowRequest = async (recipientId, type) => {    
    try{
        const response = await api.post(`/relationships`,{recipientId, type});
        return response.data
    }
    catch (error) {
     console.log(error)
    }
}

export const getRelationshipStatus = async (targetUserId)=>{
   
    try{
        const response = await api.get(`/relationships/status/${targetUserId}`)
        return response.data
    }
    catch (error){
        console.log(error)
    }
}

export const getFollowers = async (userId) => {
    try {
        const response = await api.get(`/relationships/followers/${userId}`);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const getFollowing = async (userId) => {
    try {
        const response = await api.get(`/relationships/following/${userId}`);   
        return response.data;
    } catch (error) {
        console.log(error);
    }   
};

export const getFollowRequests = async () => {
    try {
        const response = await api.get(`/relationships/requests`);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}
export const respondToFollowRequest = async (requesterId, action) => {
    try {
        const response = await api.post(`/relationships/follow-request/${requesterId}`, { action });
        return response.data;
    }           
    catch (error) {
        console.log(error);
    }
}

export const unfollowUser = async (recipientId) => {
  try {
    const response = await api.delete(`/relationships/${recipientId}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};


export const acceptFollowRequest = async (requesterId) => {
  try {
    const response = await api.patch(`/relationships/${requesterId}/accept`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const rejectFollowRequest = async (requesterId) => {
  try {
    const response = await api.patch(`/relationships/${requesterId}/reject`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};


