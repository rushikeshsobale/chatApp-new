import React, { useState } from 'react';
import '../css/profilePage.css'
import { FaUpload } from 'react-icons/fa';
const PostModal = ({ showModal, onClose, handleAddPost }) => {
  const [activeTab, setActiveTab] = useState('text');
  const [newPost, setNewPost] = useState('');
  const [media, setMedia] = useState(null);

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Store the actual file in state for uploading
      setMedia(file);  // Store the actual File object
    }
  };

  return (
    showModal && (
      <div className="custom-modal-overlay" >
        <div className="custom-modal-content bg-dark">
          <div className="modal-header">
            <h5>Create a Post</h5>
            <button onClick={onClose} className="close-button">✖</button>
          </div>
          <div className="modal-body">
            <div className="tabbed-interface text-secondary">
              <button onClick={() => setActiveTab('text')} className={`tab-button ${activeTab === 'text' ? 'active' : ''}`}>Text</button>
              <button onClick={() => setActiveTab('media')} className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}>Image/Video</button>
            </div>
            {activeTab === 'text' && (
              <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows="3"
              className="custom-textarea mb-2"
              placeholder="What's on your mind?"
            />
            )}
            {activeTab === 'media' && (
             <div className="custom-file-input mb-2">
             <input
               type="file"
               accept="image/*,video/*"
               onChange={handleMediaUpload}
               id="file-upload"
               className="file-input"
             />
             <label htmlFor="file-upload" className="file-label">
               <FaUpload /> Choose File
             </label>
           </div>
            )}
            {media && (
              <div className="media-preview mt-2">
                {media.type.startsWith('image') ? (
                  <img src={media.url} alt="Preview" className="img-fluid" />
                ) : (
                  <video controls className="w-100">
                    <source src={media.url} type={media.type} />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-secondary">Close</button>
            <button onClick={() => handleAddPost(newPost, media)} className="btn btn-primary">Post</button>
          </div>
        </div>
      </div>
    )
  );
};

export default PostModal;
