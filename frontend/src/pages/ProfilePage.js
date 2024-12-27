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
      const response = await fetch(`http://localhost:5500/getUser`, {
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
      const response = await fetch(`http://localhost:5500/getProfileUser/${userId}`, {
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
          const response = await fetch(`http://localhost:5500/api/posts/${userData._id}`);
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
    fetch('http://localhost:5500/api/posts', {
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
      const response = await fetch(`http://localhost:5500/api/updateUser/${userId}`, {
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
    <div className="container-fluid mt-1 ">
      <EditProfile userData={userData} onSave={handleSave} />
      {userData ? (
        <div className="row justify-content-center">
          {/* Profile and Action Buttons */}
          <div className="text-center col-lg-8" style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '1rem' }}>
            <div className="d-flex flex-column align-items-center p-3">
              <img
                src={userData?.profilePicture || 'https://via.placeholder.com/150?text=Profile+Picture'}
                alt="Profile"
                className="rounded-circle"
                style={{
                  width: '100px',
                  height: '100px',
                  border: '3px solid white',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  marginBottom: '1rem'
                }}
              />
              <div className="text-center ">
                <h1 className="font-weight-bold" style={{ fontSize: '1.5rem' }}>
                  {userData.firstName} {userData.lastName}
                </h1>
                <p>{userData.bio}</p>
                {!user2 && <div className="d-flex justify-content-center gap-2 mt-3">
                  <button
                    className="border btn btn-outline-light text-dark"
                    type="button"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasRight"
                    aria-controls="offcanvasRight"
                    style={{ width: '150px', borderRadius: '20px' }}
                  >
                    <FaUserEdit /> Edit Profile
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    className="border btn btn-outline-light text-dark"
                    type="button"
                    style={{ width: '150px', borderRadius: '20px' }}
                  >
                    <FaPlus /> Create Post
                  </button>
                </div>}
              </div>
            </div>
          </div>
          <div className="bg-none">
            {selectedPostId ? (
              <PostDetail postId={selectedPostId} onClose={() => setSelectedPostId(null)} userId={userData._id} handleNextPost={handleNextPost} handlePrevPost={handlePrevPost}/>
            ) : (
              <div className="row mt-4 d-flex justify-content-center gap-4">
                {posts.length > 0 ? (
                  posts.map((post, index) => (
                    <div key={index} className="post-card alert alert-secondary mt-2 col-lg-2 col-md-3 col-sm-4 col-6" onClick={() => handlePostClick(post._id)} style={{ zIndex: 1, background:'ghostwhite' }}>
                      {post.media && (
                        /\.(mp4|webm|ogg)$/i.test(post.media) ? (
                          <video src={post.media} controls className="img-fluid post-video"  style={{height:'200px'}} />
                        ) : (
                          <img src={post.media} alt="Post Media" className="img-fluid post-image" style={{height:'200px'}}/>
                        )
                      )}
                      {post.text && <p>{post.text}</p>}
                      {post.media && post.media.type && post.media.type.startsWith('video') && (
                        <video controls className="w-100 mt-2">
                          <source src={post.media.url} type={post.media.type} />
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                  ))
                ) : (
                  <p className='m-auto text-center'>No posts yet!</p>
                )}
              </div>
            )}
          </div>
          {/* Sidebar with UsersList and Modal Trigger */}
          <div className="col-lg-5 mt-4">
            <CustomModal
              showModal={showModal}
              onClose={() => setShowModal(false)}
              newPost={newPost}
              setNewPost={setNewPost}
              handleMediaUpload={handleMediaUpload}
              handleAddPost={handleAddPost}
            />
          </div>
        </div>
      ) : (
        <p>Loading user data...</p>
      )}
    </div>
  );
};
export default ProfilePage;
