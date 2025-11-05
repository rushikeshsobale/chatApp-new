import React from "react";
import "../css/Chat.css";
import { FaArrowLeft, FaCircle, FaCheckDouble } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const FriendList = ({ 
  friends, 
  activeUsers, 
  msgCounts, 
  unseenMessages,
  selectedFriend, 
  handleFriendSelect 
}) => {
  
  const navigate = useNavigate();

  const getLastUnseenMessage = (friendId) => {
    const messages = unseenMessages
      ?.filter(msg => msg.senderId == friendId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return messages || null;
  };

  const handleBack = () => {
    navigate(-1);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const truncateMessage = (message, maxLength = 25) => {
    if (!message) return '';
    return message.length > maxLength 
      ? message.substring(0, maxLength) + '...' 
      : message;
  };

  return (
    <div className="friend-list-genz">
      <div className="friends-header-genz">
        <h3>Friends 💫</h3>
        <div className="active-count">
          {activeUsers.length} online
        </div>
      </div>

      <div className="friends-scroll-genz">
        {friends?.map((friend, index) => {
          const isActive = activeUsers.some(user => user._id || user === friend?._id);
          const lastUnseenMsg = getLastUnseenMessage(friend._id);
          const hasUnread = lastUnseenMsg && lastUnseenMsg.length > 0;
          const lastMessage = lastUnseenMsg?.[0];
          
          return (
            <div
              key={index}
              onClick={() => handleFriendSelect(friend, lastUnseenMsg)}
              className={`friend-card-genz ${selectedFriend === friend ? "selected-genz" : ""} ${hasUnread ? "unread-genz" : ""}`}
            >
              <div className="friend-avatar-genz">
                <div className={`avatar-container-genz ${isActive ? "active-genz" : ""}`}>
                  <img
                    src={friend?.profilePicture || "https://cdn.pixabay.com/photo/2021/09/20/03/24/skeleton-6639547_1280.png"}
                    alt="Profile"
                    className="profile-image-genz"
                  />
                  {isActive && (
                    <div className="online-indicator-genz">
                      <FaCircle />
                    </div>
                  )}
                </div>
              </div>

              <div className="friend-content-genz">
                <div className="friend-header-genz">
                  <div className="friend-name-genz">
                    {friend?.userName}
                  </div>
                  {lastMessage && (
                    <div className="message-time-genz">
                      {formatTime(lastMessage.createdAt)}
                    </div>
                  )}
                </div>

                <div className="friend-footer-genz">
                  <div className="message-preview-genz">
                    {lastMessage ? (
                      <>
                        <span className="message-text">
                          {truncateMessage(lastMessage.content)}
                        </span>
                        {hasUnread ? (
                          <span className="unread-indicator">🔴</span>
                        ) : (
                          <FaCheckDouble className="read-indicator" />
                        )}
                      </>
                    ) : (
                      <span className="no-message-text">
                        Start a conversation! 💬
                      </span>
                    )}
                  </div>
                  
                  {hasUnread && (
                    <div className="unread-badge-genz">
                      {lastUnseenMsg.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Hover effect gradient border */}
              <div className="card-glow-genz"></div>
            </div>
          );
        })}

        {(!friends || friends.length === 0) && (
          <div className="empty-state-genz">
            <div className="empty-icon">👥</div>
            <h4>No friends yet</h4>
            <p>Start following people to see them here</p>
            <button className="discover-btn-genz">
              Discover Friends
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .friend-list-genz {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: transparent;
        }

        .friends-header-genz {
          padding: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .friends-header-genz h3 {
          margin: 0;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 1.3rem;
        }

        .active-count {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .friends-scroll-genz {
          flex: 1;
          overflow-y: auto;
          padding: 10px 0;
        }

        .friend-card-genz {
          display: flex;
          align-items: center;
          padding: 15px 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          background: white;
        }

        .friend-card-genz:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
          transform: translateX(5px);
        }

        .friend-card-genz.selected-genz {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border-right: 3px solid #667eea;
        }

        .friend-card-genz.unread-genz {
          background: linear-gradient(135deg, rgba(255, 71, 87, 0.05) 0%, rgba(255, 165, 2, 0.05) 100%);
        }

        .friend-avatar-genz {
          position: relative;
          margin-right: 15px;
        }

        .avatar-container-genz {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #e0e0e0;
          transition: all 0.3s ease;
        }

        .friend-card-genz:hover .avatar-container-genz {
          border-color: #667eea;
          transform: scale(1.1);
        }

        .avatar-container-genz.active-genz {
          border-color: #4CAF50;
        }

        .profile-image-genz {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .online-indicator-genz {
          position: absolute;
          bottom: 2px;
          right: 2px;
          color: #4CAF50;
          background: white;
          border-radius: 50%;
          font-size: 0.6rem;
          width: 12px;
          height: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .friend-content-genz {
          flex: 1;
          min-width: 0;
        }

        .friend-header-genz {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .friend-name-genz {
          font-weight: 600;
          color: #333;
          font-size: 0.95rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .message-time-genz {
          font-size: 0.75rem;
          color: #999;
          white-space: nowrap;
        }

        .friend-footer-genz {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .message-preview-genz {
          display: flex;
          align-items: center;
          gap: 5px;
          flex: 1;
          min-width: 0;
        }

        .message-text {
          color: #666;
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .no-message-text {
          color: #999;
          font-size: 0.8rem;
          font-style: italic;
        }

        .unread-indicator {
          font-size: 0.6rem;
        }

        .read-indicator {
          color: #667eea;
          font-size: 0.7rem;
        }

        .unread-badge-genz {
          background: linear-gradient(135deg, #ff4757 0%, #ffa502 100%);
          color: white;
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 0.7rem;
          font-weight: 600;
          min-width: 18px;
          text-align: center;
          animation: pulse 2s infinite;
        }

        .card-glow-genz {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(102, 126, 234, 0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          border-radius: 8px;
        }

        .friend-card-genz:hover .card-glow-genz {
          opacity: 1;
        }

        .empty-state-genz {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 15px;
          opacity: 0.5;
        }

        .empty-state-genz h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-weight: 600;
        }

        .empty-state-genz p {
          margin: 0 0 20px 0;
          font-size: 0.9rem;
        }

        .discover-btn-genz {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 10px 20px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .discover-btn-genz:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        /* Scrollbar styling */
        .friends-scroll-genz::-webkit-scrollbar {
          width: 4px;
        }

        .friends-scroll-genz::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
        }

        .friends-scroll-genz::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.3);
          border-radius: 2px;
        }

        .friends-scroll-genz::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.5);
        }
      `}</style>
    </div>
  );
};

export default FriendList;