import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import PostDetail from '../components/PostDetail';
import '../css/postFeed.css';
import moment from "moment";
const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const loaderRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
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

  const handleUserClick = (id) => {
    navigate(`/ProfilePage/${id}`);
  };

  return (
    <div className=" p-0 col-lg:p-5   container" style={{ overflow: 'scroll', height: '100vh' }}>
      <div className="d-flex  align-items-center justify-content-between border-bottom ">
        {/* Back Button */}
        <button className="btn btn-dark border-0" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left fs-5"></i>
        </button>

        {/* Title */}
        <h1 className="flex-grow-1 text-white text-center m-0">Posts</h1>

        {/* Spacer to balance alignment */}
        <div style={{ width: "40px" }}></div>
      </div>

      {selectedPostId && (
        <div className='p-fixed'>
          <PostDetail
            postId={selectedPostId}
            onClose={() => setSelectedPostId(null)}
          />
        </div>
      )}


      {/* Grid Layout for Posts */}
      <div className="">
        {posts?.map((post) => (
          <div className="col-md-12 m-auto">
            <div className=" bg-none text-white shadow-sm mb-1" onClick={() => handlePostClick(post._id)}>
              {/* Post Header */}
              <div className="card-header bg-none d-flex align-items-center justify-content-between p-1 border-bottom">
                <div className="d-flex align-items-center">
                  <img
                    src="https://via.placeholder.com/40"
                    alt="User"
                    className="rounded-circle me-2"
                    style={{ width: "40px", height: "40px" }}
                  />
                  <div>
                    <h6 className="mb-0 fw-bold text-white" onClick={() => handleUserClick(post.userId._id)}
                    >{post.userId.firstName}</h6>
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
              <div className="post-image">
                <div
                  className="card-img-top"
                  style={{
                    height: "70vh",
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

        ))}
      </div>


      {/* Loader */}
      {loading && (
        <div className="text-center mt-4" ref={loaderRef}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostFeed;
