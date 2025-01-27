import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import ChatUi from '../components/ChatUi';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, setInitialMessages } from '../store/store';
import { useSocket} from '../components/socketContext';
import '../css/Chat.css';
import { setUser } from '../store/action';
import io from 'socket.io-client';
const ChatComponent = () => {
  const {socket, setSocket, setUserId, userId} = useSocket();
  const [name, setName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState('')
  const chatHistory = useSelector(state => state.chat.chatHistory);
  const token = localStorage.getItem('token');
  const dispatch = useDispatch();
  const fetchUserData = async () => {
    try {
      const response = await fetch(`https://api.makethechange.in/getUser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`, // Include the token in the Authorization header
          'Content-Type': 'application/json', // Optional: specify content type
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserId(data._id);
        setName(data.firstName);
        setProfilePicture(data.profilePicture);
        setFriends(data.friends);
        setUserId(data._id)
        dispatch(setUser({ userId: data._id , name: data.firstName}));
        if(!socket){

        
        const socketConnection = io(`https://api.makethechange.in/`, { query: { id: data._id} });
        setSocket(socketConnection);  
        }  
      } else {
        console.error('Failed to fetch user data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  useEffect(() => {
    fetchUserData();
  }, []);
  useEffect(() => {
    if (socket && userId) {
      socket.on('message', handleMessage);
      socket.on('restatus', (data) => setActiveUsers(data));
      socket.emit('joinRoom', { userId });
      socket.on('status', (data) => setActiveUsers(prevActiveUsers => [...prevActiveUsers, data]));
      socket.on('userLeft', (activeMembers) => setActiveUsers(activeMembers));
      return () => {
        socket.off('message', handleMessage);
        socket.off('status');
        // socket.disconnect();
      };
    }
  }, [socket, userId]);
  const handleFriendSelect = (member) => {
    setSelectedFriend(member);
  };
  useEffect(() => {
    const fetchMessages = async () => {
     
      try {
        const response = await fetch(`https://api.makethechange.in/getMessages/${userId}`);
        if (response.ok) {
          const messages = await response.json();
          dispatch(setInitialMessages(messages));
        } else {
          throw new Error('Failed to fetch messages');
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    if (userId) fetchMessages();
  }, [userId, dispatch]);
  const handleMessage = (message) => {
    const audio = new Audio('/mixkit-bell-notification-933.wav');
    audio.play();
    setMsgCounts(prevCounts => ({
      ...prevCounts,
      [message.senderId]: (prevCounts[message.senderId] || 0) + 1,
    }));
    if (message.senderId) {
      dispatch(addMessage({
        neededId: message.senderId,
        message: {
          ...message,
          sentByCurrentUser: message.sender === name,
        },
      }));
      socket.emit('recievedMsg', { id: message.senderId });
    } else {
      console.error('Message does not have senderId:', message);
    }
  };
  return (
    <div className="my-3"  >
      <div className="row flex-grow-1">
        <div className={`${ 'col-4 col-md-4 col-lg-4'} p-4 chat-box shEffect mx-5`} style={{ height: '600px', zIndex: '1', background:'ghostwhite'}}>
          <div className="mb-1 d-flex justify-content-center">
            <img
              src={profilePicture}
              alt={`${name}'s Profile`}
              className="profile-image mx-3"
              style={{ borderRadius: '50%', border: '2px solid #fff' }}
            />
            <h5 className="mx-2 my-auto">{name}</h5>
          </div>
          <ul style={{overflow:"auto", height:"400px", scrollbarWidth:'none'}}>
            {friends?.filter(member => member?.isFriend === 'friends')
              .map((member, index) => (
                <li
                  className={`d-flex justify-content-between align-items-center px-2 py-0 m-3 border rounded bg-white ${selectedFriend === member ? 'active' : ''}`}
                  key={index}
                  onClick={() => handleFriendSelect(member)}
                  style={{ borderBottom: '1px solid #eaeaea', cursor: 'pointer' }}
                >

                  <div className="d-flex align-items-center">
                    <img
                      src={member?.friendId?.profilePicture||'https://as1.ftcdn.net/v2/jpg/06/33/54/78/1000_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg'}
                      alt={`${member?.friendId?.firstName}'s Profile`}
                      className="mx-2"
                      style={{ borderRadius: '50%', border: '2px solid #fff', width: '50px', height: '50px' }}
                    />
                    <div className="d-flex align-items-center">
                      {activeUsers.some(user => user.userId === member?.friendId?._id) && (
                        <span className="active-status mx-1" style={{ color: 'green' }}>&#8226;</span>
                      )}
                      <span className="mx-1 text-dark">{member?.friendId?.firstName + " " + member?.friendId?.lastName }</span>
                    </div>
                  </div>
                  <span className="message-count badge bg-primary mx-2">
                    {msgCounts[member?.friendId?._id] || ''}
                  </span>
                </li>
              ))}
          </ul>
        </div>
        {selectedFriend && (
          <div className="col-md-7 d-flex flex-column shEffect chat-box m-auto" style={{ zIndex: 1, background:'ghostwhite' }}>
            <ChatUi
              member={selectedFriend}
              setSelectedFriend={setSelectedFriend}
              userId={userId}
              name={name}
              socket={socket}
              History={chatHistory}
              setMsgCounts={setMsgCounts}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatComponent;
