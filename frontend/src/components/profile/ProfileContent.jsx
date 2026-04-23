import React from "react";
import PostGrid from "./PostGrid";
import PostFeed from "./PostFeed";

const ProfileContent = ({ activeTab, posts }) => {
  if (activeTab === "grid") {
    return <PostGrid posts={posts} />;
  }

  return <PostFeed posts={posts} />;
};

export default ProfileContent;