import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Form, Button, Spinner, Alert, ProgressBar, Card, InputGroup, Badge } from 'react-bootstrap';
import { FaBook, FaMusic, FaFutbol, FaGamepad, FaVideo } from 'react-icons/fa';
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
  // 1. Initialize state for new fields (First Name and Last Name)
  const [firstName, setFirstName] = useState(userData?.firstName || '');
  const [lastName, setLastName] = useState(userData?.lastName || '');
  // Existing state for Bio
  const [bio, setBio] = useState(userData?.bio || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Optional: Simple validation check for required fields
    if (!firstName.trim() || !lastName.trim() || !bio.trim()) {
      alert("First Name, Last Name, and Bio are required!");
      setIsLoading(false);
      return;
    }

    // Simulate API call to save data
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 2. Pass ALL updated data to the parent handler
    onSaveBasicInfo({
      firstName,
      lastName,
      bio
    });

    setIsLoading(false);
    onHide();
  };

  // Determine if the save button should be disabled
  const isSaveDisabled = isLoading || !firstName.trim() || !lastName.trim() || !bio.trim();

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header className="bg-primary text-light border-0">
        <Modal.Title><FaGlobe className="me-2" /> Complete Basic Info</Modal.Title>
        <Button variant="link" className="text-light" onClick={onHide}><FaTimes size={20} /></Button>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted">A few basic details to complete your profile.</p>
        <Form onSubmit={handleSubmit}>

          {/* NEW: First Name Input */}
          <Form.Group className="mb-3" controlId="formFirstName">
            <Form.Label><FaUserEdit className="me-1" /> First Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </Form.Group>

          {/* NEW: Last Name Input */}
          <Form.Group className="mb-3" controlId="formLastName">
            <Form.Label>Last Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </Form.Group>

          {/* Existing: Short Bio Textarea */}
          <Form.Group className="mb-3" controlId="formBio">
            <Form.Label>Short Bio</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Tell the world a little about yourself (e.g., student, developer, traveler)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
            />
          </Form.Group>

          {/* Submit Button */}
          <Button
            variant="primary"
            type="submit"
            className="w-100 mt-3"
            disabled={isSaveDisabled}
          >
            {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" className="me-2" /> : "Save Info"}
          </Button>
        </Form>
      </Modal.Body>
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
  // 1. Initialize State for all categories
  const initialInterests = INTEREST_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = [];
    return acc;
  }, {});

  const [selectedInterests, setSelectedInterests] = useState(initialInterests);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  // --- Helper Logic ---

  // Function to handle adding/removing an interest tag
  const toggleInterest = useCallback((categoryKey, interest) => {
    setShowError(false); // Clear error on change
    setSelectedInterests(prev => {
      const currentList = prev[categoryKey];
      const isSelected = currentList.includes(interest);

      const newList = isSelected
        ? currentList.filter(i => i !== interest) // Remove
        : [...currentList, interest];            // Add

      return {
        ...prev,
        [categoryKey]: newList
      };
    });
  }, []);

  // Memoized value to count total selected interests across all categories
  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedInterests).flat().length;
  }, [selectedInterests]);

  // --- Submission Handler ---

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (totalSelectedCount < 3) {
      setShowError(true);
      return;
    }

    setIsLoading(true);
    setShowError(false);

    // Simulate API call and setting onboardingComplete: true
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Pass the full data object to the parent handler
    onSaveInterests({
      interests: selectedInterests,
      onboardingComplete: true
    });

    setIsLoading(false);
    onHide();
  };

  // --- Interest Selection Component (Inline/Functional) ---
  const InterestCategorySelector = ({ category }) => (
    <div className="mb-4">
      <h5 className="d-flex align-items-center">
        <category.icon className="me-2 text-success" /> {category.label}
      </h5>
      <div className="d-flex flex-wrap gap-2">
        {category.options.map((option) => {
          const isSelected = selectedInterests[category.key].includes(option);
          return (
            <Button
              key={option}
              variant={isSelected ? 'success' : 'outline-secondary'}
              size="sm"
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
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header className="bg-success text-light border-0">
        <Modal.Title><FaPalette className="me-2" /> Select Your Interests</Modal.Title>
        <Button variant="link" className="text-light" onClick={onHide}><FaTimes size={20} /></Button>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted">
          Select **at least 3 interests** to connect with similar people.
        </p>

        {/* Status and Error Alert */}
        {showError && (
          <Alert variant="danger" className="text-center">
            Please select at least 3 interests. You have selected {totalSelectedCount}.
          </Alert>
        )}
        <div className="d-flex justify-content-between mb-3">
          <h6 className="m-0">Total Selected:</h6>
          <Badge bg={totalSelectedCount >= 3 ? 'success' : 'warning'} className="fs-6">
            {totalSelectedCount} / 3
          </Badge>
        </div>

        <hr className="my-2" />

        {/* Render All Interest Categories */}
        <div className="interest-selection-container" style={{ maxHeight: '40vh', overflowY: 'auto', paddingRight: '10px' }}>
          {INTEREST_CATEGORIES.map(category => (
            <InterestCategorySelector key={category.key} category={category} />
          ))}
        </div>

        <Form onSubmit={handleSubmit}>
          <Button
            variant="success"
            type="submit"
            className="w-100 mt-4"
            disabled={isLoading || totalSelectedCount < 3} // Disable if loading or not enough selected
          >
            {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" className="me-2" /> : "Finish Onboarding"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

// --- Settings Modal (Kept the same) ---
const SettingsModal = ({ show, onHide, isPrivate, onTogglePrivate, onShowChangePassword, onLogout }) => {
  return (
    <Modal show={show} onHide={onHide} >
      <Modal.Header className="bg-dark text-light border-0">
        <Modal.Title>
          <FaCog className="me-2" /> Account Settings
        </Modal.Title>
        <Button variant="link" className="text-light" onClick={onHide}>
          <FaTimes size={20} />
        </Button>
      </Modal.Header>

      <Modal.Body className="p-4 d-grid gap-3">
        <div className="option-row justify-content-between bg-light p-3 rounded shadow-sm">
          <span className="d-flex align-items-center gap-3">
            <FaUserSecret className="text-danger" size={20} /> <strong>Private Profile</strong>
          </span>
          <Form.Check
            type="switch"
            id="custom-switch-private"
            label={isPrivate ? "On" : "Off"}
            checked={isPrivate}
            onChange={onTogglePrivate}
            className="fw-bold"
          />
        </div>

        <div className="option-row" onClick={() => { onHide(); onShowChangePassword(); }}>
          <FaLock className="text-primary" /> Change Password
        </div>

        <div className="option-row" onClick={() => { alert('Redirect to Help Center...'); onHide(); }}>
          <FaQuestionCircle className="text-info" /> Help & Support
        </div>

        <div className="option-row" onClick={onLogout} style={{ color: '#e74c3c' }}>
          <FaSignOutAlt /> <strong>Log Out</strong>
        </div>
      </Modal.Body>
    </Modal>

  );
};

// --- Profile Stepper Component (NEW HORIZONTAL STRIP) ---
const ProfileStepper = ({ steps, onStartAction }) => {
  const totalSteps = steps.length;
  const completedStepsCount = steps.filter(step => step.isCompleted).length;
  const progress = Math.round((completedStepsCount / totalSteps) * 100);

  const getStepStatus = (index) => {
    if (steps[index].isCompleted) return 'complete';
    if (index === completedStepsCount) return 'active';
    return 'pending';
  };

  return (
    <div className="p-4 mx-4 mb-2 bg-white shadow-sm rounded-lg">
      <h6 className="fw-bold mb-4">
        <FaUserEdit className="me-2 text-primary" /> Profile Setup ({progress}%)
      </h6>

      <div className="d-flex justify-content-between position-relative step-container">
        {/* Horizontal Connector Line */}


        {steps.map((step, index) => {
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
      setError("New password and confirm new password don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onChangePassword(currentPassword, newPassword);
      setSuccess("Password changed successfully!");
      setTimeout(onHide, 1000);
    } catch (err) {
      setError("Failed to change password. Please try again.");
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
            <Form.Control type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="formNewPassword">
            <Form.Label>New Password</Form.Label>
            <Form.Control type="password" placeholder="Enter new password (min 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-4" controlId="formConfirmNewPassword">
            <Form.Label>Confirm New Password</Form.Label>
            <Form.Control type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
          </Form.Group>
          <Button variant="dark" type="submit" className="w-100 py-2 d-flex align-items-center justify-content-center" disabled={isLoading}>
            {isLoading ? (<><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Changing...</>) : ("Change Password")}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};
const EditProfile = ({ show, onHide, userData, onSave, onLogout, onChangePassword, onTogglePrivateProfile }) => {
  const [formData, setFormData] = useState({});
  const [previewUrl, setPreviewUrl] = useState(userData?.profilePicture || null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [isPrivate, setIsPrivate] = useState(userData?.isPrivate || false);
  const hasBio = userData?.bio !== "undefined";
  const isInterestsComplete = userData?.onboardingComplete;
  const steps = [
    // {
    //   id: 'emailVerified',
    //   icon: FaEnvelopeOpenText,
    //   label: 'Email Verification',
    //   isCompleted: userData?.emailVerified, // true by default in your data
    //   actionText: 'Verified',
    //   onAction: () => alert('Email is already verified!'),
    // },
    {
      id: 'basicProfile',
      icon: FaGlobe,
      label: 'Basic Info',
      // Step 2 is complete if NOT using the default Google picture AND has a bio
      isCompleted: hasBio,
      actionText: 'Add Bio/Picture',

      onAction: () => setShowBasicInfoModal(true),
    },
    {
      id: 'onboarding',
      icon: FaPalette,
      label: 'Interests',
      isCompleted: isInterestsComplete,
      actionText: 'Add Interests',
      onAction: () => setShowInterestsModal(true),
    },
  ];

  // Sync state on prop change
  useEffect(() => {
    if (userData?.profilePicture) {
      setPreviewUrl(userData.profilePicture);
    }
    if (userData?.isPrivate !== undefined) {
      setIsPrivate(userData.isPrivate);
    }
    if (show) {
      setFormData({ profilePicture: null });
      setPreviewUrl(userData?.profilePicture || null);
    }
  }, [userData, show]);

  // Handlers for Modals/Actions
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const updatedFormData = { profilePicture: file };
      setFormData(updatedFormData);
      setPreviewUrl(URL.createObjectURL(file));
      onSave(updatedFormData); // Update picture immediately
    }
  };

  const handleTogglePrivate = (newPrivateStatus) => {
    setIsPrivate(newPrivateStatus);
    onTogglePrivateProfile(newPrivateStatus);
  };

  const handleSaveBasicInfo = (data) => {
    // This merges with existing data, updating bio
    onSave(data);
  };

  const handleSaveInterests = (data) => {
    // This updates the interests object and sets onboardingComplete: true
    onSave(data);
  };

  return (
    <>
      <Modal show={show} onHide={onHide}  size="lg" className="edit-profile-modal"> {/* Increased size for stepper */}
        <Modal.Header className="bg-dark text-light border-0 m-2">
          <Modal.Title className="fw-bold">My Profile</Modal.Title>
          <div>
          <Button variant="link" className="text-light" onClick={() => setShowSettingsModal(true)}>
            <FaCog size={24} />
          </Button>
          <Button variant="link" className="text-light" onClick={onHide}>
            <FaTimes size={24} />
          </Button>
          </div>
        </Modal.Header>

        <Modal.Body className="p-0  mx-2" style={{ backgroundColor: '#f8f9fa' }}>

          {/* Profile Header */}
          <div className="text-center bg-dark">
            <div className="position-relative mx-auto mb-3" style={{ width: 120, height: 120 }}>
              <div
                className="profile-image-container shadow"
                onClick={() => document.getElementById('profile-image-input').click()}
                style={{
                  width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff',
                }}
              >
                <img
                  src={previewUrl || 'https://via.placeholder.com/150'}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="image-overlay d-flex justify-content-center align-items-center">
                  <FaCamera className="text-white" size={24} />
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
            <p className=" small text-light mb-2">{userData?.email}</p>
          </div>

          {/* 1. Horizontal Stepper */}
          <ProfileStepper steps={steps} onStartAction={() => { }} />

          <hr className="my-3 mx-4" />

          {/* 2. Additional Profile Info Section */}
          <div className="px-4 pb-2">
            <Card className="p-3 shadow-sm border-0">
              <Card.Title className="fw-bold mb-3"><FaUserEdit className="me-2 text-primary" /> Quick Profile Info</Card.Title>
              <p className="text-muted small mb-1">Bio:</p>
              <p className="fw-medium text-break">{userData?.bio || "No bio added yet. Click 'Add Bio/Picture' above to complete."}</p>
            </Card>
          </div>
        </Modal.Body>
      </Modal>

      {/* Render Modals */}
      <BasicInfoModal
        setShow={setShowBasicInfoModal}
        show={showBasicInfoModal}
        onHide={() => setShowBasicInfoModal(false)}
        userData={userData}
        onSaveBasicInfo={handleSaveBasicInfo}
      />

      <InterestsModal
        setShow={setShowInterestsModal}
        show={showInterestsModal}
        onHide={() => setShowInterestsModal(false)}
        onSaveInterests={handleSaveInterests}
      />

      <SettingsModal
        show={showSettingsModal}
        onHide={() => setShowSettingsModal(false)}
        isPrivate={isPrivate}
        onTogglePrivate={handleTogglePrivate}
        onShowChangePassword={() => setShowChangePasswordModal(true)}
        onLogout={onLogout}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        show={showChangePasswordModal}
        onHide={() => setShowChangePasswordModal(false)}
        onChangePassword={onChangePassword}
      />

      <style jsx>{`
        /* --- Stepper Styles --- */
        .step-container {
            position: relative;
            padding-bottom: 25px; /* Space for action button */
        }
        
        .stepper-progress-line {
            position: absolute;
            top: -10px;
            left: 0;
            height: 4px;
            background-color: var(--bs-primary); /* Use Bootstrap primary color */
            transition: width 0.5s ease-in-out;
            z-index: 1;
        }

        .stepper-step {
            flex-grow: 1;
            position: relative;
            z-index: 2;
        }

        .stepper-step::before {
            content: '';
            position: absolute;
            top:  -10px;
            left: 0;
            right: 0;
            height: 4px;
            background-color: #dee2e6;
            z-index: -1;
        }

        .stepper-step:first-child::before {
            left: 50%;
        }

        .stepper-step:last-child::before {
            right: 50%;
        }

        .step-icon {
            width: 40px;
            height: 40px;
            background-color: #6c757d; /* Default gray */
            transition: background-color 0.3s ease;
        }

        .stepper-step.complete .step-icon {
            background-color: var(--bs-success);
        }

        .stepper-step.active .step-icon {
            background-color: var(--bs-primary);
            transform: scale(1.1);
        }
        
        /* Action Button style */
        .step-action-button {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
        }

        /* --- Other existing styles --- */
        .edit-profile-modal .modal-content {
          border: none;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
          overflow: hidden;
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
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.3s ease;
          cursor: pointer;
          border-radius: 50%;
        }
        .option-row {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1rem;
            padding: 12px 15px;
            border-radius: 10px;
            background: #fff;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .option-row:hover {
            background: #e9ecef;
            transform: translateY(-2px);
            box-shadow: 0 5px 12px rgba(0, 0, 0, 0.1);
        }
        .option-row svg {
            font-size: 1.3rem;
        }
            /* Make Bootstrap modal backdrop blurred */
.modal-backdrop.show {
  backdrop-filter: blur(8px);
  background-color: rgba(0, 0, 0, 0.3); /* optional tint */
}

/* Optional: make the modal itself look frosted */
.modal-content {
  background: rgb(212 212 212 / 85%);
  backdrop-filter: blur(5px);
  border: none;
}

      `}</style>
    </>
  );
};

export default EditProfile;