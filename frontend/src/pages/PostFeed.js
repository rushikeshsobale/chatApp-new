import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import PostDetail from '../components/PostDetail';
import '../css/postFeed.css';
import moment from "moment";
import { FaHeart, FaRegHeart, FaComment, FaPaperPlane, FaBookmark, FaRegBookmark, FaEllipsisH } from 'react-icons/fa';
import { FiSend } from 'react-icons/fi';

const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const loaderRef = useRef(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const fetchPosts = async (pageNumber) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/getPosts?page=${pageNumber}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPosts((prevPosts) => [...prevPosts, ...data.posts]);
          setLoading(false);
        } else {
          console.error('Failed to fetch posts:', data.message);
          setLoading(false);
        }
      } else {
        console.error('Failed to fetch posts:', response.statusText);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setLoading(false);
    }
  };

  const observer = useRef(
    new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      { threshold: 1 }
    )
  );

  useEffect(() => {
    if (loaderRef.current) {
      observer.current.observe(loaderRef.current);
    }
    return () => {
      if (loaderRef.current) {
        observer.current.unobserve(loaderRef.current);
      }
    };
  }, []);

  const handlePostClick = (postId) => {
    navigate(`/postDetails/${postId}`);
  };

  const handleUserClick = (id, e) => {
    e.stopPropagation();
    navigate(`/ProfilePage/${id}`);
  };

  const toggleLike = (postId, e) => {
    e.stopPropagation();
    setLikedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId) 
        : [...prev, postId]
    );
    // Here you would also make an API call to update the like status
  };

  const toggleSave = (postId, e) => {
    e.stopPropagation();
    setSavedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId) 
        : [...prev, postId]
    );
    // Here you would also make an API call to update the save status
  };

  return (
    <div className="post-feed-container">
      {/* Header */}
      <div className="post-feed-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1 className="feed-title">Posts</h1>
        <div className="header-spacer"></div>
      </div>

      {/* Post Detail Modal */}
      {selectedPostId && (
        <div className="post-detail-modal">
          <PostDetail
            postId={selectedPostId}
            onClose={() => setSelectedPostId(null)}
          />
        </div>
      )}

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
                  <h6 className="username">{post.userId.firstName}</h6>
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
              <div className="left-actions">
                <button 
                  className="action-button"
                  onClick={(e) => toggleLike(post._id, e)}
                >
                  {likedPosts.includes(post._id) ? (
                    <FaHeart className="liked" />
                  ) : (
                    <FaRegHeart />
                  )}
                </button>
                <button className="action-button">
                  <FaComment />
                </button>
                <button className="action-button">
                  <FiSend />
                </button>
              </div>
              <button 
                className="save-button"
                onClick={(e) => toggleSave(post._id, e)}
              >
                {savedPosts.includes(post._id) ? (
                  <FaBookmark />
                ) : (
                  <FaRegBookmark />
                )}
              </button>
            </div>

            {/* Post Info */}
            <div className="post-info">
              <p className="likes-count">
                {post.likes?.length > 0 
                  ? `${post.likes.length.toLocaleString()} likes` 
                  : "Be the first to like this"}
              </p>
              <p className="caption">
                <span className="caption-username">{post.userId.firstName}</span>
                {post.text}
              </p>
              {post.comments?.length > 0 && (
                <p className="view-comments">
                  View all {post.comments.length} comments
                </p>
              )}
            </div>

            {/* Add Comment */}
            <div className="add-comment">
              <input
                type="text"
                className="comment-input"
                placeholder="Add a comment..."
                onClick={(e) => e.stopPropagation()}
              />
              <button className="post-button">Post</button>
            </div>
          </div>
        ))}
      </div>

      {/* Loader */}
      {loading && (
        <div className="loader" ref={loaderRef}>
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default PostFeed;