import React from "react";

const ProfileActions = ({ user }) => {
  if (user.isOwnProfile) {
    return <button className="btn-edit">Edit Profile</button>;
  }

  return (
   // Example snippet
<button className={`btn-action ${user.isFollowing ? "btn-unfollow" : "btn-follow"}`}>
  {user.isFollowing ? (
    <>✓ Following</>
  ) : (
    "Follow"
  )}
</button>
  );
};

export default ProfileActions;