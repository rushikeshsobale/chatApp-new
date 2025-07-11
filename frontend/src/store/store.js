import { configureStore, createSlice } from '@reduxjs/toolkit';
import authReducer from './userSlice';
import socketReducer from './socketSlice';
import notificationReducer from './notificationSlice';
const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chatHistory: {},
    isLoggedIn:false,
  },
  reducers: {
    isLoggedIn: (state, action) => {
      const { status } = action.payload;
      console.log(status, 'status');
      state.isLoggedIn = status === 'true' || status === true;
    },
    addMessage: (state, action) => {
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
export const { addMessage, setInitialMessages, isLoggedIn } = chatSlice.actions;
export const store = configureStore({
  reducer: {
    chat: chatSlice.reducer,
    auth: authReducer,
    socket: socketReducer,
    notifications: notificationReducer,
  },
});
