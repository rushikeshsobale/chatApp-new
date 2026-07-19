import { io } from "socket.io-client";

let socket = null;

export const initializeSocket = (userId) => {
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5500";

  if (!socket && userId) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      query: { userId }, // Passes active context configuration headers to backend on upgrade
    });

    socket.on("connect", () => {
      console.log("Connected to Realtime Web Server with Instance ID:", socket.id);
      // The server only joins this socket to the user's room (and marks
      // them online) once it gets this. "connect" also fires on every
      // automatic reconnect — where the socket id is new — so this must
      // be re-sent here, not just once at socket creation, or the user
      // silently stops receiving realtime events after any drop.
      socket.emit("user:init", userId);
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