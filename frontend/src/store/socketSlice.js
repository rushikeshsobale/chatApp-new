// socketSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';

const apiUrl = process.env.REACT_APP_API_URL; // Replace with your actual backend URL
const user = JSON.parse(localStorage.getItem("user"));
const userId = user?.userId;
export const initializeSocket = createAsyncThunk(
  'socket/initialize',
  async (_, { dispatch }) => {
    
    console.log(userId, 'userId')
    if (!userId) return;

    const socketConnection = io(`${apiUrl}/`, {
      query: { id: userId },
    });
    console.log(socketConnection, 'socletconnection', userId)
    dispatch(setSocket(socketConnection));
  }
);

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    socket: null,
    isConnected: false,
  },
  reducers: {
    setSocket: (state, action) => {
      state.socket = action.payload;
      state.isConnected = !!action.payload;
    },
    disconnectSocket: (state) => {
      if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
        state.isConnected = false;
      }
    },
  },
});

export const { setSocket, disconnectSocket } = socketSlice.actions;
export default socketSlice.reducer;
