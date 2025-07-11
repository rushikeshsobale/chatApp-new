import api from '../api';

export const fetchUnseenMessages = async (receiverId) => {
  try {
    const response = await api.get('/messages/unseenMessages', {
      params: { receiverId },
    });
    return response.data.messages;
  } catch (error) {
    console.error('Failed to fetch unseen messages:', error);
    throw error;
  }
};

export const updateMessageStatus = async (messageIds, status = 'read') => {
  try {
    const response = await api.post('/messages/updateMsgStatus', {
      messageIds,
      status,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update message status:', error);
    throw error;
  }
};
