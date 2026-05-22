import { configureStore } from '@reduxjs/toolkit';
import authReducer from './userSlice';
import chatReducer from './chatSlice';
import notificationReducer from './notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    notifications: notificationReducer,
  },
});