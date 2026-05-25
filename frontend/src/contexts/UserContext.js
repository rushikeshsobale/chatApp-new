import React, { createContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { fetchUnseenMessages } from "../services/messageService";
import { getMe } from '../services/authService';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [unseenMessages, setUnseenMessages] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const myVideoRef = useRef();
  const [answer, setAnswer] = useState(null);
  const [showIncoming, setShowIncoming] = useState(false);
  const [member, setMember] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [callData, setCallData] = useState(null);

  // 1. Single Lazy State Initializer (Reads LocalStorage strictly ONCE on mount)
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

  // 2. Automatically sync raw string userId when the state object settles


  // 3. API Fallback wrapped safely to prevent recreation loops



 
   
  const loadUnseenMessages = useCallback(async () => {
    if (user?._id) {
      try {
        const unseen = await fetchUnseenMessages(user._id);
        setUnseenMessages(unseen);
      } catch (err) {
        console.error('Error fetching unseen messages:', err);
      }
    }
  }, [user?._id]);

  // 6. Keep Unseen Messages synchronized when User ID verified
  useEffect(() => {
    if (user?._id) {
      loadUnseenMessages();
    }
  }, [user?._id, loadUnseenMessages]);

  // 7. Hardware Peripheral Initialization Layer
  useEffect(() => {
    const initMedia = async () => {
      if (!user?._id || myStream) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMyStream(stream);
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };
    initMedia();
  }, [user?._id, myStream]);

  // 8. Managed Socket Pipeline
  useEffect(() => {
    if (!user?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setActiveUsers([]);
      }
      return;
    }

    const socketConnection = io(process.env.REACT_APP_API_URL, {
      query: { id: user._id },
    });

    setSocket(socketConnection);

    socketConnection.on('connect', () => {
      socketConnection.emit('joinRoom', { userId: user._id });
    });

    const handleRestatus = (data) => {
      setActiveUsers(data);
    };

    const handleStatus = (data) => {
      setActiveUsers((prev) => {
        if (!prev.some((u) => u === data.userId || u?._id === data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });
    };

    const handleUserLeft = ({ userId: leftUserId }) => {
      setActiveUsers((prevUsers) => prevUsers.filter(id => id !== leftUserId));
    };

    const handleIncomingCall = (data) => {
      console.log('Received incoming call data:', data);
      const { offer, from, fromName } = data;
      setCallData(offer);
      setShowIncoming(true);
      setIncomingCall({ from, fromName, offer });
    };

    socketConnection.on('incoming-call', handleIncomingCall);
    socketConnection.on('restatus', handleRestatus);
    socketConnection.on('status', handleStatus);
    socketConnection.on('userLeft', handleUserLeft);
    socketConnection.on('disconnect', () => setActiveUsers([]));
    socketConnection.on('checkit', loadUnseenMessages);

    socketConnection.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socketConnection.off('incoming-call', handleIncomingCall);
      socketConnection.off('restatus', handleRestatus);
      socketConnection.off('status', handleStatus);
      socketConnection.off('userLeft', handleUserLeft);
      socketConnection.off('checkit', loadUnseenMessages);
      socketConnection.off('connect');
      socketConnection.off('disconnect');
      socketConnection.off('connect_error');
      socketConnection.disconnect();
    };
  }, [user?._id, loadUnseenMessages]);

  return (
    <UserContext.Provider
      value={{
        socket,
        activeUsers,
        unseenMessages,
        setUnseenMessages,
        loadUnseenMessages,
        answer,
        incomingCall,
        setIncomingCall,
        user,
        setUser,
        setMember,
        member,
        myStream,
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