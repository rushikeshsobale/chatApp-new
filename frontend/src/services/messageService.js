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

export const callSendMessage = async (messageData) => {
  try {
    const response = await api.post('/messages/postMessage', messageData);
    return response.data;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

// services/messageService.js
export const fetchMessage = async (conversationId, page = 1, limit = 20) => {
  const response = await api.get('/messages/getMessages', {
    params: { conversationId, page, limit }
  });
  // Assuming your backend returns an array directly now based on the fix above
  return response.data; 
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

export const deleteMessages = async(senderId, receiverId)=>{
  console.log(senderId, receiverId, 'idds')
  try{
    const response = await api.delete('/messages/clearChat',{
      senderId, 
      receiverId,
    })
    return response.data
  }
  catch(error){
  console.error('failed to clear chat', error)
  }
}