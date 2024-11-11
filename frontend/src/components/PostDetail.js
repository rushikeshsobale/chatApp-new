// PostDetail.js
import React, { useState, useEffect } from 'react';
import { FaThumbsUp, FaRegThumbsUp } from 'react-icons/fa'; // Like icons from react-icons
import '../css/postDetail.css';
import LikesCommentsPreview from './LikesCommentsPreview';
import { useSelector } from 'react-redux';

const PostDetail = ({ postId, onClose, currentIndex, onNext, onPrevious, handleNextPost, handlePrevPost }) => {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState([]);
  const [hasLiked, setHasLiked] = useState(false);
  const userId = useSelector(state => state.auth.userId.userId);
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`http://localhost:5500/api/getPost/${postId}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data.post);
          setComments(data.post.comments || []);
          setLikes(data.post.likes || []);
          // Check if the user has already liked the post
          const userHasLiked = data.post.likes.some((like) => like.userId._id === userId);
          setHasLiked(userHasLiked);
        } else {
          console.error('Failed to fetch post:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      }
    };
    fetchPost();
  }, [postId, flag]);

  const handleAddComment = async () => {
    try {
      const response = await fetch(`http://localhost:5500/api/posts/${postId}/comments`, {
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
    console.log('this got liked')
    if (hasLiked) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5500/api/likePost/${postId}`, {
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

  if (!post) return <p>Loading post...</p>;

  return (
    <div className="post-detail-container bg-none" style={{ marginTop: '-200px', background: 'none' }}>
      <div className="post-detail">
        <button style={{ fontSize: '12px' }} onClick={onClose} className="btn btn-secondary">X</button>
        {post.media && (
          /\.(mp4|webm|ogg)$/i.test(post.media) ? (
            <video src={post.media} controls className="img-fluid post-video" />
          ) : (
            <img src={post.media} alt="Post Media" className="img-fluid post-image" />
          )
        )}
        <h3 style={{ fontSize: '13px' }}>{post.text}</h3>
        <div className='d-flex'>
          <div className="likes">
            <LikesCommentsPreview handleLike={handleLike} type="likes" users={post.likes.map(like => like.userId)} hasLiked={hasLiked} />
          </div>
          <div className="comments">
            <LikesCommentsPreview type="comments" users={post.comments.map(comment => comment.userId)} comments={comments} />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="d-flex justify-content-between mt-3">
          <button onClick={handlePrevPost} className="btn btn-secondary">Previous</button>
          <button onClick={handleNextPost} className="btn btn-secondary">Next</button>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
