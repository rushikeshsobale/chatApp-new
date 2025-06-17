import React, { useState } from 'react';
import '../css/profilePage.css';
import { FaUpload, FaTimes } from 'react-icons/fa';

const PostModal = ({ showModal, onClose, handleAddPost }) => {
  const [activeTab, setActiveTab] = useState('text');
  const [newPost, setNewPost] = useState('');
  const [media, setMedia] = useState(null);

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log(file, 'file')
      const url = URL.createObjectURL(file); // Generate a preview URL
      setMedia({ file, url, type: file.type });
    }
  };

  return (
    showModal && (
      <div className="custom-modal-overlay d-flex align-items-center justify-content-center">
        <div className="custom-modal-content p-4 rounded shadow-lg bg-light">
          <div className="modal-header d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <h5 className="m-0">Create a Post</h5>
            <button onClick={onClose} className="btn btn-sm btn-light p-2 rounded-circle">
              <FaTimes />
            </button>
          </div>

          <div className="modal-body">
            <div className="tabbed-interface mb-3">
              <button
                onClick={() => setActiveTab('text')}
                className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}
              >
                Text
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
              >
                Image/Video
              </button>
            </div>

            {activeTab === 'text' && (
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows="4"
                className="form-control custom-textarea"
                placeholder="What's on your mind?"
              />
            )}

            {activeTab === 'media' && (
              <div className="custom-file-input">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  id="file-upload"
                  className="file-input d-none"
                />
                <label htmlFor="file-upload" className="btn btn-outline-primary w-100">
                  <FaUpload className="me-2" /> Choose File
                </label>
              </div>
            )}

            {media && (
              <div className="media-preview mt-3 text-center">
                {media.type.startsWith('image') ? (
                  <img src={media.url} alt="Preview" className="img-fluid rounded" />
                ) : (
                  <video controls className="w-100 rounded">
                    <source src={media.url} type={media.type} />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer d-flex justify-content-between mt-3">
            <button onClick={onClose} className="btn btn-secondary">Close</button>
            <button
              onClick={() => handleAddPost(newPost, media)}
              className="btn btn-primary"
              disabled={!newPost && !media} // Disable post button if no content
            >
              Post
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default PostModal;
