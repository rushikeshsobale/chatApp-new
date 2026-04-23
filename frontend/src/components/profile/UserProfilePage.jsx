import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getUserProfilePage } from "../../services/profileService";
import ProfileHeader from "./ProfileHeader.jsx";
import ProfileBio from "./ProfileBio.jsx";
import ProfileTabs from "./ProfileTabs.jsx";
import ProfileContent from "./ProfileContent.jsx";
import PrivateAccount from "./PrivateAccount.jsx";
import './profile.css';

const UserProfilePage = () => {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("grid");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getUserProfilePage(userId);
        setData(res);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // Loading Skeleton State
  if (loading) {
    return <div className="prof-wrapper"><div className="loader">Loading...</div></div>;
  }

  if (!data) return <div className="error-msg">Profile not found.</div>;

  const { user, posts } = data;

  return (
    <div className="prof-wrapper">
      <main className="prof-container">
        <ProfileHeader user={user} />
       

        {!user.isLocked ? (
          <>
            <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <ProfileContent activeTab={activeTab} posts={posts} />
          </>
        ) : (
          <PrivateAccount />
        )}
      </main>
    </div>
  );
};

export default UserProfilePage;