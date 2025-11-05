import React, { useState } from 'react';
import '../css/profilePage.css';
import { FaUpload, FaTimes, FaImage, FaVideo, FaFont, FaMagic } from 'react-icons/fa';

const PostModal = ({ showModal, onClose, handleAddPost }) => {
  const [activeTab, setActiveTab] = useState('text');
  const [newPost, setNewPost] = useState('');
  const [media, setMedia] = useState(null);

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMedia({ file, url, type: file.type });
    }
  };

  const removeMedia = () => {
    setMedia(null);
  };

  if (!showModal) return null;

  return (
    <div className="genz-modal-overlay">
      <div className="genz-modal-container">
        <div className="genz-modal-glass">
          {/* Header */}
          <div className="genz-modal-header">
            <div className="genz-modal-title">
              <FaMagic className="sparkle-icon" />
              <h3>Create Post</h3>
            </div>
            <button onClick={onClose} className="genz-close-btn">
              <FaTimes />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="genz-tab-nav">
            <button
              onClick={() => setActiveTab('text')}
              className={`genz-tab ${activeTab === 'text' ? 'active' : ''}`}
            >
              <FaFont className="tab-icon" />
              <span>Text</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`genz-tab ${activeTab === 'media' ? 'active' : ''}`}
            >
              <FaImage className="tab-icon" />
              <span>Media</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="genz-modal-content">
            {activeTab === 'text' && (
              <div className="text-input-container">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows="5"
                  className="genz-textarea"
                  placeholder="What's the tea? ☕️..."
                  maxLength="280"
                />
                <div className="character-count">
                  {newPost.length}/280
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="media-upload-section">
                {!media ? (
                  <div className="upload-zone">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      id="file-upload"
                      className="file-input-hidden"
                    />
                    <label htmlFor="file-upload" className="upload-label">
                      <div className="upload-icon">
                        <FaUpload size={32} />
                      </div>
                      <div className="upload-text">
                        <h4>Drop your media here</h4>
                        <p>or click to browse</p>
                      </div>
                      <div className="upload-hint">
                        Supports images & videos • Max 50MB
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="media-preview-container">
                    <div className="media-preview-header">
                      <span>Preview</span>
                      <button onClick={removeMedia} className="remove-media-btn">
                        <FaTimes />
                      </button>
                    </div>
                    {media.type.startsWith('image') ? (
                      <div className="image-preview">
                        <img src={media.url} alt="Preview" className="preview-media" />
                      </div>
                    ) : (
                      <div className="video-preview">
                        <video controls className="preview-media">
                          <source src={media.url} type={media.type} />
                          Your browser doesn't support video
                        </video>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="genz-modal-footer">
            <button onClick={onClose} className="genz-btn secondary">
              Cancel
            </button>
            <button
              onClick={() => handleAddPost(newPost, media)}
              className="genz-btn primary"
              disabled={!newPost && !media}
            >
              Post It! 🚀
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .genz-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .genz-modal-container {
          width: 100%;
          max-width: 500px;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .genz-modal-glass {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.3);
          overflow: hidden;
        }

        .genz-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .genz-modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .genz-modal-title h3 {
          margin: 0;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 1.5rem;
        }

        .sparkle-icon {
          color: #ff6b6b;
          animation: sparkle 2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .genz-close-btn {
          background: rgba(0, 0, 0, 0.1);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .genz-close-btn:hover {
          background: rgba(0, 0, 0, 0.15);
          transform: scale(1.1);
        }

        .genz-tab-nav {
          display: flex;
          padding: 0 24px;
          gap: 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .genz-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: none;
          border: none;
          border-radius: 16px 16px 0 0;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          color: #666;
        }

        .genz-tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          transform: translateY(1px);
        }

        .genz-tab:not(.active):hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .tab-icon {
          font-size: 0.9rem;
        }

        .genz-modal-content {
          padding: 24px;
          min-height: 200px;
        }

        .text-input-container {
          position: relative;
        }

        .genz-textarea {
          width: 100%;
          border: 2px solid #e0e0e0;
          border-radius: 16px;
          padding: 16px;
          font-size: 1rem;
          resize: none;
          transition: all 0.3s ease;
          background: white;
          font-family: inherit;
        }

        .genz-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .character-count {
          text-align: right;
          font-size: 0.8rem;
          color: #666;
          margin-top: 8px;
        }

        .upload-zone {
          border: 3px dashed #e0e0e0;
          border-radius: 20px;
          padding: 40px 20px;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .upload-zone:hover {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.05);
        }

        .upload-label {
          cursor: pointer;
          display: block;
        }

        .upload-icon {
          color: #667eea;
          margin-bottom: 16px;
        }

        .upload-text h4 {
          margin: 0 0 8px 0;
          color: #333;
          font-weight: 600;
        }

        .upload-text p {
          margin: 0;
          color: #666;
        }

        .upload-hint {
          margin-top: 16px;
          font-size: 0.8rem;
          color: #999;
        }

        .file-input-hidden {
          display: none;
        }

        .media-preview-container {
          border: 2px solid #e0e0e0;
          border-radius: 16px;
          overflow: hidden;
        }

        .media-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #e0e0e0;
        }

        .remove-media-btn {
          background: rgba(255, 107, 107, 0.1);
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ff6b6b;
          transition: all 0.2s ease;
        }

        .remove-media-btn:hover {
          background: rgba(255, 107, 107, 0.2);
          transform: scale(1.1);
        }

        .preview-media {
          width: 100%;
          max-height: 300px;
          object-fit: contain;
          display: block;
        }

        .genz-modal-footer {
          display: flex;
          justify-content: space-between;
          padding: 20px 24px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          gap: 12px;
        }

        .genz-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 50px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.95rem;
          flex: 1;
        }

        .genz-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .genz-btn.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .genz-btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .genz-btn.secondary {
          background: rgba(0, 0, 0, 0.05);
          color: #666;
        }

        .genz-btn.secondary:hover {
          background: rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default PostModal;