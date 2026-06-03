import React, { createContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { initializeSocket, disconnectSocket } from '../utils/socket';
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  
  const myVideoRef = useRef();
  const [answer, setAnswer] = useState(null);
  const [showIncoming, setShowIncoming] = useState(false);
  const [member, setMember] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [callData, setCallData] = useState(null)
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && savedUser !== "undefined" && savedUser !== "null") {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        return null;
      }
    }
    return null;
  });
  
  

  useEffect(() => {
    // Teardown if user logs out or session expires
    if (!user?._id) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    // Connect using our centralized service engine
    const socketConnection = initializeSocket(user._id);
    setSocket(socketConnection);
    socketConnection.emit('user:init', user._id);
    socketConnection.on('user:status_changed', (data) => {
      console.log('User status changed:', data);
      setActiveUsers((prev) => {
        const exists = prev.some((u) => u === data.userId || u?._id === data.userId);
        if (!exists) {
          return [...prev, data.userId];
        }
        return prev;
      });
    });
    socketConnection.emit('user:get_status', user._id, (data) => {
      if (data.status === 'online') {
        setActiveUsers((prev) => [...prev, user._id]);
      }
    });

    socketConnection.on("online_users", (users) => {
      setActiveUsers(users);
    });
    // No global event listeners needed here anymore! 
    // Chat-specific events (messages/typing) are handled inside ChatUi.
    socketConnection.on("call:incoming", (data) => {
      console.log("Incoming call:", data);
      setIncomingCall(data);
      setShowIncoming(true);
    });
    return () => {
      // Disconnect cleanly on component unmount
      disconnectSocket();
    };
  }, [user?._id]);

  return (
    <UserContext.Provider
      value={{
        socket,
        activeUsers,
        answer,
        incomingCall,
        setIncomingCall,
        user,
        setUser,
        setMember,
        member,
     
        showIncoming,
        setShowIncoming,
        callData,
        setIsLoggedIn,
        isLoggedIn,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};