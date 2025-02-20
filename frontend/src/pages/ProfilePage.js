import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaUserEdit, FaUserFriends, FaPlus, FaSearch } from 'react-icons/fa';
import EditProfile from '../components/EditProfile';
import CustomModal from '../components/customModal';
import PostDetail from '../components/PostDetail';
import { useParams, useLocation } from 'react-router-dom';
import ChatComponent from './Chat';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import { IoGridSharp } from "react-icons/io5";
import { PiSlideshowFill } from "react-icons/pi";
import { GiSouthAfricaFlag } from "react-icons/gi";
import { motion } from "framer-motion";
import LikesCommentsPreview from '../components/LikesCommentsPreview';
import "bootstrap-icons/font/bootstrap-icons.css";
import { useNavigate } from 'react-router-dom';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import moment from "moment";



const ProfilePage = () => {
  const [newPost, setNewPost] = useState('');
  const [media, setMedia] = useState(null);
  const { userId } = useParams();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [friends, setFriends] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('token');
  const [activeTab, setActiveTab] = useState("grid");
  const apiUrl = process.env.REACT_APP_API_URL;
  const navigate = useNavigate()
  // Fetch User Data
  const fetchUserData = async () => {
    try {
      const response = await fetch(`${apiUrl}/getUser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setFriends(data.friends);
      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Fetch Profile User Data (If viewing another user's profile)
  const fetchUser2Data = async () => {
    try {
      const response = await fetch(`${apiUrl}/getProfileUser/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setFriends(data.friends);
      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (location.pathname !== '/ProfilePage') {
      fetchUser2Data();
    } else {
      fetchUserData();
    }
  }, [location.pathname]);

  // Fetch Posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (userData) {
        try {
          const response = await fetch(`${apiUrl}/api/posts/${userData._id}`);
          if (response.ok) {
            const data = await response.json();
            setPosts(data.posts);
           
          } else {
            console.error("Failed to fetch posts:", response.statusText);
          }
        } catch (error) {
          console.error("Error fetching posts:", error);
        }
      }
    };
    fetchPosts();
  }, [userData]);


  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMedia({ url, type: file.type });
    }
  };
  const handleRemoveMedia = () => {
    setMedia(null);
  };
  const handleAddPost = (text, media) => {
    const userId = userData._id;
    const formData = new FormData();
    formData.append('text', text);
    formData.append('userId', userId);
    if (media) {
      formData.append('media', media);  // media should be a File object
    }
    fetch(`${apiUrl}/api/posts`, {
      method: 'POST',
      body: formData, // Use formData as the body
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setPosts((prevPosts) => [...prevPosts, data.post]);
          setNewPost('');
          setMedia(null);
          setShowModal(false);
        } else {
          console.error('Failed to post:', data.message);
        }
      })
      .catch(error => {
        console.error('Error adding post:', error);
      });
  };
  const handleSave = async (profileData) => {
    try {
      const userId = userData._id;
      const formData = new FormData();
      formData.append('firstName', profileData.firstName);
      formData.append('lastName', profileData.lastName);
      formData.append('bio', profileData.bio);
      if (profileData.profilePicture) {
        formData.append('profilePicture', profileData.profilePicture);
      }
      const response = await fetch(`${apiUrl}/api/updateUser/${userId}`, {
        method: 'PUT',
        body: formData,
      });
      if (response.ok) {
        const updatedUser = await response.json();

        setUserData(updatedUser?.user);
      } else {
        const errorData = await response.json();
        console.error("Error updating user:", errorData.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error during PUT request:", error);
    }
  };

  const handleNextPost = () => {
    const currentIndex = posts.findIndex((post) => post._id === selectedPostId);
    if (currentIndex !== -1 && currentIndex < posts.length - 1) {
      const nextPost = posts[currentIndex + 1];
      setSelectedPostId(nextPost._id);
    } else {
      console.log("No more posts available.");
    }
  };
  const handlePrevPost = () => {
    const currentIndex = posts.findIndex((post) => post._id === selectedPostId);
    // Check if there is a previous post in the array
    if (currentIndex > 0) {
      const prevPost = posts[currentIndex - 1];
      setSelectedPostId(prevPost._id);
    } else {
      console.log("No previous posts available.");
    }
  };

  const filteredPosts = posts?.filter(post =>
    post?.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFriends = friends?.filter(friend =>
    `${friend?.friendId.firstName} ${friend?.friendId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.friendId.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: "grid", label: "Grid", icon: <IoGridSharp size={24} /> },
    { id: "slideshow", label: "Slideshow", icon: <PiSlideshowFill size={24} /> },
    { id: "saved", label: "Saved", icon: <GiSouthAfricaFlag size={24} /> },
  ];
  const handlePostClick = (postId) => {
    navigate(`/postDetails/${postId}`);
  };

  return (
    <div className="profile-page  col-lg-9  m-auto justify-content-around " style={{ fontFamily: 'Poppins, sans-serif', overflow: 'scroll', height: '100vh' }}>
      {/* Header Section */}
      {userData ? (
        <div className="profile-header text-center py-3 d-flex flex-column flex-md-row align-items-center justify-content-around" style={{ color: '#fff', background:'crimson' }}>
          <div className="d-flex align-items-center text-md-start text-center gap-3">
            <img
              src={userData.profilePicture || 'https://via.placeholder.com/150'}
              alt="Profile"
              className="rounded-circle shadow"
              style={{ width: '70px', height: '70px', border: '3px solid white' }}
            />
            <div>
              <h1 className="mb-1" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {userData.firstName} {userData.lastName}
              </h1>
              <p className="mb-0" style={{ fontSize: '1rem' }}>
                {userData.bio || 'This user has no bio yet.'}
              </p>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="mt-3 mt-md-0 d-flex  gap-3">
            <button
              className="btn btn-light shadow-sm btn-sm col-sm-5 col-lg-10"
              style={{ borderRadius: '30px' }}
              onClick={() => setShowModal(true)}
            >
              <FaPlus className="me-2" /> Create Post
            </button>
            <button
              className="btn btn-outline-light shadow-sm btn-sm col-sm-5 col-lg-10"
              style={{ borderRadius: '30px' }}
            >
              <FaUserEdit className="me-2" /> Edit Profile
            </button>
          </div>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
      <div className=''>
        {/* Search Bar for Posts and Friends */}
        {/* <div className="d-flex  mb-3 col-lg-4 col-12">
        <input
          type="text"
          className="form-control "
          placeholder="Search posts or friends..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-outline-light d-md-inline-flex ms-2">
          <FaSearch />
        </button>
      </div> */}
        <div className="d-flex border-bottom p-2 justify-content-around bg-white shadow-sm">
          {[
            { id: "grid", icon: <IoGridSharp size={24} />, label: "Grid" },
            { id: "slideshow", icon: <PiSlideshowFill size={24} />, label: "Slideshow" },
            { id: "saved", icon: <GiSouthAfricaFlag size={24} />, label: "Saved" }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`flex flex-column align-items-center text-secondary position-relative border-0 bg-transparent p-2 
        ${activeTab === tab.id ? "text-dark fw-bold" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span className="span text-sm">{tab.label}</span>
              {activeTab === tab.id && (
                <div
                  className="position-absolute w-100"
                  style={{
                    height: "3px",
                    backgroundColor: "black",
                    bottom: "-2px",
                    left: 0,
                    transition: "width 0.3s ease-in-out"
                  }}
                ></div>
              )}
            </button>
          ))}
        </div>
        {/* Posts Section */}
        {activeTab == 'grid' &&
          <div className="posts-section">
            <div className="row ">
              {filteredPosts.map((post) => (
                <div key={post._id} className="col-lg-4 col-4 p-1 mb-4">
                  <div
                    className="bg-dark shadow-lg"
                    style={{
                      cursor: "pointer",
                      overflow: "hidden",
                      transition: "transform 0.3s ease-in-out",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onClick={() => handlePostClick(post._id)}
                  >
                    <div
                      className="card-img-top"
                      style={{
                        height: "130px",
                        backgroundImage: `url(${post.media})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        }

        {activeTab == 'slideshow' &&

          <div className="mt-3 bg-none" >
            <div className="row justify-content-center">
              {posts.map((post) => (
                <div className="col-md-12 ">
                  <div className=" bg-none text-white shadow-sm ">
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
                          <h6 className="mb-0 fw-bold text-white">{post.userId.firstName}</h6>
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
                    <div className="post-image ">
                      <div
                        className="card-img-top"
                        style={{
                          height: "60vh",
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
          </div>
        }


      </div>
      {/* Custom Modal */}
      {showModal && (
        <CustomModal
          handleAddPost={handleAddPost}
          showModal={showModal}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Swiper Component for Mobile (Optional) */}
      <Swiper
        spaceBetween={10}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        modules={[Pagination, Navigation]}
        className="d-md-none"  // Only show Swiper on mobile
      >
        {filteredPosts.map((post) => (
          <SwiperSlide key={post._id}>
            <div
              className="bg-dark shadow-lg"
              onClick={() => handlePostClick(post._id)}
            >
              <div
                className="card-img-top"
                style={{
                  height: "200px",
                  backgroundImage: `url(${post.media})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></div>
              <div className="card-body">
                <h5 className="card-title">{post.title || "Untitled Post"}</h5>
                <p className="card-text">{post.description || "No description available."}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ProfilePage;
