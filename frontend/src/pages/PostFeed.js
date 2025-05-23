import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import PostDetail from '../components/PostDetail';
import '../css/postFeed.css';
import moment from "moment";
import { FaHeart, FaRegHeart, FaComment, FaPaperPlane, FaBookmark, FaRegBookmark, FaEllipsisH } from 'react-icons/fa';
import { FiSend } from 'react-icons/fi';
import { Spinner, Alert } from 'react-bootstrap';

const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newComments, setNewComments] = useState({});
  const loaderRef = useRef(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const userId = currentUser?._id || currentUser?.userId;

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const fetchPosts = async (pageNumber) => {
    if (!hasMore || loading) return;

    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/post/getPosts`, {
        params: {
          page: pageNumber,
          limit: 10
        }
      });

      const { data } = response;
      if (data.success) {
        if (data.posts.length === 0) {
          setHasMore(false);
        } else {
          setPosts(prevPosts => [...prevPosts, ...data.posts]);
        }
      } else {
        throw new Error(data.message || 'Failed to fetch posts');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const observer = useRef(
    new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setPage(prevPage => prevPage + 1);
        }
      },
      { threshold: 0.5 }
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
  }, [loading, hasMore]);

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
    }
  };

  const handleComment = async (postId, e) => {
    e.stopPropagation();
    if (!userId) {
      setError('Please login to comment');
      return;
    }

    const commentText = newComments[postId];
    if (!commentText?.trim()) return;

    try {
      const response = await axios.post(`${apiUrl}/post/posts/${postId}/comments`, {
        userId: userId,
        text: commentText.trim()
      });

      if (response.data.success) {
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === postId
              ? { ...post, comments: response.data.comments }
              : post
          )
        );
        setNewComments(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error adding comment');
    }
  };

  const handleCommentChange = (postId, value) => {
    setNewComments(prev => ({ ...prev, [postId]: value }));
  };

  const toggleSave = async (postId, e) => {
    e.stopPropagation();
    if (!userId) {
      setError('Please login to save posts');
      return;
    }

    setIsSaving(true);
    try {
      const isCurrentlySaved = savedPosts.includes(postId);
      const endpoint = isCurrentlySaved ? 'unsavePost' : 'savePost';

      const response = await axios.post(`${apiUrl}/post/${endpoint}/${postId}`, {
        userId: userId
      });

      if (response.data.success) {
        setSavedPosts(prev =>
          isCurrentlySaved
            ? prev.filter(id => id !== postId)
            : [...prev, postId]
        );

        // Update the post in the posts array
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === postId
              ? { ...post, savedBy: response.data.savedBy }
              : post
          )
        );
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error saving post');
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="container mt-4">
        <Alert variant="danger" className="text-center">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="post-feed-container">
      {/* Header */}
      <div className="post-feed-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1 className="feed-title">Recommended Posts</h1>
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
      <div className="d-flex flex-column gap-3 p-2 bg-dark" style={{ height: '90vh', overflow: 'auto' }}>
        {posts.map(post => (
          <div key={post._id} className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <img src={post.userId.profilePicture || "https://via.placeholder.com/40"} alt="User" className="rounded-circle" width="40" height="40" />
                <div>
                  <div className="fw-bold">{post.userId.userName}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {moment(post.createdAt).fromNow()}
                  </div>
                </div>
              </div>
              <button className="btn btn-sm">
                <FaEllipsisH />
              </button>
            </div>
            <img src={post.media} className="card-img-top" alt="Post" style={{ height: '600px' }} />
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <div>
                  <button className="btn btn-sm me-2" onClick={(e) => handleLike(post._id, e)}>
                    {post.likes?.some(like => like.userId._id === userId)
                      ? <FaHeart className="text-danger" />
                      : <FaRegHeart />}
                  </button>
                  <button className="btn btn-sm"><FaComment /></button>
                  <button className="btn btn-sm"><FiSend /></button>
                </div>
                <button className="btn btn-sm" onClick={(e) => toggleSave(post._id, e)} disabled={isSaving}>
                  {post.savedBy?.includes(userId) ? <FaBookmark /> : <FaRegBookmark />}
                </button>
              </div>
              <div className="mb-1 fw-bold">{post.likes?.length || 0} likes</div>
              <div>
                <span className="fw-bold">{post.userId.userName}</span> {post.text}
              </div>
              {post.comments?.length > 0 && (
                <div className="text-muted mt-1">View all {post.comments.length} comments</div>
              )}
            </div>
            <div className="card-footer d-flex">
              <input
                type="text"
                className="form-control form-control-sm me-2"
                placeholder="Add a comment..."
                value={newComments[post._id] || ''}
                onChange={(e) => handleCommentChange(post._id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={(e) => handleComment(post._id, e)}
                disabled={!newComments[post._id]?.trim()}
              >
                Post
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Loader */}
      {loading && (
        <div className="loader" ref={loaderRef}>
          <Spinner animation="border" variant="light" />
        </div>
      )}
    </div>
  );
};

export default PostFeed;