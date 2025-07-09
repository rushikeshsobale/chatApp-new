import React, { useState, useEffect, useContext} from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  FaUserPlus,
  FaUserCheck,
  FaUserFriends,
  FaBell,
  FaSearch,
  FaThList,
  FaTh,
  FaTimes
} from "react-icons/fa";
import "../css/users.css";
import { useSelector } from "react-redux";
import { UserContext } from "../contexts/UserContext";

const UsersList = () => {
  const senderId = useSelector((state) => state.auth?.userId?.userId);
  const senderName = useSelector((state) => state.auth?.userId?.name);
  const notifications = useSelector((state) => state?.notifications?.notifications);
  const apiUrl = process.env.REACT_APP_API_URL;
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dataFetched, setDataFetched] = useState(false);
  const [userData, setUserData] = useState(null);
  const [disabledButtons, setDisabledButtons] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const { socket } = useContext(UserContext);
  const token = localStorage.getItem("token");
  const [viewMode, setViewMode] = useState("grid");

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/getUsers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Problem fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [dataFetched]);

  const addFriend = async (userId, index) => {
    try {
      const call = await fetch(`${apiUrl}/sendRequest/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (call.ok) {
        setDisabledButtons([...disabledButtons, index]);
        fetchUserData();
        const message = {
          text: `${senderName} has sent you a friend request`,
        };
        socket.emit("raisedRequest", { userId, senderId, message });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${apiUrl}/getUser`, {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const acceptFriendRequest = async (userId) => {
    try {
      const response = await fetch(`${apiUrl}/acceptFriendRequest/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (response.ok) {
        await fetchUserData();
        fetchUsers();
        const message = {
          text: `${senderName} has accepted your friend request`,
        };
        socket.emit("raisedRequest", { userId, senderId, message });
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const getFriendStatus = (userId) => {
    if (userData) {
      const friend = userData.friends.find(
        (friend) => friend.friendId?._id === userId
      );
      return friend?.isFriend;
    }
    return "not_friends";
  };

  const handleUserClick = (userId) => {
    navigate(`/ProfilePage/${userId}`);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchTerm("");
      setFilteredUsers(users);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    const filtered = users.filter(
      (user) =>
        user.firstName.toLowerCase().includes(e.target.value.toLowerCase()) ||
        user.lastName.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  return (
    <div className="users-list-container">
      {/* Header with Controls */}
      <div className="users-header">
        <h2 className="section-title">Find Friends</h2>
        
        <div className="controls">
          <button 
            className={`icon-button ${showSearch ? 'active' : ''}`}
            onClick={toggleSearch}
          >
            <FaSearch />
          </button>
          
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <FaThList />
            </button>
            <button
              className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <FaTh />
            </button>
          </div>
          
          <div className="notifications-wrapper">
            <button 
              className={`icon-button ${showNotifications ? 'active' : ''}`}
              onClick={toggleNotifications}
            >
              <FaBell />
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  <button onClick={toggleNotifications} className="close-btn">
                    <FaTimes />
                  </button>
                </div>
                <ul className="notifications-list">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <li key={index} className="notification-item">
                        {notification.text}
                      </li>
                    ))
                  ) : (
                    <li className="no-notifications">No new notifications</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={handleSearch}
          />
          <button className="search-clear" onClick={toggleSearch}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* Users Grid/List */}
      <div className={`users-display ${viewMode}`}>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user, index) => {
            const status = getFriendStatus(user._id);
            return (
              <div
                key={user._id}
                className={`user-card ${status === 'friends' ? 'friend' : ''}`}
                onClick={() => handleUserClick(user._id)}
              >
                <div className="user-avatar-container">
                  <img
                    src={user.profilePicture || "https://via.placeholder.com/150"}
                    alt={`${user.firstName}'s Profile`}
                    className="user-avatar"
                  />
                  {status === 'friends' && (
                    <div className="online-indicator"></div>
                  )}
                </div>

                <div className="user-info">
                  <h3 className="user-name">
                    {user.firstName} {user.lastName}
                  </h3>
                  {viewMode === "grid" && (
                    <p className="user-email">{user.email}</p>
                  )}
                </div>

                <div className="user-actions">
                  {status === "friends" ? (
                    <button className="btn-friends" disabled>
                      <FaUserFriends /> Friends
                    </button>
                  ) : status === "sent" ? (
                    <button className="btn-pending" disabled>
                      <FaUserCheck /> Pending
                    </button>
                  ) : status === "recieved" ? (
                    <button
                      className="btn-accept"
                      onClick={(e) => {
                        e.stopPropagation();
                        acceptFriendRequest(user._id);
                      }}
                    >
                      <FaUserCheck /> Accept
                    </button>
                  ) : (
                    <button
                      className="btn-add"
                      onClick={(e) => {
                        e.stopPropagation();
                        addFriend(user._id, index);
                      }}
                    >
                      <FaUserPlus /> Add Friend
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-results">
            <p>No users found matching your search.</p>
            <button 
              className="btn-invite"
              onClick={() => alert("Invite feature coming soon!")}
            >
              Invite Friends
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersList;