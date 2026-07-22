import api from "../api";

export const fetchConversations = async () => {
  try {
    const res = await api.get("/conversations");

    return res.data;
  } catch (error) {
    console.error("Failed to fetch conversations", error);
    throw error;
  }
};

export const createOrGetConversation = async (data) => {
  console.log("Creating/getting conversation with data:", data);
  try {
    const formData = new FormData();

    // group name
    if (data.groupName) {
      formData.append("groupName", data.groupName);
    }
    
    if(data.encryptedKeys) {
      formData.append("encryptedKeys", JSON.stringify(data.encryptedKeys));
    }
    // caption (optional)
    if (data.groupCaption) {
      formData.append("caption", data.caption);
    }

    // participants (must be JSON string)
    if (data.participants) {
      formData.append("participants", JSON.stringify(data.participants));
    }

    // avatar file
    if (data.groupAvatar) {
      formData.append("groupAvatar", data.groupAvatar);
    }

    const res = await api.post("/conversations", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  } catch (error) {
    console.error("Failed to create/get conversation", error);
    throw error;
  }
};
export const fetchConversationById = async (conversationId) => {
  try {
    const res = await api.get(`/conversations/${conversationId}`);
    return res.data;
  } catch (error) {
    console.error("Failed to fetch conversation", error);
    throw error;
  }
};

export const fetchConversationMessages = async (conversationId) => {
  try {
    const res = await api.get(`/messages/${conversationId}`);
    return res.data.messages;
  } catch (error) {
    console.error("Failed to fetch messages", error);
    throw error;
  }
};

export const markConversationAsRead = async (conversationId) => {
  try {
    await api.patch(`/conversations/${conversationId}/read`);
  } catch (error) {
    console.error("Failed to mark conversation as read", error);
    throw error;
  }
};

export const muteConversation = async (conversationId, muted) => {
  try {
    const res = await api.patch(`/conversations/${conversationId}/mute`, { muted });
    return res.data;
  } catch (error) {
    console.error("Failed to update mute state", error);
    throw error;
  }
};

export const archiveConversation = async (conversationId, archived) => {
  try {
    const res = await api.patch(`/conversations/${conversationId}/archive`, { archived });
    return res.data;
  } catch (error) {
    console.error("Failed to update archive state", error);
    throw error;
  }
};

export const getFriendsforGroupCreation = async () => {
  try {
    const res = await api.get("/users/friends");
    return res.data;
  } catch (error) {
    console.error("Failed to fetch friends for group creation", error);
    throw error;
  }
};

export const deleteGroup = async (conversationId) => {
  try {
    const res = await api.delete(`/conversations/${conversationId}`);
    return res.data;
  } catch (error) {
    console.error("Failed to delete group", error);
    throw error;
  }
};

export const addGroupMember = async (conversationId, userId, encryptedKey) => {
  try {
    const res = await api.patch(`/conversations/${conversationId}/members`, { userId, encryptedKey });
    return res.data;
  } catch (error) {
    console.error("Failed to add group member", error);
    throw error;
  }
};

export const removeGroupMember = async (conversationId, memberId) => {
  try {
    const res = await api.delete(`/conversations/${conversationId}/members/${memberId}`);
    return res.data;
  } catch (error) {
    console.error("Failed to remove group member", error);
    throw error;
  }
};

export const leaveGroup = async (conversationId) => {
  try {
    const res = await api.delete(`/conversations/${conversationId}/leave`);
    return res.data;
  } catch (error) {
    console.error("Failed to leave group", error);
    throw error;
  }
};

export const updateGroupInfo = async (conversationId, { groupName, groupAvatar }) => {
  try {
    const formData = new FormData();
    if (groupName) formData.append("groupName", groupName);
    if (groupAvatar) formData.append("groupAvatar", groupAvatar);

    const res = await api.patch(`/conversations/${conversationId}/group-info`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    console.error("Failed to update group info", error);
    throw error;
  }
};
