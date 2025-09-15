import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Spinner, Alert } from 'react-bootstrap';
import moment from 'moment';
import { FaHeart, FaRegHeart, FaComment, FaBookmark, FaRegBookmark, FaEllipsisH } from 'react-icons/fa';
import { FiSend } from 'react-icons/fi';
import '../css/postFeed.css';
import { getSavedPost } from '../services/profileService';
const SavedPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;
 
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const userId = currentUser?._id || currentUser?.userId;

  useEffect(() => {
    if (!userId) {
      setError('Please login to view saved posts');
      setLoading(false);
      return;
    }
    fetchSavedPosts();
  }, [userId]);

  const fetchSavedPosts = async () => {
    try {
      const response = await getSavedPost(userId)
      if (response.success) {
        setPosts(response.posts);
        setSavedPosts(response.posts.map(post => post._id));
      } else {
        throw new Error(response.message || 'Failed to fetch saved posts');
      }
    } catch (error) {
      setError(error.response?.message || error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{
   console.log(posts.length, 'postId')
  },[posts])
  const handlePostClick = (postId) => {
    navigate(`/postDetails/${postId}`);
  };
  const handleUserClick = (id, e) => {
    e.stopPropagation();
    navigate(`/ProfilePage/${id}`);
  };
  const handleLike = async (postId, e) => {
    e.stopPropagation();
    if (!userId) {
      setError('Please login to like posts');
      return;
    }

    setIsLiking(true);
    try {
      const response = await axios.post(`${apiUrl}/post/likePost/${postId}`, {
        userId: userId
      });

      if (response.data.success) {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { ...post, likes: response.data.likes }
              : post
          )
        );
        setLikedPosts(prev => 
          prev.includes(postId) 
            ? prev.filter(id => id !== postId) 
            : [...prev, postId]
        );
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error liking post');
    } finally {
      setIsLiking(false);
    }
  };

  
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <Alert variant="danger" className="text-center">{error}</Alert>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <h3>No Saved Posts</h3>
          <p>Posts you save will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="post-feed-container">
      {/* Header */}
      

      {/* Posts Grid */}
      <div className="posts-grid">
        {posts?.map((post) => (
          <div 
            key={post._id} 
            className="post-card"
            onClick={() => handlePostClick(post._id)}
          >
            {/* Post Header */}
            <div className="post-header">
              <div 
                className="user-info"
                onClick={(e) => handleUserClick(post.userId._id, e)}
              >
                <img
                  src={post.userId.profilePicture || "https://via.placeholder.com/40"}
                  alt="User"
                  className="user-avatar"
                />
                <div className="user-details">
                  <h6 className="username">{post.userId.userName}</h6>
                  <small className="post-time">
                    {moment(post?.createdAt).fromNow()}
                  </small>
                </div>
              </div>
              <button className="more-options">
                <FaEllipsisH />
              </button>
            </div>
            {/* Post Media */}
            <div className="post-media">
              <div
                className="media-content"
                style={{
                  backgroundImage: `url(${post.media})`,
                }}
              ></div>
            </div>
            {/* Post Actions */}
            <div className="post-actions">
              
              {/* <button 
                className="save-button"
                onClick={(e) => toggleSave(post._id, e)}
                disabled={isSaving}
              >
                <FaBookmark className="saved" />
              </button> */}
            </div>
            {/* Post Info */}
          
          </div>
        ))}
      </div>
    </div>
  );
};
export default SavedPosts; 