import React, { createContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { initializeSocket, disconnectSocket } from '../utils/socket';
import {
  fetchNotifications,
  notificationReceived,
  clearNotifications,
} from '../store/notificationSlice';
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const dispatch = useDispatch();
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
      dispatch(clearNotifications());
      return;
    }

    // Connect using our centralized service engine
    const socketConnection = initializeSocket(user._id);
    setSocket(socketConnection);
    socketConnection.emit('user:init', user._id);

    dispatch(fetchNotifications(user._id));
    socketConnection.on('got_a_notification', (data) => {
      dispatch(notificationReceived(data));
    });

    socketConnection.on('user:status_changed', (data) => {
      setActiveUsers((prev) => {
        const exists = prev.some((u) => (u.userId ?? u) === data.userId);

        if (data.status === 'online') {
          if (exists) return prev;
          return [...prev, { userId: data.userId, status: 'online' }];
        }

        return prev.filter((u) => (u.userId ?? u) !== data.userId);
      });
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


  const contextValue = useMemo(
    () => ({
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
    }),
    [
      socket,
      activeUsers,
      answer,
      incomingCall,
      user,
      member,
      showIncoming,
      callData,
      isLoggedIn,
    ]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>

  );
};