import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; 
import axios from 'axios';
import { getProfileUserData } from '../services/profileService';
const UserProfilePage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const currentUserId = currentUser?.userId;
  useEffect(() => {
    const fetchProfile = async (userId, currentUserId) => { 
        const response = await getProfileUserData()
        console.log(response, 'response')
    };
    fetchProfile();
  }, [userId, currentUserId]);
  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!user) return <div className="text-center mt-10">User not found</div>;
  const isPrivate = user.isPrivate && !user.followers.includes(currentUserId);
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-4">
        <img
          src={user.profilePicture}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover"
        />
        <div>
          <h2 className="text-2xl font-semibold">@{user.userName}</h2>
          <p className="text-sm text-gray-500">{user.bio || "No bio yet."}</p>
          <p className="text-sm text-gray-400">{user.emailVerified ? "✅ Verified" : "❌ Not verified"}</p>
        </div>
      </div>
      {isPrivate ? (
        <div className="mt-10 text-center text-red-500">
          This profile is private. Follow to see posts.
        </div>
      ) : (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Posts</h3>
          {posts.length === 0 ? (
            <p className="text-gray-500">No posts yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {posts.map((post) => (
                <div key={post._id} className="border rounded p-2">
                  <img src={post.imageUrl} alt="Post" className="w-full h-48 object-cover rounded" />
                  <p className="mt-2 text-sm">{post.caption}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default UserProfilePage;
