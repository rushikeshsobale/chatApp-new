import React from "react";
import "../css/Chat.css";

const FriendList = ({ friends, activeUsers, msgCounts, selectedFriend, handleFriendSelect }) => (
  <div className="friend-list-container">
    <ul className="p-2">
      {friends
        .filter((friend) => friend?.isFriend === "friends")
        .map((friend, index) => {
          const isActive = activeUsers.some((user) => user.userId === friend?.friendId?._id);
          return (
            <li
              key={index}
              onClick={() => handleFriendSelect(friend)}
              className={`friend-item  ${selectedFriend === friend ? "selected" : ""}`}
            >
              {/* Profile Section */}
              <div className="friend-info d-flex">
                <div className={`avatar ${isActive ? "active-glow" : ""}`}>
                  <img className='profile-pic'  src={friend?.friendId?.profilePicture || "https://cdn.pixabay.com/photo/2021/09/20/03/24/skeleton-6639547_1280.png"} alt="Profile" />
                </div>
                <div className="d-flex items-center">
                  <span className="friend-name ">
                    {friend?.friendId?.firstName} {friend?.friendId?.lastName}
                  </span>
                  {isActive && <small className="active-status">Active now</small>}
                </div>
              </div>

              {/* Message Count Badge */}
              {msgCounts[friend?.friendId?._id] > 0 && (
                <span className="msg-count">{msgCounts[friend?.friendId?._id]}</span>
              )}
            </li>
          );
        })}
    </ul>
  </div>
);

export default FriendList;
