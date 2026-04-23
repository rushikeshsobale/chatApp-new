import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Form, Button, Spinner, Alert, ProgressBar, Card, InputGroup, Badge } from 'react-bootstrap';
import { xx } from 'react-icons/fa';
import { FaBook, FaMusic, FaFutbol, FaGamepad, FaVideo, FaChevronRight } from 'react-icons/fa';
import {
  FaCamera,
  FaLock,
  FaQuestionCircle,
  FaSignOutAlt,
  FaTimes,
  FaCheckCircle,
  FaArrowRight,
  FaCog,
  FaUserSecret,
  FaEnvelopeOpenText,
  FaPalette,
  FaGlobe, // Added for Bio/Basic Info
  FaUserEdit,
} from 'react-icons/fa';


// --- Modals for Step Completion ---

// 1. Basic Info Modal
const BasicInfoModal = ({ setShow, show, onHide, userData, onSaveBasicInfo }) => {
  const [firstName, setFirstName] = useState(userData?.firstName || '');
  const [lastName, setLastName] = useState(userData?.lastName || '');
  const [bio, setBio] = useState(userData?.bio || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    onSaveBasicInfo({ firstName, lastName, bio });
    setIsLoading(false);
    onHide();
  };

  const isSaveDisabled = isLoading || !firstName.trim() || !lastName.trim() || !bio.trim();

  // Custom styles for the dark aesthetic
  const darkModalStyle = {
    backgroundColor: '#121212', // Deep black/grey
    color: '#e0e0e0',           // Off-white text
    border: '1px solid #333'    // Subtle border
  };

  const inputStyle = {
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    color: '#fff',
    fontSize: '0.95rem'
  };

  return (
    <Modal show={show} onHide={onHide} centered contentClassName="border-0">
      <div style={darkModalStyle} className="rounded-3">
        <Modal.Header className="border-0 pb-0 d-flex justify-content-between align-items-center">
          <Modal.Title className="fs-5 fw-bold text-white">
            Profile Details
          </Modal.Title>
          <Button
            variant="link"
            className="text-muted p-0"
            onClick={onHide}
          >
            <FaTimes size={18} />
          </Button>
        </Modal.Header>

        <Modal.Body className="pt-2">
          <p className="small text-secondary mb-4">Complete your information to continue.</p>

          <Form onSubmit={handleSubmit}>
            <div className="row g-2">
              <Form.Group className="col-md-6 mb-3" controlId="formFirstName">
                <Form.Label className="small text-secondary">First Name</Form.Label>
                <Form.Control
                  style={inputStyle}
                  className="shadow-none focus-dark"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="col-md-6 mb-3" controlId="formLastName">
                <Form.Label className="small text-secondary">Last Name</Form.Label>
                <Form.Control
                  style={inputStyle}
                  className="shadow-none focus-dark"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </Form.Group>
            </div>

            <Form.Group className="mb-4" controlId="formBio">
              <Form.Label className="small text-secondary">Short Bio</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                style={inputStyle}
                className="shadow-none focus-dark"
                placeholder="Brief description..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              variant="light"
              type="submit"
              className="w-100 fw-bold py-2 mb-2"
              disabled={isSaveDisabled}
              style={{ borderRadius: '6px' }}
            >
              {isLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </Form>
        </Modal.Body>
      </div>
    </Modal>
  );
};
// 2. Interests Modal (Placeholder)
const INTEREST_CATEGORIES = [
  { key: 'books', label: 'Books 📚', icon: FaBook, options: ['Fantasy', 'Sci-Fi', 'Non-Fiction', 'Biography', 'Mystery', 'Poetry'] },
  { key: 'music', label: 'Music 🎵', icon: FaMusic, options: ['Pop', 'Rock', 'Hip Hop', 'Jazz', 'Classical', 'Electronic'] },
  { key: 'sports', label: 'Sports ⚽', icon: FaFutbol, options: ['Basketball', 'Football', 'Soccer', 'Tennis', 'Running', 'Yoga'] },
  { key: 'hobbies', label: 'Hobbies 🎨', icon: FaGamepad, options: ['Gaming', 'Cooking', 'Photography', 'Traveling', 'Gardening', 'Coding'] },
  { key: 'movies', label: 'Movies 🎬', icon: FaVideo, options: ['Action', 'Comedy', 'Drama', 'Horror', 'Documentary', 'Anime'] },
];

const InterestsModal = ({ show, onHide, onSaveInterests }) => {
  const initialInterests = INTEREST_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = [];
    return acc;
  }, {});

  const [selectedInterests, setSelectedInterests] = useState(initialInterests);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const toggleInterest = useCallback((categoryKey, interest) => {
    setShowError(false);
    setSelectedInterests(prev => {
      const currentList = prev[categoryKey];
      const isSelected = currentList.includes(interest);
      const newList = isSelected
        ? currentList.filter(i => i !== interest)
        : [...currentList, interest];

      return { ...prev, [categoryKey]: newList };
    });
  }, []);

  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedInterests).flat().length;
  }, [selectedInterests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalSelectedCount < 3) {
      setShowError(true);
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    onSaveInterests({ interests: selectedInterests, onboardingComplete: true });
    setIsLoading(false);
    onHide();
  };

  // Modern Dark Styles
  const darkModalStyle = {
    backgroundColor: '#121212',
    color: '#e0e0e0',
    border: '1px solid #333'
  };

  const tagStyle = (isSelected) => ({
    backgroundColor: isSelected ? '#ffffff' : 'transparent',
    color: isSelected ? '#000' : '#888',
    borderColor: isSelected ? '#ffffff' : '#444',
    fontSize: '0.8rem',
    borderRadius: '20px',
    transition: 'all 0.2s ease',
    fontWeight: isSelected ? '600' : '400'
  });

  const InterestCategorySelector = ({ category }) => (
    <div className="mb-4">
      <h6 className="text-white-50 mb-3 text-uppercase small ls-wide">
        <category.icon className="me-2" /> {category.label}
      </h6>
      <div className="d-flex flex-wrap gap-2">
        {category.options.map((option) => {
          const isSelected = selectedInterests[category.key].includes(option);
          return (
            <Button
              key={option}
              variant="outline-secondary"
              style={tagStyle(isSelected)}
              className="px-3"
              onClick={() => toggleInterest(category.key, option)}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Modal show={show} onHide={onHide} centered contentClassName="border-0">
      <div style={darkModalStyle} className="rounded-4 overflow-hidden">
        <Modal.Header className="border-0 pb-0 d-flex justify-content-between">
          <Modal.Title className="fs-5 fw-bold text-white">Your Interests</Modal.Title>
          <Button variant="link" className="text-muted p-0" onClick={onHide}><FaTimes /></Button>
        </Modal.Header>

        <Modal.Body>
          <p className="small text-secondary mb-4">
            Pick at least 3 things you love to personalize your feed.
          </p>

          <div className="interest-selection-container pe-2 mb-4"
            style={{ maxHeight: '45vh', overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {INTEREST_CATEGORIES.map(category => (
              <InterestCategorySelector key={category.key} category={category} />
            ))}
          </div>

          <div className="pt-3 border-top border-dark">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="small text-secondary">
                {totalSelectedCount < 3 ? `Select ${3 - totalSelectedCount} more` : 'Ready to go!'}
              </span>
              <span className={`small fw-bold ${totalSelectedCount >= 3 ? 'text-white' : 'text-secondary'}`}>
                {totalSelectedCount} / 3
              </span>
            </div>

            <Form onSubmit={handleSubmit}>
              <Button
                variant="light"
                type="submit"
                className="w-100 fw-bold py-2 shadow-sm"
                disabled={isLoading || totalSelectedCount < 3}
              >
                {isLoading ? <Spinner size="sm" /> : "Finish"}
              </Button>
            </Form>
          </div>
        </Modal.Body>
      </div>
    </Modal>
  );
};
// --- Settings Modal (Kept the same) ---
const SettingsModal = ({ show, onHide, isPrivate, onTogglePrivate, onShowChangePassword, onLogout }) => {
  const darkModalStyle = {
    backgroundColor: '#121212',
    color: '#e0e0e0',
    border: '1px solid #333'
  };

  // Shared style for row items
  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    borderBottom: '1px solid #222'
  };

  return (
    <Modal show={show} onHide={onHide} centered contentClassName="border-0">
      <div style={darkModalStyle} className="rounded-4 overflow-hidden">
        <Modal.Header className="border-0 pb-0 d-flex justify-content-between">
          <Modal.Title className="fs-5 fw-bold text-white">Settings</Modal.Title>
          <Button variant="link" className="text-muted p-0" onClick={onHide}>
            <FaTimes size={18} />
          </Button>
        </Modal.Header>

        <Modal.Body className="px-4 pb-4">
          <p className="small text-secondary mb-3">Manage your account and privacy</p>

          {/* Privacy Switch Row */}
          <div style={rowStyle} className="justify-content-between">
            <span className="d-flex align-items-center gap-3">
              <FaUserSecret className="text-secondary" size={18} />
              <span className="small fw-medium">Private Profile</span>
            </span>
            <Form.Check
              type="switch"
              id="private-switch"
              checked={isPrivate}
              onChange={onTogglePrivate}
              className="custom-dark-switch"
            />
          </div>

          {/* Change Password */}
          <div
            style={rowStyle}
            onClick={() => { onHide(); onShowChangePassword(); }}
            className="hover-opacity"
          >
            <span className="d-flex align-items-center gap-3">
              <FaLock className="text-secondary" size={16} />
              <span className="small fw-medium">Change Password</span>
            </span>
          </div>

          {/* Help Center */}
          <div
            style={rowStyle}
            onClick={() => { alert('Redirecting...'); onHide(); }}
            className="hover-opacity"
          >
            <span className="d-flex align-items-center gap-3">
              <FaQuestionCircle className="text-secondary" size={16} />
              <span className="small fw-medium">Help & Support</span>
            </span>
          </div>

          {/* Log Out - Minimalist Danger Style */}
          <div
            style={{ ...rowStyle, borderBottom: 'none' }}
            onClick={onLogout}
            className="hover-opacity mt-2"
          >
            <span className="d-flex align-items-center gap-3 text-danger">
              <FaSignOutAlt size={16} />
              <span className="small fw-bold">Log Out</span>
            </span>
          </div>
        </Modal.Body>
      </div>
    </Modal>
  );
};
// --- Profile Stepper Component (NEW HORIZONTAL STRIP) ---
const ProfileStepper = ({ steps, onStartAction }) => {
  const totalSteps = steps?.length;
  const completedStepsCount = steps?.filter(step => step.isCompleted)?.length;
  const progress = Math.round((completedStepsCount / totalSteps) * 100);

  const getStepStatus = (index) => {
    if (steps[index].isCompleted) return 'complete';
    if (index === completedStepsCount) return 'active';
    return 'pending';
  };

  return (
    <div className="px-4 py-1  mb-1 bg-white shadow-sm rounded-lg">
      <h6 className=" mb-4">
        <FaUserEdit className="me-2 text-primary" /> Profile Setup ({progress}%)
      </h6>

      <div className="d-flex justify-content-between position-relative step-container">
        {/* Horizontal Connector Line */}


        {steps?.map((step, index) => {
          const status = getStepStatus(index);
          const isActive = status === 'active';
          const isCompleted = status === 'complete';
          const isPending = status === 'pending';

          return (
            <div
              key={step.id}
              className={`stepper-step text-center ${status}`}
              onClick={step.onAction}
              style={{ cursor: isActive ? 'pointer' : 'default' }}
            >
              <div className={`step-icon mx-auto d-flex align-items-center justify-content-center p-2 rounded-circle shadow`}>
                {isCompleted ? <FaCheckCircle size={18} className="text-light" /> : <step.icon size={18} className="text-light" style={{ zIndex: 1 }} />}
              </div>
              <small className="d-block mt-2 fw-medium">{step.label}</small>

              {/* Action Button for Active Step */}
              {isActive && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-2 step-action-button"
                  onClick={step.onAction}
                >
                  {step.actionText || 'Start'} <FaArrowRight size={10} />
                </Button>
              )}
            </div>
          );
        })}
        <div className="stepper-progress-line" style={{ width: `${progress}%`, zIndex: 3 }}></div>
      </div>
    </div>
  );
};

const ChangePasswordModal = ({ show, onHide, onChangePassword }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!show) {
      setError('');
      setSuccess('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Minimum 8 characters required.");
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onChangePassword(currentPassword, newPassword);
      setSuccess("Password updated.");
      setTimeout(onHide, 1200);
    } catch (err) {
      setError("Error updating password.");
    } finally {
      setIsLoading(false);
    }
  };

  const darkModalStyle = {
    backgroundColor: '#121212',
    color: '#e0e0e0',
    border: '1px solid #333'
  };

  const inputStyle = {
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    color: '#fff',
    fontSize: '0.9rem',
    borderRadius: '8px'
  };

  return (
    <Modal show={show} onHide={onHide} centered contentClassName="border-0">
      <div style={darkModalStyle} className="rounded-4">
        <Modal.Header className="border-0 pb-0 d-flex justify-content-between align-items-center">
          <Modal.Title className="fs-5 fw-bold text-white">Security</Modal.Title>
          <Button variant="link" className="text-muted p-0" onClick={onHide}>
            <FaTimes size={18} />
          </Button>
        </Modal.Header>

        <Modal.Body className="pt-2">
          <p className="small text-secondary mb-4">Update your password to keep your account secure.</p>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small text-secondary">Current Password</Form.Label>
              <Form.Control
                type="password"
                style={inputStyle}
                className="shadow-none focus-dark"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small text-secondary">New Password</Form.Label>
              <Form.Control
                type="password"
                style={inputStyle}
                className="shadow-none focus-dark"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small text-secondary">Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                style={inputStyle}
                className="shadow-none focus-dark"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </Form.Group>

            {/* Subtle Inline Feedback */}
            {error && <div className="text-danger small mb-3 text-center fw-medium">{error}</div>}
            {success && <div className="text-white small mb-3 text-center fw-medium">{success}</div>}

            <Button
              variant="light"
              type="submit"
              className="w-100 fw-bold py-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "Update Password"
              )}
            </Button>
          </Form>
        </Modal.Body>
      </div>
    </Modal>
  );
};


const EditProfile = ({ show, onHide, userData, onSave, onLogout, onChangePassword, onTogglePrivateProfile }) => {
  const [previewUrl, setPreviewUrl] = useState(userData?.profilePicture || null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [onShowChangePassword, setShowChangePassword] = useState(false);
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const updatedFormData = { profilePicture: file };
      // setFormData(updatedFormData);
      setPreviewUrl(URL.createObjectURL(file));
      onSave(updatedFormData); // Update picture immediately
    }
  };
  // Define steps for 2026 Minimalist UI
  const steps = [
    { id: 'basic', label: 'Basic Info', isCompleted: userData?.bio !== "undefined", onAction: () => setShowBasicInfoModal(true) },
    { id: 'interests', label: 'Interests', isCompleted: userData?.onboardingComplete, onAction: () => setShowInterestsModal(true) }
  ];

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="md">
        <Modal.Body className="p-0 bg-prof-dark border-0">
          {/* Header Actions */}
          <div className="d-flex justify-content-between p-3 position-absolute w-100" style={{ zIndex: 10 }}>
            <button className="prof-icon-btn" onClick={() => setShowSettingsModal(true)}><FaCog /></button>
            <button className="prof-icon-btn" onClick={onHide}><FaTimes /></button>
          </div>

          {/* Profile Identity Section */}
          <div className="prof-hero pt-5 pb-4 text-center">
            <div className="prof-avatar-wrapper mx-auto mb-3">
              <img src={previewUrl || 'https://via.placeholder.com/150'} alt="Profile" />
              <div className="prof-avatar-overlay" onClick={() => document.getElementById('img-input').click()}>
                <FaCamera size={14} />
              </div>
              <input id="img-input" type="file" hidden onChange={(e) => handleImageChange(e)} />
            </div>
            <div className="prof-user-name">{userData?.userName || 'User'}</div>
            <div className="prof-user-email">{userData?.email}</div>
          </div>

          {/* New Modern Stepper Section */}
          <div className="px-4 py-3">
            <div className="prof-section-label">Profile Completion</div>
            <div className="prof-stepper-grid">
              {steps.map(step => (
                <div
                  key={step.id}
                  className={`prof-step-item ${step.isCompleted ? 'completed' : ''}`}
                  onClick={step.onAction}
                >
                  <div className="prof-step-indicator" />
                  <div className="prof-step-content">
                    <span>{step.label}</span>
                    <FaChevronRight size={10} className="prof-arrow" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bio Section */}
          <div className="px-4 pb-4">
            <div className="prof-section-label">Current Bio</div>
            <div className="prof-bio-box">
              {userData?.bio && userData.bio !== "undefined" ? userData.bio : "Add a bio to complete your professional profile."}
            </div>
          </div>

          <BasicInfoModal
            show={showBasicInfoModal}
            onHide={() => setShowBasicInfoModal(false)}
            userData={userData}
            onSaveBasicInfo={onSave}
          />
          <InterestsModal
            show={showInterestsModal}
            onHide={() => setShowInterestsModal(false)}
            onSaveInterests={onSave}
          />
          <SettingsModal
            show={showSettingsModal}
            onHide={() => setShowSettingsModal(false)}
            onShowChangePassword={() => setShowChangePassword(true)}
            onLogout={onLogout}
          />

          <ChangePasswordModal
            show={onShowChangePassword}
            onHide={() => setShowChangePassword(false)}
            onChangePassword={onChangePassword}
          />
        
        </Modal.Body>
      </Modal>

      <style jsx>{`
        /* Core Dark Theme */
        :global(.modal-content) { background: transparent; border: none; }
        .bg-prof-dark { background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 16px; overflow: hidden; }
        
        .prof-icon-btn { background: none; border: none; color: #555; transition: 0.2s; cursor: pointer; }
        .prof-icon-btn:hover { color: #fff; }

        /* Identity */
        .prof-hero { background: linear-gradient(180deg, #141414 0%, #0d0d0d 100%); }
        .prof-avatar-wrapper { width: 90px; height: 90px; border-radius: 50%; position: relative; border: 1px solid #222; padding: 4px; }
        .prof-avatar-wrapper img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .prof-avatar-overlay { 
          position: absolute; inset: 4px; background: rgba(0,0,0,0.4); 
          border-radius: 50%; display: flex; align-items: center; justify-content: center; 
          color: #fff; opacity: 0; transition: 0.2s; cursor: pointer;
        }
        .prof-avatar-wrapper:hover .prof-avatar-overlay { opacity: 1; }
        
        .prof-user-name { font-size: 1rem; color: #fff; font-weight: 400; margin-top: 8px; }
        .prof-user-email { font-size: 0.75rem; color: #555; letter-spacing: 0.2px; }

        /* Modern Segmented Stepper */
        .prof-section-label { font-size: 0.65rem; color: #444; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        
        .prof-stepper-grid { display: flex; gap: 10px; margin-bottom: 20px; }
        .prof-step-item { 
          flex: 1; background: #141414; border: 1px solid #1f1f1f; 
          padding: 10px; border-radius: 8px; cursor: pointer; transition: 0.2s;
        }
        .prof-step-item:hover { border-color: #333; background: #181818; }
        
        .prof-step-indicator { height: 3px; background: #222; border-radius: 2px; margin-bottom: 8px; }
        .prof-step-item.completed .prof-step-indicator { background: #fff; }
        
        .prof-step-content { display: flex; justify-content: space-between; align-items: center; }
        .prof-step-content span { font-size: 0.75rem; color: #888; }
        .prof-step-item.completed span { color: #fff; }
        .prof-arrow { color: #333; }

        /* Bio */
        .prof-bio-box { 
          background: #141414; border: 1px solid #1f1f1f; padding: 12px; 
          border-radius: 8px; font-size: 0.8rem; color: #777; line-height: 1.5;
        }

        /* Removes default bootstrap modal backdrop blur/tint if desired */
.modal-backdrop {
  background-color: rgba(0, 0, 0, 0.8) !important;
}

/* Custom focus state for all inputs */
.focus-dark:focus {
  background-color: #1e1e1e !important;
  border-color: #888 !important; /* Lighter grey on focus */
  color: white !important;
  box-shadow: none !important;
}

/* Slim scrollbar for the Interests Modal */
.interest-selection-container::-webkit-scrollbar {
  width: 4px;
}
.interest-selection-container::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 10px;
}
      `}</style>

      {/* BasicInfo, Interests, and Settings Modals follow same style as previous components */}
    </>
  );
};

export default EditProfile;
