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

export const getFriendsforGroupCreation = async () => {
  try {
    const res = await api.get("/users/friends");
    return res.data;
  } catch (error) {
    console.error("Failed to fetch friends for group creation", error);
    throw error;
  }
};
