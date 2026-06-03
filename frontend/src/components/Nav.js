import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaBell } from 'react-icons/fa';
import { RiMessengerLine } from 'react-icons/ri';
import NotificationModal from '../components/Notification'; 
import { UserContext } from '../contexts/UserContext';
import { updateNotification, deleteNotification } from '../services/notificationService';
import { ThemeContext } from '../contexts/ThemeContext';
import EditProfile from './EditProfile';
import { updateUserProfile } from '../services/profileService';

const Navbar = () => {
  const navigate = useNavigate();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { unseenMessages = [], setUser, user } = useContext(UserContext); // Safe fallback array
  const { isDark } = useContext(ThemeContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 1. Calculate unread distinct 1-on-1 peer channels
  // This extracts unique conversation IDs so multiple messages from the same friend only count as 1
  const uniqueUnseenChatsCount = new Set(
    unseenMessages
      .map((msg) => msg?.conversationId || msg?.conversation)
      .filter(Boolean)
  ).size;

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await updateNotification(notificationId, true);
      setNotifications(prevNotifications =>
        prevNotifications?.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleSave = async (profileData) => {
    try {
      const userId = user._id;
      const updatedUser = await updateUserProfile(userId, profileData);
      setUser(updatedUser?.user);
      setShowEditProfile(false);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const logOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await deleteNotification(notificationId);
      if (response.ok) {
        setNotifications(prevNotifications =>
          prevNotifications.filter(notification => notification._id !== notificationId)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <nav
      className={`container-fluid navbar navbar-expand-lg rounded shadow-sm sticky-top border-bottom p-0 ${isDark ? 'navbar-dark border-secondary' : 'navbar-light border-light-subtle'}`}
      style={{ background: isDark ? '#000000' : '#ffffff', zIndex: 1050, transition: 'background 0.3s ease' }}
    >
      <div className="container-fluid d-flex justify-content-between align-items-center px-3 py-2">
        <a className="navbar-brand fw-bold text-gradient" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          HiBUDDY
        </a>

        <div className="d-flex align-items-center gap-3">
          {/* Home Icon */}
          <div
            className={`cursor-pointer ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}
            onClick={() => navigate('/home')}
          >
            <FaHome size={26} />
          </div>

          {/* Messages Icon with Distinct Conversation Badge Counter */}
          <button
            className={`btn p-0 position-relative ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}
            onClick={() => navigate('/chats')}
          >
            <RiMessengerLine size={26} />
            {uniqueUnseenChatsCount > 0 && (
              <span 
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-flex align-items-center justify-content-center" 
                style={{ fontSize: '0.65rem', minWidth: '16px', height: '16px', padding: '2px' }}
              >
                {uniqueUnseenChatsCount}
              </span>
            )}
          </button>

          {/* Profile Picture Trigger */}
          <img
            src={user?.profilePicture || '/default-avatar.png'}
            alt="Profile"
            className={`rounded-circle border ${isDark ? 'border-secondary' : 'border-light-subtle'}`}
            style={{ width: "30px", height: "30px", objectFit: "cover", cursor: 'pointer' }}
            onClick={() => navigate(`/profile`)} // Fixed string path syntax evaluation 
          />

          {/* Notifications Trigger */}
          <span className={`cursor-pointer ${isDark ? 'text-secondary text-hover-light' : 'text-muted text-hover-dark'}`}>
            <FaBell size={22} onClick={() => setShowNotifications(true)} />
          </span>

          {/* Notification Window Context */}
          <NotificationModal
            notifications={notifications}
            unreadCount={unreadCount}
            show={showNotifications}
            onToggle={() => setShowNotifications(!showNotifications)}
            onMarkRead={handleMarkNotificationAsRead}
            onDelete={handleDeleteNotification}
            theme={isDark ? 'dark' : 'light'}
          />
        </div>
      </div>
         
      {showProfileModal && user && (
        <EditProfile 
          show={showProfileModal} 
          onHide={() => setShowProfileModal(false)} 
          user={user} 
          onSave={handleSave} 
          onSettings={() => { navigate('/settings'); setShowProfileModal(false); }} 
          onLogout={logOut} 
          theme={isDark ? 'dark' : 'light'} 
        />
      )}
    </nav>
  );
};

export default Navbar;