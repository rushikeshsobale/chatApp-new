import React from "react";

const PostGrid = ({ posts }) => {
  if (!posts || posts.length === 0) {
    return <div className="no-posts text-center fs-6 mt-3">No posts yet.</div>;
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