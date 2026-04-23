import React from "react";

const ProfileStats = ({ user }) => {
  return (
    <div className="profile-stats">
      <div className="stat-item">
        <span className="stat-value">{user.postsCount}</span>
        <span className="stat-label">posts</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{user.followersCount}</span>
        <span className="stat-label">followers</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{user.followingCount}</span>
        <span className="stat-label">following</span>
      </div>
    </div>
  );
};

export default ProfileStats;