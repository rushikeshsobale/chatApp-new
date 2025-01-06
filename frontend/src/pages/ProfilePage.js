import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaUserEdit, FaUserFriends, FaPlus } from 'react-icons/fa';
import EditProfile from '../components/EditProfile';
import CustomModal from '../components/customModal';
import PostDetail from '../components/PostDetail';
import { useParams, useLocation } from 'react-router-dom';

const ProfilePage = () => {
  const { userId } = useParams();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [friends, setFriends] = useState([]);
  const [user2, setUser2] = useState()
  const [bio, setBio] = useState('');
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState([]);
  const [media, setMedia] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/getUser`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setFriends(data.friends);
        setBio(data.bio || '');
      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  const fetchUser2Data = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/getProfileUser/${userId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setFriends(data.friends);
        setBio(data.bio || '');
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
      setUser2(userId)
    }
    else {
      fetchUserData();
      setUser2('')
    }
  }, [location.pathname])
  useEffect(() => {
    const fetchPosts = async () => {
      if (userData) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/posts/${userData._id}`);
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
  }, [userData]); // This effect runs only when userData is available or updated
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
    fetch(`${process.env.API_URL}/api/posts`, {
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/updateUser/${userId}`, {
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
  const handlePostClick = (postId) => {
    setSelectedPostId(postId);
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


  return (
    <div
      className="profile-page container-fluid px-md-4"
      style={{ fontFamily: 'Poppins, sans-serif' }}
    >
      {/* Header Section */}
      {userData ? (
        <div
        className="profile-header text-center p-4 d-flex flex-column flex-md-row align-items-center justify-content-around"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgb(255, 255, 255), rgb(110, 72, 157))',
          borderRadius: '20px',
          color: '#fff',
          padding: window.innerWidth <= 576 ? '20px' : '40px', // Adjust padding for small screens
        }}
      >
        <div
          className="mb-3 mb-md-0"
          style={{
            transform: window.innerWidth <= 576 ? 'scale(0.8)' : 'scale(1)', // Scale down the image on small screens
          }}
        >
          <img
            src={userData.profilePicture || 'https://via.placeholder.com/150'}
            alt="Profile"
            className="rounded-circle shadow"
            style={{
              width: window.innerWidth <= 576 ? '120px' : '150px', // Adjust image size
              height: window.innerWidth <= 576 ? '120px' : '150px',
              border: '3px solid white',
            }}
          />
        </div>
      
        <div
          className="text-center text-md-start"
          style={{
            transform: window.innerWidth <= 576 ? 'scale(0.9)' : 'scale(1)', // Scale down the text content on small screens
          }}
        >
          <h1
            className="mt-3 text-center"
            style={{
              fontSize: window.innerWidth <= 576 ? '1.5rem' : '1.8rem', // Adjust font size
              fontWeight: 'bold',
            }}
          >
            {userData.firstName} {userData.lastName}
          </h1>
          <p
            className="text-muted text-center"
            style={{
              fontSize: window.innerWidth <= 576 ? '0.9rem' : '1rem', // Adjust font size for bio
            }}
          >
            {userData.bio || 'This user has no bio yet.'}
          </p>
          <div className="mt-3 d-flex flex-column flex-sm-row justify-content-center gap-3">
            <button
              className="btn btn-light shadow-sm btn-sm m-auto"
              style={{
                borderRadius: '30px',
                width: window.innerWidth <= 576 ? '120px' : '150px', // Adjust button width
              }}
              onClick={() => setShowModal(true)}
            >
              <FaPlus /> Create Post
            </button>
            <button
              className="btn btn-outline-light shadow-sm btn-sm m-auto"
              style={{
                borderRadius: '30px',
                width: window.innerWidth <= 576 ? '120px' : '150px', // Adjust button width
              }}
            >
              <FaUserEdit /> Edit Profile
            </button>
          </div>
        </div>
      </div>
      
      
      ) : (
        <p>Loading profile...</p>
      )}

      {/* Posts Section */}
      <div className="posts-section mt-4 mb-5">
        <div className="row justify-content-center gap-4 mx-1 mb-5">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post._id}
                className="shadow-lg p-3 mx-1 rounded mt-4"
                style={{
                 
                  width: '320px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: '1px solid rgb(0, 0, 0)',
                  borderRadius: '15px',
                  transition: 'all 0.1s ease-in-out',
                }}
                onClick={() => handlePostClick(post._id)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {post.media && (
                  <div 
                  className='post-card p-3'
                    style={{
                      height: '180px',
                      backgroundImage: `url(${post.media})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '12px',
                      marginBottom: '12px',
                    }}
                  ></div>
                )}
                <div>
                  <p
                    className="post-text"
                    style={{
                      fontSize: '16px',
                      color: '#333',
                      textAlign: 'justify',
                      lineHeight: '1.5',
                    }}
                  >
                    {post.text}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted" style={{ fontSize: '18px' }}>
              No posts yet!
            </p>
          )}
        </div>
      </div>


      {/* Custom Modal */}
      {showModal && (
        <CustomModal
          showModal={showModal}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Post Details */}
      {selectedPostId && (
        <PostDetail
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  );
};
export default ProfilePage;
