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
  const remoteVideoRef = useRef();
  const peerRef = useRef(null);
  const [answer, setAnswer] = useState(null);
  const [incomingCall, setIncommingCall] = useState(false)
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
      const friends = user.followers || [];
      socketConnection.emit('joinRoom', { userId: user.userId, friends });
    });

    const handleRestatus = (data) => {
      console.log('restate', data)
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

    const handleOffer = async (offer) => {
      setIncommingCall(true)
      if (!myStream) {
        console.warn("No local stream yet, cannot handle offer.");
        return;
      }

      peerRef.current = new RTCPeerConnection();
      // Add local tracks
      myStream.getTracks().forEach((track) => {
        peerRef.current.addTrack(track, myStream);
      });

      // When remote track arrives
      peerRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      // Send ICE candidates
      peerRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("candidate", event.candidate, friendId);
        }
      };
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      setAnswer(answer)
    };
    const handleUserLeft = ({ userId: leftUserId }) => {
      setActiveUsers((prev) => prev.filter((u) => u._id !== leftUserId));
    };
    socketConnection.on('restatus', handleRestatus);
    socketConnection.on('status', handleStatus);
    socketConnection.on('userLeft', handleUserLeft);
    // socketConnection.on('recievedMessage', handleRecievedMessage); // ✅ FIXED HERE
    socketConnection.on('disconnect', () => setActiveUsers([]));
    socketConnection.on("offer", handleOffer)
    socketConnection.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    console.log(socketConnection, '✅ socket connection');
    return () => {
      socketConnection.off('restatus', handleRestatus);
      socketConnection.off('status', handleStatus);
      socketConnection.off('userLeft', handleUserLeft);
      // socketConnection.off('recievedMessage', handleRecievedMessage); // ✅ CLEANUP
      socketConnection.off('connect');
      socketConnection.off('disconnect');
      socketConnection.off('connect_error');
      socketConnection.off('offer')
      socketConnection.disconnect();
    };
  }, [user?.userId]); // optional: can be [user?.userId] for more stability
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
        user
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
