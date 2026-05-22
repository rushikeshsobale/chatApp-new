import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: {},
};

const userSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      // Expecting action.payload to be the user data object directly
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = {};
    }
  }
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;