import React from "react";

const ProfileBio = ({ user }) => {
  return (
    <div className="profile-bio">
    
      <p className="profile-bio-text">{user.bio}</p>
    </div>
  );
};

export default ProfileBio;