import React from "react";
import { FaCamera } from "react-icons/fa";

const PostGrid = ({ posts }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="no-posts">
        <span className="no-posts-icon"><FaCamera /></span>
        <div className="no-posts-title">No posts yet</div>
        <p className="no-posts-subtext">Posts shared by this account will show up here.</p>
      </div>
    );
  }

  return (
    <div className="post-grid">
      {posts.map((post) => (
        <div key={post._id} className="grid-item">
          <img src={post.mediaUrl} alt="Post content" loading="lazy" />
        </div>
      ))}
    </div>
  );
};

export default PostGrid;