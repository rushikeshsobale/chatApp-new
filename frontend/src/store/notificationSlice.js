import { createSlice } from '@reduxjs/toolkit';
const initialState = {
  notifications: []
};
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    updateNotifications: (state, action) => {
      console.log(state, action);
      state.notifications.push(action.payload);
    }
  }
});
export const { updateNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
