import React from "react";
import ProfileActions from "./ProfileActions";
import ProfileStats from "./ProfileStats";
import ProfileBio from "./ProfileBio";
const ProfileHeader = ({ user }) => {
  const handleShowFollowers = () => {
    // Implement logic to show followers modal or navigate to followers page
    console.log("Show followers for user:", user.userName);
  } 
  const handleShowFollowing = () => { 
    // Implement logic to show following modal or navigate to following page
    console.log("Show following for user:", user.userName);
  }

  return (
    <div
      className="mt-1 profile-header position-relative overflow-hidden mb-1"
      style={{ background: '#000000ff' }}
    >
      <div className="container text-white" >
        <div className="row align-items-center mt-1"  >
          <div className="col-md-8 d-flex flex-row align-items-center gap-4" >
            <div className="position-relative hover-3d">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="Profile"
                  className="rounded-circle shadow-lg"
                  style={{
                    width: "80px",
                    height: "80px",
                    border: "4px solid rgba(255,255,255,0.8)",
                    objectFit: "cover",
                    transform: "perspective(500px) rotateY(-5deg)",
                    transition: "all 0.5s ease",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                  }}

                  onMouseEnter={e =>
                    e.currentTarget.style.transform =
                    "perspective(500px) rotateY(5deg) scale(1.05)"
                  }
                  onMouseLeave={e =>
                    e.currentTarget.style.transform = "perspective(500px) rotateY(-5deg)"
                  }
                />
              ) : (
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-lg"
                  style={{
                    width: "100px",
                    height: "100px",
                    border: "4px solid hsla(0, 0%, 100%, 0.80)",
                    fontSize: "36px",
                    fontWeight: "bold",
                    transform: "perspective(500px) rotateY(-5deg)",
                    transition: "all 0.5s ease",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                  }}
                  onMouseEnter={e =>
                    e.currentTarget.style.transform =
                    "perspective(500px) rotateY(5deg) scale(1.05)"
                  }
                  onMouseLeave={e =>
                    e.currentTarget.style.transform = "perspective(500px) rotateY(-5deg)"
                  }
                >
                  {user.userName?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="status-indicator"></div>
            </div>
            <div >
              <p
                className="mb-1"
              >
                <span className="text-white text-sm">{user?.userName}</span>
              </p>
              <p
                className="mb-0"
                style={{
                  fontSize: "0.7rem",
                  opacity: 0.9,
                  maxWidth: "500px"
                }}
              >
                {user?.bio || "Tell your story..."}
              </p>
              <div className="d-flex justify-content-around align-items-center">
                {/* Followers Stats */}
                <div className="text-center cursor-pointer" style={{ cursor: 'pointer' }} onClick={handleShowFollowers}>
                  <h3 className="mb-0 fw-bold" style={{ fontSize: '0.8rem' }}>
                    {user.followersCount || 0}
                  </h3>
                  <p className="mb-0 " style={{ fontSize: '0.7rem' }}>
                    Followers
                  </p>
                </div>
                {/* Divider */}
                <div className="mx-2" style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }}></div>
                {/* Following Stats */}
                <div className="text-center cursor-pointer" style={{ cursor: 'pointer' }} onClick={handleShowFollowing}>
                  <h3 className="mb-0 fw-bold" style={{ fontSize: '0.8rem' }}>
                    {user.followingCount || 0}
                  </h3>
                  <p className="mb-0 " style={{ fontSize: '0.7rem' }}>
                    Following
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;