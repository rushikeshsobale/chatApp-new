import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const EditProfile = ({ userData, onSave }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null); // For storing file

  // This will run when userData is passed in and populate the form with current data
  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setBio(userData.bio || '');
      setProfileImage(userData.profilePicture || '');
    }
  }, [userData]);

  // Handle profile image change (from file input)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImage(URL.createObjectURL(file)); // Preview the image
    }
  };

  const handleSave = () => {
    
    const profileData = {
      firstName,
      lastName,
      bio,
      profilePicture: profileImageFile,
    };

    onSave(profileData);
  };

  return (
    <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasRight" aria-labelledby="offcanvasRightLabel">
      <div className="offcanvas-header">
        <h5 id="offcanvasRightLabel">Edit Profile</h5>
        <button type="button" className="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div className="offcanvas-body">
        <div className="mb-3">
          <label htmlFor="profileImage" className="form-label">Profile Picture</label>
          <input
            type="file"
            className="form-control"
            id="profileImage"
            onChange={handleImageChange}
          />
          {profileImage && (
            <div className="mt-3">
              <img
                src={profileImage}
                alt="Profile Preview"
                className="rounded-circle"
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>

        <div className="mb-3">
          <label htmlFor="name" className="form-label">Full Name</label>
          <div className="d-flex">
            <input
              type="text"
              className="form-control me-2"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
            />
            <input
              type="text"
              className="form-control"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
            />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="bio" className="form-label">Bio</label>
          <textarea
            className="form-control"
            id="bio"
            rows="3"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
          ></textarea>
        </div>

        <button className="btn btn-success btn-sm" onClick={handleSave} data-bs-dismiss="offcanvas">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EditProfile;
