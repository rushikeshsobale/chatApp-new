import React from "react";
import "../css/Chat.css";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
const FriendList = ({ 
  friends, 
  activeUsers, 
  msgCounts, 
  unseenMessages,    // ⬅️ new prop
  selectedFriend, 
  handleFriendSelect 
}) => {
  console.log(activeUsers, 'activeUsers')
  const navigate = useNavigate()
  const getLastUnseenMessage = (friendId) => {
    const messages = unseenMessages
      ?.filter(msg => msg.senderId == friendId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return messages || null;
  };
  const handleBack = () => {
    navigate(-1); // Go back one step in history
  };
  return (
    <div className="friend-list-container overflow-auto" >
      <div className="friend-list-header" style={{backGround:'antiquewhite'}}>
      <button className="back-button " onClick={handleBack}>
          <FaArrowLeft />
        </button>
        <h3 className="m-auto w-100">Messages</h3>
      </div>

      <div className="friends-scroll-container">
        {friends?.map((friend, index) => {
          const isActive = activeUsers.some(user => user._id || user === friend?._id);
          
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
                    <span className=""></span>
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
