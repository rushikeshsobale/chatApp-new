import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import PostDetail from '../components/PostDetail';
const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const loaderRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
   const [selectedPostId, setSelectedPostId] = useState(null);
  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const fetchPosts = async (pageNumber) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5500/api/getPosts?page=${pageNumber}&limit=10`);
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
    setSelectedPostId(postId);
  };

  return (
    <div className=" mt-1">
      <h2 className="text-center mb-4">Explore </h2>
      {selectedPostId && (
        <div className='p-fixed'>
        <PostDetail
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
        </div>
      )}
      
      {/* Grid Layout for Posts */}
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {posts?.map((post) => (
          <div key={post._id} className="col"  onClick={() => handlePostClick(post._id)}>
            <div className="card shadow-lg rounded border-0 h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="post-meta">
                    <h5 className="card-title text-primary">{post.title}</h5>
                    <small className="text-muted">{new Date(post.createdAt).toLocaleString()}</small>
                  </div>
                  <div>
                    <span className="badge bg-success">{post.likes.length} Likes</span>
                    <span className="badge bg-info ms-2">{post.comments.length} Comments</span>
                  </div>
                </div>

                {/* Media: Image or Video */}
                <div className="media-container mb-3">
                  {post.media && post.media.endsWith('.mp4') ? (
                    <video controls className="img-fluid rounded" style={{ maxHeight: '300px', width: '100%', objectFit: 'cover' }}>
                      <source src={post.media} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img src={post.media} alt="Post media" className="img-fluid rounded" style={{ maxHeight: '300px', width: '100%', objectFit: 'cover' }} />
                  )}
                </div>

                <p className="card-text">{post.text}</p>

                <div className="d-flex justify-content-between">
                  <button className="btn btn-outline-danger btn-sm d-flex align-items-center">
                    <i className="bi bi-heart-fill me-1"></i> Like
                  </button>
                  <button className="btn btn-outline-secondary btn-sm d-flex align-items-center">
                    <i className="bi bi-chat-left-dots-fill me-1"></i> Comment
                  </button>
                </div>
              </div>
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
