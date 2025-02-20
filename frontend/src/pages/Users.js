import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaUserPlus, FaUserCheck, FaUserFriends, FaBell, FaSearch, FaThList, FaTh } from 'react-icons/fa'; // Added grid/list icons
import '../css/users.css';
import { useSelector } from 'react-redux';
import { useSocket } from '../components/socketContext';

import PostFeed from './PostFeed';

const UsersList = () => {
  const senderId = useSelector(state => state.auth.userId.userId);
  const senderName = useSelector(state => state.auth.userId.name);
  const notifications = useSelector(state => state.notifications.notifications); // Get notifications from Redux
  const apiUrl = process.env.REACT_APP_API_URL;
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataFetched, setDataFetched] = useState(false);
  const [userData, setUserData] = useState(null);
  const [disabledButtons, setDisabledButtons] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false); // state to control notification dropdown
  const navigate = useNavigate();
  const { socket } = useSocket();
  const token = localStorage.getItem('token');
  const [viewMode, setViewMode] = useState("list"); // Toggle between "list" and "grid"

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/getUsers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, // Include the token in the Authorization header
          'Content-Type': 'application/json', // Optional: specify content type
        },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Problem fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [dataFetched]);

  const addFriend = async (userId, index) => {
    try {
      const call = await fetch(`${apiUrl}/sendRequest/${userId}`, {
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
      const response = await fetch(`${apiUrl}/getUser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`, // Include the token in the Authorization header
          'Content-Type': 'application/json', // Optional: specify content type
        },
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
      const response = await fetch(`${apiUrl}/acceptFriendRequest/${userId}`, {
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
      const response = await fetch(`${apiUrl}/declineFriendRequest/${requestId}`, {
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

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    const filtered = users.filter(user =>
      user.firstName.toLowerCase().includes(e.target.value.toLowerCase()) ||
      user.lastName.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  return (
    <div className=" text-light container">
      <div className="row">
        {/* Users List Section */}
        <div className="col-md-12 m-auto">
          <div className="fixed bg-dark shadow py-3 px-2 d-flex align-items-center justify-content-between">
          
            {/* <h2 className="fs-5 text-primary mb-0 d-smaller-none">Find Friends</h2> */}

            {/* Search Bar */}
            <div className="input-group" style={{ maxWidth: "300px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={handleSearch}
                style={{ borderRadius: "20px 0 0 20px" }}
              />
              <span
                className="input-group-text bg-primary text-white"
                style={{ borderRadius: "0 20px 20px 0" }}
              >
                <FaSearch />
              </span>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="btn-group">
              <button
                className={`btn btn-sm ${viewMode === "list" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setViewMode("list")}
              >
                <FaThList /> {/* List View Icon */}
              </button>
              <button
                className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setViewMode("grid")}
              >
                <FaTh /> {/* Grid View Icon */}
              </button>
            </div>
          </div>

          <ul className={`row justify-content-center p-0  mt-3 ${viewMode === "grid" ? "d-flex flex-wrap" : ""}` } style={{ listStyleType: 'none' }}>
            {filteredUsers.map((user, index) => {
              const status = getFriendStatus(user._id);
              return (
                <li
                  key={user._id}
                  className={`col-lg-2 col-12 ${viewMode === "grid" ? "bg-dark card " : "col-lg-3 col-12 m-1"}`}
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease-in-out',
                    backgroundColor: viewMode === "list" ? '#333' : '',
                    padding: viewMode === "list" ? '1rem' : '',
                    marginBottom: '1rem',
                   
                  }}
                  onClick={() => handleUserClick(user._id)}
                >
                  <div className={`text-center ${viewMode === 'list' ? 'd-flex align-items-center ' : ''}`}>
                    <img
                      src={user.profilePicture || 'https://via.placeholder.com/90'}
                      alt={`${user.firstName}'s Profile`}
                      className=""
                      style={{
                        borderRadius: '50%',
                        border: '3px solid #007bff',
                        width: viewMode === "list" ? '40px' : '90px', // Smaller in list view
                        height: viewMode === "list" ? '40px' : '90px', // Smaller in list view
                        objectFit: 'cover',
                      }}
                    />

                    <p className='mx-3' style={{ fontWeight: 'bold', fontSize: '1rem', color: 'whitesmoke' }}>
                      {user.firstName + ' ' + user.lastName}
                    </p>
                    {viewMode=='grid'&&
                       <p className='text-white'>{user.email}</p>
                    }
                    <div className="text-center">
                      {status === 'friends' ? (
                        <button
                          className="btn btn-outline-secondary btn-sm rounded-pill t"
                          style={{ fontSize: '0.9rem', fontWeight: 'bold', cursor: 'not-allowed' }}
                          disabled
                        >
                          <FaUserFriends /> Friends
                        </button>
                      ) : status === 'sent' ? (
                        <button
                          className="btn btn-outline-warning btn-sm rounded-pill w-100"
                          style={{ fontSize: '0.9rem', fontWeight: 'bold' }}
                          disabled
                        >
                          <FaUserCheck /> Requested
                        </button>
                      ) : status === 'recieved' ? (
                        <button
                          className="btn btn-outline-success btn-sm rounded-pill w-100"
                          style={{ fontSize: '0.9rem', fontWeight: 'bold' }}
                          onClick={() => acceptFriendRequest(user._id)}
                        >
                          <FaUserCheck /> Accept
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline-primary btn-sm rounded-pill w-100"
                          style={{ fontSize: '0.9rem', fontWeight: 'bold' }}
                          onClick={() => addFriend(user._id, index)}
                        >
                          <FaUserPlus /> Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Notifications */}
          <div className="position-relative">
            <button
              type="button"
              className="btn btn-primary position-relative"
              onClick={toggleNotifications}
            >
              <FaBell />
              {notifications.length > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="notifications-dropdown">
                <ul className="list-group">
                  {notifications.map((notification, index) => (
                    <li key={index} className="list-group-item">
                      {notification.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Feed Component */}
      <PostFeed />
    </div>
  );
};

export default UsersList;
