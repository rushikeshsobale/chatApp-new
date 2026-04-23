import React, { useEffect, useState } from 'react';
import { getAllGroups } from '../services/groupServices';
import { FaUsers, FaChevronLeft } from 'react-icons/fa';

const GroupList = ({ handleGroupSelect, handleBackToFriendList }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      const response = await getAllGroups();
      setGroups(response);
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  if (loading) return (
    <div className="prof-loading">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="prof-group-container">
      {/* Subtle Navigation Header */}
      <div className="prof-group-header">
        <button onClick={handleBackToFriendList} className="prof-back-btn">
          <FaChevronLeft size={10} className="me-2" /> Lists
        </button>
        <span className="prof-header-title">Groups</span>
      </div>

      <div className="prof-scroll-container">
        {groups.length === 0 ? (
          <div className="prof-empty-state">No groups found</div>
        ) : (
          <div className="prof-group-list">
            {groups.map((group) => (
              <div
                key={group._id}
                className="prof-group-row"
                onClick={() => handleGroupSelect(group)}
              >
                <div className="prof-group-avatar-wrapper">
                  {group.profilePicture ? (
                    <img src={group.profilePicture} alt="" className="prof-group-img" />
                  ) : (
                    <div className="prof-group-placeholder">
                      <FaUsers size={14} />
                    </div>
                  )}
                </div>

                <div className="prof-group-info">
                  <div className="prof-group-name">{group.name}</div>
                  <div className="prof-group-meta">
                    {group.members?.length || 0} participants
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        /* Core Surface - Pitch Black to match other components */
        .prof-group-container {
          height: 100%;
          background: #000;
          display: flex;
          flex-direction: column;
        }

        .prof-group-header {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #111;
          gap: 12px;
        }

        .prof-back-btn {
          background: none;
          border: none;
          color: #666;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.2s;
        }

        .prof-back-btn:hover { color: #fff; }

        .prof-header-title {
          color: #fff;
          font-size: 0.85rem;
          font-weight: 400;
          letter-spacing: 0.3px;
        }

        .prof-scroll-container {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .prof-group-list { padding: 8px 0; }

        .prof-group-row {
          display: flex;
          align-items: center;
          padding: 10px 20px;
          cursor: pointer;
          transition: background 0.2s ease;
          gap: 14px;
        }

        .prof-group-row:hover {
          background: #0a0a0a;
        }

        /* Group-specific visual: Rounded Square (12px) vs Circles for Users */
        .prof-group-img, .prof-group-placeholder {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          object-fit: cover;
          background: #161616;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #444;
          border: 1px solid #1f1f1f;
        }

        .prof-group-info {
          flex: 1;
          min-width: 0;
          border-bottom: 1px solid #0f0f0f;
          padding-bottom: 10px;
        }

        .prof-group-row:last-child .prof-group-info {
          border-bottom: none;
        }

        .prof-group-name {
          color: #efefef;
          font-size: 0.85rem;
          font-weight: 400;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .prof-group-meta {
          color: #555;
          font-size: 0.7rem;
          letter-spacing: 0.2px;
        }

        .prof-empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #333;
          font-size: 0.8rem;
          letter-spacing: 0.5px;
        }

        .prof-loading {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 1px solid #222;
          border-top-color: #efefef;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default GroupList;
