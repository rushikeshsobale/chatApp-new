import React, { useState, useRef, useEffect, useContext } from 'react';
import { FaImage, FaTimes, FaRegSmile, FaChartBar, FaGlobeAmericas, FaChevronDown, FaSpinner } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { ThemeContext } from '../contexts/ThemeContext';
import tokens from '../styles/designTokens';

const PostModal = ({ showModal, onClose, handleAddPost, mode = 'create', initialText = '', isSubmitting = false, error = null, currentUser = null }) => {
  const { isDark } = useContext(ThemeContext);
  const d = isDark;
  const t = tokens;
  const isEdit = mode === 'edit';
  const [text, setText] = useState(initialText);
  const [media, setMedia] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const emojiWrapperRef = useRef(null);

  // Auto-focus logic; reset the draft each time the modal opens
  const textareaRef = useRef(null);
  useEffect(() => {
    if (showModal) {
      setText(initialText);
      setMedia(null);
      setShowEmojiPicker(false);
      textareaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia({ file, url: URL.createObjectURL(file), type: file.type });
    }
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  // Escape closes the emoji picker first, then the composer itself
  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e) => {
      if (e.key !== 'Escape') return;
      if (showEmojiPicker) { setShowEmojiPicker(false); return; }
      if (!isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showModal, isSubmitting, onClose, showEmojiPicker]);

  // Close the emoji picker on an outside click without dismissing the whole modal
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e) => {
      if (emojiWrapperRef.current && !emojiWrapperRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmojiPicker]);

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="studio-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isSubmitting && onClose()}
      >
        <motion.div
          className="studio-card"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Navigation */}
          <div className="studio-nav">
            <div className="studio-identity">
              <span className="studio-avatar-ring">
                <img src={currentUser?.profilePicture || '/assets/default-avatar.svg'} alt="" />
              </span>
              <div className="studio-identity-text">
                <span className="studio-username">{currentUser?.userName || 'You'}</span>
                <div className="studio-privacy-pill">
                  <FaGlobeAmericas size={11} />
                  <span>Public</span>
                  <FaChevronDown size={9} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="studio-close-btn" disabled={isSubmitting}>
              <FaTimes />
            </button>
          </div>

          <div className="studio-scroll-area">
            {error && <div className="studio-error">{error}</div>}

            {/* Input Section */}
            <div className="studio-input-wrapper">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind?"
                className="studio-textarea"
                rows={media ? 2 : 5}
                disabled={isSubmitting}
              />
            </div>

            {/* Media Preview */}
            {!isEdit && media && (
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
              {!isEdit && (
                <>
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
                  <div className="studio-emoji-wrapper" ref={emojiWrapperRef}>
                    <button
                      className="studio-action-btn"
                      onClick={() => setShowEmojiPicker((v) => !v)}
                    >
                      <FaRegSmile />
                    </button>
                    {showEmojiPicker && (
                      <div className="studio-emoji-popover">
                        <EmojiPicker
                          onEmojiClick={handleEmojiClick}
                          theme={d ? 'dark' : 'light'}
                          width={280}
                          height={320}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="studio-right-controls">
              <div className={`studio-counter ${text.length > 250 ? 'warning' : ''}`}>
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke={d ? "#333" : "#e5e7eb"} strokeWidth="2" fill="none" />
                  <circle
                    cx="12" cy="12" r="10"
                    stroke={text.length > 250 ? "#ff4d4d" : t.accent}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="62.8"
                    strokeDashoffset={62.8 - (62.8 * Math.min(text.length, 280)) / 280}
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                  />
                </svg>
              </div>
              <button
                onClick={() => handleAddPost(text, media)}
                disabled={isSubmitting || (isEdit ? !text.trim() : !text.trim() && !media)}
                className="studio-publish-btn"
              >
                {isSubmitting ? <FaSpinner className="studio-spin" /> : (isEdit ? 'Save' : 'Publish')}
              </button>
            </div>
          </div>
        </motion.div>

        <style jsx>{`
          .studio-modal-overlay {
            position: fixed;
            inset: 0;
            background: ${d ? 'rgba(0, 0, 0, 0.85)' : 'rgba(17, 17, 20, 0.4)'};
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
            background: ${t.surface(d)};
            border: ${t.border(d)};
            border-radius: ${t.radius.xl};
            display: flex;
            flex-direction: column;
            box-shadow: ${t.shadow(d)};
          }

          .studio-nav {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 16px 20px;
            border-bottom: ${t.border(d)};
          }

          .studio-identity {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .studio-avatar-ring {
            display: inline-flex;
            padding: 2px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #ec4899);
            flex-shrink: 0;
          }

          .studio-avatar-ring img {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid ${t.surface(d)};
            display: block;
          }

          .studio-identity-text {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .studio-username {
            font-size: 0.85rem;
            font-weight: 600;
            color: ${t.text(d)};
          }

          .studio-close-btn {
            background: ${t.surfaceAlt(d)};
            border: none;
            color: ${t.text(d)};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
          }

          .studio-close-btn:hover:not(:disabled) { background: ${d ? '#252525' : '#e4e4e9'}; }
          .studio-close-btn:disabled { opacity: 0.4; cursor: not-allowed; }

          .studio-privacy-pill {
            background: ${t.surfaceAlt(d)};
            border: ${t.border(d)};
            padding: 3px 10px;
            border-radius: ${t.radius.full};
            color: ${t.textMuted(d)};
            font-size: 0.68rem;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            width: fit-content;
          }

          .studio-right-controls {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .studio-publish-btn {
            background: ${t.gradient};
            color: #ffffff;
            border: none;
            padding: 8px 20px;
            border-radius: ${t.radius.full};
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          }

          .studio-publish-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }

          .studio-spin {
            animation: studio-spin 0.8s linear infinite;
          }

          @keyframes studio-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .studio-error {
            background: rgba(255, 77, 77, 0.12);
            border: 1px solid rgba(255, 77, 77, 0.35);
            color: ${d ? '#ff8080' : '#c53030'};
            font-size: 0.8rem;
            padding: 10px 14px;
            border-radius: 10px;
            margin-bottom: 14px;
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
            color: ${t.text(d)};
            font-size: 1.2rem;
            resize: none;
            outline: none;
            line-height: 1.4;
            font-weight: 300;
          }

          .studio-textarea::placeholder { color: ${t.textMuted(d)}; }

          .studio-media-preview {
            position: relative;
            margin-top: 15px;
            border-radius: ${t.radius.lg};
            overflow: hidden;
            border: ${t.border(d)};
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
            border-top: ${t.border(d)};
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .studio-actions {
            display: flex;
            gap: 12px;
          }

          .studio-action-btn {
            background: transparent;
            border: none;
            color: ${t.accent};
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.15s ease, transform 0.1s ease;
          }

          .studio-action-btn:hover {
            background-color: ${t.accentBg(d)};
          }

          .studio-action-btn:active {
            transform: scale(0.88);
          }

          .studio-emoji-wrapper {
            position: relative;
          }

          .studio-emoji-popover {
            position: absolute;
            bottom: calc(100% + 10px);
            left: 0;
            z-index: 20;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: ${t.shadow(d)};
          }

          .studio-counter {
            display: flex;
            align-items: center;
          }

          .studio-counter svg { transform: rotate(-90deg); }

          .studio-scroll-area::-webkit-scrollbar { width: 4px; }
          .studio-scroll-area::-webkit-scrollbar-thumb {
            background: ${d ? '#222' : 'rgba(0,0,0,0.15)'};
            border-radius: 10px;
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default PostModal;