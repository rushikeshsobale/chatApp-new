import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Spinner, Alert, Button, Form } from 'react-bootstrap';
import { FaUserPlus, FaUserMinus, FaSearch } from 'react-icons/fa';
import '../css/friends.css';

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const userId = currentUser?._id || currentUser?.userId;

  useEffect(() => {
    if (!userId) {
      setError('Please login to view friends');
      setLoading(false);
      return;
    }
    fetchFriends();
  }, [userId]);

  const fetchFriends = async () => {
    try {
      const response = await axios.get(`${apiUrl}/user/friends/${userId}`);
      if (response.data.success) {
        setFriends(response.data.friends);
      } else {
        throw new Error(response.data.message || 'Failed to fetch friends');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await axios.get(`${apiUrl}/user/search`, {
        params: { query: searchQuery }
      });
      if (response.data.success) {
        setSearchResults(response.data.users);
      } else {
        throw new Error(response.data.message || 'Search failed');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      const response = await axios.post(`${apiUrl}/user/addFriend`, {
        userId,
        friendId
      });
      if (response.data.success) {
        // Update friends list
        fetchFriends();
        // Remove from search results
        setSearchResults(prev => prev.filter(user => user._id !== friendId));
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add friend');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      const response = await axios.post(`${apiUrl}/user/removeFriend`, {
        userId,
        friendId
      });
      if (response.data.success) {
        // Update friends list
        setFriends(prev => prev.filter(friend => friend._id !== friendId));
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove friend');
    }
  };

  const handleProfileClick = (userId) => {
    navigate(`/ProfilePage/${userId}`);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <Alert variant="danger" className="text-center">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="friends-container">
      {/* Header */}
      <div className="friends-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1 className="friends-title">Friends</h1>
        <div className="header-spacer"></div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <Form onSubmit={handleSearch} className="search-form">
          <Form.Group className="d-flex gap-2">
            <Form.Control
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" variant="primary" disabled={isSearching}>
              {isSearching ? <Spinner size="sm" /> : <FaSearch />}
            </Button>
          </Form.Group>
        </Form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h4>Search Results</h4>
            {searchResults.map(user => (
              <div key={user._id} className="user-card">
                <div 
                  className="user-info"
                  onClick={() => handleProfileClick(user._id)}
                >
                  <img
                    src={user.profilePicture || "https://via.placeholder.com/40"}
                    alt={user.userName}
                    className="user-avatar"
                  />
                  <div className="user-details">
                    <h6>{user.userName}</h6>
                    <small>{user.email}</small>
                  </div>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleAddFriend(user._id)}
                >
                  <FaUserPlus /> Add Friend
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friends List */}
      <div className="friends-list">
        <h4>Your Friends</h4>
        {friends.length === 0 ? (
          <div className="text-center text-white mt-4">
            <p>No friends yet</p>
            <p>Search for users to add friends</p>
          </div>
        ) : (
          friends.map(friend => (
            <div key={friend._id} className="friend-card">
              <div 
                className="friend-info"
                onClick={() => handleProfileClick(friend._id)}
              >
                <img
                  src={friend.profilePicture || "https://via.placeholder.com/40"}
                  alt={friend.userName}
                  className="friend-avatar"
                />
                <div className="friend-details">
                  <h6>{friend.userName}</h6>
                  <small>{friend.email}</small>
                </div>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleRemoveFriend(friend._id)}
              >
                <FaUserMinus /> Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Friends; 