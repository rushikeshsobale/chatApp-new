import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);

  // Retrieve user from localStorage once at the start of the render cycle
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    // 1. Check if we have a user ID to connect with
    if (!user?.userId) {
      // If no user ID, ensure socket is null and return
      if (socket) {
        console.log('User logged out, disconnecting socket.');
        socket.disconnect();
        setSocket(null);
        setUserId(null);
        setActiveUsers([]);
      }
      return; // No user, so nothing more to do
    }

    // Set the userId state
    setUserId(user.userId);

    // 2. Establish socket connection
    console.log('Connecting socket for userId:', user.userId);
    const socketConnection = io(process.env.REACT_APP_API_URL, {
      query: { id: user.userId },
      // Optional: Add specific transports if needed, e.g., ['websocket']
    });

    setSocket(socketConnection); // Update socket state

    // 3. Emit joinRoom and set up listeners when the connection is established
    socketConnection.on('connect', () => {
      console.log('Socket connected, emitting joinRoom for:', user.userId, user.followers);
      const userIdToSend = user.userId; // Use _id from user object, assuming it's consistent
      const friends = user.followers || [];
      socketConnection.emit('joinRoom', { userId: userIdToSend, friends });
    });

    const handleRestatus = (data) => {
      console.log('Received restatus:', data);
      setActiveUsers(data);
    };
    const handleStatus = (data) => {
      console.log('Received status:', data);
      setActiveUsers((prevActiveUsers) => {
        // Prevent duplicates if 'status' is received for an already active user
        if (!prevActiveUsers.some(u => u._id === data.userId)) {
          return [...prevActiveUsers, data.userId];
        }
        return prevActiveUsers;
      });
    };
    const handleUserLeft = ({ userId: leftUserId }) => {
      console.log('Received userLeft:', leftUserId);
      setActiveUsers((prev) => prev.filter((u) => u._id !== leftUserId));
    };

    socketConnection.on('restatus', handleRestatus);
    socketConnection.on('status', handleStatus);
    socketConnection.on('userLeft', handleUserLeft);

    // 4. Handle disconnection/error events (optional but recommended)
    socketConnection.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // You might want to clear active users or show a message here
      setActiveUsers([]);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Handle connection errors, e.g., show a user notification
    });


    // 5. Cleanup function for when the component unmounts or dependencies change
    return () => {
      console.log('Cleaning up socket connection and listeners.');
      socketConnection.off('restatus', handleRestatus);
      socketConnection.off('status', handleStatus);
      socketConnection.off('userLeft', handleUserLeft);
      socketConnection.off('connect'); // Clean up connect listener
      socketConnection.off('disconnect');
      socketConnection.off('connect_error');
      socketConnection.disconnect(); // Disconnect the socket
    };

  }, []); // Re-run effect if user ID, _id, or followers change

  return (
    <UserContext.Provider value={{ socket, userId, activeUsers }}>
      {children}
    </UserContext.Provider>
  );
};