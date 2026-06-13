import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import { ThemeContext } from '../contexts/ThemeContext';
import NotificationModal from '../components/Notification';
import EditProfile from './EditProfile';
import { updateNotification, deleteNotification } from '../services/notificationService';
import { updateUserProfile } from '../services/profileService';

/* ─── Icon components (inline SVG, no icon-font dependency) ──────────── */
const IconHome = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const IconMessages = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconBell = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconSearch = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ─── Styles ─────────────────────────────────────────────────────────── */
const styles = `
  .nb-root {
    position: sticky;
    top: 0;
    z-index: 1050;
    width: 100%;
    transition: background 0.25s ease, border-color 0.25s ease;
  }

  .nb-root.light {
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #f0f0f0;
  }

  .nb-root.dark {
    background: rgba(10, 10, 10, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #1f1f1f;
  }

  .nb-inner {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 24px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  /* Brand */
  .nb-brand {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    cursor: pointer;
    flex-shrink: 0;
    text-decoration: none;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Search */
  .nb-search {
    flex: 1;
    max-width: 360px;
    position: relative;
    display: flex;
    align-items: center;
  }

  .nb-search-icon {
    position: absolute;
    left: 12px;
    pointer-events: none;
    transition: color 0.2s;
  }

  .nb-root.light .nb-search-icon { color: #aaa; }
  .nb-root.dark  .nb-search-icon { color: #555; }

  .nb-search-input {
    width: 100%;
    height: 36px;
    padding: 0 14px 0 38px;
    border-radius: 999px;
    border: none;
    outline: none;
    font-size: 0.875rem;
    transition: background 0.2s, box-shadow 0.2s;
  }

  .nb-root.light .nb-search-input {
    background: #f5f5f5;
    color: #111;
  }
  .nb-root.dark .nb-search-input {
    background: #1a1a1a;
    color: #e8e8e8;
  }

  .nb-search-input::placeholder { color: #aaa; }
  .nb-root.dark .nb-search-input::placeholder { color: #555; }

  .nb-search-input:focus {
    box-shadow: 0 0 0 2px #6366f130;
  }
  .nb-root.light .nb-search-input:focus { background: #efefef; }
  .nb-root.dark  .nb-search-input:focus { background: #222; }

  /* Actions row */
  .nb-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  /* Icon button */
  .nb-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.15s ease, color 0.18s ease;
  }

  .nb-root.light .nb-btn { color: #666; }
  .nb-root.dark  .nb-btn { color: #888; }

  .nb-root.light .nb-btn:hover { background: #f3f4f6; color: #111; transform: translateY(-1px); }
  .nb-root.dark  .nb-btn:hover { background: #1e1e1e; color: #e5e5e5; transform: translateY(-1px); }

  .nb-btn:active { transform: translateY(0) scale(0.95); }

  /* Badge */
  .nb-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 15px;
    height: 15px;
    padding: 0 3px;
    border-radius: 999px;
    background: #ef4444;
    color: #fff;
    font-size: 0.6rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    pointer-events: none;
  }

  /* Avatar */
  .nb-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    cursor: pointer;
    border: 2px solid transparent;
    transition: border-color 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease;
    margin-left: 4px;
  }

  .nb-root.light .nb-avatar:hover {
    border-color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }
  .nb-root.dark .nb-avatar:hover {
    border-color: #818cf8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(129, 140, 248, 0.25);
  }

  /* Mobile: hide search, show search toggle */
  @media (max-width: 640px) {
    .nb-inner { padding: 0 16px; gap: 12px; }
    .nb-search { display: none; }
    .nb-search.expanded {
      display: flex;
      position: absolute;
      top: 56px;
      left: 0;
      right: 0;
      max-width: 100%;
      padding: 8px 16px;
      background: inherit;
      border-bottom: 1px solid;
      border-color: inherit;
      z-index: 10;
      animation: slideDown 0.2s ease;
    }
    .nb-search.expanded .nb-search-input { border-radius: 10px; }
    .nb-search-toggle { display: flex !important; }
  }

  @media (min-width: 641px) {
    .nb-search-toggle { display: none !important; }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

/* ─── Component ──────────────────────────────────────────────────────── */
const Navbar = () => {
  const navigate = useNavigate();
  const [showEditProfile, setShowEditProfile]     = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [unreadCount, setUnreadCount]             = useState(0);
  const [showProfileModal, setShowProfileModal]   = useState(false);
  const [searchOpen, setSearchOpen]               = useState(false);

  const { unseenMessages = [], setUser, user } = useContext(UserContext);
  const { isDark } = useContext(ThemeContext);

  const uniqueUnseenChatsCount = new Set(
    unseenMessages
      .map((msg) => msg?.conversationId || msg?.conversation)
      .filter(Boolean)
  ).size;

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await updateNotification(notificationId, true);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await deleteNotification(notificationId);
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleSave = async (profileData) => {
    try {
      const updated = await updateUserProfile(user._id, profileData);
      setUser(updated?.user);
      setShowEditProfile(false);
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const logOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const theme = isDark ? 'dark' : 'light';

  return (
    <>
      <style>{styles}</style>

      <nav className={`nb-root ${theme}`}>
        <div className="nb-inner">

          {/* Brand */}
          <span
            className="nb-brand"
            role="link"
            tabIndex={0}
            onClick={() => navigate('/')}
            onKeyDown={e => e.key === 'Enter' && navigate('/')}
          >
            HiBUDDY
          </span>

          {/* Search — hidden on mobile until toggle */}
          <div className={`nb-search${searchOpen ? ' expanded' : ''}`}>
            <span className="nb-search-icon"><IconSearch /></span>
            <input
              className="nb-search-input"
              type="search"
              placeholder="Search people, posts…"
              aria-label="Search"
            />
          </div>

          {/* Actions */}
          <div className="nb-actions">

            {/* Mobile search toggle */}
            <button
              className="nb-btn nb-search-toggle"
              aria-label="Toggle search"
              onClick={() => setSearchOpen(o => !o)}
            >
              <IconSearch size={19} />
            </button>

            {/* Home */}
            <button
              className="nb-btn"
              aria-label="Home"
              onClick={() => navigate('/home')}
            >
              <IconHome size={20} />
            </button>

            {/* Messages */}
            <button
              className="nb-btn"
              aria-label={`Messages${uniqueUnseenChatsCount > 0 ? ` — ${uniqueUnseenChatsCount} unread` : ''}`}
              onClick={() => navigate('/chats')}
            >
              <IconMessages size={20} />
              {uniqueUnseenChatsCount > 0 && (
                <span className="nb-badge">{uniqueUnseenChatsCount}</span>
              )}
            </button>

            {/* Notifications */}
            <button
              className="nb-btn"
              aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
              onClick={() => setShowNotifications(true)}
            >
              <IconBell size={20} />
              {unreadCount > 0 && (
                <span className="nb-badge">{unreadCount}</span>
              )}
            </button>

            {/* Avatar */}
            <img
              src={user?.profilePicture || '/default-avatar.png'}
              alt={user?.name ? `${user.name}'s profile` : 'Profile'}
              className="nb-avatar"
              onClick={() => navigate('/profile')}
            />
          </div>
        </div>

        {/* Notification panel */}
        <NotificationModal
          notifications={notifications}
          unreadCount={unreadCount}
          show={showNotifications}
          onToggle={() => setShowNotifications(v => !v)}
          onMarkRead={handleMarkNotificationAsRead}
          onDelete={handleDeleteNotification}
          theme={theme}
        />
      </nav>

      {/* Edit profile modal */}
      {showProfileModal && user && (
        <EditProfile
          show={showProfileModal}
          onHide={() => setShowProfileModal(false)}
          user={user}
          onSave={handleSave}
          onSettings={() => { navigate('/settings'); setShowProfileModal(false); }}
          onLogout={logOut}
          theme={theme}
        />
      )}
    </>
  );
};

export default Navbar;