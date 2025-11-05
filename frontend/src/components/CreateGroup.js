import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import * as bootstrap from 'bootstrap';
import { createGroup } from '../services/groupServices';

const CreateGroupDrawer = ({ friends, isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const offcanvasRef = useRef(null);
  const offcanvasInstance = useRef(null);

  useEffect(() => {
    if (offcanvasRef.current && !offcanvasInstance.current) {
      offcanvasInstance.current = new bootstrap.Offcanvas(offcanvasRef.current, {
        backdrop: true,
      });
    }

    if (isOpen) {
      offcanvasInstance.current?.show();
      setError('');
      setGroupName('');
      setSelectedUsers([]);
    } else {
      offcanvasInstance.current?.hide();
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose?.();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return setError('Group name is required');
    if (selectedUsers.length === 0) return setError('Select at least one member');

    setIsLoading(true);
    setError('');

    try {
      const groupData = {
        name: groupName,
        members: selectedUsers.map((u) => u.value),
      };

      const res = await createGroup(groupData);
      onGroupCreated?.(res);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const userOptions = friends.map(f => ({
    value: f._id,
    label: f.userName,
  }));

  return (
    <div
      className="offcanvas offcanvas-end "
      tabIndex="-1"
      id="createGroupDrawer"
      ref={offcanvasRef}
    >
      <div className="offcanvas-header bg-primary text-white">
        <h5 className="offcanvas-title">Create Group</h5>
        <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
      </div>
      <div className="offcanvas-body">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold">Group Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Select Users</label>
          <Select
            isMulti
            options={userOptions}
            value={selectedUsers}
            onChange={setSelectedUsers}
          />
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleCreateGroup}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Creating...
              </>
            ) : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupDrawer;
