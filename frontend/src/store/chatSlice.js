import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  chatHistory: {},
  isLoggedIn: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setLoginStatus: (state, action) => {
      const status = action.payload;
      state.isLoggedIn = status === 'true' || status === true;
    },
    addMessageToBackup: (state, action) => {
      const { neededId, message } = action.payload;
      if (!state.chatHistory[neededId]) {
        state.chatHistory[neededId] = [];
      }
      state.chatHistory[neededId].push(message);
    },
    setInitialMessages: (state, action) => {
      state.chatHistory = action.payload;
    },
  },
});

export const { addMessageToBackup, setInitialMessages, setLoginStatus } = chatSlice.actions;
export default chatSlice.reducer;