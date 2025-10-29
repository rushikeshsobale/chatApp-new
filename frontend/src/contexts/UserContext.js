import React, { createContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { fetchUnseenMessages } from "../services/messageService";
export const UserContext = createContext();
export const UserProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [unseenMessages, setUnseenMessages] = useState([]);
  const [flag, setFlag] = useState(false);
  const user = JSON.parse(localStorage.getItem('user'));
  const [myStream, setMyStream] = useState(null);
  const myVideoRef = useRef();
  const [answer, setAnswer] = useState(null);
  const [showIncoming, setShowIncoming] = useState(false);
  const [member, setMember] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [callData, setCallData] = useState(null);

  const loadUnseenMessages = async () => {
    if (user?.userId) {
      try {
        const unseen = await fetchUnseenMessages(user.userId);
        setUnseenMessages(unseen);
      } catch (err) {
        console.error('Error fetching unseen messages:', err);
      }
    }
  };
  useEffect(() => {
    if (user) {
      loadUnseenMessages();
      setUserId(user.userId);
    }
  }, []);
  useEffect(() => {
    if (!user?.userId) {
      if (socket) {
        console.log('User logged out, disconnecting socket.');
        socket.disconnect();
        setSocket(null);
        setActiveUsers([]);
      }
      return;
    }
    const socketConnection = io(process.env.REACT_APP_API_URL, {
      query: { id: user.userId },
    });
    setSocket(socketConnection);
    socketConnection.on('connect', () => {
      const user3 = JSON.parse(localStorage.getItem('user3'));
      const friends = user3?.followers || [];
      socketConnection.emit('joinRoom', { userId: user.userId, friends });
    });
    const handleRestatus = (data) => {
      setActiveUsers(data)
    };
    const handleStatus = (data) => {
      setActiveUsers((prev) => {
        if (!prev.some((u) => u._id === data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });
    };
    const initMedia = async () => {
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
    const handleUserLeft = ({ userId: leftUserId }) => {
      setActiveUsers((prev) => prev.filter((u) => u._id !== leftUserId));
    };
    const handleIncomingCall = ({ offer, from , fromName}) => {
      console.log(from, offer, 'incomingCall');
      setCallData(offer)
      setShowIncoming(true);
      setIncomingCall({ from, fromName, offer });
    }
    socketConnection.on('incoming-call', handleIncomingCall)
    socketConnection.on('restatus', handleRestatus);
    socketConnection.on('status', handleStatus);
    socketConnection.on('userLeft', handleUserLeft);
    // socketConnection.on('recievedMessage', handleRecievedMessage); // ✅ FIXED HERE
    socketConnection.on('disconnect', () => setActiveUsers([]));
    // socketConnection.on('incomingOffer', handleOffer)
    socketConnection.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socketConnection.off('restatus', handleRestatus);
      socketConnection.off('status', handleStatus);
      socketConnection.off('userLeft', handleUserLeft);
      // socketConnection.off('recievedMessage', handleRecievedMessage); // ✅ CLEANUP
      socketConnection.off('connect');
      socketConnection.off('disconnect');
      socketConnection.off('connect_error');
      // socketConnection.off('incomingOffer')
      socketConnection.disconnect();
    };
  }, [user?.userId]);

  // Listen for incoming ICE candidates from the callee
  // Listen for incoming ICE candidates from the callee


  return (
    <UserContext.Provider
      value={{
        socket,
        userId,
        activeUsers,
        unseenMessages,
        setUnseenMessages,
        loadUnseenMessages,
        setFlag,
        answer,
        incomingCall,
        setIncomingCall,
        user,
        setMember,
        member,
        myStream,
        showIncoming,
        setShowIncoming,
        callData
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
