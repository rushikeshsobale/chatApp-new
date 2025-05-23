import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { FaCamera } from 'react-icons/fa';

const EditProfile = ({ show, onHide, userData, onSave }) => {
  const [formData, setFormData] = useState({
    bio: userData?.bio || '',
    profilePicture: null
  });
  const [previewUrl, setPreviewUrl] = useState(userData?.profilePicture || null);

  useEffect(() => {
    if (userData?.profilePicture) {
      setPreviewUrl(userData.profilePicture);
    }
  }, [userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profilePicture: file
      }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="md"
      className="edit-profile-modal"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">Edit Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <div className="text-center mb-4">
            <div className="position-relative d-inline-block">
              <div 
                className="profile-image-container"
                style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
                }}
              >
                <img
                  src={previewUrl || "https://via.placeholder.com/150"}
                  alt="Profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
                <div 
                  className="image-overlay"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.3s ease",
                    cursor: "pointer"
                  }}
                  onClick={() => document.getElementById('profile-image-input').click()}
                >
                  <FaCamera size={24} className="text-white" />
                </div>
                <input
                  id="profile-image-input"
                  type="file"
                  className="d-none"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
              <p className="text-muted mt-2 small">Click to change profile picture</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Bio</label>
            <textarea
              className="form-control"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows="3"
              placeholder="Tell us about yourself..."
              style={{
                borderRadius: "10px",
                border: "1px solid #e0e0e0",
                padding: "12px",
                fontSize: "0.95rem",
                resize: "none"
              }}
            />
          </div>

          <div className="d-grid gap-2">
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{
                borderRadius: "8px",
                padding: "10px",
                fontSize: "1rem",
                fontWeight: "500"
              }}
            >
              Save Changes
            </button>
            <button 
              type="button" 
              className="btn btn-light"
              onClick={onHide}
              style={{
                borderRadius: "8px",
                padding: "10px",
                fontSize: "1rem",
                fontWeight: "500"
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal.Body>

      <style jsx>{`
        .profile-image-container:hover .image-overlay {
          opacity: 1;
        }
        .edit-profile-modal .modal-content {
          border-radius: 15px;
          border: none;
        }
        .edit-profile-modal .modal-header {
          padding: 1.5rem 1.5rem 0.5rem;
        }
        .edit-profile-modal .modal-body {
          padding: 1.5rem;
        }
      `}</style>
    </Modal>
  );
};

export default EditProfile;
