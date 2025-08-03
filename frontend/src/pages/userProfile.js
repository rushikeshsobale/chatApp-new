import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaUserFriends, FaBookmark, FaPen } from 'react-icons/fa';
import { IoGridSharp } from 'react-icons/io5';
import { PiSlideshowFill } from 'react-icons/pi';
import FriendSuggestion from '../components/FriendSuggestion';
import EditProfile from '../components/EditProfile';
import Loader from '../components/Loader';
import { getProfileUserData, getUserPosts, fetchSuggestions } from '../services/profileService';
import { UserContext } from '../contexts/UserContext';
import FollowModal from '../components/FollowModal';

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('grid');
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const currentUserId = currentUser?._id || currentUser?.userId;
  const { socket } = useContext(UserContext) || {};

  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingUser(true);
      try {
        const data = await getProfileUserData(userId, currentUserId);
        setUserData(data);
      } catch (e) {
        setUserData(null);
      }
      setLoadingUser(false);
    };
    fetchProfile();
  }, [userId, currentUserId]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      setLoadingPosts(true);
      try {
        const data = await getUserPosts(userId);
        setPosts(data.posts || []);
      } catch (e) {
        setPosts([]);
      }
      setLoadingPosts(false);
    };
    fetchUserPosts();
  }, [userId]);

  useEffect(() => {
    const getSuggestionsList = async () => {
      setLoadingSuggestions(true);
      try {
        const data = await fetchSuggestions();
        setSuggestions(data);
      } catch (e) {
        setSuggestions([]);
      }
      setLoadingSuggestions(false);
    };
    getSuggestionsList();
  }, []);

  if (loadingUser) return <Loader text="Loading profile..." />;
  if (!userData) return <div className="text-center mt-10">User not found</div>;

  const isPrivate = userData.isPrivate && !userData.followers?.includes(currentUserId);
  const isOwnProfile = userId === currentUserId;
  const tabs = [
    { id: 'grid', label: 'Grid', icon: <IoGridSharp size={24} /> },
    { id: 'slideshow', label: 'Slideshow', icon: <PiSlideshowFill size={24} /> },
    { id: 'saved', label: 'Saved', icon: <FaBookmark size={24} /> },
  ];

  // Add handlers for follow/unfollow (no-ops for now, can be implemented as needed)
  const handleFollowUser = (userId) => {};
  const handleUnfollowUser = (userId) => {};

  return (
    <div className="profile-page" style={{ fontFamily: "'Poppins', sans-serif", background: "#f5f5f5" }}>
      <div className="container-fluid mt-3">
        <div className="row">
          {/* Left Sidebar (empty for now, could add mutual friends, etc.) */}
          <div className="col-lg-3 d-none d-lg-block"></div>
          {/* Main Content Area */}
          <div className="col-lg-6" style={{ backgroundColor: 'white', minHeight: '100vh', overflow: 'auto' }}>
            {/* Profile Header */}
            <div className="profile-header position-relative overflow-hidden mb-3">
              <div className="container">
                <div className="row align-items-center">
                  <div className="col-md-8 d-flex flex-column flex-md-row align-items-center gap-4">
                    <div className="position-relative hover-3d">
                      <img
                        src={userData.profilePicture || 'https://via.placeholder.com/100'}
                        alt="Profile"
                        className="rounded-circle shadow-lg"
                        style={{ width: '100px', height: '100px', border: '4px solid rgba(255,255,255,0.8)', objectFit: 'cover' }}
                      />
                      {isOwnProfile && (
                        <label
                          className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 cursor-pointer"
                          style={{ cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                          onClick={() => setShowEditProfile(true)}
                        >
                          <FaPen size={12} />
                        </label>
                      )}
                    </div>
                    <div>
                      <p className="mb-2">
                        <span className="text-dark text-sm">{userData?.userName}</span>
                      </p>
                      <p className="mb-0" style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '500px' }}>
                        {userData?.bio || 'Tell your story...'}
                      </p>
                    </div>
                  </div>
                  <div className="col-md-4 mt-4 mt-md-0">
                    <div className="d-flex justify-content-around align-items-center">
                      {/* Followers Stats */}
                      <div className="text-center cursor-pointer" style={{ cursor: 'pointer' }} onClick={() => setShowFollowersModal(true)}>
                        <h3 className="mb-0 fw-bold" style={{ fontSize: '1.5rem' }}>{userData?.followers?.length || 0}</h3>
                        <p className="mb-0 " style={{ fontSize: '0.9rem' }}>Followers</p>
                      </div>
                      <div className="mx-2" style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }}></div>
                      {/* Following Stats */}
                      <div className="text-center cursor-pointer" style={{ cursor: 'pointer' }} onClick={() => setShowFollowingModal(true)}>
                        <h3 className="mb-0 fw-bold" style={{ fontSize: '1.5rem' }}>{userData?.following?.length || 0}</h3>
                        <p className="mb-0 " style={{ fontSize: '0.9rem' }}>Following</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Tabs */}
            <div className="card border-0 shadow-sm mb-3 bg-white" style={{ zIndex: 10 }}>
              <div className="card-body p-0">
                <div className="d-flex justify-content-around border-bottom">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`flex flex-column align-items-center position-relative border-0 bg-transparent ${activeTab === tab.id ? 'text-dark fw-bold' : 'text-secondary'}`}
                      onClick={() => setActiveTab(tab.id)}
                      style={{ transition: 'all 0.3s ease', width: '100%' }}
                    >
                      <div className="mb-1">{tab.icon}</div>
                      {activeTab === tab.id && (
                        <div className="position-absolute w-100 bg-primary" style={{ height: '3px', bottom: '0', left: '0', borderRadius: '3px 3px 0 0' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Profile Content */}
            <div className="mb-4 p-3">
              {!isPrivate ? (
                <>
                  {/* Followers/Following Modals */}
                  <FollowModal
                    show={showFollowersModal}
                    onHide={() => setShowFollowersModal(false)}
                    title="Followers"
                    users={userData?.followers || []}
                    currentUserId={currentUserId}
                    onFollow={handleFollowUser}
                    onUnfollow={handleUnfollowUser}
                  />
                  <FollowModal
                    show={showFollowingModal}
                    onHide={() => setShowFollowingModal(false)}
                    title="Following"
                    users={userData?.following || []}
                    currentUserId={currentUserId}
                    onFollow={handleFollowUser}
                    onUnfollow={handleUnfollowUser}
                  />
                  {activeTab === 'grid' && (
                    <div className="row g-3">
                      {loadingPosts ? <Loader text="Loading posts..." /> : posts.length === 0 ? (
                        <p className="text-gray-500">No posts yet.</p>
                      ) : (
                        posts.map((post) => (
                          <div key={post._id} className="col-lg-4 col-md-6 col-6">
                            <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '12px', cursor: 'pointer', aspectRatio: '1/1' }}>
                              <div
                                className="w-100 h-100"
                                style={{ backgroundImage: `url(${post.media || post.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'transform 0.5s ease' }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {activeTab === 'slideshow' && (
                    <div className="row justify-content-center">
                      {loadingPosts ? <Loader text="Loading posts..." /> : posts.map((post) => (
                        <div key={post._id} className="col-12 mb-4">
                          <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '16px' }}>
                            <div className="w-100" style={{ aspectRatio: '1/1', backgroundImage: `url(${post.media || post.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                            <div className="card-body">
                              <p className="mb-2">{post.caption || post.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeTab === 'saved' && (
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center py-5">
                        <FaBookmark size={48} className="text-muted mb-3" />
                        <h5>Saved Items</h5>
                        <p className="text-muted">Save photos and videos to your collection</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-10 text-center text-danger">This profile is private. Follow to see posts.</div>
              )}
            </div>
            {/* Edit Profile Modal */}
            {showEditProfile && isOwnProfile && (
              <EditProfile
                show={showEditProfile}
                onHide={() => setShowEditProfile(false)}
                userData={userData}
                onSave={() => setShowEditProfile(false)}
                onSettings={() => { navigate('/settings'); setShowEditProfile(false); }}
                onLogout={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}
              />
            )}
          </div>
          {/* Right Sidebar: Friend Suggestions */}
          <div className="col-lg-3 d-none d-lg-block">
            <div className="sticky-top" style={{ top: '70px', zIndex: 10 }}>
              {loadingSuggestions ? <Loader text="Loading suggestions..." /> : suggestions && <FriendSuggestion suggestions={suggestions} />}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .profile-page { padding-bottom: 60px; }
        @media (max-width: 992px) { .profile-page { padding-bottom: 0; } }
        .hover-3d { perspective: 1000px; }
      `}</style>
    </div>
  );
};

export default UserProfilePage;
