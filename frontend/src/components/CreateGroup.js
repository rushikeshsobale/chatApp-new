import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import * as bootstrap from 'bootstrap';
import { createGroup } from '../services/groupServices';
import { FaTimes, FaPlus } from 'react-icons/fa';

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
    } else {
      offcanvasInstance.current?.hide();
    }
  }, [isOpen]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return setError('Enter a group name');
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
      onClose();
    } catch (err) {
      setError('Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const userOptions = friends?.map(f => ({
    value: f._id,
    label: f.userName,
  }));

  // Custom Styles for React Select to match the 2026 Dark Theme
  const customSelectStyles = {
    control: (base) => ({
      ...base,
      background: '#161616',
      borderColor: '#2a2a2a',
      minHeight: '45px',
      boxShadow: 'none',
      '&:hover': { borderColor: '#444' }
    }),
    menu: (base) => ({ ...base, background: '#161616', border: '1px solid #2a2a2a' }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? '#222' : 'transparent',
      color: '#fff',
      fontSize: '0.85rem'
    }),
    multiValue: (base) => ({ ...base, background: '#333', borderRadius: '4px' }),
    multiValueLabel: (base) => ({ ...base, color: '#fff', fontSize: '0.75rem' }),
    multiValueRemove: (base) => ({ ...base, color: '#888', '&:hover': { color: '#ff4d4d', background: 'transparent' } }),
    placeholder: (base) => ({ ...base, color: '#555', fontSize: '0.85rem' }),
    input: (base) => ({ ...base, color: '#fff' })
  };

  return (
    <div
      className="offcanvas offcanvas-end prof-drawer"
      tabIndex="-1"
      ref={offcanvasRef}
      style={{ visibility: isOpen ? 'visible' : 'hidden' }}
    >
      <div className="prof-drawer-header">
        <div className="d-flex align-items-center gap-2">
            <div className="prof-plus-box"><FaPlus size={10} /></div>
            <span className="prof-drawer-title">New Group</span>
        </div>
        <button onClick={onClose} className="prof-close-btn"><FaTimes /></button>
      </div>

      <div className="offcanvas-body px-4">
        {error && <div className="prof-error-msg">{error}</div>}

        <div className="mb-4">
          <label className="prof-label-sm">Identification</label>
          <input
            type="text"
            className="prof-minimal-input"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="prof-label-sm">Participants</label>
          <Select
            isMulti
            options={userOptions}
            value={selectedUsers}
            onChange={setSelectedUsers}
            styles={customSelectStyles}
            placeholder="Search members..."
          />
        </div>

        <div className="prof-drawer-footer">
          <button className="prof-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="prof-btn-primary"
            onClick={handleCreateGroup}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Create Group"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .prof-drawer {
          background: #000 !important;
          border-left: 1px solid #1a1a1a !important;
          width: 400px !important;
        }

        .prof-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
        }

        .prof-plus-box {
            width: 24px;
            height: 24px;
            background: #161616;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }

        .prof-drawer-title {
          font-size: 0.9rem;
          color: #fff;
          letter-spacing: 0.3px;
        }

        .prof-close-btn {
          background: none;
          border: none;
          color: #444;
          cursor: pointer;
        }

        .prof-label-sm {
          display: block;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #555;
          margin-bottom: 10px;
        }

        .prof-minimal-input {
          width: 100%;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 4px;
          padding: 10px 12px;
          color: #fff;
          font-size: 0.85rem;
          outline: none;
        }

        .prof-minimal-input:focus {
          border-color: #444;
        }

        .prof-error-msg {
          font-size: 0.75rem;
          color: #ff4d4d;
          background: rgba(255, 77, 77, 0.05);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 77, 77, 0.1);
        }

        .prof-drawer-footer {
          margin-top: 40px;
          display: flex;
          gap: 12px;
        }

        .prof-btn-primary {
          flex: 1;
          background: #fff;
          color: #000;
          border: none;
          padding: 10px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .prof-btn-secondary {
          flex: 1;
          background: transparent;
          color: #666;
          border: 1px solid #2a2a2a;
          padding: 10px;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .prof-btn-primary:disabled {
          background: #222;
          color: #444;
        }

        /* Dark Backdrop customization */
        :global(.offcanvas-backdrop.show) {
          background-color: #000 !important;
          opacity: 0.8 !important;
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
};

export default CreateGroupDrawer;
