import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { fetchUnseenMessages } from "../services/messageService";
export const UserContext = createContext();
export const UserProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [unseenMessages, setUnseenMessages]= useState([])
  const [flag, setFlag] = useState(false)
  // Retrieve user from localStorage once at the start of the render cycle
  const user = JSON.parse(localStorage.getItem('user'));
  console.log(user, 'user')
   const loadUnseenMessages = async () => {
      if (user.userId) {
        try {
          const unseen = await fetchUnseenMessages(user.userId);
          setUnseenMessages(unseen);
        } catch (err) {
          console.error('Error fetching unseen messages:', err);
        }
      }
    };
    useEffect(()=>{
      if(user){
        loadUnseenMessages()
        setUserId(user.userId)
      }
    },[])
  useEffect(() => {
    // 1. Check if we have a user ID to connect with
    if (!user?.userId) {
      // If no user ID, ensure socket is null and return
      if (socket) {
        console.log('User logged out, disconnecting socket.');
        socket.disconnect();
        setSocket(null);
        setActiveUsers([]);
      }
      return; // No user, so nothing more to do
    }
    const socketConnection = io(process.env.REACT_APP_API_URL, {
      query: { id: user.userId },
    });

    console.log(socketConnection, 'socket connection')
    setSocket(socketConnection); // Update socket state
    socketConnection.on('connect', () => {
      const userIdToSend = user.userId; // Use _id from user object, assuming it's consistent
      const friends = user.followers || [];
      socketConnection.emit('joinRoom', { userId: userIdToSend, friends });
    });
    const handleRestatus = (data) => {
        console.log('handleReStatus', data)
      setActiveUsers(data);
    };
    const handleStatus = (data) => {
      console.log('handleStatus', data)
      setActiveUsers((prevActiveUsers) => {
        // Prevent duplicates if 'status' is received for an already active user
        if (!prevActiveUsers.some(u => u._id === data.userId)) {
          return [...prevActiveUsers, data.userId];
        }
        return prevActiveUsers;
      });
    };
    const handleUserLeft = ({ userId: leftUserId }) => {
   
      setActiveUsers((prev) => prev.filter((u) => u._id !== leftUserId));
    };
   const handleMessageRecieved=(data)=>{

     loadUnseenMessages(user.userId)
   }
    socketConnection.on('restatus', handleRestatus);
    socketConnection.on('status', handleStatus);
    socketConnection.on('userLeft', handleUserLeft);
    socketConnection.on('recievedMessage', handleMessageRecieved)
    socketConnection.on('disconnect', (reason) => {
      setActiveUsers([]);
    });
    socketConnection.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Handle connection errors, e.g., show a user notification
    });
    // 5. Cleanup function for when the component unmounts or dependencies change
    return () => {
   
      socketConnection.off('restatus', handleRestatus);
      socketConnection.off('status', handleStatus);
      socketConnection.off('userLeft', handleUserLeft);
      socketConnection.off('connect'); // Clean up connect listener
      socketConnection.off('disconnect');
      socketConnection.off('connect_error');
      socketConnection.disconnect(); // Disconnect the socket
    };
  }, [flag]); // Re-run effect if user ID, _id, or followers change
  return (
    <UserContext.Provider value={{ socket, userId, activeUsers, unseenMessages, setUnseenMessages, loadUnseenMessages, setFlag }}>
      {children}
    </UserContext.Provider>
  );
};