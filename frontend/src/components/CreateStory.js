import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { FaCamera, FaTimes, FaPlus, FaCircleNotch } from 'react-icons/fa';

const CreateStory = ({ show, onHide, onCreateStory }) => {
    const [media, setMedia] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [caption, setCaption] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const resetForm = () => {
        setMedia(null);
        setPreviewUrl(null);
        onHide();
    };

    return (
        <Modal 
            show={show} 
            onHide={resetForm} 
            centered 
            size="md"
            contentClassName="prof-compact-modal"
        >
            <Modal.Body className="p-0 overflow-hidden">
                <div className="prof-flex-container">
                    
                    {/* Left Side: Media Surface (Compact Height) */}
                    <div className="prof-media-aside">
                        {!previewUrl ? (
                            <div className="prof-upload-trigger" onClick={() => document.getElementById('story-input').click()}>
                                <FaPlus size={14} />
                                <input id="story-input" type="file" hidden onChange={(e) => {
                                    const file = e.target.files[0];
                                    setPreviewUrl(URL.createObjectURL(file));
                                    setMediaType(file.type.startsWith('image') ? 'image' : 'video');
                                    setMedia(file);
                                }} />
                            </div>
                        ) : (
                            <div className="prof-media-mini-preview">
                                {mediaType === 'image' ? <img src={previewUrl} alt="" /> : <video src={previewUrl} muted autoPlay loop />}
                                <button className="prof-mini-remove" onClick={() => setPreviewUrl(null)}><FaTimes /></button>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Content & Actions */}
                    <div className="prof-content-main">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="prof-label-sm">New Story</span>
                            <button onClick={onHide} className="prof-close-x"><FaTimes /></button>
                        </div>

                        <input 
                            className="prof-minimal-input"
                            placeholder="Add a brief caption..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                        />

                        <div className="prof-footer-actions">
                            <button 
                                className="prof-btn-confirm"
                                disabled={!media || isProcessing}
                                onClick={() => onCreateStory({ media, mediaType, caption })}
                            >
                                Share
                            </button>
                        </div>
                    </div>
                </div>
            </Modal.Body>

            <style jsx>{`
                :global(.prof-compact-modal) {
                    background: #0d0d0d !important;
                    border: 1px solid #1f1f1f !important;
                    border-radius: 12px !important;
                    width: 480px; /* Slightly wider, but much shorter */
                }

                .prof-flex-container {
                    display: flex;
                    height: 160px; /* Fixed small height */
                }

                /* Left Side Media Styles */
                .prof-media-aside {
                    width: 120px;
                    background: #141414;
                    border-right: 1px solid #1f1f1f;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .prof-upload-trigger {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 1px dashed #333;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #f4f4f4ff;
                    cursor: pointer;
                }

                .prof-media-mini-preview {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }

                .prof-media-mini-preview img, .prof-media-mini-preview video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .prof-mini-remove {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: rgba(0,0,0,0.7);
                    color: #fff;
                    border: none;
                    border-radius: 50%;
                    width: 18px;
                    height: 18px;
                    font-size: 0.6rem;
                }

                /* Right Side Content Styles */
                .prof-content-main {
                    flex: 1;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .prof-label-sm {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #fff6f6ff;
                }

                .prof-close-x { background: none; border: none; color: #ffffffff; font-size: 0.8rem; }

                .prof-minimal-input {
                    background: transparent;
                    border: none;
                    border-bottom: 1px solid #1f1f1f;
                    color: #fff;
                    font-size: 0.85rem;
                    padding: 8px 0;
                    outline: none;
                }

                .prof-minimal-input::placeholder { color: #333; }

                .prof-footer-actions {
                    display: flex;
                    justify-content: flex-end;
                }

                .prof-btn-confirm {
                    background: #fff;
                    color: #000;
                    border: none;
                    padding: 4px 20px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .prof-btn-confirm:disabled {
                    background: #222;
                    color: #f4efefff;
                }
            `}</style>
        </Modal>
    );
};

export default CreateStory;
