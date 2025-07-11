import React from "react";
import "../css/Chat.css";

const FriendList = ({ 
  friends, 
  activeUsers, 
  msgCounts, 
  unseenMessages,    // ⬅️ new prop
  selectedFriend, 
  handleFriendSelect 
}) => {

  const getLastUnseenMessage = (friendId) => {
 
    const messages = unseenMessages
      ?.filter(msg => msg.senderId == friendId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return messages || null;
  };

  return (
    <div className="friend-list-container">
      <div className="friend-list-header">
        <h3>Messages</h3>
        <div className="active-count">
          {activeUsers.length} active
        </div>
      </div>

      <div className="friends-scroll-container">
        {friends?.map((friend, index) => {
          const isActive = activeUsers.some(user => user === friend?._id);
          
          const lastUnseenMsg = getLastUnseenMessage(friend._id);
          
          return (
            <div
              key={index}
              onClick={() => handleFriendSelect(friend, lastUnseenMsg)}
              className={`friend-item ${selectedFriend === friend ? "selected" : ""}`}
            >
              <div className="friend-avatar">
                <div className={`avatar-container ${isActive ? "active" : ""}`}>
                  <img
                    src={friend?.profilePicture || "https://cdn.pixabay.com/photo/2021/09/20/03/24/skeleton-6639547_1280.png"}
                    alt="Profile"
                    className="profile-image"
                  />
                </div>
              </div>

              <div className="friend-details mx-3">
                <div className="friend-name">
                  {friend?.userName}
                </div>
                <div className="friend-status">
                  {isActive ? (
                    <span className="active-indicator"></span>
                  ) : (
                    <span className="last-seen">Last seen recently</span>
                  )}
                </div>
                {lastUnseenMsg && (
                  <div className="last-message text-truncate" style={{ maxWidth: '150px', color: '#666', fontSize: '0.85rem' }}>
                    {lastUnseenMsg[0]?.content}
                  </div>
                )}
              </div>

              {lastUnseenMsg.length > 0 && (
                <div className="unread-badge">
                  {lastUnseenMsg.length}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FriendList;
