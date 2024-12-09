import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaUserPlus, FaUserCheck, FaUserFriends, FaBell } from 'react-icons/fa';
import '../css/index.css';
import { useSelector } from 'react-redux';
import { useSocket } from '../components/socketContext';

const UsersList = () => {
  const senderId = useSelector(state => state.auth.userId.userId);
  const senderName = useSelector(state => state.auth.userId.name);
  const notifications = useSelector(state => state.notifications.notifications); // Get notifications from Redux

  const [users, setUsers] = useState([]);
  const [dataFetched, setDataFetched] = useState(false);
  const [userData, setUserData] = useState(null);
  const [disabledButtons, setDisabledButtons] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false); // state to control notification dropdown
  const navigate = useNavigate();
  const { socket } = useSocket();
  console.log(socket, 'socket')
  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5500/getUsers', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Problem fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [dataFetched]);

  const addFriend = async (userId, index) => {
    try {
      const call = await fetch(`http://localhost:5500/sendRequest/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (call.ok) {
        setDisabledButtons([...disabledButtons, index]);
        fetchUserData();
        const message = {
          text: `${senderName} has sent you a friend request`,
        };
        socket.emit('raisedRequest', { userId, senderId, message });
      }
    } catch (error) {
      console.log(error);
    }
  };
  const fetchUserData = async () => {
    try {
      const response = await fetch(`http://localhost:5500/getUser`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        console.error('Failed to fetch user data:', response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  useEffect(() => {
    fetchUserData();
  }, []);
  const acceptFriendRequest = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5500/acceptFriendRequest/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        await fetchUserData();
        fetchUsers();
        const message = {
          text: `${senderName} has accepted your friend request`,
        };
        socket.emit('raisedRequest', { userId, senderId, message });
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };
  const declineFriendRequest = async (requestId) => {
    try {
      const response = await fetch(`http://localhost:5500/declineFriendRequest/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        await fetchUserData();
        fetchUsers();
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };
  const getFriendStatus = (userId) => {
    if (userData) {
      const friend = userData.friends.find(friend => friend.friendId?._id === userId);
      return friend?.isFriend;
    }
    return 'not_friends';
  };
  const handleUserClick = (userId) => {
    navigate(`/ProfilePage/${userId}`);
  };
  // Toggle notifications dropdown
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };
  return (
    <div className="container mt-4">
      <div className="row">
        {/* Users List Section */}
        <div className="col-md-8 m-auto">
          <h2 className="mb-3 m-auto text-center fs-5">Find Friends</h2>
          <ul className="row justify-content-center">
            {users.map((user, index) => {
              const status = getFriendStatus(user._id);
              return (
                <li
                key={user._id}
                className="col-lg-2 mx-3 justify-content-between align-items-center border-secondary mb-3 shadow-sm rounded"
                style={{
                  background:'ghostwhite',
                  alignItems: 'center',
                  gap: '15px',
                }}
              >
                {/* User Info Section */}
                <div
                  className="text-center"
                  onClick={() => handleUserClick(user._id)}
                  style={{
                    cursor: 'pointer',
                   
                  }}
                >
                  <img
                    src={user.profilePicture || 'https://as1.ftcdn.net/v2/jpg/06/33/54/78/1000_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg'}
                    alt={`${user.firstName}'s Profile`}
                    className="mx-2"
                    style={{
                      borderRadius: '50%',
                      border: '2px solid #fff',
                      width: '90px',
                      height: '90px',
                      objectFit: 'cover', // Ensures proper scaling of images
                    }}
                  />
                  <p
                    style={{
                      fontWeight: 'bold',
                      fontSize: '1rem',
                    
                    }}
                  >
                    {user.firstName + ' ' + user.lastName}
                  </p>
                </div>
              
                {/* Action Buttons Section */}
                <div className="text-center">
                  {status === 'friends' ? (
                    <button
                      className="btn btn-outline-dark btn-sm rounded-pill text-dark text-center m-auto"
                      style={{ fontSize: '0.9rem', fontWeight: 'bold', cursor: 'not-allowed' }}
                      disabled
                    >
                      <FaUserFriends /> Friends
                    </button>
                  ) : status === 'sent' ? (
                    <button
                      className="btn btn-outline-warning btn-sm rounded-pill w-100 text-dark"
                      style={{ fontSize: '0.9rem', fontWeight: 'bold' }}
                      disabled
                    >
                      <FaUserCheck /> Requested
                    </button>
                  ) : status === 'recieved' ? (
                    <button
                      className="btn btn-outline-success btn-sm rounded-pill w-100 text-dark"
                      style={{ fontSize: '0.9rem', fontWeight: 'bold' }}
                      onClick={() => acceptFriendRequest(user._id)}
                    >
                      <FaUserCheck /> Accept
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline-primary btn-sm rounded-pill w-100 text-dark"
                      style={{ fontSize: '0.9rem', fontWeight: 'bold' }}
                      onClick={() => addFriend(user._id, index)}
                    >
                      <FaUserPlus /> Add Friend
                    </button>
                  )}
                </div>
              </li>
              
              );
            })}
          </ul>
        </div>
        {/* Notifications Section */}
        <div className={showNotifications ? 'col-lg-4' : ''}>
          <div className="d-flex justify-content-end">
            <button
              className="btn btn-outline-warning position-relative"
              onClick={toggleNotifications}
            >
              <FaBell />
              {notifications.length > 0 && (
                <span
                  className="badge badge-danger position-absolute top-0 start-100 translate-middle"
                  style={{ fontSize: '0.7rem', borderRadius: '50%' }}
                >
                  {notifications.length}
                </span>
              )}
            </button>
          </div>

          {showNotifications && (
            <div className=" mt-2 shadow-lg">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className="d-flex justify-content-between align-items-center shadow border rounded p-4 mb-4"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '12px',
                     // Subtle box background
                    border: '1px solid #e0e0e0', // Light border for box
                    borderRadius: '8px', // Rounded corners
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // Subtle shadow for depth
                  }}
                >
                  <span
                    style={{
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      color: '#333', // Slightly darker text for emphasis
                    }}
                  >
                    {notification.message.text}
                  </span>
                  <div style={{ alignSelf: 'flex-end' }}>
                    <button
                      onClick={() => acceptFriendRequest(notification.senderId)}
                      className="btn btn-sm btn-success me-2 rounded-pill"
                      style={{
                        padding: '6px 12px', // Better spacing
                        fontWeight: 'bold',
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineFriendRequest(notification.senderId)}
                      className="btn btn-sm btn-danger rounded-pill"
                      style={{
                        padding: '6px 12px', // Better spacing
                        fontWeight: 'bold',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>


              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersList;
