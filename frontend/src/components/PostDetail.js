import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Card, ListGroup, Image, Button, Form, Alert } from 'react-bootstrap';
import moment from 'moment';

const PostDetail = () => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchPostDetails = async () => {
      try {
        const response = await fetch(`${apiUrl}/getPost/${postId}`);
        const data = await response.json();

        if (data.success) {
          setPost(data.post);
          setLikes(data.post.likes || []);
          setComments(data.post.comments || []);
        } else {
          throw new Error('Post not found');
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetails();
  }, [postId]);

  const handleLike = () => {
    const newLikes = [...likes, { userId: { firstName: 'You', lastName: '', profilePicture: null } }];
    setLikes(newLikes);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const newCommentData = {
      userId: { firstName: 'You', lastName: '', profilePicture: null },
      text: newComment,
      createdAt: new Date().toISOString(),
    };

    setComments([...comments, newCommentData]);
    setNewComment('');
  };

  if (loading) {
    return <Spinner animation="border" variant="light" className="d-block mx-auto mt-5" />;
  }

  if (error) {
    return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>;
  }

  return (
    <div className="w:lg-50 d-flex justify-content-center mt-4" style={{ height: '90vh', overflow: 'scroll', scrollbarWidth: 'none' }}>
      <div className="w-100">
        <div className=" bg-none text-white shadow-sm mb-1">
          {/* Post Header */}
          <div className="card-header bg-none d-flex align-items-center justify-content-between p-1 border-bottom">
            <button className="btn btn-light border-0 me-2" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left fs-5"></i>
            </button>
            <div className="d-flex align-items-center">
              <img
                src="https://via.placeholder.com/40"
                alt="User"
                className="rounded-circle me-2"
                style={{ width: "40px", height: "40px" }}
              />
              <div>
                <h6 className="mb-0 fw-bold text-white">{post?.userId.firstName}</h6>
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
                height: "400px",
                backgroundImage: `url(${post.media})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
          </div>

          {/* Post Actions */}
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                {/* Like Button */}
                <button className="btn p-0 me-2 text-light">
                  <i className="bi bi-heart fs-5"></i>
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
            {/* {post.likes?.map(() => (
                         
                       ))} */}
            {/* Post Likes & Caption */}
            <p className="mt-2 mb-1 fw-bold">
              {post.likes?.length > 0 ? `${post.likes.length.toLocaleString()} likes` : "Be the first to like this"}
            </p>
            <p className="mb-1">
              {post.text}
            </p>

            <p className="text-white small m-0">
              View all {post.comments?.length} comments
            </p>
            <div className="d-flex ">
              {/* <div className="likes">
                             <LikesCommentsPreview
                               // handleLike={handleLike}
                               type="likes"
                               users={post.likes.map(like => like.userId)}
                             // hasLiked={hasLiked}
                             />
                           </div>
                           <div className="comments">
                             <LikesCommentsPreview
                               type="comments"
                               users={post.comments.map(comment => comment.userId)}
                               comments={post.comments}
                             />
                           </div> */}
            </div>
          </div>

          {/* Post Comment Box */}
          {/* <div className="card-footer  border-0">
                         <div className="d-flex align-items-center">
                           <input
                             type="text"
                             className="form-control border-0 bg-dark text-white"
                             placeholder="Add a comment..."
                           />
                           <button className="btn btn-sm text-primary fw-bold">Post</button>
                         </div>
                       </div> */}
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
