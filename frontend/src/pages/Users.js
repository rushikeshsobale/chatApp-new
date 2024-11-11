import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaUserPlus, FaUserCheck, FaUserFriends, FaBell } from 'react-icons/fa';
import '../css/index.css';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [dataFetched, setDataFetched] = useState(false);
  const [userData, setUserData] = useState(null);
  const [disabledButtons, setDisabledButtons] = useState([]);
  const navigate = useNavigate();
  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5500/getUsers', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include"
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
        credentials: "include"
      });
      if (call.ok) {
        setDisabledButtons([...disabledButtons, index]);
        fetchUserData();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch(`http://localhost:5500/getUser`, {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const acceptFriendRequest = async (requestId) => {
    try {
      const response = await fetch(`http://localhost:5500/acceptFriendRequest/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        await fetchUserData();
        fetchUsers();
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

  return (
    <div className="container mt-4">
      <div className="row">
        {/* Users List Section */}
        <div className="col-md-8">
          <h2 className="mb-3 text-secondary fs-5">Find Friends</h2>
          <ul className="list-group">
            {users.map((user, index) => {
              const status = getFriendStatus(user._id);
              
              return (
                <li key={user._id} className="list-group-item d-flex justify-content-between align-items-center bg-dark text-light border-secondary mb-2 rounded">
                  <div
                    className="d-flex align-items-center cursor-pointer"
                    onClick={() => handleUserClick(user._id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={user.profilePicture || ''}
                      alt={`${user.firstName}'s Profile`}
                      className="mx-2"
                      style={{ borderRadius: '50%', border: '2px solid #fff', width: '30px', height: '30px' }}
                    />
                    <span>{user.firstName + ' ' + user.lastName}</span>
                  </div>
                  <div className='col-lg-3'>
                    {status === 'friends' ? (
                      <button className="btn btn-outline-light btn-sm rounded-pill w-100" disabled>
                        <FaUserFriends /> Friends
                      </button>
                    ) : status === 'sent' ? (
                      <button className="btn btn-outline-warning btn-sm rounded-pill w-100" disabled>
                        <FaUserCheck /> Requested
                      </button>
                    ) : status =='recieved' ? (
                       
                      <button
                        className="btn btn-outline-success btn-sm rounded-pill w-100"
                        onClick={() => acceptFriendRequest(user._id)}
                      >
                        
                        <FaUserCheck /> Accept
                      </button>
                    ) : (
                      <button
                        onClick={() => addFriend(user._id, index)}
                        className="btn btn-outline-primary btn-sm rounded-pill w-100"
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
        <div className='col-md-4'>
          <h2 className="mb-3 text-warning">
            <FaBell className="me-2" /> Notifications
          </h2>
          <ul className="list-group">
            {userData && userData.friends.filter(request => !request.isFriend).map((request, index) => (
              <li key={index} className="list-group-item d-flex justify-content-between align-items-center bg-light text-dark border-secondary mb-2 rounded">
                <img
                  src={request.friendId?.profilePicture || ''}
                  alt={`${request.friendId?.firstName}'s Profile`}
                  className="mx-2"
                  style={{ borderRadius: '50%', border: '2px solid #fff', width: '30px', height: '30px' }}
                />
                <span>{request?.friendId?.friendName} requested</span>
                <div>
                  <button
                    onClick={() => acceptFriendRequest(request.friendId)}
                    className="btn btn-sm btn-outline-success me-2 rounded-pill"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineFriendRequest(request.friendId)}
                    className="btn btn-sm btn-outline-danger rounded-pill"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UsersList;
