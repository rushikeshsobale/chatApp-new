import React from "react";
import "../css/Chat.css";

const FriendList = ({ friends, activeUsers, msgCounts, selectedFriend, handleFriendSelect }) => {
  return (
    <div className="friend-list-container">
      <div className="friend-list-header">
        <h3>Messages</h3>
        <div className="active-count">
          {activeUsers.length} active
        </div>
      </div>
      
      <div className="friends-scroll-container">
        {friends
          .filter((friend) => friend?.isFriend === "friends")
          .map((friend, index) => {
            const isActive = activeUsers.some((user) => user.userId === friend?.friendId?._id);
            const unreadCount = msgCounts[friend?.friendId?._id] || 0;
            
            return (
              <div
                key={index}
                onClick={() => handleFriendSelect(friend)}
                className={`friend-item ${selectedFriend === friend ? "selected" : ""}`}
              >
                <div className="friend-avatar">
                  <div className={`avatar-container ${isActive ? "active" : ""}`}>
                    <img 
                      src={friend?.friendId?.profilePicture || "https://cdn.pixabay.com/photo/2021/09/20/03/24/skeleton-6639547_1280.png"} 
                      alt="Profile" 
                      className="profile-image"
                    />
                  </div>
                </div>

                <div className="friend-details">
                  <div className="friend-name">
                    {friend?.friendId?.firstName} {friend?.friendId?.lastName}
                  </div>
                  <div className="friend-status">
                    {isActive ? (
                      <span className="active-indicator">Online</span>
                    ) : (
                      <span className="last-seen">Last seen recently</span>
                    )}
                  </div>
                </div>

                {unreadCount > 0 && (
                  <div className="unread-badge">
                    {unreadCount}
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