import React from "react";

const ProfileTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "grid", label: "POSTS" },
    { id: "feed", label: "FEED" },
  ];

  return (
    <div className="profile-tabs">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
};

export default ProfileTabs;