import React from 'react';
import { Modal } from 'react-bootstrap';
import { FaUserPlus, FaUserCheck } from 'react-icons/fa';
const FollowModal = ({ show, onHide, title, users, currentUserId, onFollow, onUnfollow }) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="md"
      className="follow-modal"
    >
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="fw-bold">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <div className="follow-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {users?.length > 0 ? (
            users.map((user) => (
              <div
                key={user._id}
                className="d-flex align-items-center justify-content-between p-3 border-bottom hover-bg-light"
              >
                <div className="d-flex align-items-center">
                  <img
                    src={user.profilePicture || "https://via.placeholder.com/50"}
                    alt={user.userName}
                    className="rounded-circle me-3"
                    style={{ width: "50px", height: "50px", objectFit: "cover" }}
                  />
                  <div>
                    <h6 className="mb-0 fw-bold">{user.userName}</h6>
                    <p className="mb-0 text-muted small">{user.firstName} {user.lastName}</p>
                  </div>
                </div>
                {user._id !== currentUserId && title=='Followers' && (
                  <button
                    className={`btn ${user.isFollowing ? 'btn-outline-secondary' : 'btn-primary'} btn-sm rounded-pill px-3`}
                    onClick={() => user.isFollowing ? onUnfollow(user._id) : onFollow(user._id)}
                  >
                    {user.isFollowing ? (
                      <>
                        <FaUserCheck className="me-2" />
                        Following
                      </>
                    ) : (
                      <>
                        <FaUserPlus className="me-2" />
                        Follow
                      </>
                    )}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-5">
              <p className="text-muted mb-0">No users to display</p>
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default FollowModal; 