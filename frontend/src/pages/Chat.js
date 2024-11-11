import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import 'bootstrap/dist/css/bootstrap.min.css';
import ChatUi from '../components/ChatUi';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, setInitialMessages } from '../store/store';
import '../css/Chat.css';
import { setUser } from '../store/action';
const ChatComponent = () => {
  const [name, setName] = useState('');
  const [socket, setSocket] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState('')
  const chatHistory = useSelector(state => state.chat.chatHistory);
  const dispatch = useDispatch();

  const fetchUserData = async () => {
    console.log("this logged")
    try {
      const response = await fetch('http://localhost:5500/getUser', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSocket(io('http://localhost:5500', { query: { id: data._id } }));
        setUserId(data._id);
        setName(data.firstName);
        setProfilePicture(data.profilePicture)
        setFriends(data.friends); 
        dispatch(setUser({
          userId: data._id,
        }));
      
      } else {
        console.error("Failed to fetch user data:", response.statusText);
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
        socket.disconnect();
      };
    }
  }, [socket, userId]);
  const handleFriendSelect = (member) => {
    setSelectedFriend(member);
  };
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5500/getMessages/${userId}`);
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
    <div className="overlay">
      <div className="row flex-grow-1">
        <div className={`${selectedFriend ? 'col-md-4' : 'col-6 mx-auto'} p-4 chat-box shEffect mx-5`} style={{ height: '600px', zIndex: '1' }}>
          <div className="mb-1 d-flex" style={{ color: '#fff' }}>
            <img
              src={profilePicture}
              alt={`${name}'s Profile`}
              className="profile-image mx-3"
              style={{ borderRadius: '50%', border: '2px solid #fff' }}
            />
            <h5 className="mx-2 my-auto" style={{ color: '#fff' }}>{name}</h5>
          </div>
          <ul>
            {friends?.filter(member => member?.isFriend === 'friends')
              .map((member, index) => (
                <li
                  className={`d-flex justify-content-between align-items-center p-2 ${selectedFriend === member ? 'active' : ''}`}
                  key={index}
                  onClick={() => handleFriendSelect(member)}
                  style={{ borderBottom: '1px solid #eaeaea', cursor: 'pointer' }}
                >

                  <div className="d-flex align-items-center">
                    <img
                      src={member?.friendId?.profilePicture||''}
                      alt={`${member?.friendId?.firstName}'s Profile`}
                      className="mx-2"
                      style={{ borderRadius: '50%', border: '2px solid #fff', width: '30px', height: '30px' }}
                    />
                    <div className="d-flex align-items-center">
                      {activeUsers.some(user => user.userId === member?.friendId?._id) && (
                        <span className="active-status mx-1" style={{ color: 'green' }}>&#8226;</span>
                      )}
                      <span className="mx-1">{member?.friendId?.firstName}</span>
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
          <div className="col-md-7 d-flex flex-column shEffect chat-box" style={{ zIndex: 1 }}>
            <ChatUi
              member={selectedFriend}
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
