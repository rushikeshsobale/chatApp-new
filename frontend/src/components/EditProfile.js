import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner, Alert } from 'react-bootstrap'; // Added Form, Button, Spinner, Alert for better UI
import {
  FaCamera,
  FaLock,
  FaQuestionCircle,
  FaSignOutAlt,
  FaUserEdit,
  FaTimes, // Added FaTimes for close button in modals
} from 'react-icons/fa';

// --- Change Password Modal Component ---
const ChangePasswordModal = ({ show, onHide, onChangePassword }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError("New password and confirm new password don't match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call for changing password
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
      onChangePassword(currentPassword, newPassword);
      setSuccess("Password changed successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      onHide(); // Close modal on success
    } catch (err) {
      setError("Failed to change password. Please try again."); // More generic error for security
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header className="bg-dark text-light border-0">
        <Modal.Title>Change Password</Modal.Title>
        <Button variant="link" className="text-light" onClick={onHide}>
          <FaTimes size={20} />
        </Button>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formCurrentPassword">
            <Form.Label>Current Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formNewPassword">
            <Form.Label>New Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter new password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="formConfirmNewPassword">
            <Form.Label>Confirm New Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Button
            variant="dark"
            type="submit"
            className="w-100 py-2 d-flex align-items-center justify-content-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Changing...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

// --- EditProfile Component ---
const EditProfile = ({ show, onHide, userData, onSave, onSettings, onLogout, onChangePassword }) => {
  const [formData, setFormData] = useState({
    bio: userData?.bio || '',
    profilePicture: null,
  });
  const [previewUrl, setPreviewUrl] = useState(userData?.profilePicture || null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    if (userData?.profilePicture) {
      setPreviewUrl(userData.profilePicture);
    }
    // Reset form data when modal is shown/hidden or user data changes
    if (show) {
      setFormData({ bio: userData?.bio || '', profilePicture: null });
      setPreviewUrl(userData?.profilePicture || null);
    }
  }, [userData, show]);

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

  const handleShowChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleHideChangePassword = () => {
    setShowChangePasswordModal(false);
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="md" className="edit-profile-modal">
        <Modal.Header closeButton className="bg-dark text-light border-0">
        </Modal.Header>
        <Modal.Body className="p-0" style={{ backgroundColor: '#f8f9fa' }}> {/* Lighter background */}
          {/* Profile Header */}
          <div className="text-center p-1 bg-dark"> {/* Removed rounded-lg here for full width */}
            <div className="position-relative mx-auto mb-3" style={{ width: 120, height: 120 }}> {/* Slightly larger image */}
              <div
                className="profile-image-container shadow"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid #fff', // Thicker white border
                }}
              >
                <img
                  src={previewUrl || 'https://via.placeholder.com/150'}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  className="image-overlay d-flex justify-content-center align-items-center"
                  onClick={() => document.getElementById('profile-image-input').click()}
                >
                  <FaCamera className="text-white" size={24} /> {/* Larger camera icon */}
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
            <h5 className="text-light mb-1 fw-semibold">{userData?.userName || 'Your Name'}</h5>
            <p className="text-light small opacity-75">{userData?.phone || '+91 0000000000'}</p> {/* Moved phone here */}
          </div>

          {/* Editable Bio Section */}
          

          <hr className="my-3 mx-4" /> {/* Slightly thicker HR */}

          {/* Options */}
          <div className="px-4 pb-4 d-flex flex-column gap-3"> {/* Increased gap */}
            <div className="option-row" onClick={handleShowChangePassword}> {/* Opens the new modal */}
              <FaLock className="text-primary" /> Change Password
            </div>
            <div className="option-row" onClick={onSettings}> {/* Existing onSettings for other settings */}
              <FaQuestionCircle className="text-info" /> Help & Support {/* Changed color for differentiation */}
            </div>
            <div className="option-row" onClick={onLogout} style={{ color: '#e74c3c' }}>
              <FaSignOutAlt /> Log Out
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Render Change Password Modal */}
      <ChangePasswordModal
        show={showChangePasswordModal}
        onHide={handleHideChangePassword}
        onChangePassword={onChangePassword} // Pass the change password handler
      />

      <style jsx>{`
        .edit-profile-modal .modal-content {
          border: none;
          /* More rounded corners for the modal */
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15); /* Stronger shadow */
          overflow: hidden; /* Ensures rounded corners are applied to content */
        }

        .profile-image-container:hover .image-overlay {
          opacity: 1;
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5); /* Darker overlay */
          opacity: 0;
          transition: opacity 0.3s ease;
          cursor: pointer;
          border-radius: 50%; /* Ensure overlay is also round */
        }

        .option-row {
          display: flex;
          align-items: center;
          gap: 12px; /* Increased gap for icon and text */
          font-size: 1.05rem; /* Slightly larger text */
          padding: 12px 15px; /* More padding */
          border-radius: 10px; /* Slightly more rounded */
          background: #fff;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08); /* Better shadow */
          cursor: pointer;
          transition: all 0.2s ease; /* Smooth transition for all properties */
        }

        .option-row:hover {
          background: #e9ecef; /* Lighter hover background */
          transform: translateY(-2px); /* Subtle lift effect */
          box-shadow: 0 5px 12px rgba(0, 0, 0, 0.1); /* Enhanced shadow on hover */
        }

        .option-row svg {
          font-size: 1.3rem; /* Larger icons */
        }

        .btn-primary {
          background-color: #007bff; /* Bootstrap primary blue */
          border-color: #007bff;
        }

        .btn-primary:hover {
          background-color: #0056b3;
          border-color: #004085;
        }

        .modal-header .btn-close {
          filter: invert(1); /* Makes the close button white */
        }
      `}</style>
    </>
  );
};

export default EditProfile;