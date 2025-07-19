import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Button, Form, Alert } from 'react-bootstrap';
import moment from 'moment';
import axios from 'axios';
import { createNotification } from '../services/notificationService';
import { UserContext } from '../contexts/UserContext';
const PostDetail = () => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;
  const {socket} = useContext(UserContext)
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const userId = currentUser?._id || currentUser?.userId;

  useEffect(() => {
    const fetchPostDetails = async () => {
      try {
        const response = await axios.get(`${apiUrl}/post/getPost/${postId}`);
        const { data } = response;
        if (data.success) {
          setPost(data.post);
          setLikes(data.post.likes || []);
          setComments(data.post.comments || []);
        } else {
          throw new Error('Post not found');
        }
      } catch (error) {
        setError(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetails();
  }, [postId]);

  const handleLike = async () => {
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
        setLikes(response.data.likes);
        createNotification({
          recipient: post.userId._id,
          sender: userId,
          type: 'like',
          postId: postId,
          message: `${currentUser?.userName || 'Someone'} liked your post`
        });
        socket.emit('emit_notification', {
          recipient: post.userId._id,
          sender: userId,
          type: 'like',
          postId: postId,
          message: `${currentUser?.userName || 'Someone'} liked your post`
        })
          
        
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error liking post');
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !userId) {
      setError('Please login to comment');
      return;
    }

    setIsCommenting(true);
    try {
      const response = await axios.post(`${apiUrl}/post/posts/${postId}/comments`, {
        userId: userId,
        text: newComment.trim()
      });

      if (response.data.success) {
        setComments(response.data.comments);
        setNewComment('');
        createNotification({
          recipient: post.userId._id,
          sender: userId,
          type: 'comment',
          postId: postId,
          message: `${currentUser?.userName || 'Someone'} commented on your post: "${newComment.trim()}"`
        });

        socket.emit('emit_notification', {
          recipient: post.userId._id,
          sender: userId,
          type: 'comment',
          postId: postId,
          message: `${currentUser?.userName || 'Someone'} commented on your post: "${newComment.trim()}"`
        })
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error adding comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const hasLiked = likes.some(like => like.userId._id === userId);

  if (loading) {
    return <Spinner animation="border" variant="light" className="d-block mx-auto mt-5" />;
  }

  if (error) {
    return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>;
  }

  return (
    <div className="container mt-4" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="bg-none text-white shadow-sm mb-1">
            {/* Post Header */}
            <div className="card-header bg-none d-flex align-items-center justify-content-between p-1 border-bottom">
              <button className="btn btn-light border-0 me-2" onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left fs-5"></i>
              </button>
              <div className="d-flex align-items-center">
                <img
                  src={post.userId.profilePicture || "https://via.placeholder.com/40"}
                  alt="User"
                  className="rounded-circle me-3"
                  style={{ width: "45px", height: "45px", objectFit: "cover" }}
                />
                <div>
                  <h6 className="mb-0 fw-bold text-white">{post?.userId.userName}</h6>
                  <small className="text-white">
                    {moment(post?.createdAt).fromNow()}
                  </small>
                </div>
              </div>
              <button className="btn btn-light border-0">
                <i className="bi bi-three-dots"></i>
              </button>
            </div>

            {/* Post Image */}
            <div className="post-imag">
              <div
                className="card-img-top"
                style={{
                  height: '600px',
                  backgroundImage: `url(${post.media})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></div>
            </div>

            {/* Post Actions */}
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  {/* Like Button */}
                  <button 
                    className={`btn p-0 me-2 ${hasLiked ? 'text-danger' : 'text-light'}`} 
                    onClick={handleLike}
                    disabled={isLiking}
                  >
                    <i className={`bi bi-heart${hasLiked ? '-fill' : ''} fs-5`}></i>
                  </button>
                  {/* Comment Button */}
                  <button className="btn p-0 me-2 text-light">
                    <i className="bi bi-chat fs-5"></i>
                  </button>
                  {/* Share Button */}
                  <button className="btn p-0 text-light">
                    <i className="bi bi-send fs-5"></i>
                  </button>
                </div>
                <button className="btn p-0 text-light">
                  <i className="bi bi-bookmark fs-5"></i>
                </button>
              </div>

              {/* Post Likes & Caption */}
              <p className="mt-2 mb-1 fw-bold">
                {likes.length > 0 ? `${likes.length.toLocaleString()} likes` : "Be the first to like this"}
              </p>
              <p className="mb-1">
                {post?.text}
              </p>

              {/* Comments Section */}
              <div className="comments-section mt-3">
                {comments.length > 0 && (
                  <>
                    <p className="text-white small m-0 mb-2">
                      View all {comments.length} comments
                    </p>
                    {comments.slice(0, 3).map((comment, index) => (
                      <div key={index} className="comment mb-2">
                        <span className="fw-bold me-2">{comment.userId.userName}</span>
                        <span>{comment.text}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Post Comment Box */}
            <div className="card-footer bg-none border-top">
              <Form onSubmit={handleCommentSubmit} className="d-flex align-items-center">
                <Form.Control
                  type="text"
                  placeholder="Add a comment..."
                  className="me-2 bg-dark text-white border-0 rounded-pill"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isCommenting}
                />
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="rounded-pill btn-sm"
                  disabled={isCommenting || !newComment.trim()}
                >
                  {isCommenting ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    'Post'
                  )}
                </Button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;