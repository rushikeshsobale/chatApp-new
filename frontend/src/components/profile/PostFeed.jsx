import React from "react";

const PostFeed = ({ posts }) => {
  return (
    <div>
      {posts.map((post) => (
        <div key={post._id} style={{ marginBottom: "20px" }}>
          <img src={post.mediaUrl} alt="" width="100%" />
          <p>{post.caption}</p>
          <div>
            ❤️ {post.likesCount} | 💬 {post.commentsCount}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostFeed;