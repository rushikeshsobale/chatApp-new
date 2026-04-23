import React, { useState, useRef, useEffect } from 'react';
import { FaImage, FaTimes, FaRegSmile, FaChartBar, FaGlobeAmericas, FaChevronDown } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const PostModal = ({ showModal, onClose, handleAddPost }) => {
  const [text, setText] = useState('');
  const [media, setMedia] = useState(null);
  const fileInputRef = useRef(null);

  // Auto-focus logic
  const textareaRef = useRef(null);
  useEffect(() => {
    if (showModal && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showModal]);

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia({ file, url: URL.createObjectURL(file), type: file.type });
    }
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="studio-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="studio-card"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Top Navigation */}
          <div className="studio-nav">
            <button onClick={onClose} className="studio-close-btn">
              <FaTimes />
            </button>
            <div className="studio-privacy-pill">
              <FaGlobeAmericas size={12} />
              <span>Public</span>
              <FaChevronDown size={10} />
            </div>
            <button 
              onClick={() => handleAddPost(text, media)}
              disabled={!text.trim() && !media}
              className="studio-publish-btn"
            >
              Publish
            </button>
          </div>

          <div className="studio-scroll-area">
            {/* Input Section */}
            <div className="studio-input-wrapper">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's happening?"
                className="studio-textarea"
                rows={media ? 2 : 5}
              />
            </div>

            {/* Media Preview */}
            {media && (
              <div className="studio-media-preview">
                <button onClick={() => setMedia(null)} className="studio-remove-media">
                  <FaTimes size={12} />
                </button>
                {media.type.startsWith('image') ? (
                  <img src={media.url} alt="upload" className="studio-preview-obj" />
                ) : (
                  <video src={media.url} muted autoPlay loop className="studio-preview-obj" />
                )}
              </div>
            )}
          </div>

          {/* Bottom Interactive Bar */}
          <div className="studio-footer">
            <div className="studio-actions">
              <input 
                type="file" 
                hidden 
                ref={fileInputRef} 
                onChange={handleMediaUpload} 
                accept="image/*,video/*" 
              />
              <button className="studio-action-btn" onClick={() => fileInputRef.current.click()}>
                <FaImage />
              </button>
              <button className="studio-action-btn"><FaChartBar /></button>
              <button className="studio-action-btn"><FaRegSmile /></button>
            </div>

            <div className={`studio-counter ${text.length > 250 ? 'warning' : ''}`}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#222" strokeWidth="2" fill="none" />
                <circle 
                  cx="12" cy="12" r="10" 
                  stroke={text.length > 250 ? "#ff4d4d" : "#fff"} 
                  strokeWidth="2" 
                  fill="none"
                  strokeDasharray="62.8"
                  strokeDashoffset={62.8 - (62.8 * Math.min(text.length, 280)) / 280}
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
            </div>
          </div>
        </motion.div>

        <style jsx>{`
          .studio-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 5vh;
            z-index: 10000;
          }

          .studio-card {
            width: 100%;
            max-width: 580px;
            background: #0a0a0a;
            border: 1px solid #1a1a1a;
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 30px 60px rgba(0,0,0,0.8);
          }

          .studio-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #141414;
          }

          .studio-close-btn {
            background: #1a1a1a;
            border: none;
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
          }

          .studio-close-btn:hover { background: #252525; }

          .studio-privacy-pill {
            background: #141414;
            border: 1px solid #222;
            padding: 6px 14px;
            border-radius: 20px;
            color: #888;
            font-size: 0.75rem;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          }

          .studio-publish-btn {
            background: #fff;
            color: #000;
            border: none;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          }

          .studio-publish-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }

          .studio-scroll-area {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
          }

          .studio-textarea {
            width: 100%;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 1.2rem;
            resize: none;
            outline: none;
            line-height: 1.4;
            font-weight: 300;
          }

          .studio-media-preview {
            position: relative;
            margin-top: 15px;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #222;
          }

          .studio-preview-obj {
            width: 100%;
            max-height: 350px;
            object-fit: cover;
          }

          .studio-remove-media {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(0,0,0,0.7);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.1);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            backdrop-filter: blur(4px);
            cursor: pointer;
            z-index: 5;
          }

          .studio-footer {
            padding: 16px 20px;
            border-top: 1px solid #141414;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .studio-actions {
            display: flex;
            gap: 12px;
          }

          .studio-action-btn {
            background: #111;
            border: 1px solid #1a1a1a;
            color: #666;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s;
          }

          .studio-action-btn:hover {
            background: #1a1a1a;
            color: #fff;
            border-color: #333;
          }

          .studio-counter {
            display: flex;
            align-items: center;
          }

          .studio-counter svg { transform: rotate(-90deg); }

          .studio-scroll-area::-webkit-scrollbar { width: 4px; }
          .studio-scroll-area::-webkit-scrollbar-thumb {
            background: #222;
            border-radius: 10px;
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default PostModal;