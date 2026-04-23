import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import {
  sendFollowRequest as followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  getRelationshipStatus
} from "../services/relationships";

const FollowModal = ({ show, onHide, title, users = [], currentUserId }) => {
  const [followStatus, setFollowStatus] = useState({});

  /* ---------------- FETCH RELATIONSHIP STATUS ---------------- */
  useEffect(() => {
    if (!users.length || !show) return;

    const fetchStatuses = async () => {
      const map = {};

      for (const u of users) {
        const target =
          title === "Requests" ? u.requester : u.recipient;

        if (!target?._id) continue;

        try {
          const res = await getRelationshipStatus(target._id);
          map[target._id] = res.state;
        } catch {
          map[target._id] = "none";
        }
      }
      setFollowStatus(map);
    };

    fetchStatuses();
  }, [users, title, show]);

  /* ---------------- BUTTON CONFIG ---------------- */
  const getButtonConfig = (status) => {
    switch (status) {
      case "requested":
        return { text: "Requested", disabled: true };

      case "incoming_request":
        return { text: "Accept", secondary: "Reject" };

      case "follow_back":
        return { text: "Follow Back" };

      case "following":
        return { text: "Unfollow", danger: true };

      case "friends":
        return { text: "Friends", disabled: true };

      default:
        return { text: "" };
    }
  };

  /* ---------------- ACTION HANDLERS ---------------- */
  const handlePrimaryAction = async (status, userId) => {
    if (status === "following") await unfollowUser(userId);
    else if (status === "incoming_request") await acceptFollowRequest(userId);
    else await followUser(userId);

    setFollowStatus((prev) => ({
      ...prev,
      [userId]:
        status === "incoming_request" ? "following" :
        status === "following" ? "none" :
        "requested",
    }));
  };

  const handleReject = async (userId) => {
    await rejectFollowRequest(userId);
    setFollowStatus((prev) => ({ ...prev, [userId]: "none" }));
  };

  /* ---------------- RENDER ---------------- */
  return (
    <Modal show={show} onHide={onHide} centered size="md" contentClassName="prof-modal-surface " >
      <Modal.Header className="border-0 py-2 px-4 d-flex justify-content-between">
        <Modal.Title style={{ fontSize: "0.85rem", color: "#eee" }}>
          {title.toUpperCase()}
        </Modal.Title>
        <button onClick={onHide} className="prof-close-btn">✕</button>
      </Modal.Header>

      <Modal.Body className="px-4 pb-2">
        <div className="follow-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
          {users.length ? (
            users.map((u) => {
              const target =
                title === "Followers" ? u.requester : u.recipient;
              if (!target) return null;
              const status = followStatus[target._id] || "none";
              const btn = getButtonConfig(status);
              return (
                <div
                  key={target._id}
                  className="d-flex align-items-center justify-content-between py-2 border-bottom-prof"
                >
                  <div className="d-flex align-items-center">
                    <img
                      src={target.profilePicture || "https://via.placeholder.com/40"}
                      alt={target.userName}
                      className="prof-avatar-sm"
                    />
                    <div>
                      <div className="prof-username">{target.userName}</div>
                      <div className="prof-fullname text-white">
                        {target.firstName} {target.lastName}
                      </div>
                    </div>
                  </div>

                  {target._id !== currentUserId && (
                    <div className="d-flex gap-2">
                      <button
                        disabled={btn.disabled}
                        className={`prof-follow-btn ${btn.danger ? "following" : ""}`}
                        onClick={() => handlePrimaryAction(status, target._id)}
                      >
                        {btn.text}
                      </button>

                      {btn.secondary && (
                        <button
                          className="prof-follow-btn following"
                          onClick={() => handleReject(target._id)}
                        >
                          {btn.secondary}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-muted py-4">No users</p>
          )}
        </div>
      </Modal.Body>

      <style jsx>{`
        /* Modal Surface */
        :global(.prof-modal-surface) {
          background: #0d0d0d !important;
          border: 1px solid #1a1a1a !important;
          border-radius: 16px !important;
        }

        /* Typography */
        .prof-username { font-size: 0.85rem; color: #efefef; font-weight: 400; }
        .prof-fullname { font-size: 0.7rem; color: #555; }
        
        /* Avatar */
        .prof-avatar-sm {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 12px;
          background: #1a1a1a;
          border: 1px solid #1f1f1f;
        }

        /* List Styling */
        .border-bottom-prof { border-bottom: 1px solid #111; }
        .border-bottom-prof:last-child { border-bottom: none; }
        .follow-list::-webkit-scrollbar { display: none; }

        /* Professional Buttons */
        .prof-follow-btn {
          font-size: 0.75rem;
          padding: 6px 16px;
          border: none;
          border-radius: 6px;
          transition: all 0.2s ease;
          background: #fff;
          color: #000;
          font-weight: 500;
        }

        .prof-follow-btn.following {
          background: #1a1a1a;
          color: #888;
          border: 1px solid #222;
        }

        .prof-follow-btn:hover { opacity: 0.85; }

        /* Close Icon */
        .prof-close-btn {
          background: none;
          border: none;
          color: #444;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0;
        }
        .prof-close-btn:hover { color: #fff; }
        .modal-content { background: #0d0d0d;}
      `}</style>
    </Modal>
  );
};

export default FollowModal;
