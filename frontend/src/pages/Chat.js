import React, { useEffect, useState, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useDispatch, useSelector } from 'react-redux';
import { addMessage, setInitialMessages } from '../store/store';
import { useSocket } from '../components/socketContext';
import { setUser } from '../store/action';
import io from 'socket.io-client';
import '../css/Chat.css';
import ChatUi from '../components/ChatUi';
import FriendList from '../components/FriendList';
import ProfileDisplay from '../components/ProfileDisplay';
import { useNavigate } from 'react-router-dom';
const ChatComponent = () => {
  const { socket, setSocket, setUserId, userId } = useSocket();
  const [userName, setUserName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [msgCounts, setMsgCounts] = useState({});
  const [profilePicture, setProfilePicture] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const navigate = useNavigate();
  const chatHistory = useSelector((state) => state.chat.chatHistory);
  const token = localStorage.getItem('token');
  const dispatch = useDispatch();
  const apiUrl = process.env.REACT_APP_API_URL;

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/getUser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserId(data._id);
        setUserName(data.firstName);
        setProfilePicture(data.profilePicture);
        setFriends(data.friends);
        dispatch(setUser({ userId: data._id, name: data.firstName }));
        if (!socket) {
          const socketConnection = io(`${apiUrl}/`, { query: { id: data._id } });
          setSocket(socketConnection);
        }
      } else {
        console.error('Failed to fetch user data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [token, socket, setSocket, setUserId, dispatch]);
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);
 
  useEffect(() => {
    if (socket && userId) {
     
      socket.on('restatus', (data) => setActiveUsers(data));
      socket.emit('joinRoom', { userId });
      socket.on('status', (data) =>
        setActiveUsers((prevActiveUsers) => [...prevActiveUsers, data])
      );
      socket.on('userLeft', (activeMembers) => setActiveUsers(activeMembers));

      return () => {
       
        socket.off('status');
        socket.off('userLeft');
      };
    }
  }, [socket, userId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleFriendSelect = (friend) => {
    setSelectedFriend(friend);
  };

  const handleBackToFriendList = () => {
    setSelectedFriend(null);
  };

  return (
    <div className=" m-auto" >
      <div className="">
        <div className='d-flex px-2'>
          <button className="btn text-light border-0 me-2" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left fs-5"></i>
          </button>
          <div>
            <h1 className='text-center text-white pt-2 mx-3 '>Chats</h1>
          </div>
        </div>

        <div className={`p-1 chat-ui-container container justify-content-center d-flex shadow-sm ${isMobileView ? 'd-block flex-column' : ''}`}>

          {!isMobileView || !selectedFriend ? (
            <div className={`friend-list-container border border-light rounded  col-lg-4  ${isMobileView ? 'col-12' : ''}`}>
              <FriendList
                friends={friends}
                activeUsers={activeUsers}
                msgCounts={msgCounts}
                selectedFriend={selectedFriend}
                handleFriendSelect={handleFriendSelect}
                handleBackToFriendList={handleBackToFriendList}
              />
            </div>
          ) : null}
          {selectedFriend ? (
            <div className={`${isMobileView ? 'col-12' : 'col-lg-8'}`}>
              <ChatUi
                member={selectedFriend}
                setSelectedFriend={setSelectedFriend}
                userId={userId}
                userName={userName}
                socket={socket}
                history={chatHistory}
                setMsgCounts={setMsgCounts}
                onBack={isMobileView ? handleBackToFriendList : null}
              />
            </div>
          ) : (
            <div className={` d-none flex-column justify-content-center p-5 col-lg-8`} style={{ background: 'aliceblue' }}>
              {/* Illustration */}
              <img
                src="https://cdn.pixabay.com/photo/2021/09/20/03/24/skeleton-6639547_1280.png"
                alt="No friend selected"
                className="img-fluid mb-3"
                style={{ maxWidth: "200px" }}
              />

              {/* Message */}
              <p className="text-muted text-center">
                No friend selected. Choose a friend from the list or invite someone to chat!
              </p>

              {/* Invite Button */}
              <button
                className="btn btn-primary mt-3"
                onClick={() => alert("Invite feature coming soon!")}
              >
                Invite a Friend
              </button>

              {/* Or Search for Friends */}
              <div className="mt-4" style={{ width: "100%", maxWidth: "300px" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search for friends..."
                />
              </div>
            </div>

          )}

        </div>

      </div>
    </div>
  );
};

export default ChatComponent;
