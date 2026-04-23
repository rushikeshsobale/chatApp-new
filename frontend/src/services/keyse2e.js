import api from "../api";
export const recieverpublickey = async (recieverId) => {
  console.log('Fetching public key for receiver ID:', recieverId);
  try {
    const response = await api.get('/auth/reciever-public-key', { params: { recieverId } });
    return response.data.publicKey;
  } catch (error) {
    console.error('Failed to fetch receiver public key:', error);
    throw error;
  }
};

export const fetchUserKeys = async () => {
  console.log('Fetching user keys');
  try {
    const response = await api.get('/auth/user-keys');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user keys:', error);
    throw error;
  }
};

export const uploadUserKeys = async (keyData) => {
  console.log('Uploading user keys:', keyData);
  try {
    const response = await api.post('/auth/upload-keys', keyData);
    return response.data;
  } catch (error) {
    console.error('Failed to upload user keys:', error);
    throw error;
  }
};

