import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient'; // adjust path as needed
import {getAllGroups} from '../services/groupServices'
import "../css/Chat.css";
const GroupList = ({handleGroupSelect,msgCounts,handleBackToFriendList}) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGroups = async () => {
   const response = await getAllGroups()
   setGroups(response)
   console.log(response, 'response from groupList')
   if(response){
    setLoading(false)
   }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  if (loading) return <p>Loading groups...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="friend-list-container">
       <div className="friend-list-header">
        <h3>Groups</h3>
        
      </div>
      {groups.length === 0 ? (
        <p>No groups found.</p>
      ) : (
        <div className="space-y-2">
          {groups?.map((group) => (
            <div
              key={group._id}
              className=" friend-item"
              onClick={() => handleGroupSelect(group)}
            > 
            <div className="friend-avatar">
                  <div className={`avatar-container`}>
                    <img 
                      src={group?.profilePicture || "https://cdn.pixabay.com/photo/2021/09/20/03/24/skeleton-6639547_1280.png"} 
                      alt="Profile" 
                      className="profile-image"
                    />
                  </div>
                </div>

                <div className="friend-details mx-3">
                  <div className="friend-name">
                    {group.name} 
                  </div>
                  <p>Members: {group.members?.length || 0}</p>
                  {/* <p>Created by: {group.createdBy?.username || 'Unknown'}</p> */}
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupList;
