import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import {
  FaCamera,
  FaLock,
  FaQuestionCircle,
  FaSignOutAlt,
  FaUserEdit,
} from 'react-icons/fa';

const EditProfile = ({ show, onHide, userData, onSave, onSettings, onLogout }) => {
  const [formData, setFormData] = useState({
    bio: userData?.bio || '',
    profilePicture: null,
  });
  const [previewUrl, setPreviewUrl] = useState(userData?.profilePicture || null);

  useEffect(() => {
    if (userData?.profilePicture) {
      setPreviewUrl(userData.profilePicture);
    }
  }, [userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        profilePicture: file,
      }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="edit-profile-modal">
      <Modal.Body className="p-0" style={{ backgroundColor: '#f1f3f6', borderRadius: '20px' }}>
        {/* Profile Header */}
        <div
          className="text-center p-4 bg-dark"

        >   <h5 className=" text-light mt-1 mb-3  fw-semibold">{userData?.userName || 'Your Name'}</h5>
          <div className="position-relative mx-auto " style={{ width: 100, height: 100 }}>
            <div
              className="profile-image-container shadow"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #fff',
              }}
            >

              <img
                src={previewUrl || 'https://via.placeholder.com/150'}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                className="image-overlay d-flex justify-content-center align-items-center"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.4)',
                  opacity: 0,
                  transition: 'opacity 0.3s',
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('profile-image-input').click()}
              >
                <FaCamera className="text-white" size={20} />
              </div>
              <input
                id="profile-image-input"
                type="file"
                className="d-none"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

          </div>
          <div className="px-4 py-3">
            <form onSubmit={handleSubmit}>
              <label className="form-label fw-semibold text-muted">Your Bio</label>
              <input
                className="form-control mb-3 shadow-sm"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}

                placeholder="Tell us about yourself..."
                style={{ borderRadius: '10px' }}
              />
              <button
                type="submit"
                className="btn w-100 text-white d-flex align-items-center justify-content-center gap-2"
                style={{

                  borderRadius: '10px',
                }}
              >
                <FaUserEdit /> Save Changes
              </button>
            </form>
          </div>

          <p className="text-light small mb-0">{userData?.phone || '+91 0000000000'}</p>
        </div>

        {/* Editable Bio Section */}


        <hr className="my-2 mx-4" />

        {/* Options */}
        <div className="px-4 pb-4 d-flex flex-column gap-2">
          <div className="option-row" onClick={onSettings}>
            <FaLock className="text-primary" /> Change Password
          </div>
          <div className="option-row">
            <FaQuestionCircle className="text-warning" /> Get Help
          </div>
          <div className="option-row" onClick={onLogout} style={{ color: '#e74c3c' }}>
            <FaSignOutAlt /> Log Out
          </div>
        </div>
      </Modal.Body>

      <style jsx>{`
        .edit-profile-modal .modal-content {
          border-radius: 20px;
          border: none;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
        }

        .profile-image-container:hover .image-overlay {
          opacity: 1;
        }

        .option-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1rem;
          padding: 10px 12px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .option-row:hover {
          background: #f0f2f5;
        }
      `}</style>
    </Modal>
  );
};

export default EditProfile;
