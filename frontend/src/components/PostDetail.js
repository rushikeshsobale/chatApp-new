import React, { useState, useEffect } from 'react';
import { FaThumbsUp, FaRegThumbsUp } from 'react-icons/fa'; // Like icons from react-icons
import '../css/postDetail.css';
import LikesCommentsPreview from './LikesCommentsPreview';
import { useSelector } from 'react-redux';
import { Spinner } from 'react-bootstrap'; // For loading spinner

const PostDetail = ({ postId, onClose, handleNextPost, handlePrevPost }) => {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState([]);
  const [hasLiked, setHasLiked] = useState(false);
  const userId = useSelector(state => state.auth.userId.userId);
  const [flag, setFlag] = useState(false);
  const [loading, setLoading] = useState(true); // For loading state
  const [darkMode, setDarkMode] = useState(false); // For dark mode toggle

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true); // Start loading when fetching
      try {
        const response = await fetch(`https://api.makethechange.in/api/getPost/${postId}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data.post);
          setComments(data.post.comments || []);
          setLikes(data.post.likes || []);
          const userHasLiked = data.post.likes.some((like) => like.userId._id === userId);
          setHasLiked(userHasLiked);
        } else {
          console.error('Failed to fetch post:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false); // Stop loading once data is fetched
      }
    };
    fetchPost();
  }, [postId, flag]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return; // Prevent empty comments
    try {
      const response = await fetch(`https://api.makethechange.in/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment, userId }),
      });
      if (response.ok) {
        const data = await response.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment('');
        setFlag(!flag);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleLike = async () => {
    if (hasLiked) return;
    try {
      const response = await fetch(`https://api.makethechange.in/api/likePost/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        const data = await response.json();
        setLikes(data.likes);
        setHasLiked(true);
        setFlag(!flag);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const toggleDarkMode = () => setDarkMode(!darkMode); // Toggle dark mode

  if (loading) {
    return (
      <div className="spinner-container">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!post) return <p>Post not found.</p>;

  return (
    <>
      <div className={`overlay ${darkMode ? 'dark-mode' : ''}`} onClick={onClose}></div> {/* Overlay for blur */}
      <div className={`post-detail-container col-lg-6 m-auto${darkMode ? 'dark-mode' : ''}`} >
        <div className="post-detail">
          <button style={{ fontSize: '12px' }} onClick={onClose} className="btn btn-secondary">X</button>

          {post.media && /\.(mp4|webm|ogg)$/i.test(post.media) ? (
            <video src={post.media} controls className="img-fluid post-video" />
          ) : (
            <img src={post.media} alt="Post Media" className=" post-image" />
          )}

          <h3 className="post-text">{post.text}</h3>
          
          <div className="d-flex mb-3">
            <div className="likes">
              <LikesCommentsPreview
                handleLike={handleLike}
                type="likes"
                users={post.likes.map(like => like.userId)}
                hasLiked={hasLiked}
              />
            </div>
            <div className="comments">
              <LikesCommentsPreview
                type="comments"
                users={post.comments.map(comment => comment.userId)}
                comments={comments}
              />
            </div>
          </div>

          <div className="comment-section">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="comment-input"
            />
            <button onClick={handleAddComment} className="btn btn-primary mt-2">Add Comment</button>
          </div>

          <div className="d-flex justify-content-between mt-3">
            <button onClick={handlePrevPost} className="btn btn-secondary">Previous</button>
            <button onClick={handleNextPost} className="btn btn-secondary">Next</button>
          </div>
          
          {/* Dark mode toggle button */}
          <button className="btn btn-light mt-3" onClick={toggleDarkMode}>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    </>
  );
};

export default PostDetail;
