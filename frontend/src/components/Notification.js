import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaBell } from 'react-icons/fa';
import '../css/Notification.css';

const Notification = () => {
  const notifications = useSelector(state => state.notifications.notifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [prevNotificationCount, setPrevNotificationCount] = useState(0);
  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };
  // Play notification sound when new notifications arrive
  useEffect(() => {
    setPrevNotificationCount(notifications.length);
  }, [notifications, prevNotificationCount]);
  return (
    <div className="notification-container mx-5">
      <div className="notification-icon" onClick={toggleNotifications} style={{ cursor: 'pointer' }}>
        <FaBell className="text-warning" size={24} />  
        {notifications.length > 0 && (
          <span className="badge badge-danger position-absolute top-0 start-100 translate-middle">
            {notifications.length}
          </span>
        )}
      </div>
      {showNotifications && (
        <div className="floating-notification-list">
          <ul className="list-group">
            {notifications.length == 0 &&
              <p className='text-center'>No notifications</p>
            }
            {notifications.map((notification, index) => (
              <li key={index} className="list-group-item d-flex justify-content-between align-items-center bg-light text-dark border-secondary mb-2 rounded">
                <span>{notification.message.text}</span>
                <div>
                  <button
                    onClick={() => console.log("Accept", notification.senderId)}
                    className="btn btn-sm btn-outline-success me-2 rounded-pill"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => console.log("Decline", notification.senderId)}
                    className="btn btn-sm btn-outline-danger rounded-pill"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Notification;
