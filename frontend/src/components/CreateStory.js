import React, { useState, useContext, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { FaTimes, FaPlus, FaCircleNotch, FaPaperPlane } from 'react-icons/fa';
import { ThemeContext } from '../contexts/ThemeContext';
import tokens from '../styles/designTokens';

const CreateStory = ({ show, onHide, onCreateStory, isSubmitting = false, error = null, currentUser = null }) => {
    const { isDark } = useContext(ThemeContext);
    const d = isDark;
    const t = tokens;

    const [media, setMedia] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [caption, setCaption] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);

    // Reset the draft each time the modal opens, instead of leaking the
    // previous story's caption/preview into the next one.
    useEffect(() => {
        if (show) {
            setMedia(null);
            setMediaType(null);
            setCaption('');
            setPreviewUrl(null);
        }
    }, [show]);

    return (
        <Modal
            show={show}
            onHide={() => !isSubmitting && onHide()}
            centered
            size="md"
            contentClassName="story-compact-modal"
        >
            <Modal.Body className="p-0 overflow-hidden">
                <div className="story-flex-container">

                    <div className="d-flex justify-content-between align-items-center story-header">
                        <div className="story-header-identity">
                            <span className="story-avatar-ring">
                                <img src={currentUser?.profilePicture || '/assets/default-avatar.svg'} alt="" />
                            </span>
                            <span className="story-title-text">Your Story</span>
                        </div>
                        <button onClick={onHide} className="story-close-x" disabled={isSubmitting}><FaTimes /></button>
                    </div>

                    {/* Media stage: portrait, "contain"-fit — mirrors how StoryViewer
                        actually displays it, so what you see here is what viewers see. */}
                    <div className="story-media-frame">
                        <div className="story-media-stage" onClick={() => !isSubmitting && document.getElementById('story-input').click()}>
                            {!previewUrl ? (
                                <div className="story-upload-trigger">
                                    <span className="story-upload-icon"><FaPlus size={14} /></span>
                                    <span>Add photo or video</span>
                                </div>
                            ) : (
                                <div className="story-media-mini-preview">
                                    {mediaType === 'image' ? <img src={previewUrl} alt="" /> : <video src={previewUrl} muted autoPlay loop playsInline />}
                                    <button
                                        className="story-mini-remove"
                                        disabled={isSubmitting}
                                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setMedia(null); }}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            )}
                            {isSubmitting && (
                                <div className="story-uploading-overlay">
                                    <FaCircleNotch className="story-spin" size={20} />
                                    <span>Sharing story…</span>
                                </div>
                            )}
                            <input id="story-input" type="file" hidden accept="image/*,video/*" onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setPreviewUrl(URL.createObjectURL(file));
                                setMediaType(file.type.startsWith('image') ? 'image' : 'video');
                                setMedia(file);
                            }} />
                        </div>
                    </div>

                    <div className="story-content-main">
                        {error && <div className="story-error">{error}</div>}

                        <div className="story-caption-bar">
                            <input
                                className="story-caption-input"
                                placeholder="Add a caption..."
                                value={caption}
                                disabled={isSubmitting}
                                onChange={(e) => setCaption(e.target.value)}
                            />
                            <button
                                className="story-btn-confirm"
                                disabled={!media || isSubmitting}
                                onClick={() => onCreateStory({ media, mediaType, caption })}
                                aria-label="Share story"
                            >
                                {isSubmitting ? <FaCircleNotch className="story-spin" /> : <FaPaperPlane size={13} />}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal.Body>

            <style jsx>{`
                :global(.story-compact-modal) {
                    background: ${t.surface(d)} !important;
                    border: ${t.border(d)} !important;
                    border-radius: ${t.radius.xl} !important;
                    box-shadow: ${t.shadow(d)} !important;
                    width: 300px;
                }

                .story-flex-container {
                    display: flex;
                    flex-direction: column;
                }

                .story-header {
                    padding: 14px 16px;
                    border-bottom: ${t.border(d)};
                }

                .story-header-identity {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .story-avatar-ring {
                    display: inline-flex;
                    padding: 2px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1, #ec4899);
                    flex-shrink: 0;
                }

                .story-avatar-ring img {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid ${t.surface(d)};
                    display: block;
                }

                .story-title-text {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: ${t.text(d)};
                }

                .story-close-x {
                    background: ${t.surfaceAlt(d)};
                    border: none;
                    color: ${t.text(d)};
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    transition: background 0.15s ease;
                }

                .story-close-x:hover:not(:disabled) { background: ${d ? '#252525' : '#e4e4e9'}; }
                .story-close-x:disabled { opacity: 0.4; cursor: not-allowed; }

                /* Media stage: a real 9:16 portrait frame with a story-ring gradient
                   border, so it visually reads as "story" even before media is added. */
                .story-media-frame {
                    display: flex;
                    justify-content: center;
                    padding: 14px 14px 0;
                }

                .story-media-stage {
                    width: 168px;
                    aspect-ratio: 9 / 16;
                    background: #000;
                    border-radius: ${t.radius.lg};
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    cursor: pointer;
                }

                .story-upload-trigger {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: #b8b8c2;
                    text-align: center;
                    padding: 0 12px;
                }

                .story-upload-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, rgba(99,102,241,0.9), rgba(236,72,153,0.9));
                    color: #fff;
                }

                .story-upload-trigger span:last-child {
                    font-size: 0.68rem;
                    line-height: 1.3;
                }

                .story-uploading-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.72);
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    text-align: center;
                    padding: 0 10px;
                }

                .story-uploading-overlay span {
                    font-size: 0.68rem;
                    line-height: 1.3;
                }

                .story-media-mini-preview {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .story-media-mini-preview img, .story-media-mini-preview video {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .story-mini-remove {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(0,0,0,0.7);
                    color: #fff;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    font-size: 0.7rem;
                }

                .story-mini-remove:disabled { opacity: 0.5; cursor: not-allowed; }

                .story-content-main {
                    padding: 16px;
                }

                .story-error {
                    background: rgba(255, 77, 77, 0.12);
                    border: 1px solid rgba(255, 77, 77, 0.35);
                    color: ${d ? '#ff8080' : '#c53030'};
                    font-size: 0.72rem;
                    padding: 6px 10px;
                    border-radius: 10px;
                    margin-bottom: 10px;
                }

                .story-caption-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: ${t.surfaceAlt(d)};
                    border: 1px solid ${d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
                    border-radius: ${t.radius.full};
                    padding: 6px 6px 6px 16px;
                }

                .story-caption-bar:focus-within {
                    border-color: ${t.accent};
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
                }

                .story-caption-input {
                    flex: 1;
                    min-width: 0;
                    background: transparent;
                    border: none;
                    color: ${t.text(d)};
                    font-size: 0.85rem;
                    outline: none;
                }

                .story-caption-input::placeholder { color: ${t.textMuted(d)}; }
                .story-caption-input:disabled { opacity: 0.6; }

                .story-btn-confirm {
                    background: ${t.gradient};
                    color: #ffffff;
                    border: none;
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.15s ease, transform 0.1s ease;
                }

                .story-btn-confirm:active:not(:disabled) { transform: scale(0.92); }

                .story-btn-confirm:disabled {
                    background: ${t.surfaceAlt(d)};
                    color: ${t.textMuted(d)};
                }

                .story-spin {
                    animation: story-spin 0.8s linear infinite;
                }

                @keyframes story-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </Modal>
    );
};

export default CreateStory;
