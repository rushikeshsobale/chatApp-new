import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import * as bootstrap from 'bootstrap';

import { createGroup } from '../services/groupServices';
const CreateGroupModal = ({ friends }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (friends && Array.isArray(friends)) {
      const options = friends.map(friend => ({
        value: friend._id,
        label: friend.userName,
      }));
      setUserOptions(options);
    }
  }, [friends]);
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one member');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const groupData = {
        name: groupName,
        members: selectedUsers.map(user => user.value),
        admins: selectedUsers.map(user => user.value)
      };
      const response = await createGroup(groupData);    
      const modal = document.getElementById('createGroupModal');
      const modalInstance = bootstrap.Modal.getInstance(modal);
      modalInstance.hide();
      setGroupName('');
      setSelectedUsers([]);   
      console.log('Group created successfully:', response);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      {/* Trigger Button */}
      <button
        className="btn btn-primary d-flex align-items-center gap-2"
        data-bs-toggle="modal"
        data-bs-target="#createGroupModal"
      >
        <i className="bi bi-plus-circle-fill"></i>
        Create Group
      </button>

      {/* Modal */}
      <div
        className="modal fade"
        id="createGroupModal"
        tabIndex="-1"
        aria-labelledby="createGroupModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title" id="createGroupModalLabel">Create New Group</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              <div className="mb-3">
                <label htmlFor="groupName" className="form-label fw-semibold">
                  Group Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="groupName"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Select Users</label>
                <Select
                  options={userOptions}
                  isMulti
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={setSelectedUsers}
                  value={selectedUsers}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateGroup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateGroupModal;
