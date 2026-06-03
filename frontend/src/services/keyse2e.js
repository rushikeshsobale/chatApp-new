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

export const updatePublickey = async (publicKey) => { 
  try{
    const response = await api.patch('/auth/public-key', { publicKey });  
    return response.data;
  }
  catch{
    console.error('Failed to update public key');
  }
}





