import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getNotifications,
  updateNotification,
  deleteNotification,
} from '../services/notificationService';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (userId) => await getNotifications(userId)
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (notificationId) => {
    await updateNotification(notificationId, true);
    return notificationId;
  }
);

export const removeNotification = createAsyncThunk(
  'notifications/remove',
  async (notificationId) => {
    await deleteNotification(notificationId);
    return notificationId;
  }
);

const initialState = {
  items: [],
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notificationReceived: (state, action) => {
      state.items.unshift(action.payload);
    },
    clearNotifications: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload || [];
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const notification = state.items.find((n) => n._id === action.payload);
        if (notification) notification.read = true;
      })
      .addCase(removeNotification.fulfilled, (state, action) => {
        state.items = state.items.filter((n) => n._id !== action.payload);
      });
  },
});

export const { notificationReceived, clearNotifications } = notificationSlice.actions;

export const selectUnreadNotificationCount = (state) =>
  state.notifications.items.filter((n) => !n.read).length;

export default notificationSlice.reducer;
