import React from 'react';

const ProfileDisplay = ({ profilePicture, userName }) => (
  <div className="mb-1 d-flex justify-content-center">
    <img
      src={profilePicture || 'https://cdn.pixabay.com/photo/2021/09/20/03/24/skeleton-6639547_1280.png'}
      alt={`${userName}'s Profile`} // Renamed to 'userName'
      className="profile-image mx-3"
      style={{ borderRadius: '50%', border: '2px solid #fff' }}
    />
    <h5 className="mx-2 my-auto">{userName}</h5> {/* Renamed to 'userName' */}
  </div>
);

export default ProfileDisplay;
