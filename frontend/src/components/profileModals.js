import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner, Alert, ProgressBar, Card, InputGroup } from 'react-bootstrap'; 
import {
  FaCamera,
  FaLock,
  FaQuestionCircle,
  FaSignOutAlt,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaArrowRight,
  FaCog, 
  FaUserSecret, 
  FaEnvelopeOpenText, 
  FaPalette, 
  FaUserCircle, 
  FaGlobe,
} from 'react-icons/fa';

// --- Change Password Modal Component ---
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

// --- Modals for Step Completion ---

// 1. Basic Info Modal
const BasicInfoModal = ({ show, onHide, userData, onSaveBasicInfo }) => {
    const [bio, setBio] = useState(userData?.bio || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Reset bio state when modal shows/hides
        if(show) {
            setBio(userData?.bio || '');
        }
    }, [show, userData?.bio]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call to save bio
        await new Promise((resolve) => setTimeout(resolve, 800)); 
        onSaveBasicInfo({ bio }); // Pass updated data to parent handler
        setIsLoading(false);
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header className="bg-primary text-light border-0">
                <Modal.Title><FaGlobe className="me-2"/> Complete Basic Info</Modal.Title>
                <Button variant="link" className="text-light" onClick={onHide}><FaTimes size={20} /></Button>
            </Modal.Header>
            <Modal.Body>
                <p className="text-muted">A short bio helps people understand who you are!</p>
                <Form onSubmit={handleSubmit}>
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
                    <Button variant="primary" type="submit" className="w-100 mt-3" disabled={isLoading}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" className="me-2" /> : "Save Info"}
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

// 2. Interests Modal (Placeholder)
const InterestsModal = ({ show, onHide, onSaveInterests }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call and setting onboardingComplete: true
        await new Promise((resolve) => setTimeout(resolve, 1200)); 
        // NOTE: This object structure mimics the expected API update to complete onboarding
        onSaveInterests({ interests: { music: ['Pop'], hobbies: ['Reading'] }, onboardingComplete: true }); 
        setIsLoading(false);
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header className="bg-success text-light border-0">
                <Modal.Title><FaPalette className="me-2"/> Select Your Interests</Modal.Title>
                <Button variant="link" className="text-light" onClick={onHide}><FaTimes size={20} /></Button>
            </Modal.Header>
            <Modal.Body>
                <p className="text-muted">Select at least 3 categories to connect with similar people.</p>
                <Alert variant="info">
                    [Placeholder: Complex Interest Selection Form goes here]
                </Alert>
                <Form onSubmit={handleSubmit}>
                    <Button variant="success" type="submit" className="w-100 mt-3" disabled={isLoading}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" className="me-2" /> : "Finish Onboarding"}
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

// --- Settings Modal ---
const SettingsModal = ({ show, onHide, isPrivate, onTogglePrivate, onShowChangePassword, onLogout }) => {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header className="bg-dark text-light border-0">
                <Modal.Title><FaCog className="me-2"/> Account Settings</Modal.Title>
                <Button variant="link" className="text-light" onClick={onHide}><FaTimes size={20} /></Button>
            </Modal.Header>
            <Modal.Body className="p-4 d-grid gap-3">
                <div className="option-row justify-content-between bg-light p-3 rounded shadow-sm">
                    <span className="d-flex align-items-center gap-3">
                        <FaUserSecret className="text-danger" size={20} /> 
                        **Private Profile**
                    </span>
                    <Form.Check 
                        type="switch"
                        id="custom-switch-private"
                        label={isPrivate ? "On" : "Off"}
                        checked={isPrivate}
                        onChange={(e) => onTogglePrivate(e.target.checked)} // Pass the new status
                        className="fw-bold"
                    />
                </div>
                <div className="option-row" onClick={() => {onHide(); onShowChangePassword();}}><FaLock className="text-primary" /> Change Password</div>
                <div className="option-row" onClick={() => {alert('Redirect to Help Center...'); onHide();}}><FaQuestionCircle className="text-info" /> Help & Support</div>
                <div className="option-row" onClick={onLogout} style={{ color: '#e74c3c' }}><FaSignOutAlt /> **Log Out**</div>
            </Modal.Body>
        </Modal>
    );
};

// --- Profile Stepper Component (Horizontal Strip) ---
const ProfileStepper = ({ steps }) => {
    const totalSteps = steps.length;
    const completedStepsCount = steps.filter(step => step.isCompleted).length;
    const progress = Math.round((completedStepsCount / totalSteps) * 100);

    const getStepStatus = (index) => {
        if (steps[index].isCompleted) return 'complete';
        if (index === completedStepsCount) return 'active';
        return 'pending';
    };

    return (
        <div className="p-4 mx-4 mb-4 bg-white shadow-sm rounded-lg">
            <h6 className="fw-bold mb-4">
                <FaUserEdit className="me-2 text-primary"/> Profile Setup ({progress}%)
            </h6>
            
            <div className="d-flex justify-content-between position-relative step-container">
                {/* Horizontal Connector Line */}
                <div className="stepper-progress-line" style={{ width: `${progress}%` }}></div>

                {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    const isActive = status === 'active';
                    const isCompleted = status === 'complete';

                    return (
                        <div 
                            key={step.id} 
                            className={`stepper-step text-center ${status}`} 
                        >
                            <div className={`step-icon mx-auto d-flex align-items-center justify-content-center p-2 rounded-circle shadow`}>
                                {isCompleted ? <FaCheckCircle size={18} className="text-light" /> : <step.icon size={18} className="text-light" />}
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
            </div>
        </div>
    );
};


// --- EditProfile Component (EXPORTED) ---
const EditProfile = ({ show, onHide, userData, onSave, onLogout, onChangePassword, onTogglePrivateProfile }) => {
  const [formData, setFormData] = useState({ profilePicture: null });
  const [previewUrl, setPreviewUrl] = useState(userData?.profilePicture || null);
  
  // Modal Visibility States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  
  const [isPrivate, setIsPrivate] = useState(userData?.isPrivate || false); 

  // --- Profile Completion Logic based on userData ---
  const isDefaultGooglePic = userData?.profilePicture?.includes('googleusercontent.com/profile/picture/0');
  const hasBio = !!userData?.bio;
  const isInterestsComplete = userData?.onboardingComplete; 

  const steps = [
    {
      id: 'emailVerified',
      icon: FaEnvelopeOpenText,
      label: 'Email Verification',
      isCompleted: userData?.emailVerified, 
      actionText: 'Verified',
      onAction: () => alert('Email is already verified!'),
    },
    {
      id: 'basicProfile',
      icon: FaGlobe,
      label: 'Basic Info',
      isCompleted: !isDefaultGooglePic && hasBio, 
      actionText: hasBio ? 'Update Picture' : 'Add Bio',
      onAction: () => isDefaultGooglePic ? document.getElementById('profile-image-input').click() : setShowBasicInfoModal(true),
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
      <Modal show={show} onHide={onHide} centered size="lg" className="edit-profile-modal">
        <Modal.Header className="bg-dark text-light border-0">
            <Modal.Title className="fw-bold">My Profile</Modal.Title>
            <Button variant="link" className="text-light" onClick={() => setShowSettingsModal(true)}>
                <FaCog size={24} /> 
            </Button>
            <Button variant="link" className="text-light" onClick={onHide}>
                <FaTimes size={24} />
            </Button>
        </Modal.Header>
        
        <Modal.Body className="p-0" style={{ backgroundColor: '#f8f9fa' }}>

          {/* Profile Header */}
          <div className="text-center p-4 bg-dark">
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
            <p className="text-muted small text-light mb-2">{userData?.email}</p>
          </div>     

          {/* 1. Horizontal Stepper */}
          <ProfileStepper steps={steps} />

          <hr className="my-3 mx-4" />

          {/* 2. Additional Profile Info Section */}
          <div className="px-4 pb-4">
            <Card className="p-3 shadow-sm border-0">
                <Card.Title className="fw-bold mb-3"><FaUserEdit className="me-2 text-primary"/> Quick Profile Info</Card.Title>
                <p className="text-muted small mb-1">Bio:</p>
                <p className="fw-medium text-break">{userData?.bio || "No bio added yet. Click 'Add Bio' to complete your basic profile."}</p>
            </Card>
          </div>
        </Modal.Body>
      </Modal>

      {/* Render Modals */}
      <BasicInfoModal
          show={showBasicInfoModal}
          onHide={() => setShowBasicInfoModal(false)}
          userData={userData}
          onSaveBasicInfo={handleSaveBasicInfo}
      />
      
      <InterestsModal
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
            padding-bottom: 25px; 
        }
        
        .stepper-progress-line {
            position: absolute;
            top: 20px;
            left: 0;
            height: 4px;
            background-color: var(--bs-primary); 
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
            top: 20px;
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
            background-color: #6c757d; 
            transition: background-color 0.3s ease;
        }

        .stepper-step.complete .step-icon {
            background-color: var(--bs-success);
        }

        .stepper-step.active .step-icon {
            background-color: var(--bs-primary);
            transform: scale(1.1);
        }
        
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
      `}</style>
    </>
  );
};

// --- Mock Parent Component for testing purposes ---
// You will replace this with your actual usage
const MockParent = () => {
    const defaultUserData = {
        userName: "vandana_sobale",
        email: "sobalevandana1@gmail.com",
        emailVerified: true,
        profilePicture: "https://lh3.googleusercontent.com/a/ACg8ocJZwHqN_M7hWWD_dsUhU2prj4UTk0_Z4771FG6GMn1aJ6dl=s96-c", // Default Google Pic
        bio: "", // Empty bio
        isPrivate: false,
        onboardingComplete: false,
        // ... other fields from your data
    };

    const [showModal, setShowModal] = useState(true);
    const [mockUserData, setMockUserData] = useState(defaultUserData);

    // Placeholder handlers for the required props
    const handleSave = (updatedFields) => {
        console.log("API CALL: Saving changes to profile...", updatedFields);
        setMockUserData(prev => ({
            ...prev,
            ...updatedFields,
            // Simple logic to simulate picture change completing basic profile
            profilePicture: updatedFields.profilePicture ? 'https://example.com/new-pic.jpg' : prev.profilePicture, 
            bio: updatedFields.bio !== undefined ? updatedFields.bio : prev.bio,
            onboardingComplete: updatedFields.onboardingComplete !== undefined ? updatedFields.onboardingComplete : prev.onboardingComplete,
        }));
    };

    const handleChangePassword = (current, newPass) => {
        console.log(`API CALL: Changing password from ${current} to ${newPass}`);
        // Add actual password change logic here
        alert("Password change simulated successfully!");
    };

    const handleLogout = () => {
        console.log("API CALL: Logging out user.");
        alert("Logout simulated.");
    };

    const handleTogglePrivateProfile = (isPrivate) => {
        console.log(`API CALL: Setting profile private status to ${isPrivate}`);
        setMockUserData(prev => ({ ...prev, isPrivate }));
    };

    return (
        <div style={{ padding: '20px', minHeight: '100vh', background: '#e9ecef' }}>
            <h1>Edit Profile Test</h1>
            <Button onClick={() => setShowModal(true)}>Open Profile</Button>
            <pre className="mt-3 bg-white p-3 rounded">
                **Current User Data State:**
                {JSON.stringify(mockUserData, null, 2)}
            </pre>
            
            <EditProfile
                show={showModal}
                onHide={() => setShowModal(false)}
                userData={mockUserData}
                onSave={handleSave}
                onChangePassword={handleChangePassword}
                onLogout={handleLogout}
                onTogglePrivateProfile={handleTogglePrivateProfile}
            />
        </div>
    );
};

// Export the main component and the testing wrapper
export { EditProfile, MockParent }; 
// Note: When you import this, you will import { EditProfile } for your app.
// If you are testing in a single file environment, use the MockParent.