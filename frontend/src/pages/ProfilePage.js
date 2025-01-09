import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaUserEdit, FaUserFriends, FaPlus } from 'react-icons/fa';
import EditProfile from '../components/EditProfile';
import CustomModal from '../components/customModal';
import PostDetail from '../components/PostDetail';
import { useParams, useLocation } from 'react-router-dom';
import ChatComponent from './Chat';

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
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('token');
  const fetchUserData = async () => {
    try {
      const response = await fetch(`https://api.makethechange.in/getUser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`, // Include the token in the Authorization header
          'Content-Type': 'application/json', // Optional: specify content type
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setFriends(data.friends);
        console.log(data.friends, 'friend')
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
      const response = await fetch(`https://api.makethechange.in/getProfileUser/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`, // Include the token in the Authorization header
          'Content-Type': 'application/json', // Optional: specify content type
        },
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
          const response = await fetch(`https://api.makethechange.in/api/posts/${userData._id}`);
          if (response.ok) {
            const data = await response.json()
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
    fetch(`https://api.makethechange.in/api/posts`, {
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
      const response = await fetch(`https://api.makethechange.in/api/updateUser/${userId}`, {
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
  const filteredFriends = friends?.filter(friend =>
    `${friend?.friendId.firstName} ${friend?.friendId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.friendId.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

 console.log(filteredFriends, 'filteredfriends')
  return (
    <div
      className="profile-page container-fluid px-md-4"
      style={{ fontFamily: 'Poppins, sans-serif' }}
    >
      {/* Header Section */}
      {userData ? (
        <div
          className="profile-header text-center p-1 d-flex flex-column flex-md-row align-items-center justify-content-around"
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
                width: window.innerWidth <= 576 ? '120px' : '130px', // Adjust image size
                height: window.innerWidth <= 576 ? '120px' : '130px',
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
      {/* Post Details */}
      {selectedPostId && (
        <PostDetail
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}

      {/* Posts Section */}
      <div className=" row posts-section mt-4 mb-5">
        <div className="row mx-1 gap-4 justify-content-center  mb-5 col-lg-7">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post._id}
                className="shadow-lg p-3  rounded mt-4"
                style={{
                  height: '280px',
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
        <div className='col-lg-4' >
          <h5>Friends</h5>

          {/* Search Bar */}
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Friend List */}
          <ul className="list-group" style={{height:'400px', overflow:'auto'}}>
            {filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => (
                <li
                  key={friend._id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex align-items-center">
                    {/* Profile Picture */}
                    <img
                      src={friend?.friendId.profilePicture || 'https://via.placeholder.com/40'}
                      alt={`${friend?.friendId.firstName} ${friend.lastName}`}
                      className="rounded-circle me-2"
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                    {/* Friend Details */}
                    <div>
                      <strong>{friend?.friendId.firstName} {friend.friendId.lastName}</strong>
                      <br />
                      <small className="text-muted">{friend.email}</small>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="list-group-item text-center">No friends found</li>
            )}
          </ul>
        </div>
      </div>


      {/* Custom Modal */}
      {showModal && (
        <CustomModal
          handleAddPost={handleAddPost}
          showModal={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
export default ProfilePage;
