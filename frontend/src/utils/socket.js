import { io } from "socket.io-client";

let socket = null;

export const initializeSocket = (userId) => {
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5500";

  if (!socket && userId) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      query: { userId }, // Passes active context configuration headers to backend on upgrade
    });

    socket.on("connect", () => {
      console.log("Connected to Realtime Web Server with Instance ID:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.warn("Socket disconnected. Reason:", reason);
    });
  }

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};