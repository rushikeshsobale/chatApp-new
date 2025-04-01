import React from 'react';
import { FaUserPlus, FaCheckCircle } from 'react-icons/fa';

const SuggestedUser = ({ user }) => {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3">
      <div className="d-flex align-items-center">
        <img
          src={user.avatar}
          alt={user.username}
          className="rounded-circle me-3"
          style={{ width: '40px', height: '40px', objectFit: 'cover' }}
        />
        <div>
          <div className="d-flex align-items-center">
            <span className="fw-bold me-1">{user.username}</span>
            {user.isVerified && <FaCheckCircle className="text-primary" size={12} />}
          </div>
          <small className="text-muted">{user.followers} followers</small>
        </div>
      </div>
      <button className="btn btn-sm btn-outline-primary rounded-pill">
        <FaUserPlus className="me-1" /> Follow
      </button>
    </div>
  );
};

export default SuggestedUser;