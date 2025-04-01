import React from 'react';
import { FaPlus } from 'react-icons/fa';

const StoryCircle = ({ story, isCurrentUser = false }) => {
  return (
    <div className="position-relative" style={{ width: "80px", cursor: "pointer" }}>
      <div 
        className="rounded-circle overflow-hidden border border-3 border-primary"
        style={{
          width: "80px",
          height: "80px",
          padding: "3px",
          background: "linear-gradient(45deg, #ff4d6d, #c9184a, #ff758f)"
        }}
      >
        <img
          src={story.image || "https://via.placeholder.com/150"}
          alt="Story"
          className="w-100 h-100 rounded-circle object-fit-cover"
          style={{ border: "2px solid white" }}
        />
      </div>
      {isCurrentUser && (
        <div className="position-absolute bottom-0 end-0 bg-primary rounded-circle p-1">
          <FaPlus className="text-white" size={12} />
        </div>
      )}
      <p className="text-center mt-2 small text-truncate" style={{ width: "80px" }}>
        {isCurrentUser ? "Your Story" : story.user?.name || "User"}
      </p>
    </div>
  );
};

export default StoryCircle;