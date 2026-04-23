import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaLock, FaPen } from 'react-icons/fa'; 
import { getProfileUserData, getUserPosts, unlikePost, likePost } from '../services/profileService';
import { IoGridSharp } from 'react-icons/io5';
import { PiSlideshowFill } from 'react-icons/pi';  

export const UserProfilePage = () => {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('grid');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const currentUserId = currentUser?._id || currentUser?.userId;
  const isOwnProfile = userId === currentUserId;
  
  const isLocked = userData?.isPrivate && !userData?.followers?.includes(currentUserId) && !isOwnProfile;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [userRes, postsRes] = await Promise.all([
          getProfileUserData(userId, currentUserId),
          getUserPosts(userId)
        ]);
        setUserData(userRes);
        setPosts(postsRes.posts || []);
      } catch (e) {
        console.error("Profile fetch failed", e);
      }
    };
    fetchProfileData();
  }, [userId, currentUserId]);

  const handleToggleLike = async (postId, postOwnerId, isLiked) => {
    // Optimistic UI Update logic...
  };

  return (
    <div className="prof-wrapper">
      <div className="container prof-container">
        
        {/* HEADER SECTION */}
        <header className="prof-header">
          <div className="prof-avatar-aside">
            <div className="avatar-wrapper">
                <img src={userData?.profilePicture || 'https://via.placeholder.com/150'} alt="profile" />
            </div>
          </div>
          
          <div className="prof-info-main">
            <div className="prof-top-row">
              <h1 className="prof-username">{userData?.userName || 'Username'}</h1>
              <div className="prof-actions">
                {isOwnProfile ? (
                  <button className="prof-btn-outline" onClick={() => setShowEditProfile(true)}>
                    <FaPen size={10} /> Edit Profile
                  </button>
                ) : (
                  <button className="prof-btn-fill">Follow</button>
                )}
              </div>
            </div>

            <div className="prof-stats">
              <div className="stat"><span>{posts.length}</span> posts</div>
              <div className="stat" onClick={() => !isLocked && setShowFollowersModal(true)}>
                <span>{userData?.followersCount || 0}</span> followers
              </div>
              <div className="stat" onClick={() => !isLocked && setShowFollowingModal(true)}>
                <span>{userData?.followingCount || 0}</span> following
              </div>
            </div>

            <div className="prof-bio desktop-only">
              <div className="prof-name">{userData?.firstName} {userData?.lastName}</div>
              <p>{userData?.bio || "No bio yet."}</p>
            </div>
          </div>
        </header>

        {/* MOBILE BIO (Shows below header on small screens) */}
        <div className="prof-bio mobile-only">
            <div className="prof-name">{userData?.firstName} {userData?.lastName}</div>
            <p>{userData?.bio || "No bio yet."}</p>
        </div>

        {/* CONTENT SECTION */}
        {!isLocked ? (
          <>
            <nav className="prof-tabs">
              <button className={activeTab === 'grid' ? 'active' : ''} onClick={() => setActiveTab('grid')}>
                <IoGridSharp size={18} /> <span className="tab-text">POSTS</span>
              </button>
              <button className={activeTab === 'slideshow' ? 'active' : ''} onClick={() => setActiveTab('slideshow')}>
                <PiSlideshowFill size={20} /> <span className="tab-text">FEED</span>
              </button>
            </nav>

            <main className="prof-content">
              {activeTab === 'grid' ? (
                <div className="prof-grid">
                  {posts.length > 0 ? posts.map(post => (
                    <div key={post._id} className="grid-item">
                      <img src={post.mediaUrl} alt="" loading="lazy" />
                    </div>
                  )) : (
                    <div className="no-posts">No posts available</div>
                  )}
                </div>
              ) : (
                <div className="prof-slideshow">
                  {posts.map(post => (
                    <div key={post._id} className="feed-card">
                      <img src={post.mediaUrl} alt="" />
                    </div>
                  ))}
                </div>
              )}
            </main>
          </>
        ) : (
          <div className="prof-locked">
            <div className="locked-icon"><FaLock /></div>
            <h3>This account is private</h3>
            <p>Follow to see their photos and videos.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .prof-wrapper { background: #000; min-height: 100vh; color: #fff; padding: 20px 10px; }
        .prof-container { max-width: 935px; margin: 0 auto; }
        
        /* Header Layout */
        .prof-header { 
          display: flex; 
          align-items: center; 
          padding-bottom: 30px; 
          margin-bottom: 20px;
        }
        
        .prof-avatar-aside { flex: 1; display: flex; justify-content: center; }
        .avatar-wrapper { width: 150px; height: 150px; border-radius: 50%; padding: 3px; border: 1px solid #333; }
        .avatar-wrapper img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        
        .prof-info-main { flex: 2; padding-left: 20px; }
        .prof-top-row { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
        .prof-username { font-size: 1.5rem; font-weight: 300; margin: 0; }
        
        .prof-btn-outline { background: #1a1a1a; border: 1px solid #363636; color: #fff; padding: 6px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
        .prof-btn-fill { background: #0095f6; border: none; color: #fff; padding: 6px 20px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }

        .prof-stats { display: flex; gap: 30px; margin-bottom: 20px; }
        .stat { font-size: 1rem; cursor: pointer; }
        .stat span { color: #fff; font-weight: 600; }

        .prof-bio { font-size: 0.95rem; line-height: 1.5; }
        .prof-name { font-weight: 600; margin-bottom: 2px; }

        /* Tabs */
        .prof-tabs { 
          display: flex; 
          justify-content: center; 
          gap: 50px; 
          border-top: 1px solid #262626;
        }
        .prof-tabs button { 
          background: none; border: none; color: #8e8e8e; padding: 15px 0; 
          font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
          display: flex; align-items: center; gap: 6px; cursor: pointer;
          border-top: 1px solid transparent; margin-top: -1px;
        }
        .prof-tabs button.active { color: #fff; border-top: 1px solid #fff; }

        /* Grid */
        .prof-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding-top: 10px; }
        .grid-item { aspect-ratio: 1/1; background: #111; overflow: hidden; cursor: pointer; }
        .grid-item img { width: 100%; height: 100%; object-fit: cover; }
        .grid-item:hover img { opacity: 0.8; }

        /* Mobile specific adjustments */
        .mobile-only { display: none; }
        
        @media (max-width: 768px) {
          .prof-header { gap: 10px; padding-bottom: 15px; }
          .avatar-wrapper { width: 80px; height: 80px; }
          .prof-top-row { flex-direction: column; align-items: flex-start; gap: 10px; }
          .prof-stats { 
            justify-content: space-around; 
            border-top: 1px solid #262626; 
            padding: 10px 0;
            width: 100%;
          }
          .stat { display: flex; flex-direction: column; align-items: center; font-size: 0.85rem; color: #8e8e8e; }
          .stat span { color: #fff; }
          .desktop-only { display: none; }
          .mobile-only { display: block; padding: 0 10px 20px; }
          .tab-text { display: none; } /* Show only icons on mobile tabs */
          .prof-tabs { gap: 0; justify-content: space-around; }
          .prof-grid { gap: 2px; }
        }

        .prof-locked { text-align: center; padding: 60px 20px; }
        .locked-icon { font-size: 3rem; margin-bottom: 20px; color: #8e8e8e; }
        .no-posts { grid-column: span 3; text-align: center; padding: 40px; color: #8e8e8e; }
      `}</style>
    </div>
  );
};